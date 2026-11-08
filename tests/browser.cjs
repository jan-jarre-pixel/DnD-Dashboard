// All Supabase requests are intercepted; LOCAL_DB=1 executes actual RPCs in dnd_test.
const local=process.env.LOCAL_DB==='1'?require('./db/rpc.cjs'):null;
const engines=require('playwright');
const engine=process.env.BROWSER||'chromium';
if(!['chromium','firefox','webkit'].includes(engine))throw Error('Unknown browser');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 if(local){local.seed();local.rpc('dnd_gm_manage',{p_code:local.codes.gm,p_action:'start',p_title:'Browser test'});}
 const server=http.createServer((req,res)=>{
  const file=decodeURIComponent(req.url.split('?')[0]).replace(/^\/DnD-Dashboard\//,'')||'index.html';
  if(file.includes('..')||!(['index.html','spieltisch.html','config.js','online.js'].includes(file)||/^(src|public)\/[a-z0-9/.-]+$/.test(file))||!fs.existsSync(file)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{browser=await engines[engine].launch({headless:true,...(engine==='chromium'?{...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox']}:{})});
 let count=0;
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  for(const role of ['len','gra','sas','pei','gm']){
   const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];const requests=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:process.env.SUPABASE_BROWSER_BUNDLE||'/workspace/private-dnd-backup/supabase.js',contentType:'text/javascript'}));
   await page.route('https://*.supabase.co/**',r=>{
    let method=r.request().url().split('/').pop();let body=r.request().postDataJSON();requests.push({method,body});
    if(local){try{return r.fulfill({json:local.rpc(method,body)});}catch(e){return r.fulfill({status:400,json:{message:e.message}});}}
    if(method==='dnd_sign_in'&&body.p_code!=='invalid_code_for_test_0000')return r.fulfill({json:{actor:role,role:role==='gm'?'owner':'player',identity_id:'test-identity',expires_at:new Date(Date.now()+3600000).toISOString(),token:'a'.repeat(64)}});
    if(method==='dnd_session_call'){method=body.p_operation;body=body.p_payload;}
    if(method==='identity')return r.fulfill({json:{actor:role,role:role==='gm'?'owner':'player',identity_id:'test-identity',expires_at:new Date(Date.now()+3600000).toISOString()}});
    if(body?.p_code==='invalid_code_for_test_0000')return r.fulfill({status:400,json:{message:'Ungültiger Charaktercode'}});
    const session={id:'test-session',title:'Testsitzung',status:'active'};
    const snapshot={session,party:[],rolls:[],online:[],latest_id:0,gm_notes:role==='gm'?'Private Testnotiz':null};
    const data=method==='read_party'?['len','gra','sas','pei'].map(char_key=>({char_key,sheet:{}})):method==='read_character'?{}:method==='dnd_snapshot'?snapshot:null;
    return r.fulfill({json:data});
   });
   const base=`http://127.0.0.1:${server.address().port}/DnD-Dashboard/`;
   await page.goto(base);await page.locator('#loginCharacter').waitFor();
   await page.selectOption('#loginCharacter',role);await page.fill('#loginCode','invalid_code_for_test_0000');await page.locator('button[type=submit]').click();
   await page.waitForFunction(()=>document.body.innerText.includes('ungültig'));
   await page.selectOption('#loginCharacter',role);await page.fill('#loginCode',local?local.codes[role]:'synthetic_test_code_00000000');await page.locator('button[type=submit]').click();
   await page.getByText('Abmelden',{exact:true}).waitFor({timeout:5000}).catch(async e=>{console.error(await page.locator('body').innerText(),errors);throw e;});
   if(local && role!=='gm'){
    const before=local.rpc('read_character',{p_character_key:role,p_code:local.codes[role]});
    await page.evaluate(key=>adj(key,'hp',-1,0,9999),role);
    await page.waitForFunction(()=>document.body.innerText.includes('Online gespeichert'));
    assert.equal(local.rpc('read_character',{p_character_key:role,p_code:local.codes[role]}).hp,before.hp-1);
   }
   assert.equal(await page.evaluate(()=>localStorage.getItem('dnd_characters_cloud_v2')),null);
   assert.match(await page.evaluate(()=>sessionStorage.getItem('dnd_session_v1')),/^[a-f0-9]{64}$/);
   for(const req of requests.filter(x=>x.method!=='dnd_sign_in'))assert(!JSON.stringify(req.body).includes(local?local.codes[role]:'synthetic_test_code_00000000'));
   await page.reload();await page.getByText('Abmelden',{exact:true}).waitFor();
   await page.goto(base+'spieltisch.html');await page.locator('#dashboard').waitFor({state:'visible'});
   assert.equal(await page.locator('#gmPanel').isVisible(),role==='gm');
   assert.equal(await page.locator('.app-navigation a[aria-current]').count(),1);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
   if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:`${process.env.SCREENSHOT_DIR}/${role}-${viewport.width}.png`,fullPage:true});}
   assert.equal(await page.locator('#visibilityWrap').isVisible(),role==='gm');
   await page.locator('#logout').click();await page.locator('#loginPanel').waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>localStorage.getItem('dnd_characters_cloud_v2')),null);
   assert.equal(await page.evaluate(()=>sessionStorage.getItem('dnd_session_v1')),null);
   assert.deepEqual(errors,[]);count++;await context.close();
  }
 }
 console.log(`${count} ${engine} scenarios passed (5 roles × desktop/mobile; ${local?'local PostgreSQL RPCs':'mocked backend'}).`);
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
