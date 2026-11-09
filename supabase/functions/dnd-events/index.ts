import {createHandler} from './handler.mjs';
// Default Edge environment values; deliberately no service_role/admin access.
const url=Deno.env.get('SUPABASE_URL')!;
const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
Deno.serve(createHandler({
 originAllowed:(origin:string)=>origin==='https://jan-jarre-pixel.github.io'||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin),
 async poll(token:string,cursor:number,signal:AbortSignal){
  const response=await fetch(url+'/rest/v1/rpc/dnd_sync_poll',{method:'POST',headers:{apikey:anon,Authorization:'Bearer '+anon,'Content-Type':'application/json'},body:JSON.stringify({p_token:token,p_cursor:cursor}),signal});
  const data=await response.json();if(!response.ok)throw {code:data.code};return data;
 }
}));
