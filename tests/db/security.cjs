// Privilege regression for the complete application schema, plus all anonymous RPC gates.
const assert=require('node:assert/strict'),{sql}=require('./local.cjs'),{rpc}=require('./rpc.cjs');
let count=0;function test(label,fn){fn();count++;console.log('PASS '+label);}
const functions=JSON.parse(sql(`SELECT json_agg(row_to_json(f)) FROM (SELECT n.nspname AS schema,p.proname AS name,p.prosecdef AS definer,p.proconfig AS config,has_function_privilege('anon',p.oid,'EXECUTE') AS anon,has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','game_private')) f;`,'dnd_test'));
const allowed=['dnd_inventory_call','dnd_campaign_call','dnd_vtt_call','dnd_combat_call','dnd_sync_call','dnd_sync_poll','dnd_workspace_call','dnd_sign_in','dnd_sign_out','dnd_session_call','read_character','write_character','read_party','dnd_snapshot','dnd_heartbeat','dnd_gm_manage','dnd_roll'].sort();
test('only the 17 audited RPCs are executable by anon; authenticated cannot execute application functions',()=>{
 assert.equal(functions.length,55);assert.deepEqual(functions.filter(f=>f.anon).map(f=>f.name).sort(),allowed);assert(functions.every(f=>!f.authenticated));
});
test('all application functions pin an empty search_path, including private helpers',()=>{assert(functions.every(f=>f.config?.includes('search_path=""')));});
test('all 41 application tables enforce RLS and deny anon direct privileges',()=>{
 const rows=JSON.parse(sql(`SELECT json_agg(row_to_json(t)) FROM (SELECT n.nspname AS schema,c.relname,c.relrowsecurity AS rls,has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS access FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','game_private') AND c.relkind='r') t;`,'dnd_test'));assert.equal(rows.length,41);assert(rows.every(t=>t.rls&&!t.access));
});
test('private schema and deprecated claim routes are inaccessible',()=>{
 assert.equal(sql("SELECT has_schema_privilege('anon','game_private','USAGE') OR has_schema_privilege('authenticated','game_private','USAGE');",'dnd_test'),'f');
 for(const name of ['claim_character','claim_gm'])assert(functions.filter(f=>f.name===name).every(f=>!f.anon&&!f.authenticated));
});
test('every public RPC rejects invalid authority; sign-out remains safely idempotent',()=>{
 const invalid='0'.repeat(64),body={p_token:invalid,p_code:'invalid_security_test_code',p_actor:'gm',p_character_key:'len',p_action:'snapshot',p_operation:'identity',p_payload:{},p_sheet:{char:'len'},p_formula:'1d20'};
 for(const name of allowed){if(name==='dnd_sign_out'){assert.equal(rpc(name,{p_token:invalid}),null);continue;}assert.throws(()=>rpc(name,body),name);}
});
test('JWT metadata cannot confer a GM role or bypass owner RLS',()=>{
 assert.equal(sql(`SET ROLE authenticated; SET request.jwt.claims='{"role":"owner","user_metadata":{"role":"gm"}}'; SELECT count(*) FROM public.character_slots;`,'dnd_test'),'0');
 assert.throws(()=>sql(`SET ROLE authenticated; SELECT * FROM game_private.admin_access;`,'dnd_test'));
});
console.log(`${count} schema security scenarios passed.`);
