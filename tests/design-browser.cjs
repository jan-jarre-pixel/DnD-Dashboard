// Synthetic DB only: new shared shell, theme/drawer and compatibility contracts.
const assert=require('node:assert/strict'),fs=require('node:fs'),Axe=require('@axe-core/playwright').default,create=require('./qa-harness.cjs');
(async()=>{const h=await create();let scans=0;try{
 for(const entry of ['','spieltisch.html'])for(const width of [320,768,1024,1440]){
  const p=await h.page('gm',entry,{width,height:900});
  assert.equal(await p.locator('header').count(),1);assert.equal(await p.locator('#appearanceOpen').count(),1);
  await p.locator('#appearanceOpen').focus();await p.keyboard.press('Enter');await p.locator('#appearanceDialog').waitFor();
  assert(await p.locator('#appearanceTheme').evaluate(e=>document.activeElement===e));
  for(const theme of ['light','dark']){
   await p.selectOption('#appearanceTheme',theme);assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),theme);
   const scan=await new Axe({page:p}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
   assert.deepEqual(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`${entry} ${width} ${theme}`);scans++;
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  await p.selectOption('#appearanceTheme','light');await p.keyboard.press('Escape');assert(!await p.locator('#appearanceDialog').isVisible());assert(await p.locator('#appearanceOpen').evaluate(e=>e===document.activeElement));
  // An update in the authenticated transport must not replace the active shell node.
  await p.evaluate(()=>DND.store.update({liveStatus:'fallback'}));assert(await p.locator('#appearanceOpen').evaluate(e=>e===document.activeElement));
  assert.match(await p.locator('.live-status').innerText(),/Ersatzabruf/);
  await p.reload();await p.getByText('Abmelden',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),'light');
  await p.locator('#appearanceOpen').click();await p.selectOption('#appearanceTheme','dark');await p.locator('#appearanceClose').click();assert(await p.locator('#appearanceOpen').evaluate(e=>e===document.activeElement));
  if(entry){for(const hash of ['session','prep','campaign','items','combat','map','group','history']){
   await p.evaluate(hash=>location.hash=hash,hash);await p.waitForFunction(hash=>document.querySelector(`.gm-navigation a[href="#${hash}"]`)?.getAttribute('aria-current')==='page',hash);
   assert.equal(await p.locator('.app-navigation a[aria-current]').count(),1);
   assert.equal(await p.locator('.app-navigation a[aria-current]').getAttribute('href'),hash==='group'?'./#character':`spieltisch.html#${hash}`);
  }}
  // A display-only control never upgrades the server-confirmed identity.
  assert.equal(await p.evaluate(()=>DND.auth.identity().role),'owner');
  if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await p.locator('#appearanceOpen').click();await p.screenshot({path:`${process.env.SCREENSHOT_DIR}/drawer-${entry?'table':'sheet'}-${width}.png`});}
  await p.context().close();
 }
 const gallery=await h.page(null,'',{width:390,height:900});
 await gallery.evaluate(()=>{
  const section=document.createElement('section');section.id='ui-states';
  const ui=DND.ui;section.innerHTML=['primary','secondary','danger'].map(variant=>ui.button({label:variant,variant})).join('')+ui.button({label:'Wird bestätigt …',busy:true})+ui.button({label:'Offline nicht verfügbar',disabled:true})+ui.field({id:'test-field',label:'Titel',value:'Entwurf',hint:'Noch nicht bestätigt',error:'Bitte Titel prüfen'})+ui.message('Keine Einträge','Hier erscheinen deine freigegebenen Inhalte.')+ui.badge('Bestätigt','positive')+ui.badge('Ausstehend','warning')+ui.badge('Fehler','danger')+'<button id="legacy-active" class="b" type="button">Legacy-Aktion</button><div class="die fail">1</div><div class="die crit">20</div>';
  document.querySelector('main').prepend(section);
 });
 for(const theme of ['dark','light']){
  await gallery.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  const scan=await new Axe({page:gallery}).include('#ui-states').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  assert.deepEqual(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`${theme} component states`);
  await gallery.locator('#legacy-active').scrollIntoViewIfNeeded();const box=await gallery.locator('#legacy-active').boundingBox();await gallery.mouse.move(box.x+10,box.y+10);await gallery.mouse.down();
  const pair=await gallery.locator('#legacy-active').evaluate(el=>[getComputedStyle(el).color,getComputedStyle(el).backgroundColor]);await gallery.mouse.up();
  const luminance=rgb=>rgb.match(/[0-9.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0),a=luminance(pair[0]),b=luminance(pair[1]);
  assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,`${theme} active legacy button contrast`);
 }
 await gallery.context().close();
 assert.deepEqual(h.errors,[]);assert.deepEqual(h.external,[]);console.log(`PASS shared shell: ${scans} drawer AA scans, focus preservation, persisted theme, 8 legacy GM routes, 4 viewport widths, both entries; two component-state AA scans and active legacy contrast`);
 }finally{await h.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
