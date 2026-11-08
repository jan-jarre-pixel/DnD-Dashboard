const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function harness(handler){
 const session=new Map(),legacy=new Map();let events=0;
 const storage=map=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
 const ctx={structuredClone,Event:class{},dispatchEvent:()=>events++,sessionStorage:storage(session),localStorage:storage(legacy),DND_CLOUD_CONFIG:{url:'https://example.supabase.co',publishableKey:'sb_publishable_test'},supabase:{createClient:()=>({rpc:handler})}};
 vm.createContext(ctx);for(const p of ['core/model','core/store','data/client'])vm.runInContext(fs.readFileSync(`src/${p}.js`,'utf8'),ctx);
 return {ctx,session,legacy,events:()=>events};
}
const identity={actor:'len',role:'player',identity_id:'00000000-0000-0000-0000-000000000001',expires_at:'2099-01-01T00:00:00Z'};
const token='b'.repeat(64),code='private_code_used_only_at_login';
test('code exchanged once; only token persists; no caller role or code sent to data RPC',async()=>{
 const calls=[];const h=harness(async(name,params)=>{calls.push({name,params});return {data:name==='dnd_sign_in'?{...identity,token}:identity,error:null};});
 await h.ctx.DND.auth.signIn('len',code);await h.ctx.DND.api.request('read_character',{p_actor:'gm',p_code:code,p_character_key:'len'});
 assert.equal(h.session.get('dnd_session_v1'),token);assert(!JSON.stringify(h.ctx.DND.store.get()).includes(token));
 assert.equal(calls[1].params.p_payload.p_actor,undefined);assert.equal(calls[1].params.p_payload.p_code,undefined);
});
test('previously stored code is removed only after successful exchange',async()=>{
 const h=harness(async()=>({data:{...identity,token},error:null}));h.legacy.set('dnd_characters_cloud_v2',JSON.stringify({role:'player',char:'len',code}));
 const result=await h.ctx.DND.auth.restore();assert.equal(result.actor,'len');assert.equal(h.legacy.size,0);
});
test('late response from logged-out identity cannot reach the caller',async()=>{
 let resolve;const h=harness(async name=>name==='dnd_sign_in'?{data:{...identity,token}}:name==='dnd_sign_out'?{data:null}:new Promise(r=>resolve=r));
 await h.ctx.DND.auth.signIn('len',code);const pending=h.ctx.DND.api.request('read_character');await h.ctx.DND.auth.logout();resolve({data:{secret:'stale sheet'}});
 await assert.rejects(pending,/Veraltete Antwort/);assert.equal(h.session.size,0);assert.equal(h.ctx.DND.auth.identity(),null);
});
test('expired token clears identity and notifies pages; network failure retains session',async()=>{
 let error={message:'network down'};const h=harness(async name=>name==='dnd_sign_in'?{data:{...identity,token}}:{data:null,error});
 await h.ctx.DND.auth.signIn('len',code);await assert.rejects(h.ctx.DND.api.request('identity'));assert.equal(h.session.size,1);assert.equal(h.events(),0);
 error={code:'28000',message:'expired'};await assert.rejects(h.ctx.DND.api.request('identity'));assert.equal(h.session.size,0);assert.equal(h.events(),1);
});
test('server logout failure still clears credentials locally',async()=>{
 const h=harness(async name=>name==='dnd_sign_in'?{data:{...identity,token}}:{error:{message:'network down'}});
 await h.ctx.DND.auth.signIn('len',code);await assert.rejects(h.ctx.DND.auth.logout());assert.equal(h.session.size,0);assert.equal(h.ctx.DND.auth.identity(),null);
});
test('late sign-in after logout cannot resurrect an authenticated identity',async()=>{
 let finish;const h=harness(async name=>name==='dnd_sign_in'?new Promise(r=>finish=r):{data:null});
 const pending=h.ctx.DND.auth.signIn('len',code);await h.ctx.DND.auth.logout();finish({data:{...identity,token}});
 await assert.rejects(pending,/Anmeldung verworfen/);assert.equal(h.ctx.DND.auth.identity(),null);assert.equal(h.session.size,0);
});
