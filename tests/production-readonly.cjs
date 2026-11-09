// Explicit read-only production smoke: invalid codes only, no accepted sessions.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
 try{
  const base=process.env.SITE_URL||'https://jan-jarre-pixel.github.io/DnD-Dashboard/';
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(base);assert.equal(response.status(),200);await page.locator('#loginCharacter').waitFor();
   assert.equal(await page.locator('#loginCharacter option').count(),6);
   await page.selectOption('#loginCharacter','len');await page.fill('#loginCode','invalid_code_for_test_0000');await page.locator('#sheet form button[type=submit]').click();
   await page.waitForFunction(()=>document.body.innerText.includes('Code ungültig'));
   await page.goto(base+'spieltisch.html');await page.locator('#loginPanel').waitFor({state:'visible'});
   assert.equal(await page.locator('#role option').count(),6);
   await page.selectOption('#role','gm');await page.fill('#accessCode','invalid_code_for_test_0000');await page.locator('#loginForm button[type=submit]').click();
   await page.waitForFunction(()=>document.body.innerText.includes('Zugangscode ungültig'));
   assert(!await page.locator('#dashboard').isVisible());assert.deepEqual(errors,[]);
   console.log(`Production read-only smoke passed: ${base}, ${viewport.width}×${viewport.height}; both login screens and real invalid-code rejection.`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
