/* Authenticated resumable events. Database results are authoritative, never SSE input. */
((root)=>{
 'use strict';
 const DND=root.DND;let epoch=0,controller=null,identity=null,cursor=0,refreshTimer,healthTimer;
 const seen=new Set(),feed=[];
 const emit=type=>root.dispatchEvent(new CustomEvent(type));
 const status=value=>{if(DND.store.get().liveStatus!==value)DND.store.update({liveStatus:value});};
 function refresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>emit('dnd:live-refresh'),80);}
 function accept(batch){
  if(!batch||!Number.isSafeInteger(batch.cursor)||batch.cursor<0||!Array.isArray(batch.events))throw Error('Ungültiger Ereignisstand');
  if(batch.reset){feed.length=0;seen.clear();refresh();}
  for(const event of batch.events){
   if(seen.has(event.event_id))continue;seen.add(event.event_id);feed.push(event);
   if(feed.length>200)seen.delete(feed.shift().event_id);
   root.dispatchEvent(new CustomEvent('dnd:live-event',{detail:event}));refresh();
  }
  cursor=batch.cursor;
 }
 async function consume(response,mine){
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',received=false;
  try{while(mine===epoch){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});if(buffer.length>1000000)throw Error('Ereignis zu groß');let index;
   while((index=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,index);buffer=buffer.slice(index+2);const type=frame.match(/^event: (.+)$/m)?.[1];const data=frame.match(/^data: (.+)$/m)?.[1];
    if(mine!==epoch)return;
    if(type==='expired'){await DND.api.request('identity');throw Error('Sitzung abgelaufen');}
    if(type==='retry')throw Error('Stream unterbrochen');
    if(type==='batch'&&data){accept(JSON.parse(data));received=true;status('live');}
   }
  }return received;}finally{await reader.cancel().catch(()=>{});}
 }
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 async function connect(mine){
  let failures=0,nextStream=0,initialized=false;
  while(mine===epoch&&identity){
   if(root.navigator?.onLine===false){status('offline');await delay(1000);continue;}
   try{
    if(!initialized){const initial=await DND.api.request('sync.bootstrap');if(mine!==epoch)return;cursor=initial.cursor;initialized=true;refresh();}
    if(Date.now()>=nextStream){controller=new AbortController();const response=await DND.transport.stream(cursor,controller.signal);if(mine!==epoch){await response.body?.cancel();return;}if(!await consume(response,mine))throw Error('Leerer Stream');failures=0;await delay(500);}
    else{const batch=await DND.api.request('sync.poll',{cursor});if(mine!==epoch)return;accept(batch);status('fallback');await delay(batch.more?0:5000);}
   }catch{
    if(mine!==epoch)return;failures++;status(root.navigator?.onLine===false?'offline':'reconnecting');
    if(failures>=2)nextStream=Date.now()+60000;
    await delay(Math.min(30000,1000*2**Math.min(failures,5))+Math.random()*250);
   }
  }
 }
 function stop(){epoch++;controller?.abort();controller=null;identity=null;cursor=0;seen.clear();feed.length=0;clearInterval(healthTimer);clearTimeout(refreshTimer);}
 DND.store.subscribe(state=>{
  if(state.identity===identity)return;
  stop();identity=state.identity;
  if(identity){const mine=epoch;status('connecting');healthTimer=setInterval(()=>{if(!document.hidden)refresh();},20000);connect(mine);}
 });
 root.addEventListener('online',()=>{controller?.abort();refresh();});
 root.addEventListener('offline',()=>{controller?.abort();if(identity)status('offline');});
 root.addEventListener('pagehide',()=>stop());
 root.addEventListener('pageshow',()=>{const i=DND.auth.identity();if(i&&!identity)DND.store.update({identity:i});});
 DND.live=Object.freeze({events:()=>feed.slice(),refresh});
})(globalThis);
