-- Reuse the established sanitized character projection for standalone PC tokens.
BEGIN;
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
 SELECT coalesce(jsonb_agg(jsonb_build_object('x',x,'y',y,'hash',hash,'revealed',revealed)||CASE WHEN p_known->>(x||','||y)=hash THEN '{}'::jsonb ELSE jsonb_build_object('image',image) END ORDER BY y,x),'[]') INTO tiles FROM game_private.vtt_tiles WHERE map_id=m.id AND (a='gm' OR revealed);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',CASE WHEN t.combatant_id IS NOT NULL OR t.char_key IS NOT NULL THEN s->>'name' ELSE t.name END,'x',t.x,'y',t.y,'rotation',t.rotation,'size',t.size,'version',t.version,'owner_key',t.owner_key,'char_key',t.char_key,'combatant_id',t.combatant_id)
 ||CASE WHEN a='gm' THEN jsonb_build_object('visible',t.visible) ELSE '{}'::jsonb END
 ||CASE WHEN c.id IS NOT NULL AND (a='gm' OR c.char_key IS NOT NULL OR c.show_stats) OR t.combatant_id IS NULL AND t.char_key IS NOT NULL THEN jsonb_build_object('hp',s->'hp','hpMax',s->'hpMax','conditions',s->'conditions') ELSE '{}'::jsonb END ORDER BY t.id),'[]') INTO tokens
 FROM game_private.vtt_tokens t LEFT JOIN game_private.combatants c ON c.id=t.combatant_id

 CROSS JOIN LATERAL (SELECT CASE WHEN c.id IS NOT NULL THEN game_private.combat_state(c) WHEN t.char_key IS NOT NULL THEN game_private.combat_state(jsonb_populate_record(NULL::game_private.combatants,jsonb_build_object('char_key',t.char_key))) ELSE '{}'::jsonb END s) z
 WHERE t.map_id=m.id AND game_private.vtt_token_visible(a,t);
 SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY id),'[]') INTO objects FROM (SELECT id,layer,shape,label,x,y,w,h,version,CASE WHEN a='gm' THEN visible ELSE NULL END visible FROM game_private.vtt_objects o WHERE map_id=m.id AND (a='gm' OR (visible AND layer<>'notes' AND game_private.vtt_area_visible(a,m.id,x,y,w/2.0,h/2.0))))v;
 RETURN jsonb_build_object('map',jsonb_build_object('id',m.id,'title',m.title,'scene',m.scene,'encounter_id',CASE WHEN a='gm' THEN m.encounter_id ELSE NULL END,'width',m.width,'height',m.height,'grid',m.grid,'grid_size',m.grid_size,'offset_x',m.offset_x,'offset_y',m.offset_y,'scale',m.scale,'version',CASE WHEN a='gm' THEN m.version ELSE m.public_version END,'layout_version',m.layout_version,'archived',m.archived,'published',state.map_id=m.id AND state.session_id=room.session_id AND room.status IN ('active','paused'),'tiles',tiles,'tokens_hash',md5(tokens::text),'tokens',CASE WHEN p_known->>'_tokens'=md5(tokens::text) THEN NULL ELSE tokens END,'objects_hash',md5(objects::text),'objects',CASE WHEN p_known->>'_objects'=md5(objects::text) THEN NULL ELSE objects END,
 'pings',coalesce((SELECT jsonb_agg(jsonb_build_object('id',l.id,'actor',l.actor_key,'x',l.payload->'x','y',l.payload->'y','created_at',l.created_at) ORDER BY l.created_at) FROM game_private.vtt_log l WHERE l.map_id=m.id AND l.action='ping' AND l.created_at>now()-interval '8 seconds' AND game_private.vtt_area_visible(a,m.id,(l.payload->>'x')::int,(l.payload->>'y')::int)),'[]'::jsonb)),
 'library',library,'session_id',room.session_id,'session_status',room.status,'state_version',CASE WHEN a='gm' THEN state.version ELSE NULL END);
END;$$;

NOTIFY pgrst,'reload schema';
COMMIT;
