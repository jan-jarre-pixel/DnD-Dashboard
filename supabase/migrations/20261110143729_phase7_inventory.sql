-- Phase 7: transactional counted stock, shared campaign chests and persisted local generators.
-- Existing free-text equipment, sheets, code hashes and RPC bodies are untouched.
BEGIN;
CREATE TABLE game_private.inventory_items(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),char_key text REFERENCES public.character_slots(char_key),campaign_id uuid REFERENCES game_private.campaigns(id),
 scope text NOT NULL CHECK(scope IN ('character','chest','loot')),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 100),notes text NOT NULL DEFAULT '' CHECK(length(notes)<=6000),
 quantity int NOT NULL CHECK(quantity BETWEEN 0 AND 999999),unit_cp int NOT NULL DEFAULT 0 CHECK(unit_cp BETWEEN 0 AND 1000000000),weight_g int NOT NULL DEFAULT 0 CHECK(weight_g BETWEEN 0 AND 1000000),
 consumable boolean NOT NULL DEFAULT false,equipped boolean NOT NULL DEFAULT false,
 heal_dice int NOT NULL DEFAULT 0 CHECK(heal_dice BETWEEN 0 AND 8),heal_sides int NOT NULL DEFAULT 4 CHECK(heal_sides IN (4,6,8,10,12,20)),heal_bonus int NOT NULL DEFAULT 0 CHECK(heal_bonus BETWEEN 0 AND 100),
 version bigint NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((scope='character' AND char_key IS NOT NULL AND campaign_id IS NULL) OR(scope IN ('chest','loot') AND char_key IS NULL AND campaign_id IS NOT NULL)),
 CHECK(NOT equipped OR (scope='character' AND quantity>0)),CHECK(heal_dice=0 OR consumable));
CREATE INDEX inventory_character ON game_private.inventory_items(char_key) WHERE char_key IS NOT NULL;
CREATE INDEX inventory_campaign ON game_private.inventory_items(campaign_id,scope) WHERE campaign_id IS NOT NULL;
CREATE TABLE game_private.inventory_tables(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),campaign_id uuid NOT NULL REFERENCES game_private.campaigns(id),title text NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
 entries jsonb NOT NULL CHECK(jsonb_typeof(entries)='array' AND jsonb_array_length(entries) BETWEEN 1 AND 100 AND octet_length(entries::text)<=60000),version bigint NOT NULL DEFAULT 1);
CREATE INDEX inventory_tables_campaign ON game_private.inventory_tables(campaign_id);
CREATE TABLE game_private.inventory_generated(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),campaign_id uuid NOT NULL REFERENCES game_private.campaigns(id),kind text NOT NULL CHECK(kind IN ('loot','npc','quest','tavern','weather','travel','custom')),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object' AND octet_length(data::text)<=30000),saved jsonb,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX inventory_generated_campaign ON game_private.inventory_generated(campaign_id,created_at DESC);
CREATE TABLE game_private.inventory_commands(request_id uuid PRIMARY KEY,actor_key text NOT NULL,action text NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX inventory_commands_created ON game_private.inventory_commands(created_at);
CREATE TABLE game_private.inventory_log(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),char_key text REFERENCES public.character_slots(char_key),campaign_id uuid REFERENCES game_private.campaigns(id),scope text NOT NULL CHECK(scope IN ('character','chest','loot')),
 action text NOT NULL,message text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((scope='character' AND char_key IS NOT NULL AND campaign_id IS NULL) OR(scope IN ('chest','loot') AND char_key IS NULL AND campaign_id IS NOT NULL)));
CREATE INDEX inventory_log_character ON game_private.inventory_log(char_key,created_at DESC) WHERE char_key IS NOT NULL;
CREATE INDEX inventory_log_campaign ON game_private.inventory_log(campaign_id,scope,created_at DESC) WHERE campaign_id IS NOT NULL;
ALTER TABLE game_private.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.inventory_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.inventory_generated ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.inventory_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.inventory_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON game_private.inventory_items,game_private.inventory_tables,game_private.inventory_generated,game_private.inventory_commands,game_private.inventory_log FROM PUBLIC,anon,authenticated;

-- Unbiased local randomness, with immutable results saved in the command transaction.
CREATE FUNCTION game_private.inventory_random(n int) RETURNS int LANGUAGE plpgsql VOLATILE SET search_path='' AS $$
DECLARE v bigint;b bytea;limit_value bigint;
BEGIN
 IF n IS NULL OR n NOT BETWEEN 1 AND 1000000 THEN RAISE EXCEPTION 'Ungültige Zufallsgrenze'; END IF;
 limit_value:=4294967296-(4294967296%n);
 LOOP b:=extensions.gen_random_bytes(4);v:=get_byte(b,0)::bigint*16777216+get_byte(b,1)::bigint*65536+get_byte(b,2)::bigint*256+get_byte(b,3);EXIT WHEN v<limit_value; END LOOP;
 RETURN (v%n)::int+1;
END;$$;
CREATE FUNCTION game_private.inventory_catalog() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT '{
 "npc":[{"title":"Mira Steinpfad","body":"Eine geduldige Fährtenleserin sucht ihren verschwundenen Bruder."},{"title":"Tarek Glutauge","body":"Ein fahrender Schmied tauscht Reparaturen gegen vergessene Geschichten."},{"title":"Nela Windklee","body":"Eine Kräuterkundige kennt einen verborgenen Weg durch den Sumpf."},{"title":"Borin Nachtwacht","body":"Ein pensionierter Wächter verbirgt eine alte Schuld."}],
 "quest":[{"title":"Licht am alten Turm","body":"Jede Nacht leuchtet der verlassene Wachturm. Finde die Quelle und bring die Vermissten zurück."},{"title":"Die versiegte Quelle","body":"Das Dorf braucht Wasser. Entdecke, was den Zufluss unter dem Hügel blockiert."},{"title":"Ein Brief ohne Namen","body":"Ein versiegelter Brief muss vor Sonnenuntergang seinen unbekannten Empfänger erreichen."}],
 "tavern":[{"title":"Zum schiefen Anker","body":"Salzige Luft, ein warmer Eintopf und eine Wirtin, die jede Strömung kennt."},{"title":"Die silberne Laterne","body":"Reisende tauschen Geschichten; das letzte Zimmer ist für einen Fremden reserviert."},{"title":"Unter den drei Eichen","body":"Ein ruhiger Hof mit Musik und einer versteckten Nachricht unter dem Tisch."}],
 "weather":[{"title":"Nebel am Morgen","body":"Dichter Nebel liegt über den Wegen und lichtet sich erst gegen Mittag."},{"title":"Gewitterfront","body":"Dunkle Wolken ziehen auf. Ein sicherer Unterstand wird wichtig."},{"title":"Klarer Himmel","body":"Kühler Wind und gute Sicht begleiten die Reise."}],
 "travel":[{"title":"Die beschädigte Brücke","body":"Ein umgestürzter Baum blockiert den Übergang; auf der anderen Seite wartet jemand."},{"title":"Spuren im Schlamm","body":"Frische Fußspuren verlassen den Weg und führen zu einer verlassenen Feuerstelle."},{"title":"Ein unerwarteter Handel","body":"Ein Händler bietet eine Karte an, deren Rand frisch verbrannt ist."}],
 "loot":[{"title":"Reisevorräte","items":[{"title":"Goldmünzen","quantity":15,"unit_cp":100,"weight_g":10},{"title":"Rationen","quantity":3,"weight_g":500,"consumable":true}]},{"title":"Versorgungsbeutel","items":[{"title":"Goldmünzen","quantity":8,"unit_cp":100,"weight_g":10},{"title":"Heiltrank","quantity":1,"unit_cp":5000,"weight_g":250,"consumable":true,"heal_dice":2,"heal_sides":4,"heal_bonus":2}]},{"title":"Vergessene Ausrüstung","items":[{"title":"Silbermünzen","quantity":25,"unit_cp":10,"weight_g":10},{"title":"Pfeile","quantity":12,"unit_cp":5,"weight_g":25,"consumable":true},{"title":"Seil","quantity":1,"unit_cp":100,"weight_g":5000}]}]
 }'::jsonb; $$;
CREATE FUNCTION game_private.inventory_emit(k text,cid uuid,location text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE receiver text;n bigint;eid uuid:=gen_random_uuid();sid uuid;active uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(30003,1);
 SELECT r.session_id,s.campaign_id INTO sid,active FROM public.dnd_room r LEFT JOIN game_private.campaign_sessions s USING(session_id) WHERE r.id=1;
 FOR receiver IN SELECT actor_key FROM game_private.sync_cursors WHERE actor_key='gm' OR actor_key=k OR (location='chest' AND cid=active) ORDER BY actor_key LOOP
  UPDATE game_private.sync_cursors SET seq=seq+1 WHERE actor_key=receiver RETURNING seq INTO n;
  INSERT INTO game_private.sync_events VALUES(receiver,n,eid,sid,'InventoryChanged','{}',clock_timestamp());
  DELETE FROM game_private.sync_events WHERE actor_key=receiver AND seq<=n-5000;
 END LOOP;
END;$$;
CREATE FUNCTION game_private.inventory_note(p game_private.inventory_items,action_name text,amount int) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO game_private.inventory_log(char_key,campaign_id,scope,action,message) VALUES(p.char_key,p.campaign_id,p.scope,action_name,p.title||' · '||amount::text||' · '||action_name);
 PERFORM game_private.inventory_emit(p.char_key,p.campaign_id,p.scope);
END;$$;
CREATE FUNCTION game_private.inventory_snapshot(a text,cid uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE active uuid;items jsonb;resources jsonb;events jsonb;generators jsonb:='[]';tables jsonb:='[]';campaigns jsonb:='[]';campaign jsonb;
BEGIN
 SELECT s.campaign_id INTO active FROM game_private.campaign_sessions s JOIN public.dnd_room r USING(session_id) WHERE r.id=1;
 cid:=CASE WHEN a='gm' THEN coalesce(cid,active) ELSE active END;
 IF a='gm' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.created_at),'[]') INTO campaigns FROM game_private.campaigns c;
  SELECT coalesce(jsonb_agg(to_jsonb(g) ORDER BY g.created_at DESC),'[]') INTO generators FROM game_private.inventory_generated g WHERE campaign_id=cid;
  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.title),'[]') INTO tables FROM game_private.inventory_tables t WHERE campaign_id=cid;
 END IF;
 SELECT jsonb_build_object('id',id,'title',title,'archived',archived) INTO campaign FROM game_private.campaigns WHERE id=cid;
 SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.scope,i.title,i.id),'[]') INTO items FROM game_private.inventory_items i WHERE
 (a='gm' AND (i.char_key IS NOT NULL OR i.campaign_id=cid)) OR (a<>'gm' AND (i.char_key=a OR (i.scope='chest' AND i.campaign_id=active))); 
 SELECT coalesce(jsonb_agg(jsonb_build_object('key',s.char_key,'name',raw->>'name','rs',raw->'rs','sl',raw->'sl','rsU',CASE WHEN jsonb_typeof(raw->'rsU')='object' THEN raw->'rsU' ELSE '{}'::jsonb END,'slU',CASE WHEN jsonb_typeof(raw->'slU')='object' THEN raw->'slU' ELSE '{}'::jsonb END,'hp',game_private.combat_int(raw->'hp',0,0,9999),'hpMax',game_private.combat_int(raw->'hpMax',1,1,9999),'version',v.version) ORDER BY s.char_key),'[]') INTO resources
 FROM public.character_slots s JOIN game_private.character_versions v USING(char_key) JOIN game_private.combat_defaults d USING(char_key) CROSS JOIN LATERAL(SELECT d.sheet||s.sheet raw)x WHERE a='gm' OR s.char_key=a;
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC),'[]') INTO events FROM(SELECT id,action,message,created_at FROM game_private.inventory_log l WHERE (a='gm' AND (l.char_key IS NOT NULL OR l.campaign_id=cid)) OR (a<>'gm' AND (l.char_key=a OR(l.scope='chest' AND l.campaign_id=active))) ORDER BY created_at DESC LIMIT 50)t;
 RETURN jsonb_build_object('campaign',campaign,'campaigns',campaigns,'active_campaign_id',active,'items',items,'resources',resources,'log',events,'generated',generators,'tables',tables,'catalog',CASE WHEN a='gm' THEN game_private.inventory_catalog() ELSE '{}'::jsonb END);
END;$$;
CREATE FUNCTION public.dnd_inventory_call(p_token text,p_action text,p_payload jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE identity jsonb;a text;req uuid;h text;receipt game_private.inventory_commands%rowtype;active uuid;cid uuid;archived boolean;
 item game_private.inventory_items%rowtype;destination game_private.inventory_items%rowtype;generated game_private.inventory_generated%rowtype;tab game_private.inventory_tables%rowtype;
 result jsonb;data jsonb;entry jsonb;raw jsonb;dice jsonb:='[]';k text;kind text;line text;location text;target_key text;definition text;
 amount int;n int;i int;used int;maximum int;rolled int:=0;hp int;hpmax int;version_value bigint;target_campaign uuid;total int:=0;pick int;previous text;
BEGIN
 identity:=game_private.dnd_session_identity(p_token);IF identity IS NULL THEN RAISE EXCEPTION 'Sitzung abgelaufen' USING ERRCODE='28000'; END IF;a:=identity->>'actor';
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>80000 THEN RAISE EXCEPTION 'Ungültige Anfrage'; END IF;
 IF p_action='snapshot' THEN RETURN game_private.inventory_snapshot(a,CASE WHEN a='gm' THEN (p_payload->>'campaign_id')::uuid ELSE NULL END); END IF;
 IF p_action IS NULL OR p_action NOT IN ('item.create','item.set','item.consume','item.transfer','item.equip','resource.use','resource.restore','resource.rest','table.save','generate','generator.save') THEN RAISE EXCEPTION 'Unbekannte Inventaraktion'; END IF;
 IF a<>'gm' AND p_action IN ('item.create','item.set','table.save','generate','generator.save') THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
 req:=(p_payload->>'request_id')::uuid;IF req IS NULL THEN RAISE EXCEPTION 'Request-ID erforderlich'; END IF;
 h:=encode(extensions.digest((p_payload-'request_id')::text,'sha256'),'hex');
 PERFORM 1 FROM game_private.session_workspace WHERE id=1 FOR UPDATE;
 SELECT * INTO receipt FROM game_private.inventory_commands WHERE request_id=req;
 IF FOUND THEN IF receipt.actor_key<>a OR receipt.action<>p_action OR receipt.payload_hash<>h THEN RAISE EXCEPTION 'Request-ID bereits verwendet'; END IF;RETURN receipt.result; END IF;
 SELECT s.campaign_id INTO active FROM game_private.campaign_sessions s JOIN public.dnd_room r USING(session_id) WHERE r.id=1;
 cid:=CASE WHEN a='gm' THEN coalesce((p_payload->>'campaign_id')::uuid,active) ELSE active END;
 IF p_action NOT LIKE 'resource.%' THEN
  SELECT c.archived INTO archived FROM game_private.campaigns c WHERE c.id=cid;
  IF archived IS NULL THEN RAISE EXCEPTION 'Kampagne nicht gefunden'; END IF;
 END IF;
 IF p_action IN ('item.create','table.save','generate','generator.save') AND archived THEN RAISE EXCEPTION 'Kampagne ist archiviert'; END IF;
 IF p_action='item.create' THEN
  location:=p_payload->>'scope';k:=nullif(p_payload->>'char_key','');
  IF (SELECT count(*) FROM game_private.inventory_items)>=10000 THEN RAISE EXCEPTION 'Maximal 10000 Inventareinträge'; END IF;
  INSERT INTO game_private.inventory_items(scope,char_key,campaign_id,title,notes,quantity,unit_cp,weight_g,consumable,heal_dice,heal_sides,heal_bonus)
  VALUES(location,CASE WHEN location='character' THEN k END,CASE WHEN location<>'character' THEN cid END,trim(p_payload->>'title'),coalesce(p_payload->>'notes',''),(p_payload->>'quantity')::int,coalesce((p_payload->>'unit_cp')::int,0),coalesce((p_payload->>'weight_g')::int,0),coalesce((p_payload->>'consumable')::boolean,false),coalesce((p_payload->>'heal_dice')::int,0),coalesce((p_payload->>'heal_sides')::int,4),coalesce((p_payload->>'heal_bonus')::int,0)) RETURNING * INTO item;
  PERFORM game_private.inventory_note(item,'Angelegt',item.quantity);result:=to_jsonb(item);
 ELSIF p_action LIKE 'resource.%' THEN
  k:=coalesce(p_payload->>'char_key',a);IF NOT EXISTS(SELECT 1 FROM public.character_slots WHERE char_key=k) OR (a<>'gm' AND k<>a) THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
  PERFORM 1 FROM public.character_slots WHERE char_key=k FOR UPDATE;
  SELECT v.version,d.sheet||s.sheet INTO version_value,raw FROM public.character_slots s JOIN game_private.character_versions v USING(char_key) JOIN game_private.combat_defaults d USING(char_key) WHERE s.char_key=k;
  IF version_value IS DISTINCT FROM (p_payload->>'character_version')::bigint THEN RAISE EXCEPTION 'Versionskonflikt: Charakter erneut laden' USING ERRCODE='40001'; END IF;
  IF p_action='resource.rest' THEN
   kind:=p_payload->>'rest';IF kind IS NULL OR kind NOT IN ('short','long') THEN RAISE EXCEPTION 'Rastart erforderlich'; END IF;
   FOREACH location IN ARRAY ARRAY['slU','rsU'] LOOP
    data:=CASE WHEN jsonb_typeof(raw->location)='object' THEN raw->location ELSE '{}'::jsonb END;
    i:=0;
    FOR line IN SELECT l FROM regexp_split_to_table(coalesce(raw->>CASE location WHEN 'slU' THEN 'sl' ELSE 'rs' END,''),E'\n') l WHERE l!~'^[[:space:]]*$' LIMIT 100 LOOP
     definition:=trim(split_part(line,'|',3));used:=game_private.combat_int(data->i::text,0,0,99);
     IF kind='long' OR definition='sr' THEN data:=data||jsonb_build_object(i::text,0);ELSIF location='rsU' AND definition='sr1' THEN data:=data||jsonb_build_object(i::text,greatest(0,used-1)); END IF;i:=i+1;
    END LOOP;raw:=jsonb_set(raw,ARRAY[location],data);
   END LOOP;
   data:=jsonb_build_object('slU',raw->'slU','rsU',raw->'rsU');
   IF kind='long' THEN data:=data||jsonb_build_object('hp',game_private.combat_int(raw->'hpMax',1,1,9999),'tmp',0,'ds',jsonb_build_array(0,0),'hdUsed',greatest(0,game_private.combat_int(raw->'hdUsed',0,0,100)-ceil(game_private.combat_int(raw->'lvl',3,1,20)/2.0)::int)); END IF;
  ELSE
   location:=p_payload->>'kind';i:=(p_payload->>'index')::int;
   IF location IS NULL OR location NOT IN ('rsU','slU') OR i IS NULL OR i NOT BETWEEN 0 AND 99 THEN RAISE EXCEPTION 'Ungültige Ressource'; END IF;
   SELECT l INTO line FROM regexp_split_to_table(coalesce(raw->>CASE location WHEN 'slU' THEN 'sl' ELSE 'rs' END,''),E'\n') WITH ORDINALITY t(l,pos) WHERE l!~'^[[:space:]]*$' ORDER BY pos OFFSET i LIMIT 1;
   IF line IS NULL OR trim(line) IS DISTINCT FROM p_payload->>'definition' OR trim(split_part(line,'|',2))!~'^[0-9]{1,2}$' THEN RAISE EXCEPTION 'Ressourcendefinition geändert'; END IF;
   maximum:=trim(split_part(line,'|',2))::int;used:=game_private.combat_int(raw->location->i::text,0,0,99);
   IF p_action='resource.use' AND used>=maximum THEN RAISE EXCEPTION 'Ressource aufgebraucht'; END IF;
   IF p_action='resource.restore' AND used=0 THEN RAISE EXCEPTION 'Ressource bereits vollständig verfügbar'; END IF;
   data:=jsonb_build_object(location,(CASE WHEN jsonb_typeof(raw->location)='object' THEN raw->location ELSE '{}'::jsonb END)||jsonb_build_object(i::text,CASE WHEN p_action='resource.use' THEN used+1 ELSE used-1 END));
  END IF;
  UPDATE public.character_slots SET sheet=sheet||data WHERE char_key=k;
  result:=jsonb_build_object('confirmed',true,'character_version',(SELECT version FROM game_private.character_versions WHERE char_key=k));
 ELSE
  IF p_action IN ('item.set','item.consume','item.transfer','item.equip') THEN
   SELECT * INTO item FROM game_private.inventory_items WHERE id=(p_payload->>'id')::uuid FOR UPDATE;
   IF NOT FOUND OR (a<>'gm' AND NOT coalesce(item.char_key=a OR(item.scope='chest' AND item.campaign_id=active),false)) THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
   IF item.scope<>'character' THEN
    IF item.campaign_id<>cid OR archived THEN RAISE EXCEPTION 'Kampagnenzuordnung geändert oder archiviert'; END IF;
    IF a<>'gm' AND (p_payload->>'active_campaign_id')::uuid IS DISTINCT FROM active THEN RAISE EXCEPTION 'Spielsitzung wurde gewechselt'; END IF;
   END IF;
   IF item.version IS DISTINCT FROM (p_payload->>'version')::bigint THEN RAISE EXCEPTION 'Versionskonflikt: Bestand erneut laden' USING ERRCODE='40001'; END IF;
   IF p_action='item.set' THEN
    UPDATE game_private.inventory_items SET quantity=(p_payload->>'quantity')::int,equipped=equipped AND (p_payload->>'quantity')::int>0,title=coalesce(nullif(trim(p_payload->>'title'),''),title),notes=coalesce(p_payload->>'notes',notes),unit_cp=coalesce((p_payload->>'unit_cp')::int,unit_cp),weight_g=coalesce((p_payload->>'weight_g')::int,weight_g),consumable=coalesce((p_payload->>'consumable')::boolean,consumable),heal_dice=coalesce((p_payload->>'heal_dice')::int,heal_dice),heal_sides=coalesce((p_payload->>'heal_sides')::int,heal_sides),heal_bonus=coalesce((p_payload->>'heal_bonus')::int,heal_bonus),version=version+1 WHERE id=item.id RETURNING * INTO item;PERFORM game_private.inventory_note(item,'Bestand gesetzt',item.quantity);
   ELSIF p_action='item.equip' THEN
    IF item.scope<>'character' OR (item.quantity=0 AND coalesce((p_payload->>'equipped')::boolean,false)) THEN RAISE EXCEPTION 'Persönlicher Bestand erforderlich'; END IF;
    UPDATE game_private.inventory_items SET equipped=(p_payload->>'equipped')::boolean,version=version+1 WHERE id=item.id RETURNING * INTO item;PERFORM game_private.inventory_note(item,'Ausrüstung geändert',item.quantity);
   ELSIF p_action='item.consume' THEN
    IF item.scope<>'character' OR NOT item.consumable THEN RAISE EXCEPTION 'Nur persönliche Verbrauchsgegenstände'; END IF;
    amount:=(p_payload->>'amount')::int;IF amount IS NULL OR amount NOT BETWEEN 1 AND 9999 OR amount>item.quantity THEN RAISE EXCEPTION 'Nicht genügend Bestand'; END IF;
    IF item.heal_dice>0 THEN
     IF amount<>1 THEN RAISE EXCEPTION 'Heilgegenstände einzeln verwenden'; END IF;
     PERFORM 1 FROM public.character_slots WHERE char_key=item.char_key FOR UPDATE;
     SELECT v.version,d.sheet||s.sheet INTO version_value,raw FROM public.character_slots s JOIN game_private.character_versions v USING(char_key) JOIN game_private.combat_defaults d USING(char_key) WHERE s.char_key=item.char_key;
     IF version_value IS DISTINCT FROM (p_payload->>'character_version')::bigint THEN RAISE EXCEPTION 'Versionskonflikt: Charakter erneut laden' USING ERRCODE='40001'; END IF;
     IF game_private.combat_int(raw#>'{ds,1}',0,0,3)>=3 THEN RAISE EXCEPTION 'Wiederbelebung durch Spielleitung erforderlich'; END IF;
     FOR i IN 1..item.heal_dice LOOP n:=game_private.inventory_random(item.heal_sides);dice:=dice||jsonb_build_array(n);rolled:=rolled+n; END LOOP;rolled:=rolled+item.heal_bonus;
     hp:=game_private.combat_int(raw->'hp',0,0,9999);hpmax:=game_private.combat_int(raw->'hpMax',1,1,9999);
     UPDATE public.character_slots SET sheet=sheet||jsonb_build_object('hp',least(hpmax,hp+rolled),'ds',jsonb_build_array(0,0)) WHERE char_key=item.char_key;
    END IF;
    UPDATE game_private.inventory_items SET quantity=quantity-amount,equipped=equipped AND quantity>amount,version=version+1 WHERE id=item.id RETURNING * INTO item;PERFORM game_private.inventory_note(item,CASE WHEN rolled>0 THEN 'Verbraucht · Heilung '||rolled::text||' TP · Würfel '||dice::text ELSE 'Verbraucht' END,amount);
   ELSE
    amount:=(p_payload->>'amount')::int;location:=p_payload->>'destination';target_key:=nullif(p_payload->>'target_key','');target_campaign:=CASE WHEN location<>'character' THEN cid END;
    IF amount IS NULL OR amount NOT BETWEEN 1 AND 999999 OR amount>item.quantity OR location IS NULL OR location NOT IN ('character','chest','loot') THEN RAISE EXCEPTION 'Ungültige Übertragung'; END IF;
    IF location='character' AND NOT EXISTS(SELECT 1 FROM public.character_slots WHERE char_key=target_key) THEN RAISE EXCEPTION 'Charakter erforderlich'; END IF;
    IF a<>'gm' AND ((location='character' AND target_key<>a) OR location='loot' OR (location='chest' AND (p_payload->>'active_campaign_id')::uuid IS DISTINCT FROM active)) THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
    IF location<>'character' AND archived THEN RAISE EXCEPTION 'Kampagne ist archiviert'; END IF;
    IF (location=item.scope AND (target_key=item.char_key OR target_campaign=item.campaign_id)) THEN RAISE EXCEPTION 'Anderen Zielbestand wählen'; END IF;
    IF (SELECT count(*) FROM game_private.inventory_items)>=10000 THEN RAISE EXCEPTION 'Maximal 10000 Inventareinträge'; END IF;
    INSERT INTO game_private.inventory_items(scope,char_key,campaign_id,title,notes,quantity,unit_cp,weight_g,consumable,heal_dice,heal_sides,heal_bonus)
    VALUES(location,CASE WHEN location='character' THEN target_key END,target_campaign,item.title,item.notes,amount,item.unit_cp,item.weight_g,item.consumable,item.heal_dice,item.heal_sides,item.heal_bonus) RETURNING * INTO destination;
    UPDATE game_private.inventory_items SET quantity=quantity-amount,equipped=equipped AND quantity>amount,version=version+1 WHERE id=item.id RETURNING * INTO item;
    PERFORM game_private.inventory_note(item,'Abgegeben',amount);PERFORM game_private.inventory_note(destination,'Erhalten',amount);
   END IF;
   result:=jsonb_build_object('item',to_jsonb(item),'destination',to_jsonb(destination),'healing',rolled,'dice',dice);
  ELSIF p_action='table.save' THEN
   data:=p_payload->'entries';IF jsonb_typeof(data) IS DISTINCT FROM 'array' OR jsonb_array_length(data) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION '1–100 Tabelleneinträge erforderlich'; END IF;
   FOR entry IN SELECT * FROM jsonb_array_elements(data) LOOP
    IF jsonb_typeof(entry)<>'object' OR length(coalesce(entry->>'title','')) NOT BETWEEN 1 AND 100 OR length(coalesce(entry->>'body',''))>2000 OR coalesce(entry->>'weight','')!~'^[0-9]{1,3}$' OR (entry->>'weight')::int NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Ungültiger Tabelleneintrag'; END IF;
   END LOOP;
   IF nullif(p_payload->>'id','') IS NULL THEN
    IF (SELECT count(*) FROM game_private.inventory_tables WHERE campaign_id=cid)>=50 THEN RAISE EXCEPTION 'Maximal 50 eigene Tabellen je Kampagne'; END IF;
    INSERT INTO game_private.inventory_tables(campaign_id,title,entries) VALUES(cid,trim(p_payload->>'title'),data) RETURNING * INTO tab;
   ELSE
    UPDATE game_private.inventory_tables SET title=trim(p_payload->>'title'),entries=data,version=version+1 WHERE id=(p_payload->>'id')::uuid AND campaign_id=cid AND version=(p_payload->>'version')::bigint RETURNING * INTO tab;
    IF NOT FOUND THEN RAISE EXCEPTION 'Versionskonflikt: Tabelle erneut laden' USING ERRCODE='40001'; END IF;
   END IF;result:=to_jsonb(tab);PERFORM game_private.inventory_emit(NULL,cid,'loot');
  ELSIF p_action='generate' THEN
   IF (SELECT count(*) FROM game_private.inventory_generated WHERE campaign_id=cid)>=1000 THEN RAISE EXCEPTION 'Maximal 1000 Generatorergebnisse je Kampagne'; END IF;
   kind:=p_payload->>'kind';
   IF kind='custom' THEN
    SELECT * INTO tab FROM game_private.inventory_tables WHERE id=(p_payload->>'table_id')::uuid AND campaign_id=cid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Tabelle nicht gefunden'; END IF;
    SELECT sum((x->>'weight')::int) INTO total FROM jsonb_array_elements(tab.entries)x;pick:=game_private.inventory_random(total);
    FOR entry IN SELECT * FROM jsonb_array_elements(tab.entries) LOOP pick:=pick-(entry->>'weight')::int;EXIT WHEN pick<=0; END LOOP;
    data:=jsonb_build_object('title',entry->>'title','body',coalesce(entry->>'body',''),'table_title',tab.title,'table_version',tab.version);
   ELSE
    data:=game_private.inventory_catalog()->kind;
    IF jsonb_typeof(data) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Unbekannte lokale Tabelle'; END IF;
    data:=data->(game_private.inventory_random(jsonb_array_length(data))-1);
   END IF;
   INSERT INTO game_private.inventory_generated(campaign_id,kind,data) VALUES(cid,kind,data) RETURNING * INTO generated;result:=to_jsonb(generated);PERFORM game_private.inventory_emit(NULL,cid,'loot');
  ELSIF p_action='generator.save' THEN
   SELECT * INTO generated FROM game_private.inventory_generated WHERE id=(p_payload->>'id')::uuid AND campaign_id=cid FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Ergebnis nicht gefunden'; END IF;
   IF generated.saved IS NOT NULL THEN result:=generated.saved;
   ELSIF generated.kind='loot' THEN
    data:='[]';
    IF (SELECT count(*) FROM game_private.inventory_items)+jsonb_array_length(generated.data->'items')>10000 THEN RAISE EXCEPTION 'Maximal 10000 Inventareinträge'; END IF;
    FOR entry IN SELECT * FROM jsonb_array_elements(generated.data->'items') LOOP
     INSERT INTO game_private.inventory_items(campaign_id,scope,title,quantity,unit_cp,weight_g,consumable,heal_dice,heal_sides,heal_bonus)
     VALUES(cid,'loot',entry->>'title',(entry->>'quantity')::int,coalesce((entry->>'unit_cp')::int,0),coalesce((entry->>'weight_g')::int,0),coalesce((entry->>'consumable')::boolean,false),coalesce((entry->>'heal_dice')::int,0),coalesce((entry->>'heal_sides')::int,4),coalesce((entry->>'heal_bonus')::int,0)) RETURNING * INTO item;
     data:=data||jsonb_build_array(item.id);PERFORM game_private.inventory_note(item,'Generatorbeute gespeichert',item.quantity);
    END LOOP;result:=jsonb_build_object('items',data,'kind','loot');
   ELSE
    result:=public.dnd_campaign_call(p_token,'record.save',jsonb_build_object('campaign_id',cid,'kind',CASE generated.kind WHEN 'npc' THEN 'npc' WHEN 'quest' THEN 'quest' ELSE 'journal' END,'title',generated.data->>'title','body',generated.data->>'body','data','{}'::jsonb,'request_id',gen_random_uuid()));
    result:=jsonb_build_object('record_id',result->'id','kind',generated.kind);
   END IF;
   UPDATE game_private.inventory_generated SET saved=result WHERE id=generated.id;PERFORM game_private.inventory_emit(NULL,cid,'loot');
  END IF;
 END IF;
 DELETE FROM game_private.inventory_commands WHERE created_at<now()-interval '24 hours';
 IF (SELECT count(*) FROM game_private.inventory_commands WHERE actor_key=a)>=10000 THEN RAISE EXCEPTION 'Tageskontingent erreicht'; END IF;
 INSERT INTO game_private.inventory_commands VALUES(req,a,p_action,h,result,now());RETURN result;
END;$$;
REVOKE ALL ON FUNCTION game_private.inventory_random(int),game_private.inventory_catalog(),game_private.inventory_emit(text,uuid,text),game_private.inventory_note(game_private.inventory_items,text,int),game_private.inventory_snapshot(text,uuid),public.dnd_inventory_call(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dnd_inventory_call(text,text,jsonb) TO anon;
NOTIFY pgrst,'reload schema';
COMMIT;
