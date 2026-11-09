((root)=>{
 'use strict';
 const {ui,store,model}=root.DND;let playerRoute='dashboard';
 function render({identity,liveStatus}){
  const host=document.getElementById('app-shell');if(!host)return;
  const tabletop=location.pathname.endsWith('spieltisch.html'),hash=location.hash.slice(1),gm=identity?.role==='owner';
  if(['dashboard','character','actions','inventory','journal'].includes(hash))playerRoute=hash;
  const links=!identity?[['./','Charaktere','home'],['spieltisch.html','Spieltisch','tabletop']]:gm?
   [['spieltisch.html#session','Live-Session','session'],['spieltisch.html#prep','Vorbereitung','prep'],['spieltisch.html#combat','Kampf','combat'],['spieltisch.html#map','Karten','map'],['./#character','Spielercharaktere','group'],['spieltisch.html#history','Protokolle','history']]:
   [['./#dashboard','Dashboard','dashboard'],['./#character','Charakter','character'],['./#actions','Aktionen & Zauber','actions'],['./#inventory','Inventar','inventory'],['./#journal','Journal & Quests','journal'],['spieltisch.html','Spieltisch','tabletop']];
  const current=!identity?(tabletop?'tabletop':'home'):gm?(tabletop?(['prep','history','group','combat','map'].includes(hash)?hash:'session'):'group'):(tabletop?'tabletop':playerRoute);
  host.innerHTML=`<header class="app-header"><a class="app-brand" href="./"><span aria-hidden="true">◆</span> D&D Command Center<small>Prep less, decide faster.</small></a><span class="role-badge">${identity?ui.escape(gm?'Spielleitung':model.actors[identity.actor]):'Private Spielrunde'}</span>${identity?`<span class="live-status" role="status">${({live:'● Live',fallback:'● Verbunden · Ersatzabruf',offline:'○ Offline · unbestätigte Änderungen',reconnecting:'↻ Wiederverbindung',connecting:'↻ Live-Verbindung aufbauen'})[liveStatus]||'Verbunden'}</span>`:''}</header><nav class="app-navigation" aria-label="${gm?'Spielleiter-Navigation':'Hauptnavigation'}">${links.map(([href,label,key])=>ui.link(href,label,key===current)).join('')}</nav>`;
  document.body.dataset.role=identity?.role||'guest';
 }
 document.addEventListener('DOMContentLoaded',()=>{store.subscribe(render);window.addEventListener('hashchange',()=>render(store.get()));document.addEventListener('keydown',e=>{if(e.key==='Escape'){const panel=document.getElementById('dpan');const wasOpen=panel?.style.display==='block';for(const id of ['dice','dpan']){const el=document.getElementById(id);if(el)el.style.display='none';}if(wasOpen){const trigger=document.getElementById('dfab');trigger?.setAttribute('aria-expanded','false');trigger?.focus();}}});});
})(globalThis);
