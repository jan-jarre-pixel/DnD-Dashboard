// Native select popup content must not enlarge the map inspector's document.
const assert=require('node:assert/strict'),fs=require('node:fs');
const engine=process.env.BROWSER||'chromium';
assert(['chromium','firefox','webkit'].includes(engine));
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{})}:{})});
 try{
  const css=['tabletop','tokens','components','dashboards','combat','vtt'].map(name=>fs.readFileSync(`public/styles/${name}.css`,'utf8')).join('\n');
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport});
   await page.setContent(`<style>${css}</style><main class="shell"><section class="paper vtt-panel"><div class="vtt-fields"><label>Kartenname<select id="longMapName"><option value="short">Kurzer Name</option><option value="long">${'W'.repeat(100)}</option></select></label><label>Raster<select><option>Quadratisch</option><option>Hexagonal</option></select></label></div></section></main>`);
   const fits=async()=>{
    const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,select:document.querySelector('#longMapName').getBoundingClientRect().width}));
    assert(layout.scroll<=layout.width+1,`${engine}: native option overflow: ${JSON.stringify(layout)}`);
   };
   await fits();
   const select=page.locator('#longMapName');
   await select.focus();await select.press('ArrowDown');await select.press('Tab');
   assert.equal(await select.inputValue(),'long');
   assert.equal(await select.locator('option:checked').textContent(),'W'.repeat(100));
   await fits();
   await select.focus();await select.press('ArrowUp');await select.press('Tab');
   assert.equal(await select.inputValue(),'short');await fits();
   await page.close();
  }
  console.log(`${engine}: long native map names, keyboard selection and desktop/mobile widths passed.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
