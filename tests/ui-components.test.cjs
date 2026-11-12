const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function ui(){const root={DND:{}};vm.runInNewContext(fs.readFileSync('src/ui/components.js','utf8'),root);return root.DND.ui;}
test('presentation helpers escape user content and constrain executable/semantic options',()=>{
 const c=ui(),attack='"><img src=x onerror=alert(1)>';
 for(const value of [c.button({id:attack,label:attack,variant:attack,type:attack}),c.badge(attack,attack),c.field({id:'title',label:attack,value:attack,error:attack}),c.message(attack,attack)]){assert(!value.includes('<img'));assert(value.includes('&lt;img'));}
 assert.match(c.button({label:'Würfeln',busy:true}),/disabled aria-busy="true"/);
 assert.match(c.button({label:'Test',variant:attack,type:attack}),/type="button" class="ui-button ui-button--secondary"/);
 assert.match(c.field({id:'title',label:'Titel',hint:'Hinweis',error:'Fehler'}),/aria-describedby="title-hint title-error" aria-invalid="true"/);
});
test('dialog close guard protects drafts for both close button and Escape; focus returns to trigger',()=>{
 const events={},focus=[],trigger={isConnected:true,focus:()=>focus.push('trigger')},input={focus:()=>focus.push('input')};let dirty=true;
 const dialog={open:false,addEventListener:(key,fn)=>events[key]=fn,showModal(){this.open=true;},close(){this.open=false;events.close();}};
 const c=ui().dialogController(dialog,{initialFocus:input,canClose:()=>!dirty});
 c.open(trigger);assert.deepEqual(focus,['input']);assert.equal(c.close(),false);assert(dialog.open);
 let prevented=false;events.cancel({preventDefault:()=>prevented=true});assert(prevented&&dialog.open);
 dirty=false;assert.equal(c.close(),true);assert.deepEqual(focus,['input','trigger']);assert(!dialog.open);
});
test('display preference restores only supported non-sensitive values and tolerates unavailable storage',()=>{
 const source=fs.readFileSync('src/ui/preferences.js','utf8');
 for(const value of ['dark','light','owner','<img>']){const dataset={};vm.runInNewContext(source,{document:{documentElement:{dataset}},localStorage:{getItem:()=>value}});assert.equal(dataset.theme,['dark','light'].includes(value)?value:undefined);}
 assert.doesNotThrow(()=>vm.runInNewContext(source,{localStorage:{getItem(){throw Error('blocked');}}}));
});
