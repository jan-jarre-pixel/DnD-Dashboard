-- Keep resource indices compatible with legacy parts(): blank lines do not count.
-- Repair only invalid usage shapes during an explicit authorized consumption.
BEGIN;
CREATE OR REPLACE FUNCTION public.dnd_combat_call(p_token text,p_action text,p_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE i jsonb;a text;req uuid;hash text;cached game_private.combat_commands%rowtype;e game_private.encounters%rowtype;p game_private.combatants%rowtype;q game_private.combatants%rowtype;room public.dnd_room%rowtype;
 s jsonb;result jsonb:='{}';entry jsonb:='{}';is_public boolean:=true;eid uuid;nextid uuid;ids uuid[];pos int;num int;v int;maximum int;remaining int;newhp int;temp int;successes int;failures int;die int;idx int;kind text;value text;flag boolean;can_act boolean;
BEGIN
 i:=game_private.dnd_session_identity(p_token);IF i IS NULL THEN RAISE EXCEPTION 'Sitzung abgelaufen' USING ERRCODE='28000'; END IF;a:=i->>'actor';
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>30000 THEN RAISE EXCEPTION 'Ungültige Anfrage'; END IF;
 IF p_action='snapshot' THEN RETURN game_private.combat_snapshot(a,(p_payload->>'id')::uuid); END IF;
 IF p_action IS NULL OR p_action NOT IN ('create','clone','npc.add','party.add','initiative.roll','initiative.set','order.confirm','start','pause','resume','end','next','visibility','exclude','damage','heal','temp','condition','concentration','effect','death.roll','death.set','revive','budget','movement','movement.limit','resource.use') THEN RAISE EXCEPTION 'Unbekannte Kampfaktion'; END IF;
 IF a<>'gm' AND p_action NOT IN ('damage','heal','temp','condition','concentration','effect','death.roll','budget','movement','resource.use') THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
 req:=(p_payload->>'request_id')::uuid;IF req IS NULL THEN RAISE EXCEPTION 'Request-ID erforderlich'; END IF;
 hash:=encode(extensions.digest((p_payload-'request_id')::text,'sha256'),'hex');
 -- Lock order matches workspace controls, dice and character updates.
 PERFORM 1 FROM game_private.session_workspace WHERE id=1 FOR UPDATE;
 SELECT * INTO cached FROM game_private.combat_commands WHERE request_id=req;
 IF FOUND THEN IF cached.actor_key<>a OR cached.action<>p_action OR cached.payload_hash<>hash THEN RAISE EXCEPTION 'Request-ID bereits verwendet'; END IF;RETURN cached.result; END IF;
 SELECT * INTO room FROM public.dnd_room WHERE id=1;
 IF (p_payload->>'session_id')::uuid IS DISTINCT FROM room.session_id THEN RAISE EXCEPTION 'Spielsitzung wurde gewechselt'; END IF;
 IF p_action='create' THEN
  IF (SELECT count(*) FROM game_private.encounters)>=500 THEN RAISE EXCEPTION 'Maximal 500 Begegnungen'; END IF;
  value:=trim(p_payload->>'title');IF value IS NULL OR length(value) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Titel erforderlich'; END IF;
  INSERT INTO game_private.encounters(session_id,title) VALUES(room.session_id,value) RETURNING * INTO e;
  INSERT INTO game_private.combatants(encounter_id,char_key,visible,show_stats,tie_rank) SELECT e.id,char_key,true,true,row_number()OVER(ORDER BY char_key) FROM public.character_slots;
  is_public:=false;
 ELSE
  SELECT * INTO e FROM game_private.encounters WHERE id=(p_payload->>'id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
  IF (p_payload->>'version')::bigint IS DISTINCT FROM (CASE WHEN a='gm' THEN e.version ELSE e.public_version END) THEN RAISE EXCEPTION 'Versionskonflikt: Kampfstand geändert' USING ERRCODE='40001'; END IF;
  IF a<>'gm' AND (e.session_id<>room.session_id OR e.status NOT IN ('active','paused')) THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
  IF e.status='ended' AND p_action<>'clone' THEN RAISE EXCEPTION 'Kampf ist beendet'; END IF;
  IF p_action='clone' AND e.status NOT IN ('preparing','ended') THEN RAISE EXCEPTION 'Nur vor Kampfbeginn oder nach Ende kopieren'; END IF;
  IF p_action IN ('npc.add','party.add','initiative.roll','initiative.set','order.confirm') AND e.status NOT IN ('preparing','paused') THEN RAISE EXCEPTION 'Kampf zuerst pausieren'; END IF;
  IF p_action='clone' THEN
   IF (SELECT count(*) FROM game_private.encounters)>=500 THEN RAISE EXCEPTION 'Maximal 500 Begegnungen'; END IF;
   eid:=e.id;INSERT INTO game_private.encounters(session_id,title) VALUES(room.session_id,left(e.title||' · Kopie',100)) RETURNING * INTO e;
   INSERT INTO game_private.combatants(encounter_id,char_key,visible,show_stats,tie_rank) SELECT e.id,char_key,true,true,row_number()OVER(ORDER BY char_key) FROM public.character_slots;
   INSERT INTO game_private.combatants(encounter_id,name,hp,hp_max,temp_hp,ac,dex,init_bonus,speed,tie_rank,visible,show_stats,npc_template_id) SELECT e.id,name,hp_max,hp_max,0,ac,dex,init_bonus,speed,tie_rank,visible,show_stats,npc_template_id FROM game_private.combatants WHERE encounter_id=eid AND char_key IS NULL;
   is_public:=false;
  ELSIF p_action='npc.add' THEN
   IF (SELECT count(*) FROM game_private.combatants WHERE encounter_id=e.id)>=50 THEN RAISE EXCEPTION 'Maximal 50 Teilnehmer'; END IF;
   INSERT INTO game_private.combatants(encounter_id,name,hp,hp_max,ac,dex,init_bonus,speed,tie_rank,visible,show_stats) VALUES(e.id,trim(p_payload->>'name'),(p_payload->>'hp')::int,(p_payload->>'hp')::int,(p_payload->>'ac')::int,coalesce((p_payload->>'dex')::int,10),coalesce((p_payload->>'init_bonus')::int,0),coalesce((p_payload->>'speed')::int,30),(SELECT count(*)+1 FROM game_private.combatants WHERE encounter_id=e.id),coalesce((p_payload->>'visible')::boolean,false),false) RETURNING * INTO p;
   UPDATE game_private.encounters SET ties_confirmed=false WHERE id=e.id;is_public:=p.visible;
  ELSIF p_action='party.add' THEN
   INSERT INTO game_private.combatants(encounter_id,char_key,visible,show_stats,tie_rank) SELECT e.id,char_key,true,true,10+row_number()OVER(ORDER BY char_key) FROM public.character_slots ON CONFLICT DO NOTHING;is_public:=false;
  ELSIF p_action='initiative.roll' THEN
   FOR p IN SELECT * FROM game_private.combatants WHERE encounter_id=e.id AND enabled AND ((p_payload->>'target') IS NULL OR id=(p_payload->>'target')::uuid) ORDER BY id LOOP
    s:=game_private.combat_state(p);v:=greatest(-100,least(100,floor(((s#>>'{ab,1}')::numeric-10)/2)::int+coalesce((s->>'initX')::int,0)));
    result:=public.dnd_roll('gm',p_token,'1d20'||CASE WHEN v>=0 THEN '+' ELSE '' END||v,'Initiative · '||left(s->>'name',80),CASE WHEN e.status<>'preparing' AND (p.char_key IS NOT NULL OR (p.visible AND p.show_stats)) THEN 'public' ELSE 'gm' END,gen_random_uuid(),0::smallint);
    UPDATE game_private.combatants SET initiative=(result->>'total')::int WHERE id=p.id;
   END LOOP;
   UPDATE game_private.encounters SET ties_confirmed=false WHERE id=e.id;is_public:=EXISTS(SELECT 1 FROM game_private.combatants WHERE encounter_id=e.id AND enabled AND (visible OR char_key IS NOT NULL) AND ((p_payload->>'target') IS NULL OR id=(p_payload->>'target')::uuid));
  ELSIF p_action='initiative.set' THEN
   UPDATE game_private.combatants SET initiative=(p_payload->>'initiative')::int,tie_rank=(p_payload->>'rank')::int WHERE id=(p_payload->>'target')::uuid AND encounter_id=e.id RETURNING * INTO p;
   IF NOT FOUND THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
   UPDATE game_private.encounters SET ties_confirmed=false WHERE id=e.id;is_public:=p.visible OR p.char_key IS NOT NULL;
  ELSIF p_action='order.confirm' THEN
   IF EXISTS(SELECT 1 FROM game_private.combatants WHERE encounter_id=e.id AND enabled AND initiative IS NULL) THEN RAISE EXCEPTION 'Initiative fehlt'; END IF;
   IF EXISTS(SELECT 1 FROM game_private.combatants WHERE encounter_id=e.id AND enabled GROUP BY initiative,tie_rank HAVING count(*)>1) THEN RAISE EXCEPTION 'Gleichstände benötigen unterschiedliche Ränge'; END IF;
   UPDATE game_private.encounters SET ties_confirmed=true WHERE id=e.id;is_public:=false;
  ELSIF p_action='start' THEN
   IF e.status<>'preparing' OR room.status<>'active' THEN RAISE EXCEPTION 'Aktive Sitzung und vorbereiteter Kampf erforderlich'; END IF;
   IF EXISTS(SELECT 1 FROM game_private.encounters WHERE status IN ('active','paused')) THEN RAISE EXCEPTION 'Laufenden Kampf zuerst beenden'; END IF;
   IF EXISTS(SELECT 1 FROM game_private.combatants WHERE encounter_id=e.id AND enabled AND initiative IS NULL) THEN RAISE EXCEPTION 'Initiative fehlt'; END IF;
   IF NOT e.ties_confirmed AND EXISTS(SELECT 1 FROM game_private.combatants WHERE encounter_id=e.id AND enabled GROUP BY initiative HAVING count(*)>1) THEN RAISE EXCEPTION 'Gleichstände zuerst bestätigen'; END IF;
   SELECT id INTO nextid FROM game_private.combatants WHERE encounter_id=e.id AND enabled ORDER BY initiative DESC,tie_rank,id LIMIT 1;
   IF nextid IS NULL THEN RAISE EXCEPTION 'Keine Teilnehmer'; END IF;
   UPDATE game_private.encounters SET status='active',session_id=room.session_id,round=1,current_id=nextid WHERE id=e.id;
   UPDATE game_private.combatants SET action_used=false,bonus_used=false,reaction_used=false,movement_used=0,movement_extra=0 WHERE encounter_id=e.id;
  ELSIF p_action='pause' THEN
   IF e.status<>'active' THEN RAISE EXCEPTION 'Kampf ist nicht aktiv'; END IF;UPDATE game_private.encounters SET status='paused' WHERE id=e.id;
  ELSIF p_action='resume' THEN
   IF e.status<>'paused' OR room.status<>'active' THEN RAISE EXCEPTION 'Kampf oder Sitzung pausiert'; END IF;
   IF EXISTS(SELECT 1 FROM game_private.combatants WHERE encounter_id=e.id AND enabled AND initiative IS NULL) THEN RAISE EXCEPTION 'Initiative fehlt'; END IF;
   IF NOT e.ties_confirmed AND EXISTS(SELECT 1 FROM game_private.combatants WHERE encounter_id=e.id AND enabled GROUP BY initiative HAVING count(*)>1) THEN RAISE EXCEPTION 'Gleichstände zuerst bestätigen'; END IF;
   UPDATE game_private.encounters SET status='active' WHERE id=e.id;
  ELSIF p_action='end' THEN UPDATE game_private.encounters SET status='ended',ended_at=now() WHERE id=e.id;
  ELSIF p_action='next' THEN
   IF e.status<>'active' OR room.status<>'active' THEN RAISE EXCEPTION 'Kampf oder Sitzung pausiert'; END IF;
   SELECT array_agg(id ORDER BY initiative DESC,tie_rank,id) INTO ids FROM game_private.combatants WHERE encounter_id=e.id AND enabled;
   pos:=array_position(ids,e.current_id);IF pos IS NULL THEN RAISE EXCEPTION 'Aktueller Zug fehlt'; END IF;
   nextid:=ids[CASE WHEN pos=cardinality(ids) THEN 1 ELSE pos+1 END];
   is_public:=EXISTS(SELECT 1 FROM game_private.combatants WHERE id IN (e.current_id,nextid) AND (visible OR char_key IS NOT NULL));
   UPDATE game_private.encounters SET current_id=nextid,round=round+CASE WHEN pos=cardinality(ids) THEN 1 ELSE 0 END WHERE id=e.id;
   UPDATE game_private.combatants SET action_used=false,bonus_used=false,reaction_used=false,movement_used=0,movement_extra=0 WHERE id=nextid;
  ELSE
   SELECT * INTO p FROM game_private.combatants WHERE encounter_id=e.id AND id=(p_payload->>'target')::uuid FOR UPDATE;
   IF NOT FOUND OR (a<>'gm' AND p.char_key IS DISTINCT FROM a) THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
   IF a<>'gm' AND (e.status<>'active' OR room.status<>'active') THEN RAISE EXCEPTION 'Kampf oder Sitzung pausiert'; END IF;
   IF p.char_key IS NOT NULL THEN
    PERFORM 1 FROM public.character_slots WHERE char_key=p.char_key FOR UPDATE;
    IF (p_payload->>'character_version')::bigint IS DISTINCT FROM (SELECT version FROM game_private.character_versions WHERE char_key=p.char_key) THEN RAISE EXCEPTION 'Versionskonflikt: Charakter geändert' USING ERRCODE='40001'; END IF;
   END IF;
   s:=game_private.combat_state(p);is_public:=p.char_key IS NOT NULL OR (p.visible AND p.show_stats);
   maximum:=(s->>'hpMax')::int;newhp:=(s->>'hp')::int;temp:=coalesce((s->>'tmp')::int,0);successes:=coalesce((s#>>'{ds,0}')::int,0);failures:=coalesce((s#>>'{ds,1}')::int,0);
   entry:=jsonb_build_object('target',p.id,'name',s->>'name','before_hp',newhp);
   can_act:=e.status='active' AND room.status='active' AND e.current_id=p.id AND newhp>0 AND failures<3 AND NOT coalesce(s->'conditions','[]'::jsonb)?|ARRAY['Bewusstlos','Betäubt','Gelähmt','Handlungsunfähig'];
   IF p_action='visibility' THEN
    IF p.char_key IS NOT NULL THEN RAISE EXCEPTION 'Spieler bleiben sichtbar'; END IF;
    UPDATE game_private.combatants SET visible=coalesce((p_payload->>'visible')::boolean,false),show_stats=coalesce((p_payload->>'show_stats')::boolean,false) WHERE id=p.id;is_public:=p.visible OR coalesce((p_payload->>'visible')::boolean,false);entry:='{}';
   ELSIF p_action='exclude' THEN
    IF e.current_id=p.id THEN RAISE EXCEPTION 'Aktuellen Zug zuerst wechseln'; END IF;
    UPDATE game_private.combatants SET enabled=NOT enabled WHERE id=p.id;is_public:=p.visible OR p.char_key IS NOT NULL;entry:='{}';
   ELSIF p_action IN ('damage','heal','temp') THEN
    num:=(p_payload->>'amount')::int;IF num IS NULL OR num>9999 OR num<(CASE WHEN p_action='temp' AND coalesce((p_payload->>'replace')::boolean,false) THEN 0 ELSE 1 END) THEN RAISE EXCEPTION 'Ganze Menge 1–9999 erforderlich'; END IF;
    IF p_action='damage' THEN
     remaining:=greatest(0,num-temp);temp:=greatest(0,temp-num);
     IF newhp=0 THEN successes:=0;failures:=least(3,failures+CASE WHEN coalesce((p_payload->>'critical')::boolean,false) THEN 2 ELSE 1 END); END IF;
     IF remaining>=newhp+maximum THEN failures:=3;successes:=0; END IF;
     newhp:=greatest(0,newhp-remaining);
     IF coalesce(s->>'concentration','')<>'' THEN
      UPDATE game_private.combatants SET concentration_dc=CASE WHEN newhp=0 THEN 0 ELSE greatest(10,num/2) END WHERE id=p.id;
      result:=result||jsonb_build_object('concentration_dc',CASE WHEN newhp=0 THEN 0 ELSE greatest(10,num/2) END);
      IF newhp=0 THEN s:=s||jsonb_build_object('concentration',''); END IF;
     END IF;
    ELSIF p_action='heal' THEN
     IF failures>=3 THEN RAISE EXCEPTION 'Tot: Spielleitung muss Wiederbelebung entscheiden'; END IF;
     newhp:=least(maximum,newhp+num);successes:=0;failures:=0;
    ELSE temp:=CASE WHEN coalesce((p_payload->>'replace')::boolean,false) THEN num ELSE greatest(temp,num) END; END IF;
    s:=s||jsonb_build_object('hp',newhp,'tmp',temp,'ds',jsonb_build_array(successes,failures));
   ELSIF p_action='condition' THEN
    value:=p_payload->>'value';IF value IS NULL OR value NOT IN ('Blind','Bezaubert','Betäubt','Bewusstlos','Erschöpft','Festgesetzt','Gepackt','Gelähmt','Liegend','Unsichtbar','Verängstigt','Vergiftet','Handlungsunfähig') THEN RAISE EXCEPTION 'Ungültiger Zustand'; END IF;
    IF coalesce((p_payload->>'remove')::boolean,false) THEN s:=jsonb_set(s,'{conditions}',coalesce(s->'conditions','[]'::jsonb)-value);
    ELSIF NOT coalesce(s->'conditions','[]'::jsonb)?value THEN s:=jsonb_set(s,'{conditions}',coalesce(s->'conditions','[]'::jsonb)||jsonb_build_array(value)); END IF;
    IF value IN ('Betäubt','Bewusstlos','Gelähmt','Handlungsunfähig') AND NOT coalesce((p_payload->>'remove')::boolean,false) THEN s:=s||jsonb_build_object('concentration',''); END IF;
   ELSIF p_action='concentration' THEN
    value:=coalesce(p_payload->>'value','');IF length(value)>120 OR (value<>'' AND (newhp=0 OR failures>=3)) THEN RAISE EXCEPTION 'Konzentration nicht möglich'; END IF;
    s:=s||jsonb_build_object('concentration',value);UPDATE game_private.combatants SET concentration_dc=0 WHERE id=p.id;
   ELSIF p_action='effect' THEN
    value:=trim(p_payload->>'value');IF value IS NULL OR length(value) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Effekt 1–80 Zeichen'; END IF;
    IF coalesce((p_payload->>'remove')::boolean,false) THEN s:=jsonb_set(s,'{effects}',coalesce(s->'effects','[]'::jsonb)-value);
    ELSIF NOT coalesce(s->'effects','[]'::jsonb)?value THEN
     IF jsonb_array_length(coalesce(s->'effects','[]'::jsonb))>=12 THEN RAISE EXCEPTION 'Maximal 12 Effekte'; END IF;
     s:=jsonb_set(s,'{effects}',coalesce(s->'effects','[]'::jsonb)||jsonb_build_array(value));
    END IF;
   ELSIF p_action='death.roll' THEN
    IF newhp<>0 OR failures>=3 OR successes>=3 OR (a<>'gm' AND e.current_id<>p.id) THEN RAISE EXCEPTION 'Kein Todesrettungswurf verfügbar'; END IF;
    result:=public.dnd_roll(CASE WHEN a='gm' THEN 'gm' ELSE a END,p_token,'1d20','Todesrettungswurf · '||left(s->>'name',65),CASE WHEN e.status<>'preparing' AND (p.char_key IS NOT NULL OR (p.visible AND p.show_stats)) THEN 'public' ELSE 'gm' END,gen_random_uuid(),0::smallint);die:=(result->>'total')::int;
    s:=s||game_private.combat_death_result(die,successes,failures);
   ELSIF p_action='death.set' THEN
    successes:=(p_payload->>'successes')::int;failures:=(p_payload->>'failures')::int;
    IF successes IS NULL OR failures IS NULL OR successes NOT BETWEEN 0 AND 3 OR failures NOT BETWEEN 0 AND 3 THEN RAISE EXCEPTION 'Zähler 0–3 erforderlich'; END IF;
    s:=s||jsonb_build_object('ds',jsonb_build_array(successes,failures));
   ELSIF p_action='revive' THEN s:=s||jsonb_build_object('hp',1,'ds',jsonb_build_array(0,0),'concentration','');
   ELSIF p_action='budget' THEN
    kind:=p_payload->>'slot';flag:=coalesce((p_payload->>'used')::boolean,true);
    IF kind NOT IN ('action','bonus','reaction') OR kind IS NULL OR (a<>'gm' AND (NOT flag OR (kind<>'reaction' AND NOT can_act) OR (kind='reaction' AND (newhp=0 OR failures>=3 OR coalesce(s->'conditions','[]'::jsonb)?|ARRAY['Bewusstlos','Betäubt','Gelähmt','Handlungsunfähig'])))) THEN RAISE EXCEPTION 'Aktion momentan nicht verfügbar'; END IF;
    IF flag AND (CASE kind WHEN 'action' THEN p.action_used WHEN 'bonus' THEN p.bonus_used ELSE p.reaction_used END) THEN RAISE EXCEPTION 'Bereits verwendet'; END IF;
    UPDATE game_private.combatants SET action_used=CASE WHEN kind='action' THEN flag ELSE action_used END,bonus_used=CASE WHEN kind='bonus' THEN flag ELSE bonus_used END,reaction_used=CASE WHEN kind='reaction' THEN flag ELSE reaction_used END WHERE id=p.id;
   ELSIF p_action='movement' THEN
    num:=(p_payload->>'amount')::int;maximum:=coalesce(substring(s->>'speed' from '^([0-9]+)')::int,0)+p.movement_extra;
    IF num IS NULL OR num NOT BETWEEN 1 AND 1000 OR p.movement_used+num>maximum OR (a<>'gm' AND (NOT can_act OR coalesce(s->'conditions','[]'::jsonb)?|ARRAY['Gepackt','Festgesetzt'])) THEN RAISE EXCEPTION 'Bewegung momentan nicht verfügbar'; END IF;
    UPDATE game_private.combatants SET movement_used=movement_used+num WHERE id=p.id;
   ELSIF p_action='movement.limit' THEN
    UPDATE game_private.combatants SET movement_extra=(p_payload->>'amount')::int WHERE id=p.id;
   ELSIF p_action='resource.use' THEN
    IF p.char_key IS NULL THEN RAISE EXCEPTION 'Nur Charakterressourcen'; END IF;
    kind:=p_payload->>'kind';idx:=(p_payload->>'index')::int;
    IF kind IS NULL OR kind NOT IN ('slU','rsU') OR idx IS NULL OR idx NOT BETWEEN 0 AND 99 THEN RAISE EXCEPTION 'Ungültige Ressource'; END IF;
    SELECT split_part(line,'|',2) INTO value FROM (SELECT line,row_number()OVER(ORDER BY n) position FROM regexp_split_to_table(coalesce(s->>CASE kind WHEN 'slU' THEN 'sl' ELSE 'rs' END,''),E'\n') WITH ORDINALITY AS t(line,n) WHERE line!~'^[[:space:]]*$') rows WHERE position=idx+1;
    IF value IS NULL OR trim(value)!~'^[0-9]{1,2}$' THEN RAISE EXCEPTION 'Ressource nicht definiert'; END IF;
    maximum:=trim(value)::int;IF jsonb_typeof(s->kind) IS DISTINCT FROM 'object' THEN s:=jsonb_set(s,ARRAY[kind],'{}'::jsonb); END IF;v:=game_private.combat_int(s->kind->idx::text,0,0,99);
    IF v>=maximum THEN RAISE EXCEPTION 'Ressource aufgebraucht'; END IF;
    s:=jsonb_set(s,ARRAY[kind],coalesce(s->kind,'{}'::jsonb)||jsonb_build_object(idx::text,v+1));
   END IF;
   IF p_action IN ('damage','heal','temp','condition','concentration','effect','death.roll','death.set','revive','resource.use') THEN
    IF p.char_key IS NOT NULL THEN
     UPDATE public.character_slots SET sheet=sheet||jsonb_build_object('hp',s->'hp','tmp',s->'tmp','ds',s->'ds','conditions',coalesce(s->'conditions','[]'::jsonb),'status',coalesce((SELECT string_agg(x,', ') FROM jsonb_array_elements_text(coalesce(s->'conditions','[]'::jsonb))x),'bereit'),'concentration',coalesce(s->>'concentration',''),'effects',coalesce(s->'effects','[]'::jsonb),'rsU',coalesce(s->'rsU','{}'::jsonb),'slU',coalesce(s->'slU','{}'::jsonb)) WHERE char_key=p.char_key;
    ELSE UPDATE game_private.combatants SET hp=(s->>'hp')::int,temp_hp=(s->>'tmp')::int,death_s=coalesce((s#>>'{ds,0}')::int,0),death_f=coalesce((s#>>'{ds,1}')::int,0),conditions=coalesce(s->'conditions','[]'::jsonb),concentration=coalesce(s->>'concentration',''),effects=coalesce(s->'effects','[]'::jsonb) WHERE id=p.id;END IF;
   END IF;
   entry:=entry||jsonb_build_object('hp',s->'hp','tmp',s->'tmp','ds',s->'ds');
  END IF;
 END IF;
 -- Preparation and hidden changes never advance a player's public combat version.
 SELECT * INTO e FROM game_private.encounters WHERE id=e.id;
 is_public:=is_public AND e.status<>'preparing';
 UPDATE game_private.encounters SET version=version+1,public_version=public_version+CASE WHEN is_public THEN 1 ELSE 0 END WHERE id=e.id;
 INSERT INTO game_private.combat_log(encounter_id,actor_key,action,owner_only,payload) VALUES(e.id,a,p_action,NOT is_public,entry);
 PERFORM game_private.sync_emit(CASE WHEN p_action='next' THEN 'InitiativeAdvanced' ELSE 'CombatChanged' END,jsonb_build_object('encounter_id',e.id),NOT is_public);
 result:=jsonb_build_object('id',e.id,'confirmed',true,'result',result);
 DELETE FROM game_private.combat_commands WHERE created_at<now()-interval '24 hours';
 IF (SELECT count(*) FROM game_private.combat_commands WHERE actor_key=a)>=10000 THEN RAISE EXCEPTION 'Tageskontingent erreicht'; END IF;
 INSERT INTO game_private.combat_commands(request_id,actor_key,action,payload_hash,result) VALUES(req,a,p_action,hash,result);
 RETURN result;
END;$$;

NOTIFY pgrst,'reload schema';
COMMIT;
