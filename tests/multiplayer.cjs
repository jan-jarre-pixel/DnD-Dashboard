// Real HTTP SSE handler + isolated PostgreSQL + simultaneous browser contexts.
const {createServer}=require('node:http'),fs=require('node:fs'),assert=require('node:assert/strict');
const {rpc,codes,seed}=require('./db/rpc.cjs'),{sql}=require('./db/local.cjs');
const engine=process.env.BROWSER||'chromium',roles=Object.keys(codes),failures=[];
(async()=>{
 seed();rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'start'});
 const {createHandler}=await import('../supabase/functions/dnd-events/handler.mjs');
 let streams=0;const aborts=new Set();
 const handler=createHandler({duration:4000,interval:400,poll:async(token,cursor)=>{try{return rpc('dnd_sync_poll',{p_token:token,p_cursor:cursor});}catch(e){throw {code:/abgelaufen/.test(e.message)?'28000':'P0001'};}}});
 const server=createServer(async(req,res)=>{
  if(req.url==='/events'){
   streams++;const abort=new AbortController();aborts.add(abort);res.on('close',()=>{abort.abort();aborts.delete(abort);});let body='';for await(const chunk of req){body+=chunk;if(body.length>1024){res.writeHead(413).end();return;}}
   const result=await handler(new Request('http://local/events',{method:req.method,headers:req.headers,body,signal:abort.signal}));res.writeHead(result.status,Object.fromEntries(result.headers));
   try{for await(const chunk of result.body){if(abort.signal.aborted)break;res.write(chunk);}res.end();}catch{res.destroy();}return;
  }
  const file=decodeURIComponent(req.url.split('?')[0]).replace(/^\/DnD-Dashboard\//,'')||'index.html';
  if(file.includes('..')||!(['index.html','spieltisch.html','online.js','config.js'].includes(file)||/^(src|public)\/[a-z0-9/.-]+$/.test(file))||!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await require('playwright')[engine].launch({headless:true,...(engine==='chromium'?{...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox']}:{})});
 const contexts=[],pages={};const base=`http://127.0.0.1:${server.address().port}/DnD-Dashboard/`;
 async function open(role,sheet=false,contextOptions={}){
  const context=await browser.newContext(contextOptions);contexts.push(context);
  // Redirect only the transport endpoint; the application and handler remain real.
  await context.addInitScript(()=>{const original=window.fetch;window.fetch=(url,options)=>original(typeof url==='string'&&url.includes('/functions/v1/dnd-events')?location.origin+'/events':url,options);});
  const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>failures.push(e.message));
  await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:process.env.SUPABASE_BROWSER_BUNDLE||'/workspace/private-dnd-backup/supabase.js',contentType:'text/javascript'}));
  await page.route('https://*.supabase.co/rest/v1/rpc/*',r=>{try{return r.fulfill({json:rpc(r.request().url().split('/').pop(),r.request().postDataJSON())});}catch(e){return r.fulfill({status:400,json:{code:/Versionskonflikt/.test(e.message)?'40001':/abgelaufen/.test(e.message)?'28000':'P0001',message:e.message}});}});
  await page.goto(base+(sheet?'':'spieltisch.html'));await page.selectOption(sheet?'#loginCharacter':'#role',role);await page.fill(sheet?'#loginCode':'#accessCode',codes[role]);await page.locator(sheet?'#sheet form button[type=submit]':'#loginForm button[type=submit]').click();await page.getByText('Abmelden',{exact:true}).waitFor();await page.locator('.live-status').filter({hasText:'● Live'}).waitFor({timeout:15000});return page;
 }
 try{
  for(const role of roles)pages[role]=await open(role);
  if(process.env.INVENTORY_ONLY==='1'){await require('./inventory-flow.cjs')(pages,{rpc,codes});assert.deepEqual(failures,[]);return;}
  if(process.env.CAMPAIGN_ONLY==='1'){await require('./campaign-flow.cjs')(pages,{rpc,codes});assert.deepEqual(failures,[]);return;}
  await pages.gm.waitForFunction(()=>document.getElementById('onlineText').textContent==='5 / 5 Teilnehmer online');
  await Promise.all(roles.map(role=>pages[role].fill('#rollLabel','Gleichzeitig '+role)));
  const started=Date.now();await Promise.all(roles.map(role=>pages[role].locator('#rollButton').click()));
  await Promise.all(roles.map(role=>pages[role].waitForFunction(()=>document.getElementById('rolls').textContent.includes('Gleichzeitig pei')&&document.getElementById('rolls').textContent.includes('Gleichzeitig gm'))));
  const latency=Date.now()-started;
  await pages.gm.selectOption('#rollVisibility','gm');await pages.gm.fill('#rollLabel','GM_SECRET_MULTIPLAYER');await pages.gm.locator('#rollButton').click();await pages.gm.locator('#rolls').getByText(/GM_SECRET_MULTIPLAYER/).waitFor();
  for(const role of roles.filter(x=>x!=='gm')){assert(!await pages[role].locator('body').innerText().then(x=>x.includes('GM_SECRET_MULTIPLAYER')));assert(!await pages[role].evaluate(()=>JSON.stringify(DND.live.events()).includes('GM_SECRET_MULTIPLAYER')));}
  const first=await open('len',true),second=await open('len',true);
  await first.evaluate(()=>{S.len.hp=11;S.len.conditions=['Vergiftet'];S.len.status='Vergiftet';save('len');});await first.waitForFunction(()=>document.body.textContent.includes('Online gespeichert'));
  await pages.gm.waitForFunction(()=>[...document.querySelectorAll('.party-card')].some(x=>x.textContent.includes('Lennox')&&x.textContent.includes('11/30')&&x.textContent.includes('Vergiftet')));
  await second.waitForFunction(()=>S.len.hp===11);
  // Both tabs edit the same version; one succeeds, the other keeps its draft.
  await Promise.all([first.evaluate(()=>{S.len.n='DRAFT_FIRST';save('len');}),second.evaluate(()=>{S.len.n='DRAFT_SECOND';save('len');})]);
  await Promise.race([first.locator('#syncConflict').waitFor({state:'visible'}),second.locator('#syncConflict').waitFor({state:'visible'})]);
  const conflict=await first.locator('#syncConflict').isVisible()?first:second;
  await conflict.locator('#conflictDraft').click();assert.match(await conflict.inputValue('#conflictText'),/DRAFT_/);conflict.once('dialog',d=>d.accept());await conflict.locator('#conflictReload').click();await conflict.locator('#syncConflict').waitFor({state:'detached'});
  // A disconnected player misses a public event, then recovers it exactly once.
  await pages.pei.context().setOffline(true);await pages.pei.waitForFunction(()=>document.querySelector('.live-status').textContent.includes('Offline'));
  sql("UPDATE public.dnd_presence SET last_seen_at=now()-interval '60 seconds' WHERE actor_key='pei'",'dnd_test');
  await pages.gm.waitForFunction(()=>document.getElementById('onlineText').textContent==='4 / 5 Teilnehmer online');
  await pages.len.fill('#rollLabel','MISSED_PUBLIC_EVENT');await pages.len.locator('#rollButton').click();
  await pages.pei.context().setOffline(false);await pages.pei.locator('#rolls').getByText(/MISSED_PUBLIC_EVENT/).waitFor({timeout:15000});
  // The status reconciliation can render the roll before the resumed SSE batch.
  await pages.pei.waitForFunction(()=>DND.live.events().some(e=>e.type==='DiceRolled'&&e.payload.label==='MISSED_PUBLIC_EVENT'),{},{timeout:30000});
  assert.equal(await pages.pei.evaluate(()=>DND.live.events().filter(e=>e.type==='DiceRolled'&&e.payload.label==='MISSED_PUBLIC_EVENT').length),1);
  assert(streams>roles.length,'short-lived stream renewal exercised');
  await require('./combat-flow.cjs')(pages,{rpc,codes});
  await require('./vtt-flow.cjs')(pages,{rpc,codes,open});
  await require('./campaign-flow.cjs')(pages,{rpc,codes});
  await require('./inventory-flow.cjs')(pages,{rpc,codes,sheet:first});
  // Authentication revocation terminates the next poll and clears private DOM.
  const gmToken=await pages.gm.evaluate(()=>sessionStorage.getItem('dnd_session_v1'));rpc('dnd_sign_out',{p_token:gmToken});await pages.gm.locator('#loginPanel').waitFor({state:'visible',timeout:15000});assert(!await pages.gm.locator('body').textContent().then(x=>x.includes('GM_SECRET_MULTIPLAYER')));assert.equal(await pages.gm.locator('#inventoryRows').textContent(),'');assert.equal(await pages.gm.locator('#inventoryGenerated').textContent(),'');assert.equal(await pages.gm.locator('#campaignRecords').textContent(),'');assert.equal(await pages.gm.locator('#mapBoard image').count(),0);assert.equal(await pages.gm.evaluate(()=>DND.vtt.current()),null);
  assert.deepEqual(failures,[]);console.log(`${engine}: GM + four simultaneous players, public/private rolls, HP/conditions, CAS draft recovery, offline presence, missed-event replay, stream renewal and revocation passed. Local observed five-roll delivery: ${latency} ms.`);
 }finally{await browser.close();for(const abort of aborts)abort.abort();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
