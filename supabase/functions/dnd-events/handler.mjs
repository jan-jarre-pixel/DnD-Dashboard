// Token-authorized SSE. No service-role key and no client-controlled recipients.
export function createHandler({poll,originAllowed=()=>true,duration=95000,interval=2000,delay=ms=>new Promise(r=>setTimeout(r,ms))}){
 const encoder=new TextEncoder();
 return async request=>{
  const origin=request.headers.get('origin')||'';
  const headers={'Access-Control-Allow-Origin':origin||'*','Access-Control-Allow-Headers':'apikey, content-type, authorization','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store, no-transform'};
  const fail=(status,message)=>new Response(JSON.stringify({message}),{status,headers:{...headers,'Content-Type':'application/json'}});
  if(origin&&!originAllowed(origin))return fail(403,'Origin denied');
  if(request.method==='OPTIONS')return new Response(null,{headers});
  if(request.method!=='POST')return fail(405,'POST required');
  let body;
  try{
   const reader=request.body?.getReader();if(!reader)return fail(400,'Body required');let size=0,text='';const decoder=new TextDecoder();
   while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();return fail(413,'Request too large');}text+=decoder.decode(value,{stream:true});}
   body=JSON.parse(text+decoder.decode());
  }catch{return fail(400,'Invalid JSON');}
  if(!/^[a-f0-9]{64}$/.test(body?.token||'')||!Number.isSafeInteger(body.cursor)||body.cursor<0)return fail(400,'Invalid credentials or cursor');
  let first;
  try{first=await poll(body.token,body.cursor,request.signal);}catch(e){return fail(e.code==='28000'?403:503,e.code==='28000'?'Session expired':'Service unavailable');}
  let cancelled=false;
  const stream=new ReadableStream({
   async start(controller){
    const until=Date.now()+duration;let batch=first,cursor=body.cursor;
    const send=(event,data)=>controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    try{
     while(!cancelled&&!request.signal.aborted&&Date.now()<until){
      send('batch',batch);cursor=batch.cursor;
      if(!batch.more)await delay(interval);
      if(cancelled||request.signal.aborted||Date.now()>=until)break;
      batch=await poll(body.token,cursor,request.signal);
     }
    }catch(error){if(!cancelled&&!request.signal.aborted)try{send(error.code==='28000'?'expired':'retry',{});}catch{}}
    finally{if(!cancelled)try{controller.close();}catch{}}
   },cancel(){cancelled=true;}
  });
  return new Response(stream,{headers:{...headers,'Content-Type':'text/event-stream; charset=utf-8','X-Content-Type-Options':'nosniff'}});
 };
}
