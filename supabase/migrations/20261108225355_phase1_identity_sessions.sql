-- Additive migration. Does not replace codes, character sheets or legacy RPC grants.
BEGIN;
CREATE TABLE game_private.actor_identities (
 actor_key text PRIMARY KEY CHECK (actor_key IN ('len','gra','sas','pei','gm')),
 identity_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 role text NOT NULL CHECK ((actor_key='gm' AND role='owner') OR (actor_key<>'gm' AND role='player'))
);
INSERT INTO game_private.actor_identities(actor_key,role) VALUES
 ('len','player'),('gra','player'),('sas','player'),('pei','player'),('gm','owner');
CREATE TABLE game_private.actor_sessions (
 token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
 actor_key text NOT NULL REFERENCES game_private.actor_identities(actor_key),
 credential_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '12 hours',
 revoked_at timestamptz,
 CHECK (expires_at > created_at)
);
CREATE INDEX actor_sessions_actor_expiry ON game_private.actor_sessions(actor_key,expires_at);
ALTER TABLE game_private.actor_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.actor_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON game_private.actor_identities,game_private.actor_sessions FROM PUBLIC,anon,authenticated;

CREATE FUNCTION game_private.dnd_session_identity(p_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('actor',i.actor_key,'role',i.role,'identity_id',i.identity_id,'expires_at',s.expires_at)
 FROM game_private.actor_sessions s JOIN game_private.actor_identities i USING(actor_key)
 WHERE p_token ~ '^[a-f0-9]{64}$'
 AND s.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
 AND s.revoked_at IS NULL AND s.expires_at>now()
 AND s.credential_hash=CASE WHEN i.actor_key='gm'
 THEN (SELECT claim_hash FROM game_private.admin_access WHERE id=1)
 ELSE (SELECT claim_hash FROM game_private.invites WHERE char_key=i.actor_key) END;
$$;
REVOKE ALL ON FUNCTION game_private.dnd_session_identity(text) FROM PUBLIC,anon,authenticated;

-- Legacy code verification remains independent: a session token cannot renew itself.
CREATE FUNCTION game_private.dnd_legacy_code_ok(p_actor text,p_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(p_actor IN ('len','gra','sas','pei','gm')
 AND p_code ~ '^[A-Za-z0-9_-]{20,100}$' AND
 ((p_actor='gm' AND EXISTS(SELECT 1 FROM game_private.admin_access WHERE id=1 AND claim_hash=encode(extensions.digest(p_code,'sha256'),'hex')))
 OR (p_actor<>'gm' AND EXISTS(SELECT 1 FROM game_private.invites WHERE char_key=p_actor AND claim_hash=encode(extensions.digest(p_code,'sha256'),'hex')))),false);
$$;
REVOKE ALL ON FUNCTION game_private.dnd_legacy_code_ok(text,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION game_private.dnd_code_ok(p_actor text,p_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT game_private.dnd_legacy_code_ok(p_actor,p_code)
 OR coalesce(game_private.dnd_session_identity(p_code)->>'actor'=p_actor,false);
$$;
REVOKE ALL ON FUNCTION game_private.dnd_code_ok(text,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.dnd_sign_in(p_actor text,p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_token text; v_hash text; v_identity jsonb;
BEGIN
 IF NOT game_private.dnd_legacy_code_ok(p_actor,p_code) THEN
  RAISE EXCEPTION 'Zugangscode ungültig' USING ERRCODE='28000';
 END IF;
 -- Serialize the per-actor limit; invalid attempts never write a row.
 v_hash:=encode(extensions.digest(p_code,'sha256'),'hex');
 PERFORM pg_advisory_xact_lock(hashtext('dnd-session-'||p_actor));
 IF (SELECT count(*) FROM game_private.actor_sessions WHERE actor_key=p_actor AND credential_hash=v_hash AND expires_at>now() AND revoked_at IS NULL)>=20 THEN
  RAISE EXCEPTION 'Zu viele aktive Sitzungen. Bitte einen anderen Tab abmelden oder später erneut versuchen.';
 END IF;
 v_token:=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO game_private.actor_sessions(token_hash,actor_key,credential_hash)
 VALUES(encode(extensions.digest(v_token,'sha256'),'hex'),p_actor,v_hash);
 v_identity:=game_private.dnd_session_identity(v_token);
 RETURN v_identity||jsonb_build_object('token',v_token);
END;
$$;
CREATE FUNCTION public.dnd_sign_out(p_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RETURN; END IF;
 UPDATE game_private.actor_sessions SET revoked_at=coalesce(revoked_at,now())
 WHERE token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
END;
$$;

CREATE FUNCTION public.dnd_session_call(p_token text,p_operation text,p_payload jsonb DEFAULT '{}'::jsonb)
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
  UPDATE public.character_slots SET sheet=v_sheet WHERE char_key=v_actor;
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
REVOKE ALL ON FUNCTION public.dnd_sign_in(text,text),public.dnd_sign_out(text),public.dnd_session_call(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dnd_sign_in(text,text),public.dnd_sign_out(text),public.dnd_session_call(text,text,jsonb) TO anon;
COMMENT ON FUNCTION public.dnd_session_call(text,text,jsonb) IS 'Phase 1 capability session boundary. Actor and role always resolved server-side. Not a Supabase Auth JWT.';
NOTIFY pgrst,'reload schema';
COMMIT;
