/* Shared domain boundary; existing JSON character sheets remain the source of truth. */
((root)=>{
 'use strict';
 const DND=root.DND=root.DND||{};
 const actors=Object.freeze({len:'Lennox',gra:'Grandia Rythna',sas:'Sashee',pei:'Peisinoe',gm:'Spielleiter'});
 /** @typedef {{char:string,name:string,cls:string,lvl:number,hp:number,hpMax:number,tmp:number,ac:number,ab:number[],rsU:Object,slU:Object}} CharacterSheet */
 /** @typedef {{actor:string, identity_id:string, role:'owner'|'player', expires_at:string}} Identity */
 function identity(value){
  if(!value||!Object.hasOwn(actors,value.actor)||value.role!==(value.actor==='gm'?'owner':'player')||typeof value.identity_id!=='string'||!Number.isFinite(Date.parse(value.expires_at)))throw Error('Ungültige Serveridentität');
  return Object.freeze({actor:value.actor,identity_id:value.identity_id,role:value.role,expires_at:value.expires_at});
 }
 function normalizeSheet(raw,id,defaults,skills){
  const def=structuredClone(defaults[id]);
  if(!def)throw Error('Unbekannter Charakter');
  const s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const out={...def};
  for(const k of ['name','player','cls','race','bg','speed','langs','atk','sp','sl','rs','ft','gear','n','cb'])if(typeof s[k]==='string')out[k]=s[k].slice(0,20000);
  for(const [k,[lo,hi]] of Object.entries({tmp:[0,9999],hdUsed:[0,100],insp:[0,1],sa:[0,5],initX:[-100,100],joat:[0,1],lvl:[1,20],ac:[0,100],hpMax:[1,9999],hp:[0,9999],hd:[1,20]}))if(s[k]!==undefined&&Number.isFinite(Number(s[k])))out[k]=Math.max(lo,Math.min(hi,Math.trunc(Number(s[k]))));
  for(const k of ['ab','sv','ds'])if(Array.isArray(s[k]))out[k]=def[k].map((v,i)=>Number.isFinite(Number(s[k][i]))?Math.max(k==='ab'?1:0,Math.min(k==='ab'?30:k==='sv'?1:3,Math.trunc(Number(s[k][i])))):v);
  for(const k of ['slU','rsU']){out[k]={};if(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k]))for(const [i,v] of Object.entries(s[k]))if(/^(0|[1-9][0-9]?)$/.test(i)&&Number.isFinite(Number(v)))out[k][i]=Math.max(0,Math.min(99,Math.trunc(Number(v))));}
  if(s.sk&&typeof s.sk==='object'&&!Array.isArray(s.sk)){out.sk={...def.sk};for(const [skill,v] of Object.entries(s.sk))if(skills.some(x=>x[0]===skill)&&[0,1,2].includes(Number(v)))out.sk[skill]=Number(v);}
  out.char=id;return out;
 }
 DND.model=Object.freeze({actors,identity,normalizeSheet,schemaVersion:1});
})(globalThis);
