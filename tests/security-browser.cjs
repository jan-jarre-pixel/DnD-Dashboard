// Cross-role regression for S10-XSS-001; all identities and data are synthetic.
const assert=require('node:assert/strict'),create=require('./qa-harness.cjs');
(async()=>{const h=await create();try{
 const attack='<img src=x onerror=window.PHASE10_XSS=1>';
 h.rpc('write_character',{p_character_key:'len',p_code:h.codes.len,p_sheet:{char:'len',sl:attack+' | <svg/onload=window.PHASE10_XSS=2> | lr',name:attack,ft:attack,gear:attack,n:attack,cb:`Zauber | Test | Description | | | ${attack}~1d6~Damage`}});
 const gm=await h.page('gm','#character');await gm.locator('#sheet table').waitFor();
 assert.equal(await gm.locator('#sheet img,#sheet svg').count(),0);assert.equal(await gm.evaluate(()=>window.PHASE10_XSS),undefined);assert((await gm.locator('#sheet').innerText()).includes(attack));await gm.locator('#sheet .character-link').first().click();await gm.getByRole('button',{name:'Kampfmodus',exact:true}).click();assert.equal(await gm.locator('#sheet img,#sheet svg').count(),0);assert.equal(await gm.evaluate(()=>window.PHASE10_XSS),undefined);await gm.context().close();
 const player=await h.page('len','#character');await player.getByRole('button',{name:'Bearbeiten',exact:true}).click();
 assert.equal(await player.locator('#sheet').getByLabel('Name',{exact:true}).inputValue(),attack);assert.equal(await player.locator('#sheet img,#sheet svg').count(),0);assert.equal(await player.evaluate(()=>window.PHASE10_XSS),undefined);await player.context().close();
 h.rpc('write_character',{p_character_key:'len',p_code:h.codes.len,p_sheet:{char:'len',rs:Array.from({length:200},(_,i)=>`Resource ${i} | 1000000000 | lr`).join('\n')}});
 const bounded=await h.page('len','#character');await bounded.getByText('Die Anzeige ist auf 30 Ressourcenzeilen', {exact:false}).waitFor();assert(await bounded.locator('.pip').count()<=5940);assert.equal(await bounded.evaluate(()=>window.PHASE10_XSS),undefined);
 assert.deepEqual(h.errors,[]);assert.deepEqual(h.external,[]);console.log(`PASS ${process.env.BROWSER||'chromium'}: stored cross-role XSS, editor preservation, bounded resource DOM, no external requests`);
 }finally{await h.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
