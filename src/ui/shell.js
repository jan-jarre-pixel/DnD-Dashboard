/* Stable shell nodes: live updates must not replace focused controls. */
((root)=>{
 'use strict';
 const {ui,store,model}=root.DND;let playerRoute='dashboard',signature='';
 const statuses={live:'● Live verbunden',fallback:'● Verbunden · Ersatzabruf',offline:'○ Offline · unbestätigte Änderungen',reconnecting:'↻ Wiederverbindung',connecting:'↻ Live-Verbindung aufbauen'};
 function render({identity,liveStatus}){
  const host=document.getElementById('app-shell');if(!host)return;
  const tabletop=location.pathname.endsWith('spieltisch.html'),hash=location.hash.slice(1),gm=identity?.role==='owner';
  if(['dashboard','character','actions','inventory','journal'].includes(hash))playerRoute=hash;
  const links=!identity?[['./','Charaktere','home'],['spieltisch.html','Spieltisch','tabletop']]:gm?
   [['spieltisch.html#session','Live-Session','session'],['spieltisch.html#prep','Vorbereitung','prep'],['spieltisch.html#campaign','Kampagnenbuch','campaign'],['spieltisch.html#items','Inventar & Generatoren','items'],['spieltisch.html#combat','Kampf','combat'],['spieltisch.html#map','Karten','map'],['./#character','Spielercharaktere','group'],['spieltisch.html#history','Protokolle','history']]:
   [['./#dashboard','Dashboard','dashboard'],['./#character','Charakter','character'],['./#actions','Aktionen & Zauber','actions'],['./#inventory','Inventar','inventory'],['./#journal','Journal & Quests','journal'],['spieltisch.html','Spieltisch','tabletop']];
  const current=!identity?(tabletop?'tabletop':'home'):gm?(tabletop?(['prep','history','group','combat','map','campaign','items'].includes(hash)?hash:'session'):'group'):(tabletop?'tabletop':playerRoute);
  host.querySelector('.role-badge').textContent=identity?(gm?'Spielleitung':model.actors[identity.actor]):'Private Spielrunde';
  const status=host.querySelector('.live-status');status.textContent=identity?(statuses[liveStatus]||'Verbindung wird geprüft …'):'Mit privatem Code anmelden';
  const next=JSON.stringify([links,current]);if(next!==signature){host.querySelector('.app-navigation').innerHTML=links.map(([href,label,key])=>ui.link(href,label,key===current)).join('');signature=next;}
  host.querySelector('.app-navigation').setAttribute('aria-label',gm?'Spielleiter-Navigation':'Hauptnavigation');
  document.body.dataset.role=identity?.role||'guest';
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const host=document.getElementById('app-shell');if(!host)return;
  host.innerHTML=`<header class="app-header"><a class="app-brand" href="./"><img src="public/icons/compass.svg" alt="" width="40" height="40"><span>D&D Command Center<small>Dein Abenteuer. Alles im Blick.</small></span></a><div class="app-meta"><span class="role-badge"></span><span class="live-status" role="status" aria-live="polite"></span></div><div class="app-tools" id="app-tools">${ui.button({id:'appearanceOpen',label:'Darstellung'})}</div></header><nav class="app-navigation" aria-label="Hauptnavigation"></nav>`;
  // Preserve the existing logout node and its page adapter handler, without a second header.
  const oldHeader=document.querySelector('header.top');if(oldHeader){const logout=document.getElementById('logout'),connection=document.getElementById('connection');host.querySelector('#app-tools').append(logout);connection.hidden=true;connection.removeAttribute('role');connection.removeAttribute('aria-live');host.append(connection);oldHeader.remove();}
  const dialog=document.createElement('dialog');dialog.id='appearanceDialog';dialog.className='ui-dialog ui-drawer';dialog.setAttribute('aria-labelledby','appearanceTitle');
  dialog.innerHTML=`<div class="section-head"><h2 id="appearanceTitle">Darstellung</h2>${ui.button({id:'appearanceClose',label:'Schließen'})}</div><p>Dunkles Meerblau oder helles Pergament: Wähle die Ansicht für deinen Spielabend.</p><div class="ui-field"><label for="appearanceTheme">Farbschema</label><select id="appearanceTheme"><option value="dark">Dunkel · Meer & Messing</option><option value="light">Hell · Pergament</option></select></div><p class="ui-hint">Weniger Bewegung? Die Darstellung folgt deiner Systemeinstellung.</p><h3>Schnell erreichbar</h3><dl class="ui-shortcuts"><dt>Strg / ⌘ + K</dt><dd>Suche & Werkzeuge</dd><dt>Alt + I</dt><dd>Inventar</dd><dt>?</dt><dd>Tastaturhilfe</dd><dt>Escape</dt><dd>Geöffneten Dialog schließen</dd></dl>`;
  document.body.append(dialog);const theme=dialog.querySelector('#appearanceTheme');theme.value=document.documentElement.dataset.theme==='light'?'light':'dark';
  const controller=ui.dialogController(dialog,{initialFocus:theme});host.querySelector('#appearanceOpen').setAttribute('aria-haspopup','dialog');host.querySelector('#appearanceOpen').setAttribute('aria-controls','appearanceDialog');host.querySelector('#appearanceOpen').onclick=event=>controller.open(event.currentTarget);dialog.querySelector('#appearanceClose').onclick=controller.close;
  theme.onchange=()=>{document.documentElement.dataset.theme=theme.value;try{localStorage.setItem('dnd-theme',theme.value);}catch{/* Display preference is optional. */}const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme.value==='light'?'#f3eee3':'#0b151d';};
  store.subscribe(render);window.addEventListener('hashchange',()=>render(store.get()));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')){const panel=document.getElementById('dpan'),wasOpen=panel?.style.display==='block';for(const id of ['dice','dpan']){const el=document.getElementById(id);if(el)el.style.display='none';}if(wasOpen){const trigger=document.getElementById('dfab');trigger?.setAttribute('aria-expanded','false');trigger?.focus();}}});
 });
})(globalThis);
