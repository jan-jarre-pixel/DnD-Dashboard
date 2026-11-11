-- Native geometric predicates avoid nested SQL-function startup per wall/object.
BEGIN;
CREATE OR REPLACE FUNCTION game_private.vtt_clear_region(mid uuid,fl int,ox numeric,oy numeric,px numeric,py numeric,rw numeric,rh numeric,ignore_id uuid DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE
 o point:=point(ox,oy);a point:=point(px-rw,py-rh);b point:=point(px+rw,py-rh);c point:=point(px+rw,py+rh);d point:=point(px-rw,py+rh);
 p1 polygon:=format('(%s,%s,%s)',o,a,b)::polygon;p2 polygon:=format('(%s,%s,%s)',o,b,c)::polygon;p3 polygon:=format('(%s,%s,%s)',o,c,d)::polygon;p4 polygon:=format('(%s,%s,%s)',o,d,a)::polygon;
 oa lseg:=lseg(o,a);ob lseg:=lseg(o,b);oc lseg:=lseg(o,c);od lseg:=lseg(o,d);ab lseg:=lseg(a,b);bc lseg:=lseg(b,c);cd lseg:=lseg(c,d);da lseg:=lseg(d,a);
BEGIN
 RETURN NOT EXISTS(SELECT FROM game_private.vtt_features f WHERE f.map_id=mid AND f.floor=fl AND f.id IS DISTINCT FROM ignore_id AND f.enabled AND (f.kind='wall' OR f.kind='door' AND f.door_state<>'open')
 AND greatest(f.x1,f.x2)>=least(ox,px-rw) AND least(f.x1,f.x2)<=greatest(ox,px+rw) AND greatest(f.y1,f.y2)>=least(oy,py-rh) AND least(f.y1,f.y2)<=greatest(oy,py+rh)
 AND (point(f.x1,f.y1)<@p1 OR point(f.x1,f.y1)<@p2 OR point(f.x1,f.y1)<@p3 OR point(f.x1,f.y1)<@p4 OR point(f.x2,f.y2)<@p1 OR point(f.x2,f.y2)<@p2 OR point(f.x2,f.y2)<@p3 OR point(f.x2,f.y2)<@p4
 OR lseg(point(f.x1,f.y1),point(f.x2,f.y2)) ?# oa OR lseg(point(f.x1,f.y1),point(f.x2,f.y2)) ?# ob OR lseg(point(f.x1,f.y1),point(f.x2,f.y2)) ?# oc OR lseg(point(f.x1,f.y1),point(f.x2,f.y2)) ?# od
 OR lseg(point(f.x1,f.y1),point(f.x2,f.y2)) ?# ab OR lseg(point(f.x1,f.y1),point(f.x2,f.y2)) ?# bc OR lseg(point(f.x1,f.y1),point(f.x2,f.y2)) ?# cd OR lseg(point(f.x1,f.y1),point(f.x2,f.y2)) ?# da));
END;$$;
NOTIFY pgrst,'reload schema';
COMMIT;
