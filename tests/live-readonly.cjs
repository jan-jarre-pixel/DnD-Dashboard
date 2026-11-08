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
 console.log(`${count} live read-only denial checks passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
