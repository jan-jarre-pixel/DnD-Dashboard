const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ctx={structuredClone};vm.createContext(ctx);for(const file of ['src/core/model.js','src/ui/components.js','src/ui/player-dashboard.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const c={name:'<img src=x onerror=bad()>',cls:'Test',lvl:3,hp:12,hpMax:20,tmp:2,ac:15,speed:'30 ft',ab:[10,14,10,10,10,10],initX:0,insp:1,conditions:["' onclick='bad()"],n:'</textarea><script>bad()</script>',gear:'Test gear',questNotes:'Task',rs:'',sl:'',rsU:{},slU:{}};
const legacy={parts:s=>s?s.split('\n').map(x=>x.split('|')):[],skills:[['Heimlichkeit',1]],attributes:['STR','GES'],mod:x=>Math.floor((x-10)/2),signed:n=>n>=0?'+'+n:String(n),combat:()=>'<div>Existing actions</div>',sheet:()=>'<div>Existing sheet</div>'};
test('all player views use the same model and escape personal/published strings',()=>{
 for(const view of ['dashboard','character','actions','inventory','journal']){
  const html=ctx.DND.player.render(view,'len',c,{session:{title:'<script>bad()</script>',status:'active'},scene:'<img src=x>',announcement:'<script>bad()</script>'},legacy);
  assert(!html.includes('<script>'));assert(!html.includes('<img src=x'));assert(!html.includes("onclick='bad()"));assert(html.includes('&lt;img'));
 }
 const html=ctx.DND.player.render('journal','len',c,null,legacy);assert(html.includes('&lt;/textarea&gt;'));assert(html.includes('Task'));
});
test('optional extension fields survive normalization and remain bounded',()=>{
 const defaults={len:{...c,sv:[0,0],ds:[0,0],sk:{}}};const s=ctx.DND.model.normalizeSheet({...c,conditions:Array.from({length:30},(_,i)=>'C'+i),questNotes:'Quest note'},'len',defaults,[]);
 assert.equal(s.conditions.length,20);assert.equal(s.questNotes,'Quest note');assert.equal(defaults.len.questNotes,'Task');
});
