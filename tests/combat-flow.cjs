const assert=require('node:assert/strict');
module.exports=async function combatFlow(pages,local){
 const gm=pages.gm,len=pages.len;
 await gm.locator('#gm-navigation').getByRole('link',{name:'Kampf',exact:true}).click();await gm.locator('#combatPanel').waitFor({state:'visible'});
 await gm.fill('#combatTitle','Browser encounter');await gm.locator('#combatCreate button').click();await gm.waitForFunction(()=>DND.combat.current()?.combat?.title==='Browser encounter');
 const id=await gm.evaluate(()=>DND.combat.current().combat.id);
 await gm.locator('#combatNpc summary').click();await gm.locator('#combatNpcForm [name=name]').fill('SECRET_FOE_BROWSER');await gm.locator('#combatNpcForm [name=hp]').fill('20');await gm.locator('#combatNpcForm button').click();await gm.waitForFunction(()=>DND.combat.current().combat.participants.length===5);
 const members=await gm.evaluate(()=>DND.combat.current().combat.participants),hidden=members.find(p=>!p.char_key),pc=members.find(p=>p.char_key==='len');
 for(const [i,p]of members.entries()){
  const row=gm.locator(`#combatRows [data-target="${p.id}"]`),details=row.locator('details');if(!await details.evaluate(x=>x.open))await details.locator('summary').click();
  await row.locator('input[name=initiative]').fill(String(p.char_key==='len'?20:10-i));await row.locator('form[data-form="initiative.set"] button').click();await gm.waitForFunction(({id,value})=>DND.combat.current().combat.participants.find(x=>x.id===id).initiative===value,{id:p.id,value:p.char_key==='len'?20:10-i});
 }
 await gm.getByRole('button',{name:'Reihenfolge bestätigen',exact:true}).click();await gm.waitForFunction(()=>DND.combat.current().combat.ties_confirmed);
 await gm.getByRole('button',{name:'Kampf starten',exact:true}).click();await gm.waitForFunction(()=>DND.combat.current().combat.status==='active');
 for(const role of ['len','gra','sas','pei']){await pages[role].locator('#combatPanel').waitFor({state:'visible'});await pages[role].waitForFunction(()=>DND.combat.current()?.combat?.status==='active');assert(!await pages[role].evaluate(()=>JSON.stringify(DND.combat.current()).includes('SECRET_FOE_BROWSER')));assert(!await pages[role].evaluate(h=>JSON.stringify(DND.live.events()).includes(h),hidden.id));}
 await len.locator('#combatTurn').getByRole('heading',{name:'Du bist am Zug',exact:true}).waitFor();
 const row=len.locator(`#combatRows [data-target="${pc.id}"]`);await row.locator('details summary').click();
 const before=local.rpc('read_character',{p_character_key:'len',p_code:local.codes.len}).hp;
 await row.locator('[data-amount-input]').fill('5');await row.getByRole('button',{name:'Temporäre TP setzen',exact:true}).click();await len.waitForFunction(()=>DND.combat.current().combat.own.tmp===5);
 let dropped=false;const ids=[];
 const lose=route=>{const body=route.request().postDataJSON();if(body.p_action==='damage'){ids.push(body.p_payload.request_id);if(!dropped){local.rpc('dnd_combat_call',body);dropped=true;return route.fulfill({status:504,json:{code:'GatewayTimeout',message:'Lost combat response after commit'}});}}return route.fallback();};
 await len.route('**/rest/v1/rpc/dnd_combat_call',lose);
 await row.locator('[data-amount-input]').fill('8');await row.getByRole('button',{name:'Schaden anwenden',exact:true}).click();await len.waitForFunction(()=>document.getElementById('combatNotice').textContent.includes('Lost combat response'));
 len.once('dialog',d=>d.accept());await len.locator('#combatReload').click();await len.waitForFunction(()=>DND.combat.current().combat.own.hp===8);
 if(!await row.locator('details').evaluate(x=>x.open))await row.locator('summary').click();await row.locator('[data-amount-input]').fill('8');await row.getByRole('button',{name:'Schaden anwenden',exact:true}).click();await len.waitForFunction(()=>document.getElementById('combatNotice').textContent.includes('Server bestätigt'));
 assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);assert.equal(local.rpc('read_character',{p_character_key:'len',p_code:local.codes.len}).hp,before-3);await len.unroute('**/rest/v1/rpc/dnd_combat_call',lose);
 // A definitive CAS rejection must be retryable after an explicit refresh.
 await row.locator('[data-amount-input]').fill('2');local.rpc('write_character',{p_character_key:'len',p_code:local.codes.len,p_sheet:{char:'len',n:'Concurrent edit during combat'}});
 await row.getByRole('button',{name:'Heilung anwenden',exact:true}).click();await len.waitForFunction(()=>document.getElementById('combatNotice').textContent.includes('Versionskonflikt'));
 len.once('dialog',d=>d.accept());await len.locator('#combatReload').click();await len.waitForFunction(()=>!document.getElementById('combatNotice').textContent.includes('Versionskonflikt')||DND.combat.current().combat.own.n==='Concurrent edit during combat');
 if(!await row.locator('details').evaluate(x=>x.open))await row.locator('summary').click();await row.locator('[data-amount-input]').fill('2');await row.getByRole('button',{name:'Heilung anwenden',exact:true}).click();await len.waitForFunction(()=>DND.combat.current().combat.own.hp===10);
 const malicious='<img src=x onerror="window.COMBAT_XSS=1">';await row.locator('form[data-form=effect] input').fill(malicious);await row.locator('form[data-form=effect] button').click();await len.waitForFunction(x=>DND.combat.current().combat.own.effects.includes(x),malicious);await gm.waitForFunction(x=>DND.combat.current().combat.participants.some(p=>p.effects?.includes(x)),malicious);assert.equal(await gm.evaluate(()=>window.COMBAT_XSS),undefined);assert.equal(await len.evaluate(()=>window.COMBAT_XSS),undefined);
 await len.locator('#combatTurn').getByRole('button',{name:'Aktion verwenden',exact:true}).click();await len.waitForFunction(()=>DND.combat.current().combat.participants.find(p=>p.char_key==='len').action_used);assert(await len.locator('#combatTurn').getByRole('button',{name:'Aktion verwenden',exact:true}).isDisabled());
 await gm.getByRole('button',{name:'Nächster Zug',exact:true}).click();await len.waitForFunction(()=>DND.combat.current().combat.current_id!==DND.combat.current().combat.own.id);assert(await len.locator('#combatTurn').getByRole('button',{name:'Aktion verwenden',exact:true}).isDisabled());
 const foe=gm.locator(`#combatRows [data-target="${hidden.id}"]`);if(!await foe.locator('details').evaluate(x=>x.open))await foe.locator('summary').click();
 await foe.locator('input[name=visible]').check();await foe.locator('form[data-form=visibility] button').click();await len.waitForFunction(h=>DND.combat.current().combat.participants.some(p=>p.id===h),hidden.id);assert.equal(await len.evaluate(h=>DND.combat.current().combat.participants.find(p=>p.id===h).hp,hidden.id),undefined);
 await foe.locator('input[name=show_stats]').check();await foe.locator('form[data-form=visibility] button').click();await len.waitForFunction(h=>DND.combat.current().combat.participants.find(p=>p.id===h).hp===20,hidden.id);
 for(let i=0;i<4;i++){const old=await gm.evaluate(()=>DND.combat.current().combat.current_id);await gm.getByRole('button',{name:'Nächster Zug',exact:true}).click();await gm.waitForFunction(v=>DND.combat.current().combat.current_id!==v,old);}
 await len.waitForFunction(()=>DND.combat.current().combat.round===2&&DND.combat.current().combat.current_id===DND.combat.current().combat.own.id);assert.equal(await len.evaluate(()=>DND.combat.current().combat.participants.find(p=>p.char_key==='len').action_used),false);
 await gm.setViewportSize({width:390,height:844});await len.setViewportSize({width:390,height:844});assert(await gm.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await len.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(process.env.SCREENSHOT_DIR){const fs=require('node:fs');fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await gm.screenshot({path:process.env.SCREENSHOT_DIR+'/combat-gm-mobile.png',fullPage:true});await len.screenshot({path:process.env.SCREENSHOT_DIR+'/combat-player-mobile.png',fullPage:true});}
 gm.once('dialog',d=>d.accept());await gm.getByRole('button',{name:'Kampf beenden',exact:true}).click();await len.locator('#combatPanel').waitFor({state:'hidden'});
 console.log('Combat UI: preparation, hidden NPC, initiative, My Turn, lost-ack retry, shared HP, turn budgets, reveal, round reset, mobile and end passed.');
};
