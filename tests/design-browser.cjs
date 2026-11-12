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
 assert.deepEqual(h.errors,[]);assert.deepEqual(h.external,[]);console.log(`PASS shared shell: ${scans} drawer AA scans, focus preservation, persisted theme, 8 legacy GM routes, 4 viewport widths, both entries`);
 }finally{await h.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
