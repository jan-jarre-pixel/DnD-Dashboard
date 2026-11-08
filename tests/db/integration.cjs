// Uses actual audited PostgreSQL RPC definitions in dnd_test, never the live service.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {sql}=require('./local.cjs'),{rpc,codes,seed}=require('./rpc.cjs');
let checks=0;
const check=(name,fn)=>{fn();checks++;console.log(`PASS ${name}`);};
const deny=(name,body)=>assert.throws(()=>rpc(name,body));
seed();
for(const key of ['len','gra','sas','pei']){
 check(`${key}: own character load and save`,()=>{
  const sheet=rpc('read_character',{p_character_key:key,p_code:codes[key]});assert.equal(sheet.char,key);
  rpc('write_character',{p_character_key:key,p_code:codes[key],p_sheet:{...sheet,hp:15}});
  assert.equal(rpc('read_character',{p_character_key:key,p_code:codes[key]}).hp,15);
 });
 check(`${key}: foreign character, GM list, session control and secret roll denied`,()=>{
  deny('read_character',{p_character_key:key==='len'?'gra':'len',p_code:codes[key]});
  deny('write_character',{p_character_key:key==='len'?'gra':'len',p_code:codes[key],p_sheet:{char:'len'}});
  deny('read_party',{p_code:codes[key]});deny('dnd_gm_manage',{p_code:codes[key],p_action:'start'});
  deny('dnd_roll',{p_actor:key,p_code:codes[key],p_formula:'1d20',p_label:'Forbidden',p_visibility:'gm',p_request_id:randomUUID(),p_adv:0});
 });
}
check('GM reads all four; GM cannot overwrite a character',()=>{
 assert.equal(rpc('read_party',{p_code:codes.gm}).length,4);
 deny('write_character',{p_character_key:'len',p_code:codes.gm,p_sheet:{char:'len',hp:1}});
});
check('direct table access denied to anon',()=>{
 for(const table of ['public.character_slots','public.game_masters','game_private.invites','game_private.admin_access','public.dnd_room','public.dnd_rolls','public.dnd_presence'])assert.throws(()=>sql(`SET ROLE anon; SELECT * FROM ${table};`,'dnd_test'));
});
check('null/invalid codes and invalid sheet rejected',()=>{
 for(const code of [null,'','invalid_code_test_000000000'])deny('dnd_snapshot',{p_actor:'gm',p_code:code});
 deny('write_character',{p_character_key:'len',p_code:codes.len,p_sheet:{char:'gra'}});
});
check('session start, notes and five actor heartbeats',()=>{
 assert.equal(rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'start',p_title:'Isolated M0 test'}).status,'active');
 rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'notes',p_notes:'secret-local-test'});
 for(const key of Object.keys(codes))rpc('dnd_heartbeat',{p_actor:key,p_code:codes[key]});
 assert.equal(rpc('dnd_snapshot',{p_actor:'len',p_code:codes.len}).online.length,5);
});
check('all dice sizes, advantage/disadvantage and modifiers',()=>{
 for(const faces of [4,6,8,10,12,20,100]){
  const r=rpc('dnd_roll',{p_actor:'len',p_code:codes.len,p_formula:`2d${faces}+3`,p_label:'test',p_request_id:randomUUID(),p_adv:0});
  assert.equal(r.total,r.chosen_rolls.reduce((a,b)=>a+b,3));assert(r.chosen_rolls.every(x=>x>=1&&x<=faces));
 }
 for(const adv of [-1,1]){
  const r=rpc('dnd_roll',{p_actor:'gra',p_code:codes.gra,p_formula:'1d20',p_label:'test',p_request_id:randomUUID(),p_adv:adv});
  assert.equal(r.total,adv===1?Math.max(...r.individual_rolls):Math.min(...r.individual_rolls));
 }
});
check('secret roll and GM notes excluded from every player response',()=>{
 const secret=rpc('dnd_roll',{p_actor:'gm',p_code:codes.gm,p_formula:'1d20',p_label:'secret-label',p_visibility:'gm',p_request_id:randomUUID()});
 for(const key of ['len','gra','sas','pei']){
  const snap=rpc('dnd_snapshot',{p_actor:key,p_code:codes[key]});assert.equal(snap.gm_notes,null);assert(!snap.rolls.some(x=>x.id===secret.id));assert(!JSON.stringify(snap).includes('secret-label'));
 }
 assert(rpc('dnd_snapshot',{p_actor:'gm',p_code:codes.gm}).rolls.some(x=>x.id===secret.id));
});
check('same-request retry returns exactly one stored roll',()=>{
 const body={p_actor:'sas',p_code:codes.sas,p_formula:'1d20+2',p_label:'retry',p_request_id:randomUUID()};
 assert.deepEqual(rpc('dnd_roll',body),rpc('dnd_roll',body));
 assert.equal(sql(`SELECT count(*) FROM public.dnd_rolls WHERE request_id='${body.p_request_id}';`,'dnd_test'),'1');
});
check('pause rejects rolls, resume and end enforce lifecycle',()=>{
 assert.equal(rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'pause'}).status,'paused');
 deny('dnd_roll',{p_actor:'pei',p_code:codes.pei,p_formula:'1d20',p_label:'paused',p_request_id:randomUUID()});
 assert.equal(rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'resume'}).status,'active');
 assert.equal(rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'end'}).status,'ended');
});
console.log(`${checks} isolated database scenarios passed.`);
