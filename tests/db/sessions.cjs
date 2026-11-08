const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {rpc,codes,seed}=require('./rpc.cjs'),{sql,literal}=require('./local.cjs');
seed();let count=0;
function test(label,fn){fn();count++;console.log('PASS '+label);}
const sessions={};
const call=(actor,operation,payload={})=>rpc('dnd_session_call',{p_token:sessions[actor].token,p_operation:operation,p_payload:payload});
for(const actor of Object.keys(codes))test(`${actor}: legacy code exchanges for server-bound identity`,()=>{
 const s=sessions[actor]=rpc('dnd_sign_in',{p_actor:actor,p_code:codes[actor]});
 assert.match(s.token,/^[a-f0-9]{64}$/);assert.equal(s.actor,actor);assert.equal(s.role,actor==='gm'?'owner':'player');
 assert.equal(call(actor,'identity').identity_id,s.identity_id);
 assert(!sql('SELECT row_to_json(s) FROM game_private.actor_sessions s;','dnd_test').includes(s.token));
 assert.throws(()=>rpc('dnd_sign_in',{p_actor:actor,p_code:s.token}));
});
test('invalid/null sign-ins do not create sessions',()=>{
 const before=sql('SELECT count(*) FROM game_private.actor_sessions;','dnd_test');
 for(const code of [null,'','invalid_test_code_00000000'])assert.throws(()=>rpc('dnd_sign_in',{p_actor:'gm',p_code:code}));
 assert.equal(before,sql('SELECT count(*) FROM game_private.actor_sessions;','dnd_test'));
});
test('every player loads/saves only their own sheet',()=>{
 for(const actor of ['len','gra','sas','pei']){
  const s=call(actor,'read_character',{p_character_key:actor});call(actor,'write_character',{p_character_key:actor,p_sheet:{...s,hp:17}});
  assert.equal(call(actor,'read_character',{p_character_key:actor}).hp,17);
  assert.throws(()=>call(actor,'read_character',{p_character_key:actor==='len'?'gra':'len'}));
  assert.throws(()=>call(actor,'write_character',{p_character_key:actor==='len'?'gra':'len',p_sheet:{char:'len'},p_actor:'gm',role:'owner'}));
 }
});
test('GM reads party, cannot write player sheets',()=>{
 assert.equal(call('gm','read_party').length,4);
 assert.throws(()=>call('gm','write_character',{p_character_key:'len',p_sheet:{char:'len'}}));
});
test('forged payload role and actor never grant GM rights',()=>{
 for(const actor of ['len','gra','sas','pei']){
  assert.throws(()=>call(actor,'read_party',{p_actor:'gm',role:'owner'}));
  assert.throws(()=>call(actor,'dnd_gm_manage',{p_action:'start',p_actor:'gm',p_code:codes.gm}));
 }
 call('gm','dnd_gm_manage',{p_action:'start',p_title:'Session token test'});
 const r=call('len','dnd_roll',{p_actor:'gm',p_formula:'1d20',p_label:'forged actor',p_request_id:randomUUID()});assert.equal(r.actor_key,'len');
 assert.throws(()=>call('len','dnd_roll',{p_formula:'1d20',p_label:'secret',p_visibility:'gm',p_request_id:randomUUID()}));
});
test('hidden notes and secret rolls never reach player token',()=>{
 call('gm','dnd_gm_manage',{p_action:'notes',p_notes:'session-private-secret'});
 call('gm','dnd_roll',{p_formula:'1d20',p_label:'session-private-secret',p_visibility:'gm',p_request_id:randomUUID()});
 const snapshot=call('len','dnd_snapshot');assert.equal(snapshot.gm_notes,null);assert(!JSON.stringify(snapshot).includes('session-private-secret'));
});
test('private identities/sessions/helpers not directly accessible',()=>{
 for(const table of ['game_private.actor_identities','game_private.actor_sessions'])assert.throws(()=>sql(`SET ROLE anon;SELECT * FROM ${table}`,'dnd_test'));
 assert.throws(()=>sql(`SET ROLE anon;SELECT game_private.dnd_session_identity(${literal(sessions.len.token)})`,'dnd_test'));
});
test('malformed token, null/array/oversized payloads and unknown operations denied',()=>{
 for(const token of [null,'','a'.repeat(64)])assert.throws(()=>rpc('dnd_session_call',{p_token:token,p_operation:'identity'}));
 for(const payload of [null,[],{note:'x'.repeat(220000)}])assert.throws(()=>call('len','identity',payload));
 assert.throws(()=>call('len','DROP TABLE character_slots'));
});
test('logout revokes only its own token, replay fails',()=>{
 rpc('dnd_sign_out',{p_token:sessions.len.token});assert.throws(()=>call('len','identity'));assert.equal(call('gra','identity').actor,'gra');
 rpc('dnd_sign_out',{p_token:sessions.len.token}); // idempotent
});
test('expired token fails, original code remains valid',()=>{
 sql("UPDATE game_private.actor_sessions SET created_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE actor_key='gra'",'dnd_test');
 assert.throws(()=>call('gra','identity'));
 assert.equal(rpc('dnd_sign_in',{p_actor:'gra',p_code:codes.gra}).actor,'gra');
});
test('code rotation invalidates a previously issued token',()=>{
 sql("UPDATE game_private.invites SET claim_hash=repeat('0',64) WHERE char_key='sas'",'dnd_test');assert.throws(()=>call('sas','identity'));
});
test('legacy accesses still work with unchanged codes',()=>{
 assert.equal(rpc('read_character',{p_character_key:'pei',p_code:codes.pei}).char,'pei');assert.equal(rpc('read_party',{p_code:codes.gm}).length,4);
});
test('active session limit is enforced, rotating a code does not inherit old quota',()=>{
 for(let i=0;i<20;i++)rpc('dnd_sign_in',{p_actor:'len',p_code:codes.len});
 assert.throws(()=>rpc('dnd_sign_in',{p_actor:'len',p_code:codes.len}));
 const changed='local_rotated_code_for_len_000000';
 sql(`UPDATE game_private.invites SET claim_hash=encode(extensions.digest(${literal(changed)},'sha256'),'hex') WHERE char_key='len'`,'dnd_test');
 assert.equal(rpc('dnd_sign_in',{p_actor:'len',p_code:changed}).actor,'len');
});
console.log(`${count} session authorization scenarios passed.`);
