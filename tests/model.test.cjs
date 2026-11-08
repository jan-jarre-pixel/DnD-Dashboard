const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={structuredClone};vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/core/model.js','utf8'),ctx);vm.runInContext(fs.readFileSync('src/core/store.js','utf8'),ctx);
test('identity rejects a forged player-owner combination',()=>{
 assert.throws(()=>ctx.DND.model.identity({actor:'len',role:'owner',identity_id:'id',expires_at:new Date().toISOString()}));
 assert.throws(()=>ctx.DND.model.identity({actor:'other',role:'player',identity_id:'id',expires_at:new Date().toISOString()}));
});
test('normalization clamps values, ignores prototype fields and preserves defaults',()=>{
 const defaults={len:{hp:21,ab:[8,17],sv:[0,1],ds:[0,0],sk:{Heimlichkeit:2},rsU:{},slU:{},ft:'Original'}};
 const raw=JSON.parse('{"char":"gra","hp":-5,"ab":[100,-1],"rsU":{"__proto__":4,"0":2},"ft":"Notiz","sk":{"Unknown":2}}');
 const normalized=ctx.DND.model.normalizeSheet(raw,'len',defaults,[['Heimlichkeit',1]]);
 assert.equal(normalized.char,'len');assert.equal(normalized.hp,0);assert.equal(normalized.ab[0],30);assert.equal(normalized.ab[1],1);assert.equal(normalized.rsU['0'],2);assert.equal(normalized.sk.Heimlichkeit,2);assert.equal(defaults.len.ft,'Original');
});
test('UI store exposes no credential state and supports disposal',()=>{
 let calls=0;const dispose=ctx.DND.store.subscribe(()=>calls++);ctx.DND.store.update({connection:'online'});dispose();ctx.DND.store.update({connection:'offline'});assert.equal(calls,2);assert.equal('token' in ctx.DND.store.get(),false);assert(Object.isFrozen(ctx.DND.store.get()));
});
