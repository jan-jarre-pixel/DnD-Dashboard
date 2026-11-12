const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync('public/styles/tokens.css','utf8');
function luminance(hex){const rgb=hex.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
const contrast=(a,b)=>{const la=luminance(a),lb=luminance(b);return (Math.max(la,lb)+.05)/(Math.min(la,lb)+.05);};
for(const [mode,block] of [['dark',css.split(':root[data-theme="light"]')[0]],['light',css.split(':root[data-theme="light"]')[1]]])test(`${mode}: shared text tokens satisfy AA on all surfaces`,()=>{
 const tokens=Object.fromEntries([...block.matchAll(/--dnd-([a-z-]+):(#\w{6})/g)].map(m=>[m[1],m[2]]));
 for(const ink of ['text','muted','gold'])for(const bg of ['bg','surface','raised'])assert(contrast(tokens[ink],tokens[bg])>=4.5,`${ink}/${bg}`);
});

for(const [mode,block] of [['dark',css.split(':root[data-theme="light"]')[0]],['light',css.split(':root[data-theme="light"]')[1]]])test(`${mode}: interactive borders, focus, semantic feedback and primary buttons meet contrast budgets`,()=>{
 const tokens=Object.fromEntries([...block.matchAll(/--dnd-([a-z-]+):(#\w{6})/g)].map(m=>[m[1],m[2]]));
 for(const bg of ['bg','surface','raised']){
  for(const ink of ['border','focus'])assert(contrast(tokens[ink],tokens[bg])>=3,`${ink}/${bg}`);
  for(const ink of ['sea','positive','warning','danger'])assert(contrast(tokens[ink],tokens[bg])>=4.5,`${ink}/${bg}`);
 }
 assert(contrast(tokens['on-accent'],tokens.gold)>=4.5,'primary button text');
});
