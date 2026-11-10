-- Additive campaign workspace. Existing API definitions, codes and sheets are preserved.
BEGIN;
CREATE TABLE game_private.campaigns(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=6000),version bigint NOT NULL DEFAULT 1,
 legacy boolean NOT NULL DEFAULT false,archived boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX campaign_legacy ON game_private.campaigns(legacy) WHERE legacy;
INSERT INTO game_private.campaigns(title,legacy) VALUES('Bestehende Kampagne',true);
CREATE TABLE game_private.campaign_sessions(session_id uuid PRIMARY KEY,campaign_id uuid NOT NULL REFERENCES game_private.campaigns(id));
CREATE INDEX campaign_sessions_campaign ON game_private.campaign_sessions(campaign_id);
INSERT INTO game_private.campaign_sessions SELECT session_id,c.id FROM public.dnd_room CROSS JOIN game_private.campaigns c WHERE c.legacy;
INSERT INTO game_private.campaign_sessions SELECT a.session_id,c.id FROM game_private.session_archives a CROSS JOIN game_private.campaigns c WHERE c.legacy ON CONFLICT DO NOTHING;
CREATE TABLE game_private.campaign_records(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),campaign_id uuid NOT NULL REFERENCES game_private.campaigns(id),
 kind text NOT NULL CHECK(kind IN ('npc','quest','journal','node','edge','statblock','encounter')),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 100),body text NOT NULL DEFAULT '' CHECK(length(body)<=6000),
 private_notes text NOT NULL DEFAULT '' CHECK(length(private_notes)<=12000),data jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(data)='object' AND octet_length(data::text)<=24000),
 published jsonb CHECK(jsonb_typeof(published)='object'),version bigint NOT NULL DEFAULT 1,updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX campaign_records_campaign ON game_private.campaign_records(campaign_id,kind);
CREATE TABLE game_private.campaign_resources(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),campaign_id uuid NOT NULL REFERENCES game_private.campaigns(id),
 encounter_id uuid UNIQUE REFERENCES game_private.encounters(id) ON DELETE CASCADE,
 map_id uuid UNIQUE REFERENCES game_private.vtt_maps(id) ON DELETE CASCADE,
 plan_id uuid UNIQUE REFERENCES game_private.session_plans(id) ON DELETE CASCADE,
 CHECK(num_nonnulls(encounter_id,map_id,plan_id)=1));
CREATE INDEX campaign_resources_campaign ON game_private.campaign_resources(campaign_id);
INSERT INTO game_private.campaign_resources(campaign_id,encounter_id) SELECT c.id,e.id FROM game_private.campaigns c CROSS JOIN game_private.encounters e WHERE c.legacy;
INSERT INTO game_private.campaign_resources(campaign_id,map_id) SELECT c.id,m.id FROM game_private.campaigns c CROSS JOIN game_private.vtt_maps m WHERE c.legacy;
INSERT INTO game_private.campaign_resources(campaign_id,plan_id) SELECT c.id,p.id FROM game_private.campaigns c CROSS JOIN game_private.session_plans p WHERE c.legacy;
CREATE TABLE game_private.campaign_commands(request_id uuid PRIMARY KEY,actor_key text NOT NULL,action text NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX campaign_commands_created ON game_private.campaign_commands(created_at);
ALTER TABLE game_private.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.campaign_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.campaign_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.campaign_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.campaign_commands ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON game_private.campaigns,game_private.campaign_sessions,game_private.campaign_records,game_private.campaign_resources,game_private.campaign_commands FROM PUBLIC,anon,authenticated;

CREATE FUNCTION game_private.campaign_session_bind() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cid uuid;
BEGIN
 IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN
  cid:=nullif(current_setting('dnd.campaign_id',true),'')::uuid;
  IF cid IS NULL THEN SELECT id INTO cid FROM game_private.campaigns WHERE legacy; END IF;
  IF NOT EXISTS(SELECT 1 FROM game_private.campaigns WHERE id=cid AND NOT archived) THEN RAISE EXCEPTION 'Kampagne ist archiviert'; END IF;
  INSERT INTO game_private.campaign_sessions VALUES(NEW.session_id,cid);
 END IF;RETURN NEW;
END;$$;
CREATE TRIGGER campaign_session_bind AFTER UPDATE ON public.dnd_room FOR EACH ROW EXECUTE FUNCTION game_private.campaign_session_bind();
CREATE FUNCTION game_private.campaign_resource_bind() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cid uuid;
BEGIN
 cid:=nullif(current_setting('dnd.campaign_id',true),'')::uuid;
 IF cid IS NULL THEN SELECT c.campaign_id INTO cid FROM game_private.campaign_sessions c JOIN public.dnd_room r ON r.session_id=c.session_id WHERE r.id=1; END IF;
 IF cid IS NULL THEN SELECT id INTO cid FROM game_private.campaigns WHERE legacy; END IF;
 INSERT INTO game_private.campaign_resources(campaign_id,encounter_id,map_id,plan_id) VALUES(cid,CASE WHEN TG_TABLE_NAME='encounters' THEN NEW.id END,CASE WHEN TG_TABLE_NAME='vtt_maps' THEN NEW.id END,CASE WHEN TG_TABLE_NAME='session_plans' THEN NEW.id END);
 RETURN NEW;
END;$$;
CREATE TRIGGER campaign_encounter_bind AFTER INSERT ON game_private.encounters FOR EACH ROW EXECUTE FUNCTION game_private.campaign_resource_bind();
CREATE TRIGGER campaign_map_bind AFTER INSERT ON game_private.vtt_maps FOR EACH ROW EXECUTE FUNCTION game_private.campaign_resource_bind();
CREATE TRIGGER campaign_plan_bind AFTER INSERT ON game_private.session_plans FOR EACH ROW EXECUTE FUNCTION game_private.campaign_resource_bind();

-- Existing clients retain their APIs; their activation/publication must respect campaign ownership.
CREATE FUNCTION game_private.campaign_live_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE expected uuid;actual uuid;
BEGIN
 IF TG_TABLE_NAME='encounters' THEN
  IF NEW.status NOT IN ('active','paused') THEN RETURN NEW; END IF;
  SELECT campaign_id INTO actual FROM game_private.campaign_resources WHERE encounter_id=NEW.id;
  SELECT campaign_id INTO expected FROM game_private.campaign_sessions WHERE session_id=NEW.session_id;
 ELSIF TG_TABLE_NAME='session_plans' THEN
  IF NEW.status<>'live' THEN RETURN NEW; END IF;
  SELECT campaign_id INTO actual FROM game_private.campaign_resources WHERE plan_id=NEW.id;
  SELECT campaign_id INTO expected FROM game_private.campaign_sessions WHERE session_id=NEW.game_session_id;
 ELSIF TG_TABLE_NAME='vtt_maps' THEN
  IF NEW.encounter_id IS NULL THEN RETURN NEW; END IF;
  SELECT campaign_id INTO actual FROM game_private.campaign_resources WHERE map_id=NEW.id;
  SELECT campaign_id INTO expected FROM game_private.campaign_resources WHERE encounter_id=NEW.encounter_id;
 ELSE
  IF NEW.map_id IS NULL THEN RETURN NEW; END IF;
  SELECT campaign_id INTO actual FROM game_private.campaign_resources WHERE map_id=NEW.map_id;
  SELECT campaign_id INTO expected FROM game_private.campaign_sessions WHERE session_id=NEW.session_id;
 END IF;
 IF actual IS NULL OR expected IS NULL OR actual<>expected THEN RAISE EXCEPTION 'Vorbereitung gehört zu anderer Kampagne'; END IF;
 RETURN NEW;
END;$$;
CREATE TRIGGER campaign_combat_guard BEFORE UPDATE ON game_private.encounters FOR EACH ROW EXECUTE FUNCTION game_private.campaign_live_guard();
CREATE TRIGGER campaign_plan_guard BEFORE UPDATE ON game_private.session_plans FOR EACH ROW EXECUTE FUNCTION game_private.campaign_live_guard();
CREATE TRIGGER campaign_map_guard BEFORE UPDATE ON game_private.vtt_maps FOR EACH ROW EXECUTE FUNCTION game_private.campaign_live_guard();
CREATE TRIGGER campaign_publication_guard BEFORE UPDATE ON game_private.vtt_state FOR EACH ROW EXECUTE FUNCTION game_private.campaign_live_guard();
REVOKE ALL ON FUNCTION game_private.campaign_live_guard() FROM PUBLIC,anon,authenticated;

-- One projection per authority. Player-supplied campaign IDs are deliberately ignored.
CREATE FUNCTION game_private.campaign_snapshot(a text,cid uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE campaign jsonb;records jsonb;resources jsonb:='[]';library jsonb:='[]';active uuid;
BEGIN
 SELECT s.campaign_id INTO active FROM game_private.campaign_sessions s JOIN public.dnd_room r USING(session_id) WHERE r.id=1;
 IF a='gm' THEN
  cid:=coalesce(cid,active);
  SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.created_at,c.id),'[]') INTO library FROM game_private.campaigns c;
  SELECT to_jsonb(c) INTO campaign FROM game_private.campaigns c WHERE c.id=cid;
  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.kind,r.updated_at,r.id),'[]') INTO records FROM game_private.campaign_records r WHERE r.campaign_id=cid;
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO resources FROM (
   SELECT r.id,r.encounter_id,r.map_id,r.plan_id,coalesce(e.title,m.title,p.title) title,e.status encounter_status FROM game_private.campaign_resources r
   LEFT JOIN game_private.encounters e ON e.id=r.encounter_id LEFT JOIN game_private.vtt_maps m ON m.id=r.map_id LEFT JOIN game_private.session_plans p ON p.id=r.plan_id WHERE r.campaign_id=cid)x;
 ELSE
  cid:=active;
  SELECT jsonb_build_object('id',c.id,'title',c.title) INTO campaign FROM game_private.campaigns c WHERE c.id=cid;
  SELECT coalesce(jsonb_agg(r.published ORDER BY r.kind,r.id),'[]') INTO records FROM game_private.campaign_records r WHERE r.campaign_id=cid AND r.published IS NOT NULL
  AND (r.kind<>'edge' OR (EXISTS(SELECT 1 FROM game_private.campaign_records n WHERE n.id=(r.published->>'from')::uuid AND n.campaign_id=cid AND n.published IS NOT NULL)
   AND EXISTS(SELECT 1 FROM game_private.campaign_records n WHERE n.id=(r.published->>'to')::uuid AND n.campaign_id=cid AND n.published IS NOT NULL)));
 END IF;
 RETURN jsonb_build_object('campaign',campaign,'records',coalesce(records,'[]'),'campaigns',library,'resources',resources,'active_campaign_id',active);
END;$$;
CREATE FUNCTION public.dnd_campaign_call(p_token text,p_action text,p_payload jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE identity jsonb;a text;cid uuid;req uuid;h text;receipt game_private.campaign_commands%rowtype;c game_private.campaigns%rowtype;r game_private.campaign_records%rowtype;t game_private.campaign_records%rowtype;
 result jsonb;d jsonb;v jsonb;entry jsonb;item jsonb;eid uuid;pid uuid;resource game_private.campaign_resources%rowtype;n int;total int:=0;ver bigint;room public.dnd_room%rowtype;previous_setting text;
BEGIN
 identity:=game_private.dnd_session_identity(p_token);IF identity IS NULL THEN RAISE EXCEPTION 'Sitzung abgelaufen' USING ERRCODE='28000'; END IF;a:=identity->>'actor';
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>50000 THEN RAISE EXCEPTION 'Ungültige Anfrage'; END IF;
 IF p_action='snapshot' THEN RETURN game_private.campaign_snapshot(a,CASE WHEN a='gm' THEN (p_payload->>'campaign_id')::uuid ELSE NULL END); END IF;
 IF a<>'gm' THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
 IF p_action IS NULL OR p_action NOT IN ('campaign.save','record.save','record.publish','record.withdraw','session.start','resource.assign','encounter.build') THEN RAISE EXCEPTION 'Unbekannte Kampagnenaktion'; END IF;
 req:=(p_payload->>'request_id')::uuid;IF req IS NULL THEN RAISE EXCEPTION 'Request-ID erforderlich'; END IF;
 h:=encode(extensions.digest((p_payload-'request_id')::text,'sha256'),'hex');
 PERFORM 1 FROM game_private.session_workspace WHERE id=1 FOR UPDATE;
 SELECT * INTO receipt FROM game_private.campaign_commands WHERE request_id=req;
 IF FOUND THEN IF receipt.actor_key<>a OR receipt.action<>p_action OR receipt.payload_hash<>h THEN RAISE EXCEPTION 'Request-ID bereits verwendet'; END IF;RETURN receipt.result; END IF;
 cid:=(p_payload->>'campaign_id')::uuid;
 SELECT * INTO c FROM game_private.campaigns WHERE id=cid FOR UPDATE;
 IF c.id IS NULL AND NOT(p_action='campaign.save' AND cid IS NULL) THEN RAISE EXCEPTION 'Kampagne nicht gefunden'; END IF;
 IF p_action='campaign.save' THEN
  IF cid IS NULL THEN
   IF (SELECT count(*) FROM game_private.campaigns)>=50 THEN RAISE EXCEPTION 'Maximal 50 Kampagnen'; END IF;
   INSERT INTO game_private.campaigns(title,description) VALUES(trim(p_payload->>'title'),coalesce(p_payload->>'description','')) RETURNING * INTO c;
  ELSE
   UPDATE game_private.campaigns SET title=trim(p_payload->>'title'),description=coalesce(p_payload->>'description',''),archived=coalesce((p_payload->>'archived')::boolean,false),version=version+1 WHERE id=cid AND version=(p_payload->>'version')::bigint RETURNING * INTO c;
   IF NOT FOUND THEN RAISE EXCEPTION 'Versionskonflikt: Kampagne erneut laden' USING ERRCODE='40001'; END IF;
   IF c.archived AND EXISTS(SELECT 1 FROM game_private.campaign_sessions s JOIN public.dnd_room live_room USING(session_id) WHERE s.campaign_id=cid AND live_room.status IN ('active','paused')) THEN RAISE EXCEPTION 'Laufende Kampagne zuerst beenden'; END IF;
  END IF; result:=to_jsonb(c);
 ELSE
  IF c.archived THEN RAISE EXCEPTION 'Kampagne ist archiviert'; END IF;
  IF p_action='record.save' THEN
   d:=coalesce(p_payload->'data','{}');
   IF jsonb_typeof(d)<>'object' THEN RAISE EXCEPTION 'Ungültige Felder'; END IF;
   IF p_payload->>'kind'='quest' THEN
    IF coalesce(d->>'status','open') NOT IN ('open','active','completed','failed') THEN RAISE EXCEPTION 'Ungültiger Queststatus'; END IF;
    d:=jsonb_build_object('status',coalesce(d->>'status','open'),'objectives',left(coalesce(d->>'objectives',''),6000),'reward',left(coalesce(d->>'reward',''),2000));
   ELSIF p_payload->>'kind'='statblock' THEN
    IF coalesce(d->>'hp','')!~'^[0-9]{1,4}$' OR coalesce(d->>'ac','')!~'^[0-9]{1,3}$' OR coalesce(d->>'xp','')!~'^[0-9]{1,7}$' OR (d->>'hp')::int NOT BETWEEN 1 AND 9999 OR (d->>'ac')::int NOT BETWEEN 0 AND 100 OR (d->>'xp')::int NOT BETWEEN 0 AND 1000000 THEN RAISE EXCEPTION 'Ungültiger Statblock'; END IF;
    d:=jsonb_build_object('hp',(d->>'hp')::int,'ac',(d->>'ac')::int,'xp',(d->>'xp')::int,'dex',game_private.combat_int(d->'dex',10,1,30),'init_bonus',game_private.combat_int(d->'init_bonus',0,-100,100),'speed',game_private.combat_int(d->'speed',30,0,1000),'actions',left(coalesce(d->>'actions',''),6000));
   ELSIF p_payload->>'kind'='encounter' THEN
    IF jsonb_typeof(d->'members') IS DISTINCT FROM 'array' OR jsonb_array_length(d->'members')>46 THEN RAISE EXCEPTION 'Gegnerliste erforderlich'; END IF;
    FOR item IN SELECT * FROM jsonb_array_elements(d->'members') LOOP
     IF jsonb_typeof(item)<>'object' OR coalesce(item->>'count','')!~'^[0-9]{1,2}$' THEN RAISE EXCEPTION 'Ungültige Anzahl'; END IF;
     n:=(item->>'count')::int;total:=total+n;
     IF n NOT BETWEEN 1 AND 46 OR NOT EXISTS(SELECT 1 FROM game_private.campaign_records WHERE id=(item->>'template_id')::uuid AND campaign_id=cid AND kind='statblock') THEN RAISE EXCEPTION 'Statblock derselben Kampagne erforderlich'; END IF;
    END LOOP;
    IF total>46 THEN RAISE EXCEPTION 'Maximal 46 Gegner'; END IF;
    IF jsonb_typeof(d->'levels') IS DISTINCT FROM 'array' OR jsonb_array_length(d->'levels') NOT BETWEEN 1 AND 12 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'levels') l WHERE l!~'^[0-9]{1,2}$' OR l::int NOT BETWEEN 1 AND 20) THEN RAISE EXCEPTION 'Gruppenstufen 1–20 erforderlich'; END IF;
    d:=jsonb_build_object('members',d->'members','levels',d->'levels','loot',left(coalesce(d->>'loot',''),6000),'difficulty_note',left(coalesce(d->>'difficulty_note',''),1000));
   ELSIF p_payload->>'kind'='edge' THEN
    IF NOT EXISTS(SELECT 1 FROM game_private.campaign_records WHERE id=(d->>'from')::uuid AND campaign_id=cid AND kind='node') OR NOT EXISTS(SELECT 1 FROM game_private.campaign_records WHERE id=(d->>'to')::uuid AND campaign_id=cid AND kind='node') THEN RAISE EXCEPTION 'Story-Knoten derselben Kampagne erforderlich'; END IF;
    d:=jsonb_build_object('from',(d->>'from')::uuid,'to',(d->>'to')::uuid);
   ELSE d:='{}'; END IF;
   pid:=nullif(p_payload->>'id','')::uuid;
   IF pid IS NULL THEN
    IF (SELECT count(*) FROM game_private.campaign_records WHERE campaign_id=cid)>=1000 THEN RAISE EXCEPTION 'Maximal 1000 Einträge je Kampagne'; END IF;
    INSERT INTO game_private.campaign_records(campaign_id,kind,title,body,private_notes,data) VALUES(cid,p_payload->>'kind',trim(p_payload->>'title'),coalesce(p_payload->>'body',''),coalesce(p_payload->>'private_notes',''),d) RETURNING * INTO r;
   ELSE
    UPDATE game_private.campaign_records SET title=trim(p_payload->>'title'),body=coalesce(p_payload->>'body',''),private_notes=coalesce(p_payload->>'private_notes',''),data=d,version=version+1,updated_at=clock_timestamp() WHERE id=pid AND campaign_id=cid AND kind=p_payload->>'kind' AND version=(p_payload->>'version')::bigint RETURNING * INTO r;
    IF NOT FOUND THEN RAISE EXCEPTION 'Versionskonflikt: Eintrag erneut laden; Entwurf bleibt erhalten' USING ERRCODE='40001'; END IF;
   END IF;result:=to_jsonb(r);
  ELSIF p_action IN ('record.publish','record.withdraw','encounter.build') THEN
   SELECT * INTO r FROM game_private.campaign_records WHERE id=(p_payload->>'id')::uuid AND campaign_id=cid FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Eintrag nicht gefunden'; END IF;
   IF r.version IS DISTINCT FROM (p_payload->>'version')::bigint THEN RAISE EXCEPTION 'Versionskonflikt: Eintrag erneut laden' USING ERRCODE='40001'; END IF;
   IF p_action='record.publish' THEN
    IF r.kind IN ('statblock','encounter') THEN RAISE EXCEPTION 'Planung bleibt privat'; END IF;
    v:=jsonb_build_object('id',r.id,'kind',r.kind,'title',r.title,'body',r.body);
    IF r.kind='quest' THEN v:=v||r.data; ELSIF r.kind='edge' THEN v:=v||r.data; END IF;
    UPDATE game_private.campaign_records SET published=v,version=version+1 WHERE id=r.id RETURNING * INTO r;
    PERFORM game_private.sync_emit('CampaignChanged','{}',false);result:=to_jsonb(r);
   ELSIF p_action='record.withdraw' THEN
    UPDATE game_private.campaign_records SET published=NULL,version=version+1 WHERE id=r.id RETURNING * INTO r;
    PERFORM game_private.sync_emit('CampaignChanged','{}',false);result:=to_jsonb(r);
   ELSE
    IF r.kind<>'encounter' THEN RAISE EXCEPTION 'Encounter-Plan erforderlich'; END IF;
    SELECT * INTO room FROM public.dnd_room WHERE id=1;
    previous_setting:=current_setting('dnd.campaign_id',true);PERFORM set_config('dnd.campaign_id',cid::text,true);
    result:=public.dnd_combat_call(p_token,'create',jsonb_build_object('title',r.title,'request_id',gen_random_uuid(),'session_id',room.session_id));eid:=(result->>'id')::uuid;
    FOR item IN SELECT * FROM jsonb_array_elements(r.data->'members') LOOP
     SELECT * INTO t FROM game_private.campaign_records WHERE id=(item->>'template_id')::uuid AND campaign_id=cid AND kind='statblock';
     IF NOT FOUND THEN RAISE EXCEPTION 'Statblock nicht gefunden'; END IF;
     FOR n IN 1..(item->>'count')::int LOOP
      SELECT version INTO ver FROM game_private.encounters WHERE id=eid;
      PERFORM public.dnd_combat_call(p_token,'npc.add',t.data||jsonb_build_object('name',t.title,'id',eid,'version',ver,'request_id',gen_random_uuid(),'session_id',room.session_id,'visible',false));
      -- Existing optional template reference; actual HP stays exclusively in combatants.
      UPDATE game_private.combatants SET npc_template_id=t.id WHERE encounter_id=eid AND char_key IS NULL AND npc_template_id IS NULL;
     END LOOP;
    END LOOP;
    PERFORM set_config('dnd.campaign_id',coalesce(previous_setting,''),true);
    result:=jsonb_build_object('id',eid);
   END IF;
  ELSIF p_action='session.start' THEN
   -- A fresh room session is the only campaign switch. No changing a running binding.
   previous_setting:=current_setting('dnd.campaign_id',true);PERFORM set_config('dnd.campaign_id',cid::text,true);
   IF p_payload->>'plan_id' IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM game_private.campaign_resources WHERE campaign_id=cid AND plan_id=(p_payload->>'plan_id')::uuid) THEN RAISE EXCEPTION 'Plan gehört zu anderer Kampagne'; END IF;
    result:=public.dnd_workspace_call(p_token,'session.start',jsonb_build_object('id',p_payload->>'plan_id','version',p_payload->'plan_version','request_id',gen_random_uuid()));
   ELSE result:=public.dnd_workspace_call(p_token,'session.quickstart',jsonb_build_object('title',coalesce(p_payload->>'title',c.title),'request_id',gen_random_uuid())); END IF;
   PERFORM set_config('dnd.campaign_id',coalesce(previous_setting,''),true);
  ELSIF p_action='resource.assign' THEN
   SELECT * INTO resource FROM game_private.campaign_resources WHERE id=(p_payload->>'id')::uuid FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Ressource nicht gefunden'; END IF;
   IF resource.campaign_id IS DISTINCT FROM (p_payload->>'source_campaign_id')::uuid THEN RAISE EXCEPTION 'Versionskonflikt: Zuordnung geändert' USING ERRCODE='40001'; END IF;
   IF EXISTS(SELECT 1 FROM game_private.encounters WHERE id=resource.encounter_id AND status IN ('active','paused')) OR EXISTS(SELECT 1 FROM game_private.vtt_state WHERE map_id=resource.map_id) OR EXISTS(SELECT 1 FROM game_private.session_plans WHERE id=resource.plan_id AND status<>'planned') THEN RAISE EXCEPTION 'Nur ungenutzte Vorbereitungen zuordnen'; END IF;
   -- A map and its encounter must remain together; linked resources cannot be reassigned separately.
   IF EXISTS(SELECT 1 FROM game_private.vtt_maps WHERE id=resource.map_id AND encounter_id IS NOT NULL) OR EXISTS(SELECT 1 FROM game_private.vtt_maps WHERE encounter_id=resource.encounter_id) THEN RAISE EXCEPTION 'Kartenverknüpfung zuerst lösen'; END IF;
   UPDATE game_private.campaign_resources SET campaign_id=cid WHERE id=resource.id;result:=jsonb_build_object('confirmed',true);
  END IF;
 END IF;
 PERFORM game_private.sync_emit('CampaignChanged','{}',true);
 DELETE FROM game_private.campaign_commands WHERE created_at<now()-interval '24 hours';
 IF (SELECT count(*) FROM game_private.campaign_commands)>=10000 THEN RAISE EXCEPTION 'Tageskontingent erreicht'; END IF;
 INSERT INTO game_private.campaign_commands VALUES(req,a,p_action,h,result,now());RETURN result;
END;$$;
REVOKE ALL ON FUNCTION game_private.campaign_session_bind(),game_private.campaign_resource_bind(),game_private.campaign_snapshot(text,uuid),public.dnd_campaign_call(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dnd_campaign_call(text,text,jsonb) TO anon;
NOTIFY pgrst,'reload schema';
COMMIT;
