const {rpc,codes,seed}=require('./rpc.cjs'),{sql,literal,dockerArgs,dockerEnv}=require('./local.cjs'),{randomUUID}=require('node:crypto'),{execFile}=require('node:child_process'),{promisify}=require('node:util'),assert=require('node:assert/strict');const exec=promisify(execFile);
(async()=>{
 seed();const gm=rpc('dnd_sign_in',{p_actor:'gm',p_code:codes.gm}).token,len=rpc('dnd_sign_in',{p_actor:'len',p_code:codes.len}).token;rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'start'});let id;
 const read=()=>rpc('dnd_vtt_call',{p_token:gm,p_action:'snapshot',p_payload:{id}});
 const payload=data=>{const s=read();return {id:s.map?.id,version:s.map?.version,state_version:s.state_version,layout_version:s.map?.layout_version,session_id:s.session_id,token_version:s.map?.tokens.find(t=>t.id===data.target)?.version,request_id:randomUUID(),...data};};
 const send=(action,data={})=>rpc('dnd_vtt_call',{p_token:gm,p_action:action,p_payload:payload(data)});
 const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX8sAAAAASUVORK5CYII=';
 id=send('create',{title:'Concurrent door',width:512,height:256,tiles:[0,1].map(x=>({x,y:0,image}))}).id;send('publish');send('fog',{cells:[[0,0],[1,0]],revealed:true});
 const token=send('token.add',{name:'Len',x:100,y:128,owner_key:'len',visible:true}).result.target,door=send('feature.add',{kind:'door',label:'Door',x1:180,y1:0,x2:180,y2:255,door_state:'open'}).result.target;
 const concurrent=(actor,action,data)=>exec('docker',[...dockerArgs,'exec','dnd-m0-postgres','psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres','-d','dnd_test','-c',`SET ROLE anon;SELECT public.dnd_vtt_call(${literal(actor)},${literal(action)},${literal(JSON.stringify(data))}::jsonb)`],{env:dockerEnv,maxBuffer:1024*1024});
 for(let i=0;i<8;i++){
  const t=read().map.tokens.find(t=>t.id===token);send('token.update',{target:token,name:t.name,x:100,y:128,owner_key:'len',visible:true});send('feature.update',{target:door,kind:'door',x1:180,y1:0,x2:180,y2:255,door_state:'open'});
  const move=payload({target:token,x:230,y:128}),close=payload({target:door});const results=await Promise.allSettled(i%2?[concurrent(gm,'feature.toggle',close),concurrent(len,'token.move',move)]:[concurrent(len,'token.move',move),concurrent(gm,'feature.toggle',close)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);for(const r of results)if(r.status==='rejected')assert.match(r.reason.stderr,/Versionskonflikt|blockiert/);
  const m=read().map,d=m.features.find(f=>f.id===door),p=m.tokens.find(t=>t.id===token);assert(d.door_state==='closed'&&p.x===100||d.door_state==='open'&&p.x===230);
 }
 console.log('Eight real parallel door-close/player-move races passed: exactly one CAS winner, no movement through an already closed door and no stale closure overwrites.');
})().catch(e=>{console.error(e);process.exitCode=1;});
