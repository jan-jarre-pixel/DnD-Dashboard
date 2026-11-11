-- Phase 9: floors, bounded lights and conservative server-side line of sight.
BEGIN;
ALTER TABLE game_private.vtt_maps ADD COLUMN active_floor int NOT NULL DEFAULT 0 CHECK(active_floor BETWEEN 0 AND 3), ADD COLUMN vision_mode text NOT NULL DEFAULT 'manual' CHECK(vision_mode IN ('manual','sight')), ADD COLUMN ambient_light boolean NOT NULL DEFAULT true;
CREATE TABLE game_private.vtt_levels(map_id uuid REFERENCES game_private.vtt_maps(id) ON DELETE CASCADE, floor int CHECK(floor BETWEEN 0 AND 3), title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 60), PRIMARY KEY(map_id,floor));
INSERT INTO game_private.vtt_levels SELECT id,0,'Erdgeschoss' FROM game_private.vtt_maps;
CREATE FUNCTION game_private.vtt_initial_level() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN INSERT INTO game_private.vtt_levels VALUES(NEW.id,0,'Erdgeschoss');RETURN NEW;END;$$;
CREATE TRIGGER vtt_initial_level AFTER INSERT ON game_private.vtt_maps FOR EACH ROW EXECUTE FUNCTION game_private.vtt_initial_level();
ALTER TABLE game_private.vtt_tiles ADD COLUMN floor int NOT NULL DEFAULT 0, DROP CONSTRAINT vtt_tiles_pkey, ADD PRIMARY KEY(map_id,floor,x,y), ADD FOREIGN KEY(map_id,floor) REFERENCES game_private.vtt_levels(map_id,floor);
ALTER TABLE game_private.vtt_tokens ADD COLUMN floor int NOT NULL DEFAULT 0, ADD COLUMN vision_radius int NOT NULL DEFAULT 0 CHECK(vision_radius BETWEEN 0 AND 2048), ADD COLUMN darkvision_radius int NOT NULL DEFAULT 0 CHECK(darkvision_radius BETWEEN 0 AND 2048), ADD FOREIGN KEY(map_id,floor) REFERENCES game_private.vtt_levels(map_id,floor);
ALTER TABLE game_private.vtt_objects ADD COLUMN floor int NOT NULL DEFAULT 0, ADD FOREIGN KEY(map_id,floor) REFERENCES game_private.vtt_levels(map_id,floor);
CREATE INDEX vtt_tokens_floor ON game_private.vtt_tokens(map_id,floor);
CREATE INDEX vtt_objects_floor ON game_private.vtt_objects(map_id,floor);
CREATE TABLE game_private.vtt_features(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),map_id uuid NOT NULL REFERENCES game_private.vtt_maps(id) ON DELETE CASCADE, floor int NOT NULL DEFAULT 0,kind text NOT NULL CHECK(kind IN ('wall','door','light')),label text NOT NULL DEFAULT '' CHECK(length(label)<=100),x1 int NOT NULL CHECK(x1 BETWEEN 0 AND 2047),y1 int NOT NULL CHECK(y1 BETWEEN 0 AND 2047),x2 int NOT NULL CHECK(x2 BETWEEN 0 AND 2047),y2 int NOT NULL CHECK(y2 BETWEEN 0 AND 2047),radius int NOT NULL DEFAULT 256 CHECK(radius BETWEEN 1 AND 2048),enabled boolean NOT NULL DEFAULT true,door_state text NOT NULL DEFAULT 'closed' CHECK(door_state IN ('open','closed','locked')),version bigint NOT NULL DEFAULT 1,FOREIGN KEY(map_id,floor) REFERENCES game_private.vtt_levels(map_id,floor),CHECK(kind='light' OR x1<>x2 OR y1<>y2));
CREATE INDEX vtt_features_floor ON game_private.vtt_features(map_id,floor);
ALTER TABLE game_private.vtt_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.vtt_features ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON game_private.vtt_levels,game_private.vtt_features FROM PUBLIC,anon,authenticated;

CREATE FUNCTION game_private.vtt_cross(ax float8,ay float8,bx float8,by_ float8,cx float8,cy float8) RETURNS float8 LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT (bx-ax)*(cy-ay)-(by_-ay)*(cx-ax) $$;
CREATE FUNCTION game_private.vtt_segments(ax float8,ay float8,bx float8,by_ float8,cx float8,cy float8,dx float8,dy float8) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT greatest(ax,bx)>=least(cx,dx) AND greatest(cx,dx)>=least(ax,bx) AND greatest(ay,by_)>=least(cy,dy) AND greatest(cy,dy)>=least(ay,by_) AND game_private.vtt_cross(ax,ay,bx,by_,cx,cy)*game_private.vtt_cross(ax,ay,bx,by_,dx,dy)<=0 AND game_private.vtt_cross(cx,cy,dx,dy,ax,ay)*game_private.vtt_cross(cx,cy,dx,dy,bx,by_)<=0
$$;
CREATE FUNCTION game_private.vtt_in_triangle(px float8,py float8,ax float8,ay float8,bx float8,by_ float8,cx float8,cy float8) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT abs(game_private.vtt_cross(ax,ay,bx,by_,cx,cy))>0 AND ((game_private.vtt_cross(ax,ay,bx,by_,px,py)>=0 AND game_private.vtt_cross(bx,by_,cx,cy,px,py)>=0 AND game_private.vtt_cross(cx,cy,ax,ay,px,py)>=0) OR (game_private.vtt_cross(ax,ay,bx,by_,px,py)<=0 AND game_private.vtt_cross(bx,by_,cx,cy,px,py)<=0 AND game_private.vtt_cross(cx,cy,ax,ay,px,py)<=0))
$$;
CREATE FUNCTION game_private.vtt_triangle_hit(ox float8,oy float8,ax float8,ay float8,bx float8,by_ float8,x1 float8,y1 float8,x2 float8,y2 float8) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT game_private.vtt_in_triangle(x1,y1,ox,oy,ax,ay,bx,by_) OR game_private.vtt_in_triangle(x2,y2,ox,oy,ax,ay,bx,by_) OR game_private.vtt_segments(ox,oy,ax,ay,x1,y1,x2,y2) OR game_private.vtt_segments(ax,ay,bx,by_,x1,y1,x2,y2) OR game_private.vtt_segments(bx,by_,ox,oy,x1,y1,x2,y2)
$$;
CREATE FUNCTION game_private.vtt_clear_region(mid uuid,fl int,ox numeric,oy numeric,px numeric,py numeric,rw numeric,rh numeric,ignore_id uuid DEFAULT NULL) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT EXISTS(SELECT FROM game_private.vtt_features f WHERE f.map_id=mid AND f.floor=fl AND f.id IS DISTINCT FROM ignore_id AND f.enabled AND (f.kind='wall' OR f.kind='door' AND f.door_state<>'open') AND (game_private.vtt_triangle_hit(ox,oy,px-rw,py-rh,px+rw,py-rh,f.x1,f.y1,f.x2,f.y2) OR game_private.vtt_triangle_hit(ox,oy,px+rw,py-rh,px+rw,py+rh,f.x1,f.y1,f.x2,f.y2) OR game_private.vtt_triangle_hit(ox,oy,px+rw,py+rh,px-rw,py+rh,f.x1,f.y1,f.x2,f.y2) OR game_private.vtt_triangle_hit(ox,oy,px-rw,py+rh,px-rw,py-rh,f.x1,f.y1,f.x2,f.y2)))
$$;
CREATE FUNCTION game_private.vtt_fog_visible(mid uuid,fl int,px numeric,py numeric,rw numeric DEFAULT 0,rh numeric DEFAULT 0) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT EXISTS(SELECT FROM generate_series(floor((px-rw)/256)::int,floor((px+rw)/256)::int) xx CROSS JOIN generate_series(floor((py-rh)/256)::int,floor((py+rh)/256)::int) yy WHERE NOT EXISTS(SELECT FROM game_private.vtt_tiles t WHERE t.map_id=mid AND t.floor=fl AND t.x=xx AND t.y=yy AND t.revealed))
$$;
CREATE FUNCTION game_private.vtt_region_visible(a text,mid uuid,fl int,px numeric,py numeric,rw numeric DEFAULT 0,rh numeric DEFAULT 0,ignore_id uuid DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE m game_private.vtt_maps%rowtype;v game_private.vtt_tokens%rowtype;
BEGIN
 IF a='gm' THEN RETURN true;END IF;
 SELECT * INTO m FROM game_private.vtt_maps WHERE id=mid;
 IF NOT FOUND OR fl<>m.active_floor OR NOT game_private.vtt_fog_visible(mid,fl,px,py,rw,rh) THEN RETURN false;END IF;
 IF m.vision_mode='manual' THEN RETURN true;END IF;
 FOR v IN SELECT t.* FROM game_private.vtt_tokens t WHERE t.map_id=mid AND t.floor=fl AND t.owner_key=a AND t.visible AND t.vision_radius>0 AND game_private.vtt_fog_visible(mid,fl,t.x,t.y,t.size*m.grid_size/2,t.size*m.grid_size/2) AND (t.combatant_id IS NULL OR EXISTS(SELECT FROM game_private.combatants c JOIN game_private.encounters e ON e.id=c.encounter_id JOIN public.dnd_room r ON r.id=1 WHERE c.id=t.combatant_id AND c.enabled AND (c.char_key IS NOT NULL OR c.visible) AND e.status<>'preparing' AND e.session_id=r.session_id)) LOOP
  IF (abs(v.x-px)+rw)^2+(abs(v.y-py)+rh)^2<=v.vision_radius^2::numeric AND game_private.vtt_clear_region(mid,fl,v.x,v.y,px,py,rw,rh,ignore_id) AND (m.ambient_light OR (abs(v.x-px)+rw)^2+(abs(v.y-py)+rh)^2<=v.darkvision_radius^2::numeric OR EXISTS(SELECT FROM game_private.vtt_features l WHERE l.map_id=mid AND l.floor=fl AND l.kind='light' AND l.enabled AND (abs(l.x1-px)+rw)^2+(abs(l.y1-py)+rh)^2<=l.radius^2::numeric AND game_private.vtt_clear_region(mid,fl,l.x1,l.y1,px,py,rw,rh,ignore_id))) THEN RETURN true;END IF;
 END LOOP;
 RETURN false;
END;$$;
CREATE OR REPLACE FUNCTION game_private.vtt_area_visible(a text,m uuid,px numeric,py numeric,rw numeric DEFAULT 0,rh numeric DEFAULT 0) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT game_private.vtt_region_visible(a,m,active_floor,px,py,rw,rh) FROM game_private.vtt_maps WHERE id=m $$;
CREATE OR REPLACE FUNCTION game_private.vtt_token_visible(a text,t game_private.vtt_tokens) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT a='gm' OR (t.visible AND game_private.vtt_region_visible(a,t.map_id,t.floor,t.x,t.y,t.size*m.grid_size/2,t.size*m.grid_size/2) AND (t.combatant_id IS NULL OR EXISTS(SELECT FROM game_private.combatants c JOIN game_private.encounters e ON e.id=c.encounter_id JOIN public.dnd_room r ON r.id=1 WHERE c.id=t.combatant_id AND c.enabled AND (c.char_key IS NOT NULL OR c.visible) AND e.status<>'preparing' AND e.session_id=r.session_id))) FROM game_private.vtt_maps m WHERE m.id=t.map_id
$$;
CREATE FUNCTION game_private.vtt_any_token(t game_private.vtt_tokens) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT FROM unnest(ARRAY['len','gra','sas','pei']) a WHERE game_private.vtt_token_visible(a,t)) $$;
CREATE FUNCTION game_private.vtt_any_area(mid uuid,fl int,px numeric,py numeric,rw numeric DEFAULT 0,rh numeric DEFAULT 0) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT FROM unnest(ARRAY['len','gra','sas','pei']) a WHERE game_private.vtt_region_visible(a,mid,fl,px,py,rw,rh)) $$;

CREATE FUNCTION game_private.vtt_path_clear(mid uuid,fl int,ox numeric,oy numeric,px numeric,py numeric,r numeric) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT game_private.vtt_clear_region(mid,fl,ox-r,oy-r,px,py,r,r) AND game_private.vtt_clear_region(mid,fl,ox+r,oy-r,px,py,r,r) AND game_private.vtt_clear_region(mid,fl,ox+r,oy+r,px,py,r,r) AND game_private.vtt_clear_region(mid,fl,ox-r,oy+r,px,py,r,r)
$$;
CREATE OR REPLACE FUNCTION game_private.vtt_snapshot(a text,p_id uuid,p_known jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
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
 SELECT coalesce(jsonb_agg(jsonb_build_object('x',x,'y',y,'hash',hash,'revealed',revealed)||CASE WHEN coalesce(p_known->>'_floor','0')=m.active_floor::text AND p_known->>(x||','||y)=hash THEN '{}'::jsonb ELSE jsonb_build_object('image',image) END ORDER BY y,x),'[]') INTO tiles FROM game_private.vtt_tiles WHERE map_id=m.id AND floor=m.active_floor AND (a='gm' OR game_private.vtt_region_visible(a,m.id,floor,x*256+least(256,m.width-x*256)/2.0,y*256+least(256,m.height-y*256)/2.0,(least(256,m.width-x*256)-1)/2.0,(least(256,m.height-y*256)-1)/2.0));
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',CASE WHEN t.combatant_id IS NOT NULL OR t.char_key IS NOT NULL THEN s->>'name' ELSE t.name END,'x',t.x,'y',t.y,'rotation',t.rotation,'floor',t.floor,'size',t.size,'version',t.version,'owner_key',t.owner_key,'char_key',t.char_key,'combatant_id',t.combatant_id)
 ||CASE WHEN a='gm' THEN jsonb_build_object('visible',t.visible,'vision_radius',t.vision_radius,'darkvision_radius',t.darkvision_radius) ELSE '{}'::jsonb END
 ||CASE WHEN c.id IS NOT NULL AND (a='gm' OR c.char_key IS NOT NULL OR c.show_stats) OR t.combatant_id IS NULL AND t.char_key IS NOT NULL THEN jsonb_build_object('hp',s->'hp','hpMax',s->'hpMax','conditions',s->'conditions') ELSE '{}'::jsonb END ORDER BY t.id),'[]') INTO tokens
 FROM game_private.vtt_tokens t LEFT JOIN game_private.combatants c ON c.id=t.combatant_id

 CROSS JOIN LATERAL (SELECT CASE WHEN c.id IS NOT NULL THEN game_private.combat_state(c) WHEN t.char_key IS NOT NULL THEN game_private.combat_state(jsonb_populate_record(NULL::game_private.combatants,jsonb_build_object('char_key',t.char_key))) ELSE '{}'::jsonb END s) z
 WHERE t.map_id=m.id AND game_private.vtt_token_visible(a,t);
 SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY id),'[]') INTO objects FROM (SELECT id,layer,shape,label,x,y,w,h,floor,version,CASE WHEN a='gm' THEN visible ELSE NULL END visible FROM game_private.vtt_objects o WHERE map_id=m.id AND (a='gm' OR (visible AND layer<>'notes' AND game_private.vtt_region_visible(a,m.id,floor,x,y,w/2.0,h/2.0))))v;
 RETURN jsonb_build_object('map',jsonb_build_object('id',m.id,'title',m.title,'active_floor',m.active_floor,'vision_mode',m.vision_mode,'ambient_light',m.ambient_light,'levels',(SELECT jsonb_agg(jsonb_build_object('floor',l.floor,'title',l.title) ORDER BY l.floor) FROM game_private.vtt_levels l WHERE l.map_id=m.id AND (a='gm' OR l.floor=m.active_floor)),'features',coalesce((SELECT jsonb_agg(CASE WHEN a='gm' THEN to_jsonb(f) ELSE jsonb_build_object('id',f.id,'kind',f.kind,'label',f.label,'floor',f.floor,'x1',f.x1,'y1',f.y1,'x2',f.x2,'y2',f.y2,'door_state',f.door_state) END ORDER BY f.id) FROM game_private.vtt_features f WHERE f.map_id=m.id AND (a='gm' OR f.kind='door' AND f.enabled AND game_private.vtt_region_visible(a,m.id,f.floor,(f.x1+f.x2)/2.0,(f.y1+f.y2)/2.0,abs(f.x2-f.x1)/2.0,abs(f.y2-f.y1)/2.0,f.id))),'[]'),'scene',m.scene,'encounter_id',CASE WHEN a='gm' THEN m.encounter_id ELSE NULL END,'width',m.width,'height',m.height,'grid',m.grid,'grid_size',m.grid_size,'offset_x',m.offset_x,'offset_y',m.offset_y,'scale',m.scale,'version',CASE WHEN a='gm' THEN m.version ELSE m.public_version END,'layout_version',m.layout_version,'archived',m.archived,'published',state.map_id=m.id AND state.session_id=room.session_id AND room.status IN ('active','paused'),'tiles',tiles,'tokens_hash',md5(tokens::text),'tokens',CASE WHEN p_known->>'_tokens'=md5(tokens::text) THEN NULL ELSE tokens END,'objects_hash',md5(objects::text),'objects',CASE WHEN p_known->>'_objects'=md5(objects::text) THEN NULL ELSE objects END,
 'pings',coalesce((SELECT jsonb_agg(jsonb_build_object('id',l.id,'actor',l.actor_key,'x',l.payload->'x','y',l.payload->'y','created_at',l.created_at) ORDER BY l.created_at) FROM game_private.vtt_log l WHERE l.map_id=m.id AND l.action='ping' AND coalesce((l.payload->>'floor')::int,0)=m.active_floor AND l.created_at>now()-interval '8 seconds' AND game_private.vtt_area_visible(a,m.id,(l.payload->>'x')::int,(l.payload->>'y')::int)),'[]'::jsonb)),
 'library',library,'session_id',room.session_id,'session_status',room.status,'state_version',CASE WHEN a='gm' THEN state.version ELSE NULL END);
END;$$;

CREATE OR REPLACE FUNCTION public.dnd_vtt_call(p_token text,p_action text,p_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a text;identity jsonb;req uuid;hash text;cached game_private.vtt_commands%rowtype;m game_private.vtt_maps%rowtype;state game_private.vtt_state%rowtype;room public.dnd_room%rowtype;t game_private.vtt_tokens%rowtype;oldtoken game_private.vtt_tokens%rowtype;o game_private.vtt_objects%rowtype;c game_private.combatants%rowtype;
 result jsonb;tile jsonb;img text;bytes bytea;ix int;iy int;px int;py int;rot int;sz numeric;name text;is_public boolean:=false;published boolean;old_visible boolean;step int;steps int;area numeric;ownerkey text;character_key text;cid uuid;limit_n int;known jsonb;f game_private.vtt_features%rowtype;fl int;lv int;
BEGIN
 identity:=game_private.dnd_session_identity(p_token);IF identity IS NULL THEN RAISE EXCEPTION 'Sitzung abgelaufen' USING ERRCODE='28000'; END IF;a:=identity->>'actor';
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>2100000 THEN RAISE EXCEPTION 'Ungültige Anfrage / Größenlimit'; END IF;
 IF p_action='snapshot' THEN
  known:=coalesce(p_payload->'known','{}');IF jsonb_typeof(known)<>'object' OR octet_length(known::text)>10000 THEN RAISE EXCEPTION 'Ungültiger Kachelcache'; END IF;
  RETURN game_private.vtt_snapshot(a,(p_payload->>'id')::uuid,known);
 END IF;
 IF p_action='preview' THEN IF a<>'gm' OR coalesce(p_payload->>'actor','') NOT IN ('len','gra','sas','pei') THEN RAISE EXCEPTION 'Zugriff verweigert';END IF;RETURN game_private.vtt_snapshot(p_payload->>'actor',NULL,'{}');END IF;
 IF p_action IS NULL OR p_action NOT IN ('create','settings','publish','unpublish','archive','fog','token.add','token.update','token.move','token.remove','object.add','object.update','object.remove','ping','vision','level.add','level.select','level.rename','feature.add','feature.update','feature.remove','feature.toggle') THEN RAISE EXCEPTION 'Unbekannte Kartenaktion'; END IF;
 IF a<>'gm' AND p_action NOT IN ('token.move','ping') THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
 IF p_action NOT IN ('create','level.add') AND octet_length(p_payload::text)>30000 THEN RAISE EXCEPTION 'Anfrage zu groß'; END IF;
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

  IF p_action='vision' THEN
   IF jsonb_typeof(p_payload->'ambient_light') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Umgebungslicht erforderlich';END IF;
   UPDATE game_private.vtt_maps SET vision_mode=p_payload->>'vision_mode',ambient_light=(p_payload->>'ambient_light')::boolean WHERE id=m.id;
   is_public:=published;
  ELSIF p_action='level.add' THEN
   IF jsonb_typeof(p_payload->'tiles') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'tiles') NOT BETWEEN 1 AND 64 OR (p_payload->>'width')::int IS DISTINCT FROM m.width OR (p_payload->>'height')::int IS DISTINCT FROM m.height THEN RAISE EXCEPTION 'Ebenen benötigen vollständige Bildkacheln mit denselben Kartenmaßen';END IF;
   SELECT min(i) INTO lv FROM generate_series(0,3) i WHERE NOT EXISTS(SELECT FROM game_private.vtt_levels l WHERE l.map_id=m.id AND l.floor=i);
   IF lv IS NULL THEN RAISE EXCEPTION 'Maximal vier Ebenen';END IF;
   IF coalesce((SELECT sum(length(image)) FROM game_private.vtt_tiles WHERE map_id=m.id),0)+octet_length((p_payload->'tiles')::text)>2000000 THEN RAISE EXCEPTION 'Alle Ebenen zusammen: maximal 2 MB Bilddaten';END IF;
   INSERT INTO game_private.vtt_levels VALUES(m.id,lv,trim(p_payload->>'title'));
  FOR tile IN SELECT value FROM jsonb_array_elements(p_payload->'tiles') LOOP
   ix:=(tile->>'x')::int;iy:=(tile->>'y')::int;img:=tile->>'image';
   IF ix IS NULL OR iy IS NULL OR ix<0 OR iy<0 OR ix>=ceil(m.width/256.0) OR iy>=ceil(m.height/256.0) OR img IS NULL OR length(img)>100000 OR img!~'^data:image/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$' THEN RAISE EXCEPTION 'Ungültige Bildkachel'; END IF;
   bytes:=decode(split_part(img,',',2),'base64');
   IF NOT (substring(bytes from 1 for 8)=decode('89504e470d0a1a0a','hex') AND img LIKE 'data:image/png;%') AND NOT (substring(bytes from 1 for 3)=decode('ffd8ff','hex') AND img LIKE 'data:image/jpeg;%') AND NOT (substring(bytes from 1 for 4)=decode('52494646','hex') AND substring(bytes from 9 for 4)=decode('57454250','hex') AND img LIKE 'data:image/webp;%') THEN RAISE EXCEPTION 'Nicht unterstütztes Bildformat'; END IF;
   INSERT INTO game_private.vtt_tiles(map_id,floor,x,y,image,hash) VALUES(m.id,lv,ix,iy,img,encode(extensions.digest(img,'sha256'),'hex'));
  END LOOP;
  IF (SELECT count(*) FROM game_private.vtt_tiles WHERE map_id=m.id AND floor=lv)<>ceil(m.width/256.0)*ceil(m.height/256.0) THEN RAISE EXCEPTION 'Unvollständige Bildkacheln'; END IF;

   result:=jsonb_build_object('floor',lv);
  ELSIF p_action IN ('level.select','level.rename') THEN
   lv:=(p_payload->>'floor')::int;
   IF NOT EXISTS(SELECT FROM game_private.vtt_levels l WHERE l.map_id=m.id AND l.floor=lv) THEN RAISE EXCEPTION 'Ebene nicht vorhanden';END IF;
   IF p_action='level.select' THEN UPDATE game_private.vtt_maps SET active_floor=lv WHERE id=m.id;is_public:=published;
   ELSE UPDATE game_private.vtt_levels SET title=trim(p_payload->>'title') WHERE map_id=m.id AND floor=lv;is_public:=published AND lv=m.active_floor;END IF;
  ELSIF p_action IN ('feature.add','feature.update','feature.remove','feature.toggle') THEN
   IF p_action='feature.add' THEN
    IF (SELECT count(*) FROM game_private.vtt_features WHERE map_id=m.id)>=64 THEN RAISE EXCEPTION 'Maximal 64 Wände, Türen und Lichter';END IF;
    INSERT INTO game_private.vtt_features(map_id,floor,kind,x1,y1,x2,y2) VALUES(m.id,m.active_floor,'light',0,0,0,0) RETURNING * INTO f;
   ELSE SELECT * INTO f FROM game_private.vtt_features WHERE id=(p_payload->>'target')::uuid AND map_id=m.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Zugriff verweigert';END IF;
   END IF;
   is_public:=published AND f.floor=m.active_floor;
   IF p_action='feature.remove' THEN DELETE FROM game_private.vtt_features WHERE id=f.id;
   ELSIF p_action='feature.toggle' THEN
    IF f.kind='door' AND f.door_state='locked' THEN RAISE EXCEPTION 'Tür zuerst im Formular entriegeln';END IF;
    UPDATE game_private.vtt_features SET door_state=CASE WHEN f.kind='door' THEN CASE WHEN f.door_state='open' THEN 'closed' ELSE 'open' END ELSE door_state END,enabled=CASE WHEN f.kind='light' THEN NOT enabled ELSE enabled END,version=version+1 WHERE id=f.id RETURNING * INTO f;
   ELSE
    fl:=coalesce((p_payload->>'floor')::int,f.floor);
    UPDATE game_private.vtt_features SET floor=fl,kind=p_payload->>'kind',label=coalesce(p_payload->>'label',''),x1=(p_payload->>'x1')::int,y1=(p_payload->>'y1')::int,x2=(p_payload->>'x2')::int,y2=(p_payload->>'y2')::int,radius=coalesce((p_payload->>'radius')::int,256),enabled=coalesce((p_payload->>'enabled')::boolean,true),door_state=coalesce(p_payload->>'door_state','closed'),version=version+1 WHERE id=f.id RETURNING * INTO f;
    IF greatest(f.x1,f.x2)>=m.width OR greatest(f.y1,f.y2)>=m.height THEN RAISE EXCEPTION 'Geometrie außerhalb der Karte';END IF;
    is_public:=is_public OR published AND fl=m.active_floor;
   END IF;
   IF (SELECT count(*) FROM game_private.vtt_features WHERE map_id=m.id AND kind='light')>8 THEN RAISE EXCEPTION 'Maximal acht Lichtquellen';END IF;
   result:=jsonb_build_object('target',f.id);
  ELSIF p_action IN ('publish','unpublish') THEN
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
    UPDATE game_private.vtt_tiles SET revealed=(p_payload->>'revealed')::boolean WHERE map_id=m.id AND floor=m.active_floor AND x=(tile->>0)::int AND y=(tile->>1)::int;
    IF NOT FOUND THEN RAISE EXCEPTION 'Kachel außerhalb der Karte'; END IF;
   END LOOP;
   UPDATE game_private.vtt_maps SET layout_version=layout_version+1 WHERE id=m.id;is_public:=published;
  ELSIF p_action IN ('token.add','token.update','token.move','token.remove') THEN
   IF p_action='token.add' THEN
    IF (SELECT count(*) FROM game_private.vtt_tokens WHERE map_id=m.id)>=50 THEN RAISE EXCEPTION 'Maximal 50 Tokens'; END IF;
    INSERT INTO game_private.vtt_tokens(map_id,name,x,y,floor) VALUES(m.id,trim(p_payload->>'name'),(p_payload->>'x')::int,(p_payload->>'y')::int,m.active_floor) RETURNING * INTO t;
   ELSE
    SELECT * INTO t FROM game_private.vtt_tokens WHERE id=(p_payload->>'target')::uuid AND map_id=m.id FOR UPDATE;
    IF NOT FOUND OR (a<>'gm' AND (t.owner_key IS DISTINCT FROM a OR NOT game_private.vtt_token_visible(a,t))) THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
    IF (p_payload->>'token_version')::bigint IS DISTINCT FROM t.version THEN RAISE EXCEPTION 'Versionskonflikt: Token geändert' USING ERRCODE='40001'; END IF;
   END IF;
   oldtoken:=t;old_visible:=game_private.vtt_any_token(t);
   IF p_action='token.remove' THEN DELETE FROM game_private.vtt_tokens WHERE id=t.id;
   ELSE
    px:=(p_payload->>'x')::int;py:=(p_payload->>'y')::int;rot:=coalesce((p_payload->>'rotation')::int,t.rotation);sz:=CASE WHEN a='gm' THEN coalesce((p_payload->>'size')::numeric,t.size) ELSE t.size END;
    IF px IS NULL OR py IS NULL OR sz IS NULL OR sz NOT BETWEEN 0.5 AND 4 OR px-sz*m.grid_size/2<0 OR py-sz*m.grid_size/2<0 OR px+sz*m.grid_size/2>=m.width OR py+sz*m.grid_size/2>=m.height THEN RAISE EXCEPTION 'Token muss vollständig innerhalb der Karte liegen'; END IF;
    IF p_action='token.move' THEN
     IF (p_payload->>'layout_version')::bigint IS DISTINCT FROM m.layout_version THEN RAISE EXCEPTION 'Versionskonflikt: Kartenfreigabe geändert' USING ERRCODE='40001'; END IF;
     IF a<>'gm' THEN
      steps:=greatest(1,ceil(greatest(abs(px-t.x),abs(py-t.y))/32.0)::int);
      FOR step IN 0..steps LOOP
       IF NOT game_private.vtt_region_visible(a,m.id,t.floor,t.x+(px-t.x)*step::numeric/steps,t.y+(py-t.y)*step::numeric/steps,sz*m.grid_size/2,sz*m.grid_size/2) THEN RAISE EXCEPTION 'Bewegung nicht freigegeben: Nebel, Sicht oder Wand/Tür prüfen.'; END IF;
      END LOOP;
      IF NOT game_private.vtt_path_clear(m.id,t.floor,t.x,t.y,px,py,sz*m.grid_size/2) THEN RAISE EXCEPTION 'Bewegung nicht freigegeben: Nebel, Sicht oder Wand/Tür prüfen.';END IF;
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
     UPDATE game_private.vtt_tokens SET floor=coalesce((p_payload->>'floor')::int,t.floor),vision_radius=coalesce((p_payload->>'vision_radius')::int,t.vision_radius),darkvision_radius=coalesce((p_payload->>'darkvision_radius')::int,t.darkvision_radius),name=trim(p_payload->>'name'),owner_key=ownerkey,char_key=character_key,combatant_id=cid,visible=coalesce((p_payload->>'visible')::boolean,false) WHERE id=t.id;
    END IF;
    UPDATE game_private.vtt_tokens SET x=px,y=py,rotation=rot,size=sz,version=version+1 WHERE id=t.id RETURNING * INTO t;
   END IF;
   is_public:=published AND (old_visible OR (p_action<>'token.remove' AND game_private.vtt_any_token(t)));
   result:=jsonb_build_object('target',t.id);
  ELSIF p_action IN ('object.add','object.update','object.remove') THEN
   IF p_action='object.add' THEN
    IF (SELECT count(*) FROM game_private.vtt_objects WHERE map_id=m.id)>=500 THEN RAISE EXCEPTION 'Maximal 500 Kartenobjekte'; END IF;
    INSERT INTO game_private.vtt_objects(map_id,layer,shape,x,y,w,h,floor) VALUES(m.id,p_payload->>'layer',p_payload->>'shape',0,0,10,10,m.active_floor) RETURNING * INTO o;
   ELSE
    SELECT * INTO o FROM game_private.vtt_objects WHERE id=(p_payload->>'target')::uuid AND map_id=m.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Zugriff verweigert'; END IF;
   END IF;
   old_visible:=o.visible AND o.layer<>'notes' AND game_private.vtt_any_area(m.id,o.floor,o.x,o.y,o.w/2.0,o.h/2.0);
   IF p_action='object.remove' THEN DELETE FROM game_private.vtt_objects WHERE id=o.id;
   ELSE
    px:=(p_payload->>'x')::int;py:=(p_payload->>'y')::int;ix:=(p_payload->>'w')::int;iy:=(p_payload->>'h')::int;
    IF px IS NULL OR py IS NULL OR ix IS NULL OR iy IS NULL OR px-ix/2.0<0 OR py-iy/2.0<0 OR px+ix/2.0>=m.width OR py+iy/2.0>=m.height THEN RAISE EXCEPTION 'Objekt außerhalb der Karte'; END IF;
    UPDATE game_private.vtt_objects SET floor=coalesce((p_payload->>'floor')::int,o.floor),layer=p_payload->>'layer',shape=p_payload->>'shape',label=coalesce(p_payload->>'label',''),x=px,y=py,w=ix,h=iy,visible=coalesce((p_payload->>'visible')::boolean,false),version=version+1 WHERE id=o.id RETURNING * INTO o;
   END IF;
   is_public:=published AND (old_visible OR (p_action<>'object.remove' AND o.visible AND o.layer<>'notes' AND game_private.vtt_any_area(m.id,o.floor,o.x,o.y,o.w/2.0,o.h/2.0)));
   result:=jsonb_build_object('target',o.id);
  ELSIF p_action='ping' THEN
   px:=(p_payload->>'x')::int;py:=(p_payload->>'y')::int;
   IF NOT coalesce(published,false) OR px IS NULL OR py IS NULL OR px<0 OR py<0 OR px>=m.width OR py>=m.height OR NOT (CASE WHEN a='gm' THEN game_private.vtt_any_area(m.id,m.active_floor,px,py) ELSE game_private.vtt_area_visible(a,m.id,px,py) END) THEN RAISE EXCEPTION 'Ping nur im veröffentlichten, freigegebenen Bereich'; END IF;
   IF EXISTS(SELECT 1 FROM game_private.vtt_log WHERE actor_key=a AND action='ping' AND created_at>clock_timestamp()-interval '1 second') THEN RAISE EXCEPTION 'Bitte kurz vor dem nächsten Ping warten'; END IF;
   result:=jsonb_build_object('x',px,'y',py,'floor',m.active_floor);is_public:=true;
  END IF;
 END IF;
 IF p_action IN ('vision','level.select') OR p_action IN ('feature.add','feature.update','feature.remove','feature.toggle') AND (coalesce(is_public,false) OR f.floor=m.active_floor) OR p_action IN ('token.add','token.update','token.remove') AND ((oldtoken.visible AND oldtoken.owner_key IS NOT NULL AND oldtoken.floor=m.active_floor AND oldtoken.vision_radius>0) OR (p_action<>'token.remove' AND t.visible AND t.owner_key IS NOT NULL AND t.floor=m.active_floor AND t.vision_radius>0)) THEN UPDATE game_private.vtt_maps SET layout_version=layout_version+1 WHERE id=m.id;END IF;
 IF (SELECT count(*) FROM game_private.vtt_tokens WHERE map_id=m.id AND vision_radius>0)>8 THEN RAISE EXCEPTION 'Maximal acht Sicht-Tokens';END IF;
 IF p_action<>'ping' THEN UPDATE game_private.vtt_maps SET version=version+1,public_version=public_version+CASE WHEN is_public THEN 1 ELSE 0 END WHERE id=m.id; END IF;
 INSERT INTO game_private.vtt_log(map_id,actor_key,action,payload) VALUES(m.id,a,p_action,coalesce(result,'{}'));
 PERFORM game_private.sync_emit(CASE WHEN p_action='token.move' THEN 'TokenMoved' ELSE 'VTTChanged' END,'{}',NOT coalesce(is_public,false));
 DELETE FROM game_private.vtt_commands WHERE created_at<now()-interval '24 hours';
 IF (SELECT count(*) FROM game_private.vtt_commands WHERE actor_key=a)>=10000 THEN RAISE EXCEPTION 'Tageskontingent erreicht'; END IF;
 result:=jsonb_build_object('id',m.id,'confirmed',true,'result',coalesce(result,'{}'));
 INSERT INTO game_private.vtt_commands(request_id,actor_key,action,payload_hash,result) VALUES(req,a,p_action,hash,result);
 RETURN result;
END;$$;

DO $$ DECLARE f record;BEGIN FOR f IN SELECT p.oid::regprocedure sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='game_private' AND p.proname LIKE 'vtt_%' LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||f.sig||' FROM PUBLIC,anon,authenticated';END LOOP;END;$$;
NOTIFY pgrst,'reload schema';
COMMIT;
