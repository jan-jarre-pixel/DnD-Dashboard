// WCAG rule scans supplement keyboard/contrast/unit and multiplayer checks; no certification claim.
const assert=require('node:assert/strict'),Axe=require('@axe-core/playwright').default,create=require('./qa-harness.cjs');
(async()=>{const h=await create();let count=0;try{
 const cases=[[null,''],[null,'spieltisch.html'],['len',''],['len','#character'],['gm','#character'],['gm','spieltisch.html#prep'],['len','#inventory'],['len','#journal'],['gm','spieltisch.html#campaign'],['gm','spieltisch.html#items']];
 for(const theme of ['dark','light'])for(const mobile of [false,true])for(const [actor,entry] of cases){
  const p=await h.page(actor,entry,{width:mobile?390:1440,height:900});
  await p.evaluate(t=>{document.documentElement.dataset.theme=t;localStorage.setItem('dnd-theme',t);},theme);
  if(entry==='#character'&&actor==='len')await p.getByRole('button',{name:'Bearbeiten',exact:true}).click();
  if(entry.includes('#prep'))await p.locator('#planForm').waitFor();
  const result=await new Axe({page:p}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`${actor||'guest'} ${entry||'root'} ${theme} ${mobile?'mobile':'desktop'}`);
  if(actor==='len'&&entry==='#character'){
   const field=p.locator('#sheet').getByLabel('Name',{exact:true});await p.locator('label[for="field-name"]').click();assert(await field.evaluate(e=>e===document.activeElement));await field.focus();await p.keyboard.press('Tab');assert(await p.locator('#sheet').getByLabel('Spieler/in',{exact:true}).evaluate(e=>e===document.activeElement));
  }
  // Reflow at the WCAG 400%-zoom equivalent width. Wide data tables may scroll in their own container.
  if(!actor){await p.setViewportSize({width:320,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'guest page reflows at 320px');await p.keyboard.press('Tab');assert(await p.evaluate(()=>document.activeElement?.tagName!=='BODY'));}
  await p.context().close();count++;
 }
 assert.deepEqual(h.errors,[]);assert.deepEqual(h.external,[]);console.log(`PASS ${process.env.BROWSER||'chromium'}: ${count} WCAG A/AA scans, associated editor labels, keyboard order, 320px guest reflow`);
 }finally{await h.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
