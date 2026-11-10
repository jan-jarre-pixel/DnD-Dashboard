/* Portable data formats and bounded, text-only search. No credentials or executable imports. */
((root)=>{'use strict';
 const actors=['len','gra','sas','pei'],notes=['n','gear','questNotes'];
 const forbidden=new Set(['__proto__','prototype','constructor','token','p_token','p_code','code','password','access_token','refresh_token','publishableKey']);
 function validate(sheet,actor){
  if(!actors.includes(actor)||!sheet||Array.isArray(sheet)||typeof sheet!=='object'||sheet.char!==actor)throw Error('Sicherung gehört zu einem anderen Charakter.');
  let count=0;function walk(v,depth=0){if(++count>5000||depth>8)throw Error('Sicherung ist zu komplex.');if(typeof v==='string'&&v.length>20000)throw Error('Text ist zu lang.');if(typeof v==='number'&&!Number.isSafeInteger(v))throw Error('Ungültiger Zahlenwert.');if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){if(forbidden.has(k))throw Error('Zugangsdaten und besondere Objektschlüssel sind nicht erlaubt.');walk(x,depth+1);}}walk(sheet);
  for(const k of ['name','player','cls','race','bg','speed','langs','atk','sp','sl','rs','ft','gear','n','cb','questNotes','status','concentration'])if(k in sheet&&typeof sheet[k]!=='string')throw Error('Textfeld ungültig: '+k);
  for(const [k,lo,hi]of [['hp',0,9999],['hpMax',1,9999],['tmp',0,9999],['ac',0,100],['lvl',1,20],['insp',0,1],['hdUsed',0,100],['initX',-100,100],['joat',0,1],['sa',0,5],['hd',1,20]])if(k in sheet&&(!Number.isInteger(sheet[k])||sheet[k]<lo||sheet[k]>hi))throw Error('Charakterwert ungültig: '+k);
  for(const [k,length,lo,hi]of [['ab',6,1,30],['sv',6,0,1],['ds',2,0,3]])if(k in sheet&&(!Array.isArray(sheet[k])||sheet[k].length!==length||sheet[k].some(x=>!Number.isInteger(x)||x<lo||x>hi)))throw Error('Liste ungültig: '+k);
  for(const [k,max,len]of [['conditions',20,40],['effects',12,80]])if(k in sheet&&(!Array.isArray(sheet[k])||sheet[k].length>max||sheet[k].some(x=>typeof x!=='string'||x.length>len)))throw Error('Liste ungültig: '+k);
  for(const k of ['rsU','slU'])if(k in sheet&&(!sheet[k]||Array.isArray(sheet[k])||typeof sheet[k]!=='object'||Object.entries(sheet[k]).some(([i,v])=>! /^(0|[1-9][0-9]?)$/.test(i)||!Number.isInteger(v)||v<0||v>99)))throw Error('Ressourcen ungültig.');
  if(new TextEncoder().encode(JSON.stringify(sheet)).length>180000)throw Error('Sicherung ist zu groß.');return structuredClone(sheet);
 }
 function backup(actor,sheet){return {format:'dnd-character',schema:1,actor,created_at:new Date().toISOString(),sheet:validate({...sheet,char:actor},actor)};}
 function parse(text,actor){if(typeof text!=='string'||text.length>250000)throw Error('Datei ist zu groß.');const b=JSON.parse(text);if(!b||b.format!=='dnd-character'||b.schema!==1||Object.keys(b).some(k=>!['format','schema','actor','created_at','sheet'].includes(k)))throw Error('Unbekanntes Sicherungsformat oder Version.');if(b.actor!==actor)throw Error('Sicherung gehört zu einem anderen Charakter.');return validate(b.sheet,actor);}
 function diff(base,next){return Object.keys(next).filter(k=>JSON.stringify(base[k])!==JSON.stringify(next[k])).map(key=>({key,before:base[key]??null,after:next[key]}));}
 function notePatch(base,patch){return Object.fromEntries(notes.filter(k=>Object.hasOwn(patch,k)&&patch[k]!==String(base[k]??'')).map(k=>[k,patch[k]]));}
 const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de');
 function search(rows,query){const words=fold(query).trim().slice(0,100).split(/\s+/).filter(Boolean);if(!words.length)return [];return rows.filter(r=>words.every(w=>fold(r.title+' '+r.text).includes(w))).slice(0,50);}
 const api=Object.freeze({actors,notes,validate,backup,parse,diff,notePatch,search});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DND.comfortRules=api;
})(globalThis);
