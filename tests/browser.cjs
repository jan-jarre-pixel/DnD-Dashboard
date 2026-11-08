// Isolated UI tests: all Supabase requests are intercepted; no live writes.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=decodeURIComponent(req.url.split('?')[0]).replace(/^\/DnD-Dashboard\//,'')||'index.html';
  if(!['index.html','spieltisch.html','config.js','online.js'].includes(file)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let count=0;
 try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  for(const role of ['len','gra','sas','pei','gm']){
   const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:process.env.SUPABASE_BROWSER_BUNDLE||'/workspace/private-dnd-backup/supabase.js',contentType:'text/javascript'}));
   await page.route('https://*.supabase.co/**',r=>{
    const method=r.request().url().split('/').pop();const body=r.request().postDataJSON();
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
   await page.selectOption('#loginCharacter',role);await page.fill('#loginCode','synthetic_test_code_00000000');await page.locator('button[type=submit]').click();
   await page.getByText('Abmelden',{exact:true}).waitFor({timeout:5000}).catch(async e=>{console.error(await page.locator('body').innerText(),errors);throw e;});
   await page.goto(base+'spieltisch.html');await page.locator('#dashboard').waitFor({state:'visible'});
   assert.equal(await page.locator('#gmPanel').isVisible(),role==='gm');
   assert.equal(await page.locator('#visibilityWrap').isVisible(),role==='gm');
   await page.locator('#logout').click();await page.locator('#loginPanel').waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>localStorage.getItem('dnd_characters_cloud_v2')),null);
   assert.deepEqual(errors,[]);count++;await context.close();
  }
 }
 console.log(`${count} Chromium scenarios passed (5 roles × desktop/mobile; mocked backend).`);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
