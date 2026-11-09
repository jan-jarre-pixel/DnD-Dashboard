const {test}=require('node:test'),assert=require('node:assert/strict');
const token='b'.repeat(64),req=(body={token,cursor:0},extra={})=>new Request('http://local/events',{method:'POST',headers:{origin:'https://allowed'},body:JSON.stringify(body),...extra});
test('SSE authenticates before headers, rejects oversized input/origins/methods',async()=>{
 const {createHandler}=await import('../supabase/functions/dnd-events/handler.mjs');
 const h=createHandler({originAllowed:o=>o==='https://allowed',poll:async()=>{throw {code:'28000'};}});
 assert.equal((await h(req())).status,403);assert.equal((await h(req({token:'bad',cursor:0}))).status,400);assert.equal((await h(req({token,cursor:0,padding:'x'.repeat(1500)}))).status,413);assert.equal((await h(req(undefined,{headers:{origin:'https://evil'}}))).status,403);assert.equal((await h(new Request('http://local'))).status,405);
});
test('SSE resumes the confirmed cursor and terminates on token revocation',async()=>{
 const {createHandler}=await import('../supabase/functions/dnd-events/handler.mjs');let calls=0;
 const h=createHandler({duration:1000,interval:0,poll:async(t,c)=>{assert.equal(t,token);if(calls++===0){assert.equal(c,8);return {cursor:9,events:[{event_id:'one'}],more:true};}assert.equal(c,9);throw {code:'28000'};}});
 const r=await h(req({token,cursor:8}));assert.equal(r.headers.get('cache-control'),'no-store, no-transform');const text=await r.text();assert(text.includes('event: batch'));assert(text.includes('event: expired'));assert(!text.includes(token));
});
test('SSE catches transient failures without leaking upstream messages',async()=>{
 const {createHandler}=await import('../supabase/functions/dnd-events/handler.mjs');let calls=0;
 const h=createHandler({duration:1000,interval:0,poll:async()=>{if(calls++===0)return {cursor:0,events:[],more:true};throw Error('SECRET_SQL');}});
 const text=await (await h(req())).text();assert(text.includes('event: retry'));assert(!text.includes('SECRET_SQL'));
});
