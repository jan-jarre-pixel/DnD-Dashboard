-- Phase 2: persistent GM preparation, explicit publication and durable recaps.
-- Existing character rows and codes are untouched. Existing GM RPC signature retained.
BEGIN;
CREATE TABLE game_private.session_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
 scene text NOT NULL DEFAULT '' CHECK(length(scene)<=200),
 party_info text NOT NULL DEFAULT '' CHECK(length(party_info)<=6000),
 private_notes text NOT NULL DEFAULT '' CHECK(length(private_notes)<=12000),
 status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','live','completed')),
 game_session_id uuid UNIQUE,
 version bigint NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE game_private.session_workspace (
 id smallint PRIMARY KEY CHECK(id=1),
 active_plan_id uuid REFERENCES game_private.session_plans(id),
 scene text NOT NULL DEFAULT '' CHECK(length(scene)<=200),
 announcement text NOT NULL DEFAULT '' CHECK(length(announcement)<=6000),
 version bigint NOT NULL DEFAULT 1
);
INSERT INTO game_private.session_workspace(id) VALUES(1);
CREATE TABLE game_private.session_archives (
 session_id uuid PRIMARY KEY,
 plan_id uuid REFERENCES game_private.session_plans(id),
 title text NOT NULL,started_at timestamptz,ended_at timestamptz NOT NULL,
 duration_seconds bigint NOT NULL CHECK(duration_seconds>=0),
 recap jsonb NOT NULL CHECK(jsonb_typeof(recap)='object' AND octet_length(recap::text)<=262144),
 version bigint NOT NULL DEFAULT 1
);
CREATE TABLE game_private.workspace_commands (
 request_id uuid PRIMARY KEY,action text NOT NULL,payload_hash text NOT NULL,
 result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE game_private.session_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.session_workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.session_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.workspace_commands ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON game_private.session_plans,game_private.session_workspace,game_private.session_archives,game_private.workspace_commands FROM PUBLIC,anon,authenticated;
CREATE INDEX session_plans_updated ON game_private.session_plans(updated_at DESC);
CREATE INDEX session_archives_ended ON game_private.session_archives(ended_at DESC);

-- Retain the old API, including for the unchanged fallback site, while archiving ends.
CREATE FUNCTION game_private.dnd_gm_manage_legacy(p_code text,p_action text,p_title text default null,p_notes text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_room public.dnd_room%rowtype;
begin
 if not game_private.dnd_code_ok('gm',p_code) then raise exception 'Nur Spielleiter'; end if;
 select * into v_room from public.dnd_room where id=1 for update;
 if p_action='start' then
   if v_room.status in ('active','paused') then raise exception 'Laufende Sitzung zuerst beenden'; end if;
   update public.dnd_room set session_id=gen_random_uuid(),
     title=left(coalesce(nullif(trim(p_title),''),'Unsere D&D-Runde'),100),
     status='active',started_at=now(),ended_at=null,updated_at=now()
   where id=1;
 elsif p_action='pause' then
   if v_room.status<>'active' then raise exception 'Sitzung ist nicht aktiv'; end if;
   update public.dnd_room set status='paused',updated_at=now() where id=1;
 elsif p_action='resume' then
   if v_room.status<>'paused' then raise exception 'Sitzung ist nicht pausiert'; end if;
   update public.dnd_room set status='active',updated_at=now() where id=1;
 elsif p_action='end' then
   if v_room.status not in ('active','paused') then raise exception 'Keine laufende Sitzung'; end if;
   update public.dnd_room set status='ended',ended_at=now(),updated_at=now() where id=1;
 elsif p_action='notes' then
   if p_notes is null or length(p_notes)>12000 then raise exception 'Ungültige Notizen'; end if;
   update public.dnd_room set gm_notes=p_notes,updated_at=now() where id=1;
 else
   raise exception 'Unbekannte Aktion';
 end if;
 return public.dnd_snapshot('gm',p_code,0)->'session';
end;
$$;

REVOKE ALL ON FUNCTION game_private.dnd_gm_manage_legacy(text,text,text,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.dnd_gm_manage(p_code text,p_action text,p_title text DEFAULT NULL,p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_result jsonb;v_room public.dnd_room%rowtype;v_plan game_private.session_plans%rowtype;v_work game_private.session_workspace%rowtype;
BEGIN
 IF NOT game_private.dnd_code_ok('gm',p_code) THEN RAISE EXCEPTION 'Nur Spielleiter'; END IF;
 -- Uniform lock order, also when an old client starts/ends the session.
 SELECT * INTO v_work FROM game_private.session_workspace WHERE id=1 FOR UPDATE;
 v_result:=game_private.dnd_gm_manage_legacy(p_code,p_action,p_title,p_notes);
 IF p_action='start' THEN
  UPDATE game_private.session_workspace SET active_plan_id=NULL,scene='',announcement='',version=version+1 WHERE id=1;
 ELSIF p_action='end' THEN
  SELECT * INTO v_room FROM public.dnd_room WHERE id=1;
  SELECT * INTO v_plan FROM game_private.session_plans WHERE id=v_work.active_plan_id AND game_session_id=v_room.session_id;
  INSERT INTO game_private.session_archives(session_id,plan_id,title,started_at,ended_at,duration_seconds,recap)
  VALUES(v_room.session_id,v_plan.id,v_room.title,v_room.started_at,v_room.ended_at,
   greatest(0,coalesce(extract(epoch FROM v_room.ended_at-v_room.started_at)::bigint,0)),
   jsonb_build_object('events','','battles','','quests','','loot','','open_tasks','','gm_notes',v_room.gm_notes,'prep_notes',coalesce(v_plan.private_notes,''),'scene',v_work.scene,'announcement',v_work.announcement))
  ON CONFLICT(session_id) DO NOTHING;
  UPDATE game_private.session_plans SET status='completed',version=version+1,updated_at=now() WHERE id=v_plan.id;
 END IF;
 RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.dnd_gm_manage(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dnd_gm_manage(text,text,text,text) TO anon;

CREATE FUNCTION game_private.dnd_workspace_snapshot(p_identity jsonb)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('session',jsonb_build_object('id',r.session_id,'title',r.title,'status',r.status,'started',r.started_at,'ended',r.ended_at),
  'scene',w.scene,'announcement',w.announcement,'version',w.version,
  'initiative',(SELECT jsonb_build_object('total',d.total,'created_at',d.created_at) FROM public.dnd_rolls d WHERE d.session_id=r.session_id AND d.actor_key=(p_identity->>'actor') AND d.label='Initiative' AND d.visibility='public' ORDER BY d.id DESC LIMIT 1))
 || CASE WHEN p_identity->>'role'='owner' THEN jsonb_build_object('active_plan_id',w.active_plan_id,'plan_count',(SELECT count(*) FROM game_private.session_plans),'archive_count',(SELECT count(*) FROM game_private.session_archives),
  'plans',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.updated_at DESC),'[]'::jsonb) FROM (SELECT id,title,scene,status,version,updated_at FROM game_private.session_plans ORDER BY updated_at DESC LIMIT 50)x),
  'history',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.ended_at DESC),'[]'::jsonb) FROM (SELECT session_id,title,started_at,ended_at,duration_seconds,version FROM game_private.session_archives ORDER BY ended_at DESC LIMIT 50)x)) ELSE '{}'::jsonb END
 FROM game_private.session_workspace w CROSS JOIN public.dnd_room r WHERE w.id=1 AND r.id=1;
$$;
REVOKE ALL ON FUNCTION game_private.dnd_workspace_snapshot(jsonb) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.dnd_workspace_call(p_token text,p_action text,p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_identity jsonb;v_owner boolean;v_request uuid;v_hash text;v_cached game_private.workspace_commands%rowtype;
 v_work game_private.session_workspace%rowtype;v_plan game_private.session_plans%rowtype;
 v_room public.dnd_room%rowtype;v_archive game_private.session_archives%rowtype;
 v_result jsonb;v_data jsonb;v_id uuid;v_version bigint;
BEGIN
 IF p_token IS NULL OR length(p_token)<>64 THEN RAISE EXCEPTION 'Sitzung abgelaufen. Bitte erneut anmelden.' USING ERRCODE='28000'; END IF;
 v_identity:=game_private.dnd_session_identity(p_token);
 IF v_identity IS NULL THEN RAISE EXCEPTION 'Sitzung abgelaufen. Bitte erneut anmelden.' USING ERRCODE='28000'; END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>210000 THEN RAISE EXCEPTION 'Ungültige Anfrage'; END IF;
 v_owner:=v_identity->>'role'='owner';
 IF p_action='snapshot' THEN RETURN game_private.dnd_workspace_snapshot(v_identity); END IF;
 IF NOT v_owner THEN RAISE EXCEPTION 'Nur Spielleiter'; END IF;
 IF p_action IN ('plans.list','archives.list') THEN
  v_version:=coalesce((p_payload->>'offset')::bigint,0);
  IF v_version<0 OR v_version>500000 THEN RAISE EXCEPTION 'Ungültige Seitennummer'; END IF;
  IF p_action='plans.list' THEN
   SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.updated_at DESC),'[]'::jsonb) INTO v_result FROM (SELECT id,title,scene,status,version,updated_at FROM game_private.session_plans ORDER BY updated_at DESC,id LIMIT 50 OFFSET v_version)x;
  ELSE
   SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.ended_at DESC),'[]'::jsonb) INTO v_result FROM (SELECT session_id,title,started_at,ended_at,duration_seconds,version FROM game_private.session_archives ORDER BY ended_at DESC,session_id LIMIT 50 OFFSET v_version)x;
  END IF;RETURN v_result;
 ELSIF p_action='plan.load' THEN
  SELECT to_jsonb(p) INTO v_result FROM game_private.session_plans p WHERE id=(p_payload->>'id')::uuid;
  IF v_result IS NULL THEN RAISE EXCEPTION 'Plan nicht gefunden'; END IF;RETURN v_result;
 ELSIF p_action='archive.load' THEN
  SELECT to_jsonb(a) INTO v_result FROM game_private.session_archives a WHERE session_id=(p_payload->>'id')::uuid;
  IF v_result IS NULL THEN RAISE EXCEPTION 'Protokoll nicht gefunden'; END IF;RETURN v_result;
 END IF;
 IF p_action NOT IN ('plan.save','session.start','session.quickstart','session.pause','session.resume','session.end','publish','archive.save') OR p_action IS NULL THEN RAISE EXCEPTION 'Unbekannte Aktion'; END IF;
 v_request:=(p_payload->>'request_id')::uuid;
 IF v_request IS NULL THEN RAISE EXCEPTION 'Request-ID erforderlich'; END IF;
 SELECT * INTO v_work FROM game_private.session_workspace WHERE id=1 FOR UPDATE;
 v_hash:=encode(extensions.digest((p_payload-'request_id')::text,'sha256'),'hex');
 SELECT * INTO v_cached FROM game_private.workspace_commands WHERE request_id=v_request;
 IF FOUND THEN
  IF v_cached.action<>p_action OR v_cached.payload_hash<>v_hash THEN RAISE EXCEPTION 'Request-ID bereits anderweitig verwendet'; END IF;
  RETURN v_cached.result;
 END IF;
 IF p_action IN ('session.pause','session.resume','session.end') THEN
  SELECT * INTO v_room FROM public.dnd_room WHERE id=1 FOR UPDATE;
  IF p_payload->>'session_id' IS DISTINCT FROM v_room.session_id::text THEN RAISE EXCEPTION 'Versionskonflikt: Die aktive Sitzung hat gewechselt.' USING ERRCODE='40001'; END IF;
 END IF;
 CASE p_action
 WHEN 'plan.save' THEN
  v_id:=nullif(p_payload->>'id','')::uuid;
  IF v_id IS NULL THEN
   IF (SELECT count(*) FROM game_private.session_plans)>=500 THEN RAISE EXCEPTION 'Maximal 500 Sitzungspläne'; END IF;
   INSERT INTO game_private.session_plans(title,scene,party_info,private_notes)
   VALUES(trim(p_payload->>'title'),coalesce(p_payload->>'scene',''),coalesce(p_payload->>'party_info',''),coalesce(p_payload->>'private_notes','')) RETURNING * INTO v_plan;
  ELSE
   UPDATE game_private.session_plans SET title=trim(p_payload->>'title'),scene=coalesce(p_payload->>'scene',''),party_info=coalesce(p_payload->>'party_info',''),private_notes=coalesce(p_payload->>'private_notes',''),version=version+1,updated_at=now()
   WHERE id=v_id AND version=(p_payload->>'version')::bigint RETURNING * INTO v_plan;
   IF NOT FOUND THEN RAISE EXCEPTION 'Versionskonflikt: Plan erneut laden. Nicht gespeicherte Änderungen bleiben im Formular.' USING ERRCODE='40001'; END IF;
  END IF;
  v_result:=to_jsonb(v_plan);
 WHEN 'session.quickstart' THEN
  IF (SELECT count(*) FROM game_private.session_plans)>=500 THEN RAISE EXCEPTION 'Maximal 500 Sitzungspläne'; END IF;
  INSERT INTO game_private.session_plans(title) VALUES(trim(p_payload->>'title')) RETURNING * INTO v_plan;
  v_result:=public.dnd_gm_manage(p_token,'start',v_plan.title,NULL);
  UPDATE game_private.session_plans SET status='live',game_session_id=(v_result->>'id')::uuid,version=version+1,updated_at=now() WHERE id=v_plan.id;
  UPDATE game_private.session_workspace SET active_plan_id=v_plan.id WHERE id=1;
 WHEN 'session.start' THEN
  SELECT * INTO v_plan FROM game_private.session_plans WHERE id=(p_payload->>'id')::uuid;
  IF NOT FOUND OR v_plan.status<>'planned' THEN RAISE EXCEPTION 'Vorbereiteten Plan auswählen'; END IF;
  IF v_plan.version IS DISTINCT FROM (p_payload->>'version')::bigint THEN RAISE EXCEPTION 'Versionskonflikt: Plan erneut laden.' USING ERRCODE='40001'; END IF;
  v_result:=public.dnd_gm_manage(p_token,'start',v_plan.title,NULL);
  UPDATE game_private.session_plans SET status='live',game_session_id=(v_result->>'id')::uuid,version=version+1,updated_at=now() WHERE id=v_plan.id;
  UPDATE game_private.session_workspace SET active_plan_id=v_plan.id WHERE id=1;
 WHEN 'session.pause' THEN v_result:=public.dnd_gm_manage(p_token,'pause',NULL,NULL);
 WHEN 'session.resume' THEN v_result:=public.dnd_gm_manage(p_token,'resume',NULL,NULL);
 WHEN 'session.end' THEN v_result:=public.dnd_gm_manage(p_token,'end',NULL,NULL);
 WHEN 'publish' THEN
  UPDATE game_private.session_workspace SET scene=coalesce(p_payload->>'scene',''),announcement=coalesce(p_payload->>'announcement',''),version=version+1
  WHERE id=1 AND version=(p_payload->>'version')::bigint RETURNING * INTO v_work;
  IF NOT FOUND THEN RAISE EXCEPTION 'Versionskonflikt: Veröffentlichungsstand erneut laden.' USING ERRCODE='40001'; END IF;
  v_result:=jsonb_build_object('version',v_work.version);
 WHEN 'archive.save' THEN
  v_data:=jsonb_build_object('events',coalesce(p_payload->>'events',''),'battles',coalesce(p_payload->>'battles',''),'quests',coalesce(p_payload->>'quests',''),'loot',coalesce(p_payload->>'loot',''),'open_tasks',coalesce(p_payload->>'open_tasks',''),'gm_notes',coalesce(p_payload->>'gm_notes',''));
  IF EXISTS(SELECT 1 FROM jsonb_each_text(v_data) WHERE length(value)>CASE WHEN key='gm_notes' THEN 12000 ELSE 6000 END) THEN RAISE EXCEPTION 'Recap-Feld zu lang (maximal 6000 Zeichen)'; END IF;
  UPDATE game_private.session_archives SET recap=recap||v_data,version=version+1
  WHERE session_id=(p_payload->>'id')::uuid AND version=(p_payload->>'version')::bigint RETURNING * INTO v_archive;
  IF NOT FOUND THEN RAISE EXCEPTION 'Versionskonflikt: Protokoll erneut laden.' USING ERRCODE='40001'; END IF;
  v_result:=to_jsonb(v_archive);
 END CASE;
 INSERT INTO game_private.workspace_commands(request_id,action,payload_hash,result) VALUES(v_request,p_action,v_hash,v_result);
 RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.dnd_workspace_call(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dnd_workspace_call(text,text,jsonb) TO anon;
-- Preserve extension fields when older deployed clients save a legacy sheet.
create or replace function public.write_character(p_character_key text, p_code text, p_sheet jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_character_key is null or p_character_key not in ('len','gra','sas','pei')
     or p_code is null or p_code !~ '^[A-Za-z0-9_-]{20,100}$' then
    raise exception 'Ungültiger Charaktercode';
  end if;
  if not exists (
    select 1 from game_private.invites i
    where i.char_key=p_character_key
      and i.claim_hash=pg_catalog.encode(extensions.digest(p_code,'sha256'),'hex')
  ) then raise exception 'Ungültiger Charaktercode'; end if;
  if p_sheet is null or pg_catalog.jsonb_typeof(p_sheet)<>'object'
     or pg_catalog.pg_column_size(p_sheet)>200000
     or p_sheet->>'char' is distinct from p_character_key then
    raise exception 'Ungültiger Charakterbogen'; end if;
  update public.character_slots set sheet=sheet||p_sheet
  where char_key=p_character_key;
  if not found then raise exception 'Unbekannter Charakter'; end if;
end;
$$;


CREATE OR REPLACE FUNCTION public.dnd_session_call(p_token text,p_operation text,p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_identity jsonb; v_actor text; v_role text; v_key text; v_sheet jsonb; v_result jsonb;
BEGIN
 v_identity:=game_private.dnd_session_identity(p_token);
 IF v_identity IS NULL THEN RAISE EXCEPTION 'Sitzung abgelaufen. Bitte erneut anmelden.' USING ERRCODE='28000'; END IF;
 v_actor:=v_identity->>'actor'; v_role:=v_identity->>'role';
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>210000 THEN
  RAISE EXCEPTION 'Ungültige Anfrage';
 END IF;
 CASE p_operation
 WHEN 'identity' THEN RETURN v_identity;
 WHEN 'read_character' THEN
  v_key:=p_payload->>'p_character_key';
  IF v_key IS NULL OR v_key NOT IN ('len','gra','sas','pei') OR (v_role<>'owner' AND v_key<>v_actor) THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
  SELECT sheet INTO v_result FROM public.character_slots WHERE char_key=v_key;
  RETURN v_result;
 WHEN 'read_party' THEN
  IF v_role<>'owner' THEN RAISE EXCEPTION 'Nur Spielleiter'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('char_key',s.char_key,'display_name',s.display_name,'sheet',s.sheet) ORDER BY s.char_key),'[]'::jsonb)
  INTO v_result FROM public.character_slots s; RETURN v_result;
 WHEN 'write_character' THEN
  v_key:=p_payload->>'p_character_key';v_sheet:=p_payload->'p_sheet';
  IF v_role<>'player' OR v_key IS DISTINCT FROM v_actor THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
  IF v_sheet IS NULL OR jsonb_typeof(v_sheet)<>'object' OR pg_column_size(v_sheet)>200000 OR v_sheet->>'char' IS DISTINCT FROM v_actor THEN RAISE EXCEPTION 'Ungültiger Charakterbogen'; END IF;
  UPDATE public.character_slots SET sheet=sheet||v_sheet WHERE char_key=v_actor;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unbekannter Charakter'; END IF;
  RETURN 'null'::jsonb;
 WHEN 'dnd_snapshot' THEN
  RETURN public.dnd_snapshot(v_actor,p_token,coalesce((p_payload->>'p_after')::bigint,0));
 WHEN 'dnd_heartbeat' THEN
  PERFORM public.dnd_heartbeat(v_actor,p_token);RETURN 'null'::jsonb;
 WHEN 'dnd_roll' THEN
  RETURN public.dnd_roll(v_actor,p_token,p_payload->>'p_formula',p_payload->>'p_label',coalesce(p_payload->>'p_visibility','public'),(p_payload->>'p_request_id')::uuid,coalesce((p_payload->>'p_adv')::smallint,0::smallint));
 WHEN 'dnd_gm_manage' THEN
  IF v_role<>'owner' THEN RAISE EXCEPTION 'Nur Spielleiter'; END IF;
  RETURN public.dnd_gm_manage(p_token,p_payload->>'p_action',p_payload->>'p_title',p_payload->>'p_notes');
 ELSE RAISE EXCEPTION 'Unbekannte Operation';
 END CASE;
END;
$$;

NOTIFY pgrst,'reload schema';
COMMIT;
