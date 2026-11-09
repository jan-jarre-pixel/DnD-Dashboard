const {spawn}=require('node:child_process'),{randomUUID}=require('node:crypto'),assert=require('node:assert/strict');
const {rpc,codes,seed}=require('./rpc.cjs'),{container,dockerArgs,dockerEnv,literal}=require('./local.cjs');
function execute(commands){return new Promise((resolve,reject)=>{const c=spawn('docker',[...dockerArgs,'exec','-i',container,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres','-d','dnd_test'],{env:dockerEnv});let out='',err='';c.stdout.on('data',d=>out+=d);c.stderr.on('data',d=>err+=d);c.on('error',reject);c.on('exit',code=>code===0?resolve(out.trim().split('\n').filter(Boolean).map(JSON.parse)):reject(Error(err)));c.stdin.end('SET ROLE anon;'+commands);});}
(async()=>{
 seed();const actors=Object.keys(codes),tokens=Object.fromEntries(actors.map(a=>[a,rpc('dnd_sign_in',{p_actor:a,p_code:codes[a]}).token]));
 const room=rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'start'}).id;
 const statement=(a,action,p)=>`SELECT public.dnd_sync_call(${literal(tokens[a])},${literal(action)},${literal(JSON.stringify(p))}::jsonb);`;
 const results=(await Promise.all(actors.map(a=>execute(Array.from({length:10},()=>statement(a,'roll',{session_id:room,formula:'1d20',label:'load50',request_id:randomUUID()})).join(''))))).flat();
 assert.equal(results.length,50);assert.equal(new Set(results.map(r=>r.id)).size,50);
 const events=rpc('dnd_sync_poll',{p_token:tokens.len,p_cursor:0}).events.filter(e=>e.type==='DiceRolled'&&e.payload.label==='load50');assert.equal(events.length,50);
 const p={session_id:room,formula:'1d20',label:'same request',request_id:randomUUID()};const retries=(await Promise.all(actors.map(()=>execute(statement('len','roll',p))))).flat();assert.equal(new Set(retries.map(r=>r.id)).size,1);
 const row=rpc('dnd_sync_call',{p_token:tokens.len,p_action:'character.read'});
 const saves=await Promise.allSettled(['one','two'].map(n=>execute(statement('len','character.save',{key:'len',version:row.version,sheet:{char:'len',n},request_id:randomUUID()}))));
 assert.equal(saves.filter(r=>r.status==='fulfilled').length,1);assert(saves.some(r=>r.status==='rejected'&&/Versionskonflikt/.test(r.reason.message)));
 console.log('50 rolls across five concurrent actors, ordered delivery, five-way idempotent retry and concurrent character CAS passed (isolated database).');
})().catch(e=>{console.error(e);process.exitCode=1;});
