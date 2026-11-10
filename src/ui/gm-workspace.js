/* GM workspace and public scene. Private forms are cleared on logout/role change. */
((root)=>{
 const e=root.DND.ui.escape;
 function init({getSnapshot,rpc,notice,refreshRoom,defaults={}}){
  const $=id=>document.getElementById(id),host=$('dashboard');
  const nav=document.createElement('aside');nav.id='gm-navigation';nav.className='gm-navigation';nav.hidden=true;
  nav.innerHTML=`<p class="eyebrow">Control Room</p><nav aria-label="GM-Arbeitsbereiche">${[['session','Live-Session'],['prep','Vorbereitung'],['campaign','Kampagnen'],['items','Inventar & Generatoren'],['combat','Kampf'],['map','Karten'],['group','Spielerstatus'],['history','Protokolle']].map(([id,title])=>`<a href="#${id}">${title}</a>`).join('')}</nav><button id="contextToggle" aria-controls="gm-context" aria-expanded="true">Kontextpanel schließen</button>`;
  const main=document.createElement('div');main.className='gm-main';while(host.firstChild)main.append(host.firstChild);host.append(nav,main);
  const context=document.createElement('aside');context.id='gm-context';context.className='gm-context';context.hidden=true;host.append(context);
  context.innerHTML='<section class="paper"><h2>Charakter im Fokus</h2><label for="contextCharacter">Spielercharakter</label><select id="contextCharacter"></select><div id="contextStats"></div></section><section class="paper"><h2>Letzte Würfe</h2><div id="contextRolls"></div></section>';
  context.append($('gmPanel').querySelector('.gm-details'));
  const scene=document.createElement('section');scene.id='sharedScene';scene.className='paper';scene.innerHTML='<h2>Aktuelle Szene</h2><p id="sceneText">Noch keine Szene veröffentlicht.</p><div id="announcementText" class="preserve-lines"></div><small id="workspaceConnection"></small>';main.querySelector('.hero').after(scene);
  const mobile=document.createElement('section');mobile.id='mobileStatus';mobile.className='mobile-status';mobile.hidden=true;scene.after(mobile);
  const columns=main.querySelector('.columns'),partyPanel=$('party').closest('section'),dicePanel=$('rollForm').closest('section'),events=$('rolls').closest('section');
  const prep=document.createElement('section');prep.id='gmPreparation';prep.className='paper';prep.hidden=true;
  prep.innerHTML=`<p class="eyebrow">Vorbereitung</p><h2>Sitzungen planen</h2><label for="planList">Vorbereitete und vergangene Sitzungen</label><select id="planList"><option value="">Neue Sitzung</option></select><div class="buttonbar"><button id="newPlan">Neuer Plan</button><button id="loadPlan">Ausgewählten Plan laden</button><button id="morePlans" hidden>Weitere Pläne laden</button></div><form id="planForm"><label for="planTitle">Titel</label><input id="planTitle" maxlength="100" required><label for="planScene">Geplante Szene</label><input id="planScene" maxlength="200"><label for="planInfo">Entwurf für Gruppeninformationen</label><textarea id="planInfo" maxlength="6000"></textarea><label for="planNotes">Private Vorbereitungsnotizen</label><textarea id="planNotes" maxlength="12000" rows="6"></textarea><p class="note">Diese Entwürfe sind ausschließlich für die Spielleitung. Veröffentlicht wird nur über „Szene & Gruppeninfo“.</p><div class="buttonbar"><button type="submit" class="primary">Plan speichern</button><button type="button" id="startPlan" disabled>Gespeicherten Plan starten</button></div><p id="planStatus" role="status">Neuer, noch nicht gespeicherter Plan.</p></form>`;
  const publishing=document.createElement('section');publishing.id='gmPublishing';publishing.className='paper';publishing.hidden=true;
  publishing.innerHTML='<h2>Szene & Gruppeninfo</h2><form id="publishForm"><label for="publishScene">Sichtbare Szene</label><input id="publishScene" maxlength="200"><label for="publishInfo">Nachricht an die Gruppe</label><textarea id="publishInfo" maxlength="6000"></textarea><div class="buttonbar"><button class="primary" type="submit">Für die Gruppe veröffentlichen</button><button type="button" id="reloadPublished">Veröffentlichten Stand laden</button><button type="button" id="usePlanDraft">Aus gewähltem Plan übernehmen</button></div></form><p class="note">Nur diese beiden Felder werden für Spieler sichtbar. Private Notizen werden nicht mitgesendet.</p>';
  const publishingDetails=document.createElement('details');publishingDetails.innerHTML='<summary>Szene & Gruppeninfo veröffentlichen</summary>';for(const node of [...publishing.children]){if(node.tagName!=='H2')publishingDetails.append(node);}publishing.replaceChildren(publishingDetails);
  const quickDice=document.createElement('section');quickDice.className='paper';quickDice.id='gmQuickDice';quickDice.hidden=true;quickDice.innerHTML='<h2>Schnell würfeln</h2><div class="buttonbar"><button id="quickPublic">1W20 öffentlich</button><button id="quickSecret">1W20 geheim</button></div><p id="quickResult" role="status" aria-live="polite"></p>';
  scene.after(quickDice);quickDice.after(mobile);
  const history=document.createElement('section');history.id='gmHistory';history.className='paper';history.hidden=true;
  history.innerHTML='<p class="eyebrow">Nachbereitung</p><h2>Sitzungsprotokolle & Recaps</h2><label for="archiveList">Beendete Sitzung</label><select id="archiveList"><option value="">Protokoll auswählen</option></select><button id="loadArchive">Protokoll laden</button><button id="moreArchives" hidden>Ältere Protokolle laden</button><div id="recapDetails" hidden><h3 id="recapTitle"></h3><p id="recapMeta"></p><form id="recapForm"></form><details><summary>Gesicherte Vorbereitung & Szene</summary><div id="recapPrep" class="preserve-lines"></div></details></div>';
  const recapFields=[['events','Wichtige Ereignisse'],['battles','Kämpfe'],['quests','Entdeckte Quests'],['loot','Erhaltene Gegenstände'],['open_tasks','Offene Aufgaben'],['gm_notes','Private Spielleiter-Notizen']];
  history.querySelector('#recapForm').innerHTML=recapFields.map(([key,label])=>`<label for="recap-${key}">${label}</label><textarea id="recap-${key}" maxlength="${key==='gm_notes'?12000:6000}" rows="3"></textarea>`).join('')+'<button type="submit" class="primary">Recap dauerhaft speichern</button><p id="recapStatus" role="status"></p>';
  main.insertBefore(prep,columns);main.insertBefore(publishing,columns);main.insertBefore(history,columns);
  let loadedPlans=[],loadedArchives=[];let snapshot=null,plan=null,archive=null,planDirty=false,publishDirty=false,recapDirty=false,notesDirty=false,publishVersion=null,lastFetch=0,loading=false,busy=false;
  let previousView=null;let collapsed=matchMedia('(max-width:1050px)').matches;const pending=new Map();
  const owner=()=>root.DND.auth.identity()?.role==='owner';
  const view=()=>['prep','history','group','combat','map','campaign','items'].includes(location.hash.slice(1))?location.hash.slice(1):'session';
  function layout(){
   const isOwner=owner(),active=view();if(active!==previousView){publishingDetails.open=active==='prep';previousView=active;}quickDice.hidden=!isOwner||active!=='session';host.classList.toggle('control-room',isOwner);host.classList.toggle('context-collapsed',collapsed);document.body.classList.toggle('control-room-page',isOwner);nav.hidden=!isOwner;context.hidden=!isOwner||collapsed;
   $('contextToggle').setAttribute('aria-expanded',String(!collapsed));$('contextToggle').textContent=collapsed?'Kontextpanel öffnen':'Kontextpanel schließen';
   for(const a of nav.querySelectorAll('a')){if(a.hash.slice(1)===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
   prep.hidden=!isOwner||active!=='prep';history.hidden=!isOwner||active!=='history';publishing.hidden=!isOwner||!['prep','session'].includes(active);
   $('gmPanel').hidden=!isOwner||active!=='session';columns.hidden=isOwner&&!['session','group'].includes(active);partyPanel.hidden=isOwner&&active!=='group';dicePanel.hidden=isOwner&&active!=='session';events.hidden=isOwner&&active!=='session';
   mobile.hidden=!isOwner||active!=='session';scene.hidden=isOwner&&['history','combat','map','campaign','items'].includes(active);
  }
  function fillSelect(id,items,valueKey,label){const el=$(id),old=el.value,signature=JSON.stringify(items);if(el.dataset.signature===signature)return;el.dataset.signature=signature;el.innerHTML='<option value="">Auswählen …</option>'+items.map(x=>`<option value="${e(x[valueKey])}">${e(label(x))}</option>`).join('');el.value=items.some(x=>String(x[valueKey])===old)?old:'';}
  function contextRender(){
   const room=getSnapshot(),party=(room?.party||[]).map(p=>({...p,hp:p.hp??defaults[p.key]?.[0],hpMax:p.hpMax??defaults[p.key]?.[0],ac:p.ac??defaults[p.key]?.[1],template:p.hp==null}));
   fillSelect('contextCharacter',party,'key',x=>x.name);if(!$('contextCharacter').value&&party.length)$('contextCharacter').value=party[0].key;
   const chosen=party.find(x=>x.key===$('contextCharacter').value);
   $('contextStats').innerHTML=chosen?`<h3>${e(chosen.name)}</h3><p>${e(chosen.class||'')} · Stufe ${e(chosen.level??'–')}</p><p>${e(chosen.hp??'–')} / ${e(chosen.hpMax??'–')} TP · RK ${e(chosen.ac??'–')}</p><p>${e(chosen.status||'bereit')}</p>${chosen.template?'<p class="note">Vorlagenwerte · Noch kein gespeicherter Bogen.</p>':''}<a href="./#character">Vollständige Bögen ansehen</a>`:'<p>Kein Charakter geladen.</p>';
   const latest=(room?.rolls||[]).slice().sort((a,b)=>Number(b.id)-Number(a.id))[0];const quickText=latest?`${latest.label}: ${Number(latest.total)||0}${latest.visibility==='gm'?' · Geheim':''}`:'Noch kein Wurf in dieser Sitzung.';if($('quickResult').textContent!==quickText)$('quickResult').textContent=quickText;
   $('contextRolls').innerHTML=(room?.rolls||[]).slice().sort((a,b)=>Number(b.id)-Number(a.id)).slice(0,3).map(x=>`<p>${e(x.label)}: <strong>${Number(x.total)||0}</strong>${x.visibility==='gm'?' · Geheim':''}</p>`).join('')||'<p class="note">Noch keine Würfe.</p>';
   mobile.innerHTML='<h2>Spielerstatus</h2>'+party.map(x=>`<span>${e(x.name)} <b>${e(x.hp??'–')}/${e(x.hpMax??'–')}</b>${x.template?' · Vorlage':''}</span>`).join('');
  }
  function update(){layout();if(owner())contextRender();}
  async function refresh(force=false){
   if(loading||!root.DND.auth.identity()||(!force&&Date.now()-lastFetch<8000))return;loading=true;
   try{
    const next=await rpc('workspace.snapshot',{});snapshot=next;lastFetch=Date.now();
    $('sceneText').textContent=next.scene||'Noch keine Szene veröffentlicht.';$('announcementText').textContent=next.announcement||'';$('workspaceConnection').textContent='Stand: '+new Date(lastFetch).toLocaleTimeString('de-DE');
    if(owner()){
     loadedPlans=[...(next.plans||[]),...loadedPlans.filter(x=>!(next.plans||[]).some(y=>y.id===x.id))];loadedArchives=[...(next.history||[]),...loadedArchives.filter(x=>!(next.history||[]).some(y=>y.session_id===x.session_id))];
     $('morePlans').hidden=loadedPlans.length>=Number(next.plan_count||0);$('moreArchives').hidden=loadedArchives.length>=Number(next.archive_count||0);
     fillSelect('planList',loadedPlans,'id',x=>`${x.title} · ${x.status==='planned'?'Vorbereitet':x.status==='live'?'Laufend':'Beendet'}`);
     fillSelect('archiveList',loadedArchives,'session_id',x=>`${new Date(x.ended_at).toLocaleDateString('de-DE')} · ${x.title}`);
     if(!publishDirty){$('publishScene').value=next.scene||'';$('publishInfo').value=next.announcement||'';publishVersion=next.version;}
    }
    update();
   }catch(error){$('workspaceConnection').textContent='Szenenstand nicht aktuell – Wiederverbindung beim nächsten Abruf.';if(force)notice(error.message||'Arbeitsstand konnte nicht geladen werden.');}
   finally{loading=false;}
  }
  async function command(action,payload){
   const key=JSON.stringify([action,payload]);if(!pending.has(key))pending.set(key,crypto.randomUUID());
   try{const result=await rpc('workspace.'+action,{...payload,request_id:pending.get(key)});pending.delete(key);return result;}
   catch(error){/* A proxy error can arrive after commit; retain the same request ID for retry. */throw error;}
  }
  const changed=()=>{planDirty=true;$('startPlan').disabled=true;$('planStatus').textContent='Nicht gespeichert. Erst speichern, dann starten.';};
  function showPlan(value){plan=value;planDirty=false;for(const [id,key] of [['planTitle','title'],['planScene','scene'],['planInfo','party_info'],['planNotes','private_notes']])$(id).value=value?.[key]||'';$('startPlan').disabled=!value||value.status!=='planned';$('planStatus').textContent=value?`Gespeichert · Version ${value.version} · ${value.status==='planned'?'Vorbereitet':value.status==='live'?'Laufend':'Beendet'}`:'Neuer, noch nicht gespeicherter Plan.';if(value)$('planList').value=value.id;}
  async function savePlan(){const value=await command('plan.save',{id:plan?.id||null,version:plan?.version||null,title:$('planTitle').value.trim(),scene:$('planScene').value,party_info:$('planInfo').value,private_notes:$('planNotes').value});showPlan(value);await refresh(true);$('planList').value=value.id;return value;}
  async function openArchive(id){
   if(recapDirty&&!confirm('Nicht gespeicherte Recap-Änderungen verwerfen?'))return;
   const value=await rpc('workspace.archive.load',{id});archive=value;recapDirty=false;$('recapDetails').hidden=false;$('recapTitle').textContent=value.title;
   $('recapMeta').textContent=`${new Date(value.ended_at).toLocaleString('de-DE')} · Dauer: ${Math.floor(value.duration_seconds/3600)} h ${Math.floor(value.duration_seconds%3600/60)} min`;
   for(const [key]of recapFields)$('recap-'+key).value=value.recap[key]||'';
   $('recapPrep').textContent=[value.recap.prep_notes,value.recap.scene,value.recap.announcement].filter(Boolean).join('\n\n');$('recapStatus').textContent='Geladen · Version '+value.version;location.hash='history';layout();
  }
  async function run(fn){if(busy)return;busy=true;try{await fn();}catch(error){notice(error.message||'Aktion fehlgeschlagen.');}finally{busy=false;}}
  for(const [id,visibility]of [['quickPublic','public'],['quickSecret','gm']])$(id).addEventListener('click',()=>{$('rollCount').value='1';$('rollFaces').value='20';$('rollBonus').value='0';$('advantage').value='0';$('rollVisibility').value=visibility;$('rollLabel').value='Schneller W20';$('rollForm').requestSubmit();});
  $('contextToggle').addEventListener('click',()=>{collapsed=!collapsed;layout();});$('contextCharacter').addEventListener('change',contextRender);
  $('gmNotes').addEventListener('input',()=>notesDirty=true);
  $('planForm').addEventListener('input',changed);$('planForm').addEventListener('submit',event=>{event.preventDefault();run(savePlan);});
  $('newPlan').addEventListener('click',()=>{if(!planDirty||confirm('Nicht gespeicherten Plan verwerfen?'))showPlan(null);});
  $('loadPlan').addEventListener('click',()=>run(async()=>{if(!$('planList').value)return;if(planDirty&&!confirm('Nicht gespeicherte Änderungen verwerfen?'))return;showPlan(await rpc('workspace.plan.load',{id:$('planList').value}));}));
  $('startPlan').addEventListener('click',()=>run(async()=>{if(!plan||planDirty)return;await command('session.start',{id:plan.id,version:plan.version});showPlan(await rpc('workspace.plan.load',{id:plan.id}));await refreshRoom();await refresh(true);location.hash='session';notice('Vorbereitete Sitzung gestartet.');}));
  $('publishForm').addEventListener('input',()=>publishDirty=true);
  $('publishForm').addEventListener('submit',event=>{event.preventDefault();run(async()=>{await command('publish',{version:publishVersion,scene:$('publishScene').value,announcement:$('publishInfo').value});publishDirty=false;await refresh(true);notice('Szene und Gruppeninfo veröffentlicht.');});});
  $('reloadPublished').addEventListener('click',()=>run(async()=>{if(publishDirty&&!confirm('Nicht veröffentlichte Änderungen verwerfen?'))return;publishDirty=false;await refresh(true);}));
  $('usePlanDraft').addEventListener('click',()=>{if(!plan){notice('Zuerst in der Vorbereitung einen Plan laden.');return;}$('publishScene').value=plan.scene;$('publishInfo').value=plan.party_info;publishDirty=true;notice('Entwurf übernommen. Noch nicht veröffentlicht.');});
  $('morePlans').addEventListener('click',()=>run(async()=>{const more=await rpc('workspace.plans.list',{offset:loadedPlans.length});loadedPlans.push(...more.filter(x=>!loadedPlans.some(y=>y.id===x.id)));await refresh(true);}));
  $('moreArchives').addEventListener('click',()=>run(async()=>{const more=await rpc('workspace.archives.list',{offset:loadedArchives.length});loadedArchives.push(...more.filter(x=>!loadedArchives.some(y=>y.session_id===x.session_id)));await refresh(true);}));
  $('loadArchive').addEventListener('click',()=>run(()=>{if($('archiveList').value)return openArchive($('archiveList').value);}));
  $('recapForm').addEventListener('input',()=>{recapDirty=true;$('recapStatus').textContent='Nicht gespeichert.';});
  $('recapForm').addEventListener('submit',event=>{event.preventDefault();run(async()=>{if(!archive)return;const payload={id:archive.session_id,version:archive.version};for(const [key]of recapFields)payload[key]=$('recap-'+key).value;archive=await command('archive.save',payload);recapDirty=false;$('recapStatus').textContent='Dauerhaft gespeichert · Version '+archive.version;await refresh(true);});});
  function reset(){$('sceneText').textContent='Noch keine Szene veröffentlicht.';$('announcementText').textContent='';$('workspaceConnection').textContent='';mobile.innerHTML='';loadedPlans=[];loadedArchives=[];snapshot=null;plan=null;archive=null;lastFetch=0;publishVersion=null;pending.clear();planDirty=publishDirty=recapDirty=notesDirty=false;for(const input of [...prep.querySelectorAll('input,textarea'),...publishing.querySelectorAll('input,textarea'),...history.querySelectorAll('textarea'),$('gmNotes')])input.value='';$('recapDetails').hidden=true;for(const id of ['quickResult','contextStats','contextRolls','recapPrep','recapTitle','recapMeta','recapStatus'])$(id).textContent='';for(const id of ['planList','archiveList','contextCharacter']){$(id).innerHTML='<option value="">Auswählen …</option>';delete $(id).dataset.signature;}quickDice.hidden=true;context.hidden=true;nav.hidden=true;prep.hidden=true;history.hidden=true;publishing.hidden=true;host.classList.remove('control-room');document.body.classList.remove('control-room-page');}
  root.DND.store.subscribe(state=>{if(!state.identity||state.identity.role!=='owner')reset();});
  window.addEventListener('hashchange',()=>{layout();if(owner())refresh();});
  window.addEventListener('beforeunload',event=>{if(planDirty||publishDirty||recapDirty||notesDirty){event.preventDefault();event.returnValue='';}});
  return Object.freeze({update,refresh,reset,notesSaved(){notesDirty=false;},allowLogout(){return !(planDirty||publishDirty||recapDirty||notesDirty)||confirm('Nicht gespeicherte Entwürfe verwerfen und abmelden?');},async control(action,title){
   let result;
   if(action==='start')result=await command('session.quickstart',{title:title||'Unsere D&D-Runde'});
   else result=await command('session.'+action,{session_id:getSnapshot()?.session?.id});
   if(action==='end'){await refresh(true);await openArchive(result.id);}return result;
  }});
 }
 root.DND.gm=Object.freeze({init});
})(globalThis);
