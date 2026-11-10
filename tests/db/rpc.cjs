const {sql,literal}=require('./local.cjs');
const signatures={dnd_vtt_call:['p_token','p_action','p_payload'],dnd_combat_call:['p_token','p_action','p_payload'],dnd_sync_call:['p_token','p_action','p_payload'],dnd_sync_poll:['p_token','p_cursor'],dnd_workspace_call:['p_token','p_action','p_payload'],dnd_sign_in:['p_actor','p_code'],dnd_sign_out:['p_token'],dnd_session_call:['p_token','p_operation','p_payload'],read_character:['p_character_key','p_code'],write_character:['p_character_key','p_code','p_sheet'],read_party:['p_code'],dnd_snapshot:['p_actor','p_code','p_after'],dnd_heartbeat:['p_actor','p_code'],dnd_gm_manage:['p_code','p_action','p_title','p_notes'],dnd_roll:['p_actor','p_code','p_formula','p_label','p_visibility','p_request_id','p_adv']};
function rpc(name,body){
 if(!Object.hasOwn(signatures,name))throw Error('Unknown RPC');
 const args=signatures[name].filter(k=>Object.hasOwn(body,k)).map(k=>`${k} => ${literal(typeof body[k]==='object'&&body[k]!==null?JSON.stringify(body[k]):body[k])}`);
 const value=sql(`SET ROLE anon; SELECT public.${name}(${args.join(',')});`,'dnd_test');
 return value?JSON.parse(value):null;
}
const codes=Object.fromEntries(['len','gra','sas','pei','gm'].map(k=>[k,`local_only_test_code_for_${k}_000000`]));
function seed(){
 sql('DELETE FROM game_private.vtt_log; DELETE FROM game_private.vtt_commands; DELETE FROM game_private.vtt_objects; DELETE FROM game_private.vtt_tokens; UPDATE game_private.vtt_state SET map_id=NULL,session_id=NULL,version=1; DELETE FROM game_private.vtt_tiles; DELETE FROM game_private.vtt_maps;','dnd_test');
 sql('DELETE FROM game_private.combat_log; DELETE FROM game_private.combat_commands; DELETE FROM game_private.combatants; DELETE FROM game_private.encounters;','dnd_test');
 sql(`DELETE FROM game_private.workspace_commands; DELETE FROM game_private.session_archives; UPDATE game_private.session_workspace SET active_plan_id=NULL,scene='',announcement='',version=1; DELETE FROM game_private.session_plans;`,'dnd_test');
 sql('UPDATE game_private.actor_sessions SET revoked_at=now();','dnd_test');
 sql(`UPDATE game_private.invites SET claim_hash=encode(extensions.digest('local_only_test_code_for_'||char_key||'_000000','sha256'),'hex');
 UPDATE game_private.admin_access SET claim_hash=encode(extensions.digest(${literal(codes.gm)},'sha256'),'hex');
 UPDATE public.character_slots SET sheet=jsonb_build_object('char',char_key,'hp',20,'hpMax',30,'name',display_name);
 UPDATE public.dnd_room SET status='waiting',gm_notes='';
 DELETE FROM public.dnd_rolls; DELETE FROM public.dnd_presence;
 DELETE FROM game_private.sync_commands; DELETE FROM game_private.sync_events; UPDATE game_private.sync_cursors SET seq=0;`,'dnd_test');
}
module.exports={rpc,codes,seed};
