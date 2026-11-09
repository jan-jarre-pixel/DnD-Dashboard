const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {rpc,codes,seed}=require('./rpc.cjs'),{sql}=require('./local.cjs');
seed();const tokens=Object.fromEntries(Object.keys(codes).map(actor=>[actor,rpc('dnd_sign_in',{p_actor:actor,p_code:codes[actor]}).token]));
const call=(actor,action,payload={})=>rpc('dnd_workspace_call',{p_token:tokens[actor],p_action:action,p_payload:payload});
const command=(action,payload={},request_id=randomUUID())=>call('gm',action,{...payload,request_id});
let count=0,plan,room,ended;
function test(name,fn){fn();count++;console.log('PASS '+name);}
test('private plans saved without publishing any drafts',()=>{
 plan=command('plan.save',{title:'Isolated session',scene:'UNPUBLISHED_SCENE',party_info:'UNPUBLISHED_INFO',private_notes:'GM_SECRET_ONLY'});
 assert.equal(plan.version,1);assert.equal(call('gm','plan.load',{id:plan.id}).private_notes,'GM_SECRET_ONLY');
 for(const actor of ['len','gra','sas','pei']){const s=call(actor,'snapshot');assert(!('plans'in s));assert(!('history'in s));assert(!JSON.stringify(s).includes('UNPUBLISHED'));assert(!JSON.stringify(s).includes('GM_SECRET_ONLY'));}
});
test('all player tokens denied every owner operation, forged metadata ignored',()=>{
 for(const actor of ['len','gra','sas','pei'])for(const action of ['plans.list','archives.list','plan.load','plan.save','archive.load','archive.save','session.start','session.quickstart','session.pause','session.resume','session.end','publish'])assert.throws(()=>call(actor,action,{id:plan.id,role:'owner',p_actor:'gm',request_id:randomUUID()}));
});
test('plan saves are idempotent and conflicting request payload rejected',()=>{
 const id=randomUUID(),payload={title:'Idempotent plan'};const a=command('plan.save',payload,id),b=command('plan.save',payload,id);assert.equal(a.id,b.id);assert.throws(()=>command('plan.save',{title:'Changed'},id));
});
test('version checks preserve concurrently edited plan',()=>{
 assert.throws(()=>command('plan.save',{id:plan.id,version:0,title:'stale'}));
 assert.equal(call('gm','plan.load',{id:plan.id}).private_notes,'GM_SECRET_ONLY');
});
test('start prepared plan with version and default publication hidden',()=>{
 assert.throws(()=>command('session.start',{id:plan.id,version:0}));room=command('session.start',{id:plan.id,version:plan.version});assert.equal(room.status,'active');assert.equal(call('gm','plan.load',{id:plan.id}).status,'live');assert.equal(call('len','snapshot').scene,'');
});
test('only explicit scene and group text reach players',()=>{
 const version=call('gm','snapshot').version;command('publish',{version,scene:'Public bridge',announcement:'Public message',private_notes:'SHOULD_NOT_PUBLISH'});
 for(const actor of ['len','gra','sas','pei']){const s=call(actor,'snapshot');assert.equal(s.scene,'Public bridge');assert.equal(s.announcement,'Public message');assert(!JSON.stringify(s).includes('GM_SECRET'));assert(!JSON.stringify(s).includes('SHOULD_NOT_PUBLISH'));}
 assert.throws(()=>command('publish',{version,scene:'stale'}));assert.equal(call('len','snapshot').scene,'Public bridge');
});
test('own server-generated initiative shown; another actor roll is not substituted',()=>{
 const roll=rpc('dnd_roll',{p_actor:'len',p_code:codes.len,p_formula:'1d20+4',p_label:'Initiative',p_request_id:randomUUID()});assert.equal(call('len','snapshot').initiative.total,roll.total);assert.equal(call('gra','snapshot').initiative,null);
});
test('pause and resume operate only on the current game session',()=>{
 assert.throws(()=>command('session.pause',{session_id:randomUUID()}));assert.equal(command('session.pause',{session_id:room.id}).status,'paused');assert.equal(command('session.resume',{session_id:room.id}).status,'active');
});
test('end creates one durable recap, retries return same result',()=>{
 rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'notes',p_notes:'Live private notes'});
 const id=randomUUID();ended=command('session.end',{session_id:room.id},id);assert.equal(ended.status,'ended');assert.deepEqual(command('session.end',{session_id:room.id},id),ended);
 const a=call('gm','archive.load',{id:room.id});assert.equal(a.recap.prep_notes,'GM_SECRET_ONLY');assert.equal(a.recap.gm_notes,'Live private notes');assert(a.duration_seconds>=0);assert(a.ended_at);assert.equal(sql(`SELECT count(*) FROM game_private.session_archives WHERE session_id='${room.id}'`,'dnd_test'),'1');
});
test('recap updates are versioned, server timing immutable and hidden from players',()=>{
 const a=call('gm','archive.load',{id:room.id});const b=command('archive.save',{id:room.id,version:a.version,events:'Discoveries',battles:'A battle',quests:'Quest found',loot:'A gem',open_tasks:'Return',gm_notes:'Private recap',duration_seconds:999999});
 assert.equal(b.duration_seconds,a.duration_seconds);assert.equal(b.recap.events,'Discoveries');assert.equal(b.recap.prep_notes,'GM_SECRET_ONLY');assert.throws(()=>command('archive.save',{id:room.id,version:a.version,events:'stale'}));assert(!JSON.stringify(call('len','snapshot')).includes('Private recap'));
});
test('new session retains previous archives and clears publication',()=>{
 const next=command('session.quickstart',{title:'Next session'});assert.notEqual(next.id,room.id);assert.equal(call('len','snapshot').announcement,'');assert.equal(call('gm','archive.load',{id:room.id}).recap.events,'Discoveries');assert.throws(()=>command('session.end',{session_id:room.id}));
});
test('legacy GM endpoint still archives ends and preserves the API',()=>{
 rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'end'});const legacy=rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'start',p_title:'Legacy API session'});rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'end'});assert.equal(call('gm','archive.load',{id:legacy.id}).title,'Legacy API session');
});
test('paginated private lists are bounded and validate their offsets',()=>{assert(call('gm','plans.list',{offset:0}).length>0);assert(call('gm','archives.list',{offset:0}).length>0);assert.deepEqual(call('gm','archives.list',{offset:5000}),[]);assert.throws(()=>call('gm','archives.list',{offset:-1}));});
test('private tables, helper, null tokens, oversized payloads and unknown commands denied',()=>{
 for(const table of ['session_plans','session_workspace','session_archives','workspace_commands'])assert.throws(()=>sql(`SET ROLE anon; SELECT * FROM game_private.${table}`,'dnd_test'));
 assert.throws(()=>sql(`SET ROLE anon; SELECT game_private.dnd_workspace_snapshot('{}'::jsonb)`,'dnd_test'));
 for(const token of [null,'','a'.repeat(64)])assert.throws(()=>rpc('dnd_workspace_call',{p_token:token,p_action:'snapshot'}));
 for(const payload of [null,[],{note:'x'.repeat(220000)}])assert.throws(()=>call('gm','snapshot',payload));
 assert.throws(()=>command('unknown'));assert.throws(()=>call('gm','plan.save',{title:'No request id'}));
});
test('old and session clients preserve extension fields they do not understand',()=>{
 sql(`UPDATE public.character_slots SET sheet=sheet||'{"questNotes":"KEEP_QUEST_NOTES","conditions":["Vergiftet"]}'::jsonb WHERE char_key='pei'`,'dnd_test');
 rpc('write_character',{p_character_key:'pei',p_code:codes.pei,p_sheet:{char:'pei',hp:19}});
 let value=rpc('read_character',{p_character_key:'pei',p_code:codes.pei});assert.equal(value.questNotes,'KEEP_QUEST_NOTES');assert.deepEqual(value.conditions,['Vergiftet']);
 rpc('dnd_session_call',{p_token:tokens.pei,p_operation:'write_character',p_payload:{p_character_key:'pei',p_sheet:{char:'pei',hp:18}}});
 value=rpc('read_character',{p_character_key:'pei',p_code:codes.pei});assert.equal(value.questNotes,'KEEP_QUEST_NOTES');assert.equal(value.hp,18);
});
test('valid Unicode notes cannot block ending and archiving a session',()=>{
 const text='🙂'.repeat(12000);const p=command('plan.save',{title:'Unicode archive',private_notes:text});const r=command('session.start',{id:p.id,version:p.version});
 rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'notes',p_notes:text});command('publish',{version:call('gm','snapshot').version,scene:'Unicode scene',announcement:'🙂'.repeat(6000)});
 command('session.end',{session_id:r.id});const archive=call('gm','archive.load',{id:r.id});assert.equal(archive.recap.gm_notes,text);assert.equal(archive.recap.prep_notes,text);
});
console.log(`${count} workspace/session/recap scenarios passed.`);
