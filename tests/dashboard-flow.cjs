const assert=require('node:assert/strict');
module.exports=async function dashboardFlow(page,local,role,viewport){
 const saved=()=>page.waitForFunction(()=>document.getElementById('st')?.textContent==='Online gespeichert ✓');
 const character=()=>local.rpc('read_character',{p_character_key:role,p_code:local.codes[role]});
 if(role!=='gm'){
  assert.equal(await page.locator('.app-navigation a').count(),6);
  await page.getByRole('link',{name:'Quick View',exact:true}).click();
  const hp=character().hp;
  await page.fill('#amt','-2');await page.getByRole('button',{name:'Schaden eintragen',exact:true}).click();assert.equal(character().hp,hp);
  await page.fill('#amt','2');await page.getByRole('button',{name:'Schaden eintragen',exact:true}).click();await saved();assert.equal(character().hp,hp-2);
  if(character().conditions?.includes('Vergiftet')){await page.getByRole('button',{name:'Vergiftet entfernen'}).click();await saved();}
  await page.selectOption('#condition-choice','Vergiftet');await page.getByRole('button',{name:'Hinzufügen',exact:true}).click();await saved();assert(character().conditions.includes('Vergiftet'));
  await page.getByRole('link',{name:'Action View',exact:true}).click();await page.getByRole('heading',{name:'Aktionen, Bonusaktionen, Reaktionen & Zauber'}).waitFor();
  assert(await page.getByRole('button',{name:'Vergiftet entfernen'}).isVisible());
  await page.getByRole('link',{name:'Full Sheet',exact:true}).click();assert((await page.locator('#sheet .hp').innerText()).includes(String(hp-2)));
  await page.locator('.app-navigation').getByRole('link',{name:'Inventar',exact:true}).click();
  await page.fill('#inventory-text','Testseil\n2 Heiltränke');await saved();
  await page.fill('#item-use','Heiltrank');await page.getByRole('button',{name:'Verwendung im Journal notieren'}).click();await saved();assert(character().n.includes('Heiltrank verwendet'));
  await page.locator('.app-navigation').getByRole('link',{name:'Journal & Quests',exact:true}).click();
  assert((await page.inputValue('#journal-text')).includes('Heiltrank verwendet'));await page.fill('#quest-text','Die Brücke untersuchen');await saved();
  await page.reload();await page.locator('#quest-text').waitFor();assert.equal(await page.inputValue('#quest-text'),'Die Brücke untersuchen');
  await page.getByRole('link',{name:'Full Sheet',exact:true}).click();await page.getByRole('heading',{name:'Ausrüstung & Items',exact:true}).waitFor();assert((await page.locator('#sheet').innerText()).includes('Testseil'));assert((await page.locator('#sheet').innerText()).includes('Die Brücke untersuchen'));
  await page.getByRole('link',{name:'Quick View',exact:true}).click();
  await page.getByRole('button',{name:'Initiative würfeln',exact:true}).click();await page.waitForFunction(()=>document.getElementById('st').textContent.includes('Wurf für alle'));
  await page.keyboard.press('Escape');assert((await page.locator('#sheet').innerText()).includes('Gewürfelte Initiative'));
  if(process.env.SCREENSHOT_DIR)await page.screenshot({path:`${process.env.SCREENSHOT_DIR}/${role}-${viewport.width}-quick.png`,fullPage:true});
  await page.getByRole('button',{name:'Kurze Rast',exact:true}).click();await saved();
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Lange Rast',exact:true}).click();await saved();assert.equal(character().hp,character().hpMax);
 }else{
  // Use the real five-role session boundary on an isolated PostgreSQL copy.
  await page.goto(page.url().split('#')[0].replace(/\/$/,'')+'/spieltisch.html');await page.locator('#dashboard').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Pausieren',exact:true}).click();await page.waitForFunction(()=>document.getElementById('sessionStatus').textContent==='Sitzung pausiert');
  await page.getByRole('button',{name:'Fortsetzen',exact:true}).click();await page.waitForFunction(()=>document.getElementById('sessionStatus').textContent==='Sitzung aktiv');
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Beenden',exact:true}).click();await page.locator('#recapDetails').waitFor({state:'visible'});
  await page.locator('#gm-navigation').getByRole('link',{name:'Vorbereitung',exact:true}).click();
  const title='Browserplan '+viewport.width;
  await page.fill('#planTitle',title);await page.fill('#planScene','Verwunschene Brücke');await page.fill('#planInfo','Treffpunkt am Fluss');await page.fill('#planNotes','GM_SECRET_BROWSER');
  let dropped=false;
  const loseResponse=route=>{const body=route.request().postDataJSON();if(!dropped&&body.p_action==='plan.save'){local.rpc('dnd_workspace_call',body);dropped=true;return route.fulfill({status:504,json:{code:'GatewayTimeout',message:'Test: Antwort nach Commit verloren'}});}return route.fallback();};
  await page.route('**/rest/v1/rpc/dnd_workspace_call',loseResponse);
  await page.getByRole('button',{name:'Plan speichern',exact:true}).click();await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('Antwort nach Commit verloren'));
  await page.getByRole('button',{name:'Plan speichern',exact:true}).click();await page.waitForFunction(()=>document.getElementById('planStatus').textContent.includes('Gespeichert'));
  await page.unroute('**/rest/v1/rpc/dnd_workspace_call',loseResponse);
  const ownerToken=await page.evaluate(()=>sessionStorage.getItem('dnd_session_v1'));const plans=local.rpc('dnd_workspace_call',{p_token:ownerToken,p_action:'snapshot',p_payload:{}}).plans;assert.equal(plans.filter(x=>x.title===title).length,1,'retry after a lost response must not create a duplicate plan');
  await page.getByRole('button',{name:'Gespeicherten Plan starten',exact:true}).click();await page.waitForFunction(()=>document.getElementById('sessionTitleDisplay').textContent.startsWith('Browserplan'));await page.locator('#gmPreparation').waitFor({state:'hidden'});
  const playerToken=local.rpc('dnd_sign_in',{p_actor:'len',p_code:local.codes.len}).token;
  const playerScene=()=>local.rpc('dnd_workspace_call',{p_token:playerToken,p_action:'snapshot',p_payload:{}});
  assert.equal(playerScene().scene,'');assert(!JSON.stringify(playerScene()).includes('GM_SECRET_BROWSER'));
  await page.locator('#gmPublishing summary').click();await page.getByRole('button',{name:'Aus gewähltem Plan übernehmen'}).click();await page.getByRole('button',{name:'Für die Gruppe veröffentlichen'}).click();await page.waitForFunction(()=>document.getElementById('sceneText').textContent==='Verwunschene Brücke');
  assert.equal(playerScene().announcement,'Treffpunkt am Fluss');assert(!('plans'in playerScene()));
  const toggle=page.locator('#contextToggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();await page.locator('#contextStats').waitFor({state:'visible'});await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Beenden',exact:true}).click();await page.locator('#recapDetails').waitFor({state:'visible'});
  await page.fill('#recap-events','Brücke entdeckt');await page.fill('#recap-open_tasks','Zurückkehren');await page.getByRole('button',{name:'Recap dauerhaft speichern'}).click();await page.waitForFunction(()=>document.getElementById('recapStatus').textContent.includes('Dauerhaft gespeichert'));
  await page.reload();await page.locator('#dashboard').waitFor({state:'visible'});await page.selectOption('#archiveList',{label:(await page.locator('#archiveList option').allTextContents()).find(x=>x.includes(title))});
  await page.getByRole('button',{name:'Protokoll laden',exact:true}).click();await page.locator('#recapDetails').waitFor({state:'visible'});assert.equal(await page.inputValue('#recap-events'),'Brücke entdeckt');
  // Leave a running test session for the next viewport's player scenarios.
  await page.locator('#gm-navigation').getByRole('link',{name:'Live-Session',exact:true}).click();await page.getByRole('button',{name:'Neue Sitzung starten',exact:true}).click();await page.waitForFunction(()=>document.getElementById('sessionStatus').textContent==='Sitzung aktiv');
 }
};
