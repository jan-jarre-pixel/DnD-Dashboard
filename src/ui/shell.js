((root)=>{
 'use strict';
 const {ui,store,model}=root.DND;
 function render({identity}){
  const host=document.getElementById('app-shell');if(!host)return;
  const tabletop=location.pathname.endsWith('spieltisch.html');
  const role=identity?.role,gm=role==='owner';
  const links=identity?(gm?[[tabletop?'./':'#main-content','Charakterübersicht'],['spieltisch.html','Session & Würfel']]:[[tabletop?'./':'#main-content','Charakterbogen'],['spieltisch.html','Spieltisch & Würfel']]):[['./','Charaktere'],['spieltisch.html','Spieltisch']];
  host.innerHTML=`<header class="app-header"><a class="app-brand" href="./"><span aria-hidden="true">◆</span> D&D Command Center<small>Prep less, decide faster.</small></a><span class="role-badge">${identity?ui.escape(gm?'Spielleitung':model.actors[identity.actor]):'Private Spielrunde'}</span></header><nav class="app-navigation" aria-label="${gm?'Spielleiter-Navigation':'Hauptnavigation'}">${links.map(([href,label],i)=>ui.link(href,label,tabletop?i===1:i===0)).join('')}</nav>`;
  document.body.dataset.role=role||'guest';
 }
 document.addEventListener('DOMContentLoaded',()=>{store.subscribe(render);document.addEventListener('keydown',e=>{if(e.key==='Escape'){const panel=document.getElementById('dpan');const wasOpen=panel?.style.display==='block';for(const id of ['dice','dpan']){const el=document.getElementById(id);if(el)el.style.display='none';}if(wasOpen){const trigger=document.getElementById('dfab');trigger?.setAttribute('aria-expanded','false');trigger?.focus();}}});});
})(globalThis);
