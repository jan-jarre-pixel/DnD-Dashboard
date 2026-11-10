// Explicit opt-in. GETs and read RPCs only; no character/session writes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('config.js','utf8'),ctx);
const {url,publishableKey}=ctx.window.DND_CLOUD_CONFIG;
(async()=>{
 let count=0;
 for(const table of ['character_slots','game_masters','dnd_room','dnd_rolls','dnd_presence']){
  const r=await fetch(`${url}/rest/v1/${table}?select=*&limit=1`,{headers:{apikey:publishableKey}});
  assert([401,403].includes(r.status),`${table}: unexpected ${r.status}`);count++;
 }
 for(const [fn,body] of [['read_character',{p_character_key:'len',p_code:'invalid_code_for_test_0000'}],['read_party',{p_code:'invalid_code_for_test_0000'}],['dnd_snapshot',{p_actor:'gm',p_code:'invalid_code_for_test_0000',p_after:0}]]){
  const r=await fetch(`${url}/rest/v1/rpc/${fn}`,{method:'POST',headers:{apikey:publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal(r.status,400,`${fn}: unexpected ${r.status}`);count++;
 }
 for(const [fn,body] of [['dnd_sign_in',{p_actor:'len',p_code:'invalid_code_for_test_0000'}],['dnd_session_call',{p_token:'invalid',p_operation:'identity',p_payload:{}}],['dnd_workspace_call',{p_token:'invalid',p_action:'snapshot',p_payload:{}}],['dnd_sync_call',{p_token:'invalid',p_action:'bootstrap',p_payload:{}}],['dnd_sync_poll',{p_token:'invalid',p_cursor:0}],['dnd_combat_call',{p_token:'invalid',p_action:'snapshot',p_payload:{}}],['dnd_vtt_call',{p_token:'invalid',p_action:'snapshot',p_payload:{}}],['dnd_campaign_call',{p_token:'invalid',p_action:'snapshot',p_payload:{}}],['dnd_inventory_call',{p_token:'invalid',p_action:'snapshot',p_payload:{}}]]){
  const r=await fetch(`${url}/rest/v1/rpc/${fn}`,{method:'POST',headers:{apikey:publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert([401,403].includes(r.status),`${fn}: unexpected ${r.status}`);count++;
 }
 for(const [options,status,message] of [
  [{method:'POST',body:JSON.stringify({token:'a'.repeat(64),cursor:0})},403,'Session expired'],
  [{method:'POST',body:JSON.stringify({token:'bad',cursor:0})},400,'Invalid credentials or cursor'],
  [{method:'POST',body:JSON.stringify({token:'a'.repeat(64),cursor:0}),headers:{Origin:'https://untrusted.example'}},403,'Origin denied'],
  [{method:'GET'},405,'POST required']
 ]){const r=await fetch(url+'/functions/v1/dnd-events',{...options,headers:{apikey:publishableKey,'Content-Type':'application/json',...options.headers}});assert.equal(r.status,status);assert.equal((await r.json()).message,message);count++;}
 const preflight=await fetch(url+'/functions/v1/dnd-events',{method:'OPTIONS',headers:{apikey:publishableKey,Origin:'https://jan-jarre-pixel.github.io','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'apikey, content-type'}});assert.equal(preflight.status,200);assert.equal(preflight.headers.get('access-control-allow-origin'),'https://jan-jarre-pixel.github.io');count++;
 console.log(`${count} live read-only denial checks passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
