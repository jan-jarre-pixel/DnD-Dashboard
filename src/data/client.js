/* One data boundary for both pages. Credentials never enter the UI store. */
((root)=>{
 'use strict';
 const DND=root.DND,key='dnd_session_v1',legacyKey='dnd_characters_cloud_v2';
 let client,token='',current=null,generation=0;
 const rolls=new Map(),inflight=new Map();
 const store=(value)=>{try{if(value)sessionStorage.setItem(key,value);else sessionStorage.removeItem(key);}catch{/* Memory-only session remains usable. */}};
 const clear=()=>{rolls.clear();inflight.clear();generation++;token='';current=null;store('');DND.store.update({identity:null,connection:'signed-out'});};
 function api(){if(client)return client;const config=root.DND_CLOUD_CONFIG||{};if(!root.supabase?.createClient||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url||'')||!config.publishableKey)throw Error('Online-Konfiguration konnte nicht geladen werden.');return client=root.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
 async function call(name,params){const {data,error}=await api().rpc(name,params);if(error)throw error;return data;}
 async function request(operation,payload={}){
  if(!token)throw Error('Bitte mit deinem privaten Code anmelden.');
  const credentials=token,epoch=generation;
  const safe={...payload};delete safe.p_code;delete safe.p_actor;
  try{const result=operation.startsWith('combat.')?await call('dnd_combat_call',{p_token:credentials,p_action:operation.slice(7),p_payload:safe}):operation==='sync.poll'?await call('dnd_sync_poll',{p_token:credentials,p_cursor:safe.cursor||0}):operation.startsWith('sync.')?await call('dnd_sync_call',{p_token:credentials,p_action:operation.slice(5),p_payload:safe}):operation.startsWith('workspace.')?await call('dnd_workspace_call',{p_token:credentials,p_action:operation.slice(10),p_payload:safe}):await call('dnd_session_call',{p_token:credentials,p_operation:operation,p_payload:safe});if(epoch!==generation)throw Error('Sitzung gewechselt. Veraltete Antwort verworfen.');return result;}
  catch(e){if(e.code==='28000'&&epoch===generation){clear();root.dispatchEvent(new Event('dnd:session-ended'));}throw e;}
 }
 async function signIn(actor,code){
  const epoch=generation;
  const result=await call('dnd_sign_in',{p_actor:actor,p_code:code});
  if(epoch!==generation){if(/^[a-f0-9]{64}$/.test(result?.token||'')){try{await call('dnd_sign_out',{p_token:result.token});}catch{}}throw Error('Sitzung gewechselt. Anmeldung verworfen.');}
  const next=DND.model.identity(result);
  if(!/^[a-f0-9]{64}$/.test(result.token||''))throw Error('Ungültige Serverantwort');
  rolls.clear();inflight.clear();generation++;token=result.token;current=next;store(token);
  try{localStorage.removeItem(legacyKey);}catch{}
  DND.store.update({identity:next,connection:'online'});return next;
 }
 async function restore(){
  if(!token){try{const saved=sessionStorage.getItem(key);if(/^[a-f0-9]{64}$/.test(saved||''))token=saved;}catch{}}
  if(token){try{current=DND.model.identity(await request('identity'));DND.store.update({identity:current,connection:'online'});return current;}catch(e){if(e.code!=='28000')throw e;}}
  let legacy;try{legacy=JSON.parse(localStorage.getItem(legacyKey)||'null');}catch{}
  const actor=legacy?.role==='gm'?'gm':legacy?.char;
  if(Object.hasOwn(DND.model.actors,actor)&&typeof legacy?.code==='string'){try{return await signIn(actor,legacy.code);}catch(e){if(e.code==='28000'){try{localStorage.removeItem(legacyKey);}catch{}}throw e;}}
  return null;
 }
 async function logout(){const old=token;clear();try{localStorage.removeItem(legacyKey);}catch{}if(old)await call('dnd_sign_out',{p_token:old});}
 async function stream(cursor,signal){
  const epoch=generation,credentials=token;if(!credentials)throw Error('Bitte anmelden.');
  const config=root.DND_CLOUD_CONFIG;const response=await fetch(config.url+'/functions/v1/dnd-events',{method:'POST',headers:{'Content-Type':'application/json','apikey':config.publishableKey},body:JSON.stringify({token:credentials,cursor}),signal,cache:'no-store'});
  if(epoch!==generation){await response.body?.cancel();throw Error('Sitzung gewechselt.');}
  if(response.status===401||response.status===403){clear();root.dispatchEvent(new Event('dnd:session-ended'));throw Error('Sitzung abgelaufen.');}
  if(!response.ok||!response.headers.get('content-type')?.includes('text/event-stream'))throw Error('Live-Verbindung nicht verfügbar');return response;
 }
 async function roll(params){
  const rollEpoch=generation;
  const key=JSON.stringify([params.p_formula,params.p_label,params.p_visibility,params.p_adv]);
  if(inflight.has(key))return inflight.get(key);
  const task=(async()=>{
  if(!rolls.has(key)){const snap=await request('workspace.snapshot');if(rollEpoch!==generation)throw Error('Sitzung gewechselt.');rolls.set(key,{request_id:crypto.randomUUID(),session_id:snap.session.id,formula:params.p_formula,label:params.p_label,visibility:params.p_visibility||'public',advantage:params.p_adv||0});}
  try{const data=await request('sync.roll',rolls.get(key));rolls.delete(key);return {data,error:null};}catch(error){if(rollEpoch===generation&&(error.code==='P0001'||error.code==='22023'))rolls.delete(key);return {data:null,error};}
  })().finally(()=>{if(inflight.get(key)===task)inflight.delete(key);});inflight.set(key,task);return task;
 }
 DND.transport=Object.freeze({stream});
 DND.auth=Object.freeze({signIn,restore,logout,identity:()=>current});
 DND.api=Object.freeze({request,roll,async rpc(name,params){try{return {data:await request(name,params),error:null};}catch(error){return {data:null,error};}}});
})(globalThis);
