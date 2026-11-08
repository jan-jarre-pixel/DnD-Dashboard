const {spawn}=require('node:child_process');
const {randomUUID}=require('node:crypto');
const assert=require('node:assert/strict');
const {rpc,codes,seed}=require('./rpc.cjs');
const {container}=require('./local.cjs');
function roll(actor,id){
 return new Promise((resolve,reject)=>{
  const child=spawn('docker',['exec','-i',container,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres','-d','dnd_test']);
  let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
  child.on('error',reject);child.on('exit',code=>code===0?resolve(JSON.parse(out)):reject(Error(err)));
  child.stdin.end(`SET ROLE anon; SELECT public.dnd_roll('${actor}','${codes[actor]}','1d20+2','concurrency','public','${id}',0::smallint);`);
 });
}
(async()=>{
 seed();rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'start'});
 const actors=Object.keys(codes);
 const results=await Promise.all(actors.map(actor=>roll(actor,randomUUID())));
 assert.equal(new Set(results.map(x=>x.id)).size,5);
 const after=Math.min(...results.map(x=>x.id));
 const recovered=rpc('dnd_snapshot',{p_actor:'len',p_code:codes.len,p_after:after});
 assert.equal(recovered.rolls.length,4);
 for(const actor of actors)assert.equal(rpc('dnd_snapshot',{p_actor:actor,p_code:codes[actor]}).rolls.length,5);
 const request=randomUUID();const retried=await Promise.all(Array.from({length:5},()=>roll('len',request)));
 assert.equal(new Set(retried.map(x=>x.id)).size,1);
 assert.equal(rpc('dnd_snapshot',{p_actor:'gm',p_code:codes.gm}).rolls.length,6);
 console.log('Concurrent five-actor rolls, five-way same-request retry and missed-event recovery passed (local database).');
})().catch(e=>{console.error(e);process.exitCode=1;});
