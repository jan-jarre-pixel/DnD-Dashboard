-- Phase 5: private tiled maps. No changes to existing character data or RPCs.
BEGIN;
CREATE TABLE game_private.vtt_maps(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
 scene text NOT NULL DEFAULT '' CHECK(length(scene)<=200), encounter_id uuid REFERENCES game_private.encounters(id),
 width int NOT NULL CHECK(width BETWEEN 256 AND 2048),height int NOT NULL CHECK(height BETWEEN 256 AND 2048),
 grid text NOT NULL DEFAULT 'square' CHECK(grid IN ('square','hex','none')),grid_size int NOT NULL DEFAULT 50 CHECK(grid_size BETWEEN 20 AND 200),
 offset_x int NOT NULL DEFAULT 0 CHECK(abs(offset_x)<=1000),offset_y int NOT NULL DEFAULT 0 CHECK(abs(offset_y)<=1000),
 scale int NOT NULL DEFAULT 5 CHECK(scale BETWEEN 1 AND 100),archived boolean NOT NULL DEFAULT false,
 version bigint NOT NULL DEFAULT 1,public_version bigint NOT NULL DEFAULT 1,layout_version bigint NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX vtt_maps_encounter ON game_private.vtt_maps(encounter_id);
CREATE TABLE game_private.vtt_tiles(
 map_id uuid NOT NULL REFERENCES game_private.vtt_maps(id),x int NOT NULL CHECK(x BETWEEN 0 AND 7),y int NOT NULL CHECK(y BETWEEN 0 AND 7),
 image text NOT NULL CHECK(length(image)<=100000),hash text NOT NULL,revealed boolean NOT NULL DEFAULT false,PRIMARY KEY(map_id,x,y));
CREATE TABLE game_private.vtt_state(id int PRIMARY KEY CHECK(id=1),map_id uuid REFERENCES game_private.vtt_maps(id),session_id uuid,version bigint NOT NULL DEFAULT 1);
INSERT INTO game_private.vtt_state(id) VALUES(1);
CREATE TABLE game_private.vtt_tokens(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),map_id uuid NOT NULL REFERENCES game_private.vtt_maps(id),
 combatant_id uuid UNIQUE REFERENCES game_private.combatants(id),char_key text REFERENCES public.character_slots(char_key),
 owner_key text REFERENCES game_private.actor_identities(actor_key),name text NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
 x int NOT NULL,y int NOT NULL,rotation int NOT NULL DEFAULT 0 CHECK(rotation BETWEEN 0 AND 359),
 size numeric NOT NULL DEFAULT 1 CHECK(size BETWEEN 0.5 AND 4),visible boolean NOT NULL DEFAULT false,version bigint NOT NULL DEFAULT 1);
CREATE INDEX vtt_tokens_map ON game_private.vtt_tokens(map_id);
CREATE INDEX vtt_tokens_character ON game_private.vtt_tokens(char_key);
CREATE INDEX vtt_tokens_owner ON game_private.vtt_tokens(owner_key);
CREATE INDEX vtt_state_map ON game_private.vtt_state(map_id);
CREATE TABLE game_private.vtt_objects(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),map_id uuid NOT NULL REFERENCES game_private.vtt_maps(id),
 layer text NOT NULL CHECK(layer IN ('props','effects','notes')),shape text NOT NULL CHECK(shape IN ('rect','circle')),
 label text NOT NULL DEFAULT '' CHECK(length(label)<=120),x int NOT NULL,y int NOT NULL,w int NOT NULL CHECK(w BETWEEN 10 AND 512),h int NOT NULL CHECK(h BETWEEN 10 AND 512),
 visible boolean NOT NULL DEFAULT false,version bigint NOT NULL DEFAULT 1);
CREATE INDEX vtt_objects_map ON game_private.vtt_objects(map_id);
CREATE TABLE game_private.vtt_commands(request_id uuid PRIMARY KEY,actor_key text NOT NULL,action text NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX vtt_commands_created ON game_private.vtt_commands(created_at);
CREATE TABLE game_private.vtt_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),map_id uuid NOT NULL REFERENCES game_private.vtt_maps(id),actor_key text NOT NULL,action text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE INDEX vtt_log_map ON game_private.vtt_log(map_id,created_at DESC);
ALTER TABLE game_private.vtt_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.vtt_tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.vtt_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.vtt_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.vtt_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.vtt_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.vtt_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON game_private.vtt_maps,game_private.vtt_tiles,game_private.vtt_state,game_private.vtt_tokens,game_private.vtt_objects,game_private.vtt_commands,game_private.vtt_log FROM PUBLIC,anon,authenticated;

CREATE FUNCTION game_private.vtt_area_visible(a text,m uuid,px numeric,py numeric,rw numeric DEFAULT 0,rh numeric DEFAULT 0) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT a='gm' OR (NOT EXISTS(SELECT 1 FROM generate_series(floor((px-rw)/256)::int,floor((px+rw)/256)::int) xx CROSS JOIN generate_series(floor((py-rh)/256)::int,floor((py+rh)/256)::int) yy WHERE NOT EXISTS(SELECT 1 FROM game_private.vtt_tiles t WHERE t.map_id=m AND t.x=xx AND t.y=yy AND t.revealed)));
$$;
CREATE FUNCTION game_private.vtt_token_visible(a text,t game_private.vtt_tokens) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT a='gm' OR (t.visible AND game_private.vtt_area_visible(a,t.map_id,t.x,t.y,t.size*m.grid_size/2,t.size*m.grid_size/2)
 AND (t.combatant_id IS NULL OR EXISTS(SELECT 1 FROM game_private.combatants c JOIN game_private.encounters e ON e.id=c.encounter_id JOIN public.dnd_room r ON r.id=1 WHERE c.id=t.combatant_id AND c.enabled AND (c.char_key IS NOT NULL OR c.visible) AND e.status<>'preparing' AND e.session_id=r.session_id))) FROM game_private.vtt_maps m WHERE m.id=t.map_id;
$$;
CREATE FUNCTION game_private.vtt_snapshot(a text,p_id uuid,p_known jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE m game_private.vtt_maps%rowtype;state game_private.vtt_state%rowtype;room public.dnd_room%rowtype;library jsonb:='[]';tiles jsonb;tokens jsonb;objects jsonb;
BEGIN
 SELECT * INTO room FROM public.dnd_room WHERE id=1;SELECT * INTO state FROM game_private.vtt_state WHERE id=1;
 IF a='gm' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'scene',scene,'archived',archived) ORDER BY created_at DESC),'[]') INTO library FROM game_private.vtt_maps;
  SELECT * INTO m FROM game_private.vtt_maps WHERE id=coalesce(p_id,state.map_id);
 ELSE
  SELECT * INTO m FROM game_private.vtt_maps WHERE id=state.map_id AND NOT archived AND state.session_id=room.session_id AND room.status IN ('active','paused');
 END IF;
 IF m.id IS NULL THEN RETURN jsonb_build_object('map',null,'library',library,'session_id',room.session_id,'session_status',room.status,'state_version',CASE WHEN a='gm' THEN state.version ELSE NULL END); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('x',x,'y',y,'hash',hash,'revealed',revealed)||CASE WHEN p_known->>(x||','||y)=hash THEN '{}'::jsonb ELSE jsonb_build_object('image',image) END ORDER BY y,x),'[]') INTO tiles FROM game_private.vtt_tiles WHERE map_id=m.id AND (a='gm' OR revealed);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',CASE WHEN t.combatant_id IS NOT NULL OR t.char_key IS NOT NULL THEN s->>'name' ELSE t.name END,'x',t.x,'y',t.y,'rotation',t.rotation,'size',t.size,'version',t.version,'owner_key',t.owner_key,'char_key',t.char_key,'combatant_id',t.combatant_id)
 ||CASE WHEN a='gm' THEN jsonb_build_object('visible',t.visible) ELSE '{}'::jsonb END
 ||CASE WHEN c.id IS NOT NULL AND (a='gm' OR c.char_key IS NOT NULL OR c.show_stats) OR t.combatant_id IS NULL AND t.char_key IS NOT NULL THEN jsonb_build_object('hp',s->'hp','hpMax',s->'hpMax','conditions',s->'conditions') ELSE '{}'::jsonb END ORDER BY t.id),'[]') INTO tokens
 FROM game_private.vtt_tokens t LEFT JOIN game_private.combatants c ON c.id=t.combatant_id
 LEFT JOIN public.character_slots cs ON cs.char_key=t.char_key LEFT JOIN game_private.combat_defaults d ON d.char_key=t.char_key
 CROSS JOIN LATERAL (SELECT CASE WHEN c.id IS NOT NULL THEN game_private.combat_state(c) ELSE coalesce(d.sheet,'{}')||coalesce(cs.sheet,'{}') END s) z
 WHERE t.map_id=m.id AND game_private.vtt_token_visible(a,t);
 SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY id),'[]') INTO objects FROM (SELECT id,layer,shape,label,x,y,w,h,version,CASE WHEN a='gm' THEN visible ELSE NULL END visible FROM game_private.vtt_objects o WHERE map_id=m.id AND (a='gm' OR (visible AND layer<>'notes' AND game_private.vtt_area_visible(a,m.id,x,y,w/2.0,h/2.0))))v;
 RETURN jsonb_build_object('map',jsonb_build_object('id',m.id,'title',m.title,'scene',m.scene,'encounter_id',CASE WHEN a='gm' THEN m.encounter_id ELSE NULL END,'width',m.width,'height',m.height,'grid',m.grid,'grid_size',m.grid_size,'offset_x',m.offset_x,'offset_y',m.offset_y,'scale',m.scale,'version',CASE WHEN a='gm' THEN m.version ELSE m.public_version END,'layout_version',m.layout_version,'archived',m.archived,'published',state.map_id=m.id AND state.session_id=room.session_id AND room.status IN ('active','paused'),'tiles',tiles,'tokens_hash',md5(tokens::text),'tokens',CASE WHEN p_known->>'_tokens'=md5(tokens::text) THEN NULL ELSE tokens END,'objects_hash',md5(objects::text),'objects',CASE WHEN p_known->>'_objects'=md5(objects::text) THEN NULL ELSE objects END,
 'pings',coalesce((SELECT jsonb_agg(jsonb_build_object('id',l.id,'actor',l.actor_key,'x',l.payload->'x','y',l.payload->'y','created_at',l.created_at) ORDER BY l.created_at) FROM game_private.vtt_log l WHERE l.map_id=m.id AND l.action='ping' AND l.created_at>now()-interval '8 seconds' AND game_private.vtt_area_visible(a,m.id,(l.payload->>'x')::int,(l.payload->>'y')::int)),'[]'::jsonb)),
 'library',library,'session_id',room.session_id,'session_status',room.status,'state_version',CASE WHEN a='gm' THEN state.version ELSE NULL END);
END;$$;

CREATE FUNCTION public.dnd_vtt_call(p_token text,p_action text,p_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a text;identity jsonb;req uuid;hash text;cached game_private.vtt_commands%rowtype;m game_private.vtt_maps%rowtype;state game_private.vtt_state%rowtype;room public.dnd_room%rowtype;t game_private.vtt_tokens%rowtype;oldtoken game_private.vtt_tokens%rowtype;o game_private.vtt_objects%rowtype;c game_private.combatants%rowtype;
 result jsonb;tile jsonb;img text;bytes bytea;ix int;iy int;px int;py int;rot int;sz numeric;name text;is_public boolean:=false;published boolean;old_visible boolean;step int;steps int;area numeric;ownerkey text;character_key text;cid uuid;limit_n int;known jsonb;
BEGIN
 identity:=game_private.dnd_session_identity(p_token);IF identity IS NULL THEN RAISE EXCEPTION 'Sitzung abgelaufen' USING ERRCODE='28000'; END IF;a:=identity->>'actor';
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>2100000 THEN RAISE EXCEPTION 'Ungültige Anfrage / Größenlimit'; END IF;
 IF p_action='snapshot' THEN
  known:=coalesce(p_payload->'known','{}');IF jsonb_typeof(known)<>'object' OR octet_length(known::text)>10000 THEN RAISE EXCEPTION 'Ungültiger Kachelcache'; END IF;
  RETURN game_private.vtt_snapshot(a,(p_payload->>'id')::uuid,known);
 END IF;
 IF p_action IS NULL OR p_action NOT IN ('create','settings','publish','unpublish','archive','fog','token.add','token.update','token.move','token.remove','object.add','object.update','object.remove','ping') THEN RAISE EXCEPTION 'Unbekannte Kartenaktion'; END IF;
 IF a<>'gm' AND p_action NOT IN ('token.move','ping') THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
 IF p_action<>'create' AND octet_length(p_payload::text)>30000 THEN RAISE EXCEPTION 'Anfrage zu groß'; END IF;
 req:=(p_payload->>'request_id')::uuid;IF req IS NULL THEN RAISE EXCEPTION 'Request-ID erforderlich'; END IF;
 hash:=encode(extensions.digest((p_payload-'request_id')::text,'sha256'),'hex');
 PERFORM 1 FROM game_private.session_workspace WHERE id=1 FOR UPDATE;
 SELECT * INTO cached FROM game_private.vtt_commands WHERE request_id=req;
 IF FOUND THEN IF cached.actor_key<>a OR cached.action<>p_action OR cached.payload_hash<>hash THEN RAISE EXCEPTION 'Request-ID bereits verwendet'; END IF;RETURN cached.result; END IF;
 SELECT * INTO room FROM public.dnd_room WHERE id=1;SELECT * INTO state FROM game_private.vtt_state WHERE id=1 FOR UPDATE;
 IF (p_payload->>'session_id')::uuid IS DISTINCT FROM room.session_id THEN RAISE EXCEPTION 'Spielsitzung wurde gewechselt'; END IF;
 IF p_action='create' THEN
  IF (SELECT count(*) FROM game_private.vtt_maps)>=24 THEN RAISE EXCEPTION 'Maximal 24 Karten inklusive Archiv'; END IF;
  IF jsonb_typeof(p_payload->'tiles') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'tiles') NOT BETWEEN 1 AND 64 OR octet_length((p_payload->'tiles')::text)>2000000 THEN RAISE EXCEPTION 'Maximal 64 Kacheln / 2 MB'; END IF;
  INSERT INTO game_private.vtt_maps(title,scene,width,height) VALUES(trim(p_payload->>'title'),coalesce(p_payload->>'scene',''),(p_payload->>'width')::int,(p_payload->>'height')::int) RETURNING * INTO m;
  FOR tile IN SELECT value FROM jsonb_array_elements(p_payload->'tiles') LOOP
   ix:=(tile->>'x')::int;iy:=(tile->>'y')::int;img:=tile->>'image';
   IF ix IS NULL OR iy IS NULL OR ix<0 OR iy<0 OR ix>=ceil(m.width/256.0) OR iy>=ceil(m.height/256.0) OR img IS NULL OR length(img)>100000 OR img!~'^data:image/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$' THEN RAISE EXCEPTION 'Ungültige Bildkachel'; END IF;
   bytes:=decode(split_part(img,',',2),'base64');
   IF NOT (substring(bytes from 1 for 8)=decode('89504e470d0a1a0a','hex') AND img LIKE 'data:image/png;%') AND NOT (substring(bytes from 1 for 3)=decode('ffd8ff','hex') AND img LIKE 'data:image/jpeg;%') AND NOT (substring(bytes from 1 for 4)=decode('52494646','hex') AND substring(bytes from 9 for 4)=decode('57454250','hex') AND img LIKE 'data:image/webp;%') THEN RAISE EXCEPTION 'Nicht unterstütztes Bildformat'; END IF;
   INSERT INTO game_private.vtt_tiles(map_id,x,y,image,hash) VALUES(m.id,ix,iy,img,encode(extensions.digest(img,'sha256'),'hex'));
  END LOOP;
  IF (SELECT count(*) FROM game_private.vtt_tiles WHERE map_id=m.id)<>ceil(m.width/256.0)*ceil(m.height/256.0) THEN RAISE EXCEPTION 'Unvollständige Bildkacheln'; END IF;
 ELSE
  SELECT * INTO m FROM game_private.vtt_maps WHERE id=(p_payload->>'id')::uuid FOR UPDATE;
  published:=m.id=state.map_id AND state.session_id=room.session_id AND room.status IN ('active','paused') AND NOT m.archived;
  IF NOT FOUND OR (a<>'gm' AND NOT coalesce(published,false)) THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
  IF p_action NOT IN ('token.move','token.update','ping') AND (p_payload->>'version')::bigint IS DISTINCT FROM m.version THEN RAISE EXCEPTION 'Versionskonflikt: Karte geändert' USING ERRCODE='40001'; END IF;
  IF a<>'gm' AND room.status<>'active' THEN RAISE EXCEPTION 'Sitzung pausiert'; END IF;
  IF p_action IN ('publish','unpublish') THEN
   IF (p_payload->>'state_version')::bigint IS DISTINCT FROM state.version THEN RAISE EXCEPTION 'Versionskonflikt: Veröffentlichte Karte geändert' USING ERRCODE='40001'; END IF;
   IF p_action='publish' THEN
    IF m.archived OR room.status NOT IN ('active','paused') THEN RAISE EXCEPTION 'Aktive Sitzung und nicht archivierte Karte erforderlich'; END IF;
    UPDATE game_private.vtt_state SET map_id=m.id,session_id=room.session_id,version=version+1 WHERE id=1;
   ELSE
    IF state.map_id IS DISTINCT FROM m.id THEN RAISE EXCEPTION 'Karte ist nicht veröffentlicht'; END IF;
    UPDATE game_private.vtt_state SET map_id=NULL,session_id=NULL,version=version+1 WHERE id=1;
   END IF;
   is_public:=true;
  ELSIF p_action='settings' THEN
   IF EXISTS(SELECT 1 FROM game_private.vtt_tokens WHERE map_id=m.id AND combatant_id IS NOT NULL) AND (p_payload->>'encounter_id')::uuid IS DISTINCT FROM m.encounter_id THEN RAISE EXCEPTION 'Verknüpfte Tokens zuerst entfernen'; END IF;
   UPDATE game_private.vtt_maps SET title=trim(p_payload->>'title'),scene=coalesce(p_payload->>'scene',''),grid=p_payload->>'grid',grid_size=(p_payload->>'grid_size')::int,offset_x=(p_payload->>'offset_x')::int,offset_y=(p_payload->>'offset_y')::int,scale=(p_payload->>'scale')::int,encounter_id=(p_payload->>'encounter_id')::uuid,layout_version=layout_version+1 WHERE id=m.id;
   IF EXISTS(SELECT 1 FROM game_private.vtt_tokens vt WHERE vt.map_id=m.id AND (vt.x-vt.size*(p_payload->>'grid_size')::int/2<0 OR vt.y-vt.size*(p_payload->>'grid_size')::int/2<0 OR vt.x+vt.size*(p_payload->>'grid_size')::int/2>=m.width OR vt.y+vt.size*(p_payload->>'grid_size')::int/2>=m.height)) THEN RAISE EXCEPTION 'Rasteränderung würde Tokens außerhalb der Karte platzieren'; END IF;
   is_public:=published;
  ELSIF p_action='archive' THEN
   IF state.map_id=m.id THEN RAISE EXCEPTION 'Karte zuerst zurückziehen'; END IF;
   UPDATE game_private.vtt_maps SET archived=NOT archived WHERE id=m.id;
  ELSIF p_action='fog' THEN
   IF jsonb_typeof(p_payload->'cells') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'cells') NOT BETWEEN 1 AND 64 OR jsonb_typeof(p_payload->'revealed') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Kacheln und Freigabe erforderlich'; END IF;
   FOR tile IN SELECT value FROM jsonb_array_elements(p_payload->'cells') LOOP
    UPDATE game_private.vtt_tiles SET revealed=(p_payload->>'revealed')::boolean WHERE map_id=m.id AND x=(tile->>0)::int AND y=(tile->>1)::int;
    IF NOT FOUND THEN RAISE EXCEPTION 'Kachel außerhalb der Karte'; END IF;
   END LOOP;
   UPDATE game_private.vtt_maps SET layout_version=layout_version+1 WHERE id=m.id;is_public:=published;
  ELSIF p_action IN ('token.add','token.update','token.move','token.remove') THEN
   IF p_action='token.add' THEN
    IF (SELECT count(*) FROM game_private.vtt_tokens WHERE map_id=m.id)>=50 THEN RAISE EXCEPTION 'Maximal 50 Tokens'; END IF;
    INSERT INTO game_private.vtt_tokens(map_id,name,x,y) VALUES(m.id,trim(p_payload->>'name'),(p_payload->>'x')::int,(p_payload->>'y')::int) RETURNING * INTO t;
   ELSE
    SELECT * INTO t FROM game_private.vtt_tokens WHERE id=(p_payload->>'target')::uuid AND map_id=m.id FOR UPDATE;
    IF NOT FOUND OR (a<>'gm' AND (t.owner_key IS DISTINCT FROM a OR NOT game_private.vtt_token_visible(a,t))) THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
    IF (p_payload->>'token_version')::bigint IS DISTINCT FROM t.version THEN RAISE EXCEPTION 'Versionskonflikt: Token geändert' USING ERRCODE='40001'; END IF;
   END IF;
   oldtoken:=t;old_visible:=game_private.vtt_token_visible('len',t);
   IF p_action='token.remove' THEN DELETE FROM game_private.vtt_tokens WHERE id=t.id;
   ELSE
    px:=(p_payload->>'x')::int;py:=(p_payload->>'y')::int;rot:=coalesce((p_payload->>'rotation')::int,t.rotation);sz:=CASE WHEN a='gm' THEN coalesce((p_payload->>'size')::numeric,t.size) ELSE t.size END;
    IF px IS NULL OR py IS NULL OR sz IS NULL OR sz NOT BETWEEN 0.5 AND 4 OR px-sz*m.grid_size/2<0 OR py-sz*m.grid_size/2<0 OR px+sz*m.grid_size/2>=m.width OR py+sz*m.grid_size/2>=m.height THEN RAISE EXCEPTION 'Token muss vollständig innerhalb der Karte liegen'; END IF;
    IF p_action='token.move' THEN
     IF (p_payload->>'layout_version')::bigint IS DISTINCT FROM m.layout_version THEN RAISE EXCEPTION 'Versionskonflikt: Kartenfreigabe geändert' USING ERRCODE='40001'; END IF;
     IF a<>'gm' THEN
      steps:=greatest(1,ceil(greatest(abs(px-t.x),abs(py-t.y))/32.0)::int);
      FOR step IN 0..steps LOOP
       IF NOT game_private.vtt_area_visible(a,m.id,t.x+(px-t.x)*step::numeric/steps,t.y+(py-t.y)*step::numeric/steps,sz*m.grid_size/2,sz*m.grid_size/2) THEN RAISE EXCEPTION 'Bewegung nur durch freigegebene Bereiche'; END IF;
      END LOOP;
     END IF;
    END IF;
    IF p_action IN ('token.add','token.update') THEN
     cid:=(p_payload->>'combatant_id')::uuid;character_key:=nullif(p_payload->>'char_key','');ownerkey:=nullif(p_payload->>'owner_key','');
     IF ownerkey='gm' THEN RAISE EXCEPTION 'Besitz: Spieler oder Spielleitung (leer)'; END IF;
     IF cid IS NOT NULL THEN
      SELECT * INTO c FROM game_private.combatants WHERE id=cid;
      IF NOT FOUND OR m.encounter_id IS NULL OR c.encounter_id<>m.encounter_id THEN RAISE EXCEPTION 'Teilnehmer gehört nicht zur zugeordneten Begegnung'; END IF;
      character_key:=c.char_key;
     END IF;
     IF character_key IS NOT NULL AND ownerkey IS DISTINCT FROM character_key THEN RAISE EXCEPTION 'Charaktertoken gehört diesem Spieler'; END IF;
     UPDATE game_private.vtt_tokens SET name=trim(p_payload->>'name'),owner_key=ownerkey,char_key=character_key,combatant_id=cid,visible=coalesce((p_payload->>'visible')::boolean,false) WHERE id=t.id;
    END IF;
    UPDATE game_private.vtt_tokens SET x=px,y=py,rotation=rot,size=sz,version=version+1 WHERE id=t.id RETURNING * INTO t;
   END IF;
   is_public:=published AND (old_visible OR (p_action<>'token.remove' AND game_private.vtt_token_visible('len',t)));
   result:=jsonb_build_object('target',t.id);
  ELSIF p_action IN ('object.add','object.update','object.remove') THEN
   IF p_action='object.add' THEN
    IF (SELECT count(*) FROM game_private.vtt_objects WHERE map_id=m.id)>=500 THEN RAISE EXCEPTION 'Maximal 500 Kartenobjekte'; END IF;
    INSERT INTO game_private.vtt_objects(map_id,layer,shape,x,y,w,h) VALUES(m.id,p_payload->>'layer',p_payload->>'shape',0,0,10,10) RETURNING * INTO o;
   ELSE
    SELECT * INTO o FROM game_private.vtt_objects WHERE id=(p_payload->>'target')::uuid AND map_id=m.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
   END IF;
   old_visible:=o.visible AND o.layer<>'notes' AND game_private.vtt_area_visible('len',m.id,o.x,o.y,o.w/2.0,o.h/2.0);
   IF p_action='object.remove' THEN DELETE FROM game_private.vtt_objects WHERE id=o.id;
   ELSE
    px:=(p_payload->>'x')::int;py:=(p_payload->>'y')::int;ix:=(p_payload->>'w')::int;iy:=(p_payload->>'h')::int;
    IF px IS NULL OR py IS NULL OR ix IS NULL OR iy IS NULL OR px-ix/2.0<0 OR py-iy/2.0<0 OR px+ix/2.0>=m.width OR py+iy/2.0>=m.height THEN RAISE EXCEPTION 'Objekt außerhalb der Karte'; END IF;
    UPDATE game_private.vtt_objects SET layer=p_payload->>'layer',shape=p_payload->>'shape',label=coalesce(p_payload->>'label',''),x=px,y=py,w=ix,h=iy,visible=coalesce((p_payload->>'visible')::boolean,false),version=version+1 WHERE id=o.id RETURNING * INTO o;
   END IF;
   is_public:=published AND (old_visible OR (p_action<>'object.remove' AND o.visible AND o.layer<>'notes' AND game_private.vtt_area_visible('len',m.id,o.x,o.y,o.w/2.0,o.h/2.0)));
   result:=jsonb_build_object('target',o.id);
  ELSIF p_action='ping' THEN
   px:=(p_payload->>'x')::int;py:=(p_payload->>'y')::int;
   IF NOT coalesce(published,false) OR px IS NULL OR py IS NULL OR px<0 OR py<0 OR px>=m.width OR py>=m.height OR NOT game_private.vtt_area_visible('len',m.id,px,py) THEN RAISE EXCEPTION 'Ping nur im veröffentlichten, freigegebenen Bereich'; END IF;
   IF EXISTS(SELECT 1 FROM game_private.vtt_log WHERE actor_key=a AND action='ping' AND created_at>clock_timestamp()-interval '1 second') THEN RAISE EXCEPTION 'Bitte kurz vor dem nächsten Ping warten'; END IF;
   result:=jsonb_build_object('x',px,'y',py);is_public:=true;
  END IF;
 END IF;
 IF p_action<>'ping' THEN UPDATE game_private.vtt_maps SET version=version+1,public_version=public_version+CASE WHEN is_public THEN 1 ELSE 0 END WHERE id=m.id; END IF;
 INSERT INTO game_private.vtt_log(map_id,actor_key,action,payload) VALUES(m.id,a,p_action,coalesce(result,'{}'));
 PERFORM game_private.sync_emit(CASE WHEN p_action='token.move' THEN 'TokenMoved' ELSE 'VTTChanged' END,'{}',NOT coalesce(is_public,false));
 DELETE FROM game_private.vtt_commands WHERE created_at<now()-interval '24 hours';
 IF (SELECT count(*) FROM game_private.vtt_commands WHERE actor_key=a)>=10000 THEN RAISE EXCEPTION 'Tageskontingent erreicht'; END IF;
 result:=jsonb_build_object('id',m.id,'confirmed',true,'result',coalesce(result,'{}'));
 INSERT INTO game_private.vtt_commands(request_id,actor_key,action,payload_hash,result) VALUES(req,a,p_action,hash,result);
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION game_private.vtt_area_visible(text,uuid,numeric,numeric,numeric,numeric),game_private.vtt_token_visible(text,game_private.vtt_tokens),game_private.vtt_snapshot(text,uuid,jsonb),public.dnd_vtt_call(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dnd_vtt_call(text,text,jsonb) TO anon;
NOTIFY pgrst,'reload schema';
COMMIT;
