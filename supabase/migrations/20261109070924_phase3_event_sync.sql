-- Phase 3: private, ordered per-recipient delivery; CAS and idempotent commands.
-- No original rows/codes are rewritten. No Auth configuration changes required.
BEGIN;
CREATE TABLE game_private.character_versions(char_key text PRIMARY KEY REFERENCES public.character_slots(char_key),version bigint NOT NULL DEFAULT 1 CHECK(version>0));
INSERT INTO game_private.character_versions(char_key) SELECT char_key FROM public.character_slots;
CREATE TABLE game_private.sync_cursors(actor_key text PRIMARY KEY REFERENCES game_private.actor_identities(actor_key),seq bigint NOT NULL DEFAULT 0);
INSERT INTO game_private.sync_cursors(actor_key) SELECT actor_key FROM game_private.actor_identities;
CREATE TABLE game_private.sync_events(
 actor_key text NOT NULL REFERENCES game_private.actor_identities(actor_key),seq bigint NOT NULL,
 event_id uuid NOT NULL,session_id uuid NOT NULL,type text NOT NULL,payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(actor_key,seq));
CREATE TABLE game_private.sync_commands(request_id uuid PRIMARY KEY,actor_key text NOT NULL,
 action text NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX sync_commands_created ON game_private.sync_commands(created_at);
ALTER TABLE game_private.character_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.sync_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.sync_commands ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON game_private.character_versions,game_private.sync_cursors,game_private.sync_events,game_private.sync_commands FROM PUBLIC,anon,authenticated;

CREATE FUNCTION game_private.sync_emit(p_type text,p_payload jsonb,p_owner_only boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a text;s bigint;e uuid:=gen_random_uuid();room uuid;
BEGIN
 -- Commit order, not a bare sequence: cursors cannot skip an uncommitted writer.
 PERFORM pg_advisory_xact_lock(30003,1);
 SELECT session_id INTO room FROM public.dnd_room WHERE id=1;
 FOR a IN SELECT actor_key FROM game_private.sync_cursors WHERE NOT p_owner_only OR actor_key='gm' ORDER BY actor_key LOOP
  UPDATE game_private.sync_cursors SET seq=seq+1 WHERE actor_key=a RETURNING seq INTO s;
  INSERT INTO game_private.sync_events(actor_key,seq,event_id,session_id,type,payload) VALUES(a,s,e,room,p_type,p_payload);
  DELETE FROM game_private.sync_events WHERE actor_key=a AND seq<=s-5000;
 END LOOP;
END;$$;
REVOKE ALL ON FUNCTION game_private.sync_emit(text,jsonb,boolean) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION game_private.sync_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v bigint;t text;
BEGIN
 IF TG_TABLE_NAME='character_slots' THEN
  IF NEW.sheet IS NOT DISTINCT FROM OLD.sheet THEN RETURN NEW; END IF;
  UPDATE game_private.character_versions SET version=version+1 WHERE char_key=NEW.char_key RETURNING version INTO v;
  PERFORM game_private.sync_emit(CASE WHEN NEW.sheet->'hp' IS DISTINCT FROM OLD.sheet->'hp' THEN 'CharacterHPChanged' ELSE 'CharacterStateChanged' END,jsonb_build_object('key',NEW.char_key,'version',v));
 ELSIF TG_TABLE_NAME='dnd_rolls' THEN
  PERFORM game_private.sync_emit('DiceRolled',to_jsonb(NEW)-'request_id',NEW.visibility='gm');
 ELSIF TG_TABLE_NAME='dnd_room' THEN
  t:=CASE WHEN NEW.session_id IS DISTINCT FROM OLD.session_id THEN 'SessionStarted' WHEN NEW.status='ended' AND OLD.status<>'ended' THEN 'SessionEnded' WHEN NEW.status='paused' AND OLD.status<>'paused' THEN 'SessionPaused' WHEN NEW.status='active' AND OLD.status='paused' THEN 'SessionResumed' ELSE 'SessionChanged' END;
  PERFORM game_private.sync_emit(t,jsonb_build_object('session_id',NEW.session_id,'status',NEW.status),NEW.session_id=OLD.session_id AND NEW.status=OLD.status AND NEW.title=OLD.title);
 ELSIF TG_TABLE_NAME='session_workspace' THEN
  PERFORM game_private.sync_emit('ScenePublished',jsonb_build_object('version',NEW.version),NEW.scene=OLD.scene AND NEW.announcement=OLD.announcement);
 ELSIF TG_TABLE_NAME='dnd_presence' THEN
  IF TG_OP='INSERT' OR OLD.last_seen_at<now()-interval '50 seconds' OR NEW.last_seen_at<now()-interval '50 seconds' THEN
   PERFORM game_private.sync_emit('PresenceChanged',jsonb_build_object('key',NEW.actor_key));
  END IF;
 ELSE
  PERFORM game_private.sync_emit('WorkspaceChanged','{}'::jsonb,true);
 END IF;
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION game_private.sync_changed() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_character AFTER UPDATE ON public.character_slots FOR EACH ROW EXECUTE FUNCTION game_private.sync_changed();
CREATE TRIGGER sync_roll AFTER INSERT ON public.dnd_rolls FOR EACH ROW EXECUTE FUNCTION game_private.sync_changed();
CREATE TRIGGER sync_room AFTER UPDATE ON public.dnd_room FOR EACH ROW EXECUTE FUNCTION game_private.sync_changed();
CREATE TRIGGER sync_publication AFTER UPDATE ON game_private.session_workspace FOR EACH ROW EXECUTE FUNCTION game_private.sync_changed();
CREATE TRIGGER sync_presence AFTER INSERT OR UPDATE ON public.dnd_presence FOR EACH ROW EXECUTE FUNCTION game_private.sync_changed();
CREATE TRIGGER sync_plan AFTER INSERT OR UPDATE ON game_private.session_plans FOR EACH ROW EXECUTE FUNCTION game_private.sync_changed();
CREATE TRIGGER sync_archive AFTER INSERT OR UPDATE ON game_private.session_archives FOR EACH ROW EXECUTE FUNCTION game_private.sync_changed();

CREATE FUNCTION public.dnd_sync_poll(p_token text,p_cursor bigint DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE i jsonb;a text;latest bigint;floor bigint;lastseq bigint;events jsonb;reset boolean;
BEGIN
 i:=game_private.dnd_session_identity(p_token);
 IF i IS NULL THEN RAISE EXCEPTION 'Sitzung abgelaufen' USING ERRCODE='28000'; END IF;
 IF p_cursor IS NULL OR p_cursor<0 THEN RAISE EXCEPTION 'Ungültiger Cursor'; END IF;
 a:=i->>'actor';
 -- Bounded heartbeat writes, including for a character-sheet-only participant.
 IF NOT EXISTS(SELECT 1 FROM public.dnd_presence WHERE actor_key=a AND last_seen_at>now()-interval '15 seconds') THEN PERFORM public.dnd_heartbeat(a,p_token); END IF;
 -- Cursor, retention boundary and page are read in one database snapshot.
 SELECT jsonb_build_object('events',CASE WHEN p_cursor<greatest(0,c.seq-5000) OR p_cursor>c.seq THEN '[]'::jsonb ELSE b.events END,
  'cursor',CASE WHEN p_cursor<greatest(0,c.seq-5000) OR p_cursor>c.seq THEN c.seq ELSE coalesce(b.lastseq,p_cursor) END,
  'reset',p_cursor<greatest(0,c.seq-5000) OR p_cursor>c.seq,
  'more',CASE WHEN p_cursor<greatest(0,c.seq-5000) OR p_cursor>c.seq THEN false ELSE coalesce(b.lastseq,p_cursor)<c.seq END)
 INTO events FROM game_private.sync_cursors c CROSS JOIN LATERAL
 (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.seq),'[]'::jsonb) events,max(x.seq) lastseq FROM
  (SELECT seq,event_id,session_id,type,payload,created_at FROM game_private.sync_events WHERE actor_key=a AND seq>p_cursor ORDER BY seq LIMIT 100)x)b
 WHERE c.actor_key=a;
 RETURN events;
END;$$;

CREATE FUNCTION public.dnd_sync_call(p_token text,p_action text,p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE i jsonb;a text;k text;result jsonb;v_sheet jsonb;v bigint;req uuid;h text;cached game_private.sync_commands%rowtype;col text;room uuid;
BEGIN
 i:=game_private.dnd_session_identity(p_token);
 IF i IS NULL THEN RAISE EXCEPTION 'Sitzung abgelaufen' USING ERRCODE='28000'; END IF;
 a:=i->>'actor';
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>210000 THEN RAISE EXCEPTION 'Ungültige Anfrage'; END IF;
 IF p_action='bootstrap' THEN
  -- Cursor first. Any concurrent change during the following reads is replayed.
  SELECT seq INTO v FROM game_private.sync_cursors WHERE actor_key=a;
  RETURN jsonb_build_object('cursor',v);
 ELSIF p_action='character.read' THEN
  k:=coalesce(p_payload->>'key',a);
  IF k NOT IN ('len','gra','sas','pei') OR k IS NULL OR (a<>'gm' AND k<>a) THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
  SELECT jsonb_build_object('sheet',s.sheet,'version',c.version) INTO result FROM public.character_slots s JOIN game_private.character_versions c USING(char_key) WHERE s.char_key=k;
  RETURN result;
 ELSIF p_action='party.read' THEN
  IF a<>'gm' THEN RAISE EXCEPTION 'Nur Spielleiter'; END IF;
  SELECT jsonb_agg(jsonb_build_object('char_key',s.char_key,'sheet',s.sheet,'version',c.version) ORDER BY s.char_key) INTO result FROM public.character_slots s JOIN game_private.character_versions c USING(char_key);
  RETURN result;
 END IF;
 IF p_action NOT IN ('character.save','roll') OR p_action IS NULL THEN RAISE EXCEPTION 'Unbekannte Operation'; END IF;
 req:=(p_payload->>'request_id')::uuid;
 IF req IS NULL THEN RAISE EXCEPTION 'Request-ID erforderlich'; END IF;
 h:=encode(extensions.digest((p_payload-'request_id')::text,'sha256'),'hex');
 -- Same request is serialized independently of target character/session locks.
 PERFORM pg_advisory_xact_lock(hashtextextended(req::text,30003));
 SELECT * INTO cached FROM game_private.sync_commands WHERE request_id=req;
 IF FOUND THEN
  IF cached.actor_key<>a OR cached.action<>p_action OR cached.payload_hash<>h THEN RAISE EXCEPTION 'Request-ID bereits verwendet'; END IF;
  RETURN cached.result;
 END IF;
 IF p_action='character.save' THEN
  k:=p_payload->>'key';v_sheet:=p_payload->'sheet';
  IF a='gm' OR k IS DISTINCT FROM a THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
  IF v_sheet IS NULL OR jsonb_typeof(v_sheet)<>'object' OR v_sheet->>'char' IS DISTINCT FROM a OR pg_column_size(v_sheet)>200000 THEN RAISE EXCEPTION 'Ungültiger Charakterbogen'; END IF;
  FOREACH col IN ARRAY ARRAY['hp','hpMax','tmp','ac','lvl','insp','hdUsed'] LOOP
   IF v_sheet ? col AND (jsonb_typeof(v_sheet->col)<>'number' OR (v_sheet->>col)!~'^[0-9]{1,4}$' OR (v_sheet->>col)::int>CASE col WHEN 'lvl' THEN 20 WHEN 'insp' THEN 1 WHEN 'ac' THEN 100 WHEN 'hdUsed' THEN 100 ELSE 9999 END OR (col IN ('hpMax','lvl') AND (v_sheet->>col)::int<1)) THEN RAISE EXCEPTION 'Ungültiger Charakterwert: %',col; END IF;
  END LOOP;
  IF v_sheet ? 'conditions' AND (jsonb_typeof(v_sheet->'conditions')<>'array' OR jsonb_array_length(v_sheet->'conditions')>20) THEN RAISE EXCEPTION 'Ungültige Zustände'; END IF;
  FOREACH col IN ARRAY ARRAY['rsU','slU'] LOOP
   IF v_sheet ? col THEN
    IF jsonb_typeof(v_sheet->col)<>'object' THEN RAISE EXCEPTION 'Ungültige Ressourcen'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_each(v_sheet->col) r WHERE r.key!~'^(0|[1-9][0-9]?)$' OR jsonb_typeof(r.value)<>'number' OR r.value::text!~'^[0-9]{1,2}$') THEN RAISE EXCEPTION 'Ungültige Ressourcen'; END IF;
   END IF;
  END LOOP;
  PERFORM 1 FROM public.character_slots WHERE char_key=k FOR UPDATE;
  SELECT version INTO v FROM game_private.character_versions WHERE char_key=k;
  IF (p_payload->>'version')::bigint IS DISTINCT FROM v THEN RAISE EXCEPTION 'Versionskonflikt: Charakter wurde zwischenzeitlich geändert' USING ERRCODE='40001'; END IF;
  UPDATE public.character_slots SET sheet=character_slots.sheet||v_sheet WHERE char_key=k;
  SELECT jsonb_build_object('version',version) INTO result FROM game_private.character_versions WHERE char_key=k;
 ELSE
  -- Same lock order as workspace/legacy session controls; stale session requests fail.
  PERFORM 1 FROM game_private.session_workspace WHERE id=1 FOR UPDATE;
  SELECT session_id INTO room FROM public.dnd_room WHERE id=1;
  IF (p_payload->>'session_id')::uuid IS DISTINCT FROM room THEN RAISE EXCEPTION 'Spielsitzung wurde gewechselt'; END IF;
  result:=public.dnd_roll(a,p_token,p_payload->>'formula',p_payload->>'label',coalesce(p_payload->>'visibility','public'),req,coalesce((p_payload->>'advantage')::smallint,0::smallint));
 END IF;
 DELETE FROM game_private.sync_commands WHERE created_at<now()-interval '24 hours';
 IF (SELECT count(*) FROM game_private.sync_commands WHERE actor_key=a)>=10000 THEN RAISE EXCEPTION 'Tageskontingent erreicht'; END IF;
 INSERT INTO game_private.sync_commands(request_id,actor_key,action,payload_hash,result) VALUES(req,a,p_action,h,result);
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION public.dnd_sync_call(text,text,jsonb),public.dnd_sync_poll(text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dnd_sync_call(text,text,jsonb),public.dnd_sync_poll(text,bigint) TO anon;
create or replace function public.dnd_roll(p_actor text,p_code text,p_formula text,p_label text,
 p_visibility text default 'public',p_request_id uuid default null,p_adv smallint default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_match text[]; v_n int; v_faces int; v_modifier int; v_raw int;
 v_bytes bytea; v_limit bigint; v_raw_rolls int[]:='{}'; v_chosen int[]:='{}';
 v_i int; v_total int:=0; v_room public.dnd_room%rowtype; v_existing public.dnd_rolls%rowtype;
 v_result public.dnd_rolls%rowtype; v_selected int; v_a int; v_b int;
begin
 if not game_private.dnd_code_ok(p_actor,p_code) then raise exception 'Zugangscode ungültig'; end if;
 PERFORM 1 FROM game_private.session_workspace WHERE id=1 FOR UPDATE;
 if p_request_id is null then raise exception 'Request-ID erforderlich'; end if;
 if p_visibility not in ('public','gm') or (p_visibility='gm' and p_actor<>'gm')
    then raise exception 'Sichtbarkeit nicht erlaubt'; end if;
 if p_label is null or length(trim(p_label)) not between 1 and 100 then raise exception 'Ungültiger Würfelname'; end if;
 if p_formula is null or length(p_formula)>25 then raise exception 'Ungültige Formel'; end if;
 v_match:=regexp_match(lower(replace(trim(p_formula),' ','')),'^([0-9]{0,2})d(4|6|8|10|12|20|100)([+-][0-9]{1,3})?$');
 if v_match is null then raise exception 'Erlaubt: 1d20+5, 2d6, 1d100'; end if;
 v_n:=coalesce(nullif(v_match[1],''),'1')::int;
 v_faces:=v_match[2]::int;
 v_modifier:=coalesce(v_match[3],'0')::int;
 if v_n<1 or v_n>20 or v_modifier < -100 or v_modifier > 100
    then raise exception 'Würfelgrenzen überschritten'; end if;
 if p_adv is null or p_adv not in (-1,0,1) or (p_adv<>0 and (v_n<>1 or v_faces<>20))
    then raise exception 'Vorteil/Nachteil nur bei einem W20'; end if;
 select * into v_room from public.dnd_room where id=1;
 select * into v_existing from public.dnd_rolls where request_id=p_request_id;
 if found then
   if v_existing.actor_key<>p_actor or v_existing.session_id<>v_room.session_id
      or v_existing.formula<>lower(replace(trim(p_formula),' ','')) or v_existing.label<>trim(p_label) or v_existing.visibility<>p_visibility or v_existing.advantage<>p_adv
      then raise exception 'Request-ID bereits verwendet'; end if;
   return to_jsonb(v_existing);
 end if;
 if v_room.status<>'active' then raise exception 'Spielleiter muss Sitzung starten'; end if;
 v_limit:=4294967296::bigint-(4294967296::bigint % v_faces);
 -- Generate a uniform unsigned 32-bit integer with rejection sampling.
 for v_i in 1..(case when p_adv=0 then v_n else 2 end) loop
   loop
     v_bytes:=extensions.gen_random_bytes(4);
     if (get_byte(v_bytes,0)::bigint*16777216+
         get_byte(v_bytes,1)::bigint*65536+
         get_byte(v_bytes,2)::bigint*256+
         get_byte(v_bytes,3)::bigint)<v_limit then exit; end if;
   end loop;
   v_raw_rolls:=array_append(v_raw_rolls,((get_byte(v_bytes,0)::bigint*16777216+
       get_byte(v_bytes,1)::bigint*65536+get_byte(v_bytes,2)::bigint*256+
       get_byte(v_bytes,3)::bigint)%v_faces+1)::int);
 end loop;
 if p_adv=1 then v_chosen:=array[greatest(v_raw_rolls[1],v_raw_rolls[2])];
 elsif p_adv=-1 then v_chosen:=array[least(v_raw_rolls[1],v_raw_rolls[2])];
 else v_chosen:=v_raw_rolls; end if;
 select coalesce(sum(a),0) into v_total from unnest(v_chosen) a;
 v_total:=v_total+v_modifier;
 insert into public.dnd_rolls(session_id,request_id,actor_key,label,formula,faces,
  individual_rolls,chosen_rolls,modifier,advantage,total,visibility)
 values(v_room.session_id,p_request_id,p_actor,trim(p_label),
  lower(replace(trim(p_formula),' ','')),v_faces,to_jsonb(v_raw_rolls),
  to_jsonb(v_chosen),v_modifier,p_adv,v_total,p_visibility)
 on conflict(request_id) do nothing returning * into v_result;
 if not found then
   select * into v_existing from public.dnd_rolls where request_id=p_request_id;
   if v_existing.actor_key<>p_actor or v_existing.session_id<>v_room.session_id or v_existing.formula<>lower(replace(trim(p_formula),' ','')) or v_existing.label<>trim(p_label) or v_existing.visibility<>p_visibility or v_existing.advantage<>p_adv
     then raise exception 'Request-ID bereits verwendet'; end if;
   return to_jsonb(v_existing);
 end if;
 return to_jsonb(v_result);
end;
$$;

NOTIFY pgrst,'reload schema';
COMMIT;
