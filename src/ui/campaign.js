/* Campaign drafts and explicit publication. No actor/token is accepted from forms. */
((root)=>{
 'use strict';const DND=root.DND,e=x=>DND.ui.escape(x);let canLeave=()=>true;
 DND.campaign=Object.freeze({allowLogout:()=>canLeave()});
 document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));
 function init(){
  const tabletop=!!document.getElementById('dashboard'),host=tabletop?document.querySelector('.gm-main'):document.getElementById('account')?.parentElement;if(!host)return;
  const panel=document.createElement('section');panel.id='campaignPanel';panel.className='paper card campaign-panel';panel.hidden=true;
  panel.innerHTML=`<div class="section-head"><h2>Kampagnenbuch</h2><button id="campaignReload" type="button">Stand laden</button></div><button id="campaignRetry" type="button" hidden>Unbestätigte Aktion erneut bestätigen</button><p id="campaignNotice" role="status" aria-live="polite"></p><div id="campaignOwner" hidden><label for="campaignSelect">Kampagne zur Bearbeitung</label><select id="campaignSelect"></select><p id="campaignActive" class="campaign-state"></p><details><summary>Kampagne anlegen oder bearbeiten</summary><form id="campaignMeta"><label>Titel<input name="title" maxlength="100" required></label><label>Private Beschreibung<textarea name="description" maxlength="6000"></textarea></label><label><input name="archived" type="checkbox" style="width:auto"> Archiviert</label><div class="buttonbar"><button type="submit">Kampagne speichern</button><button id="campaignNew" type="button">Neue Kampagne</button></div></form></details><div class="buttonbar"><button id="campaignStart" type="button">Neue Sitzung dieser Kampagne starten</button><a href="#prep">Sitzung steuern & beenden</a></div><p class="note">Alle Kampagnen verwenden die bestehende Gruppe. Es läuft eine Sitzung gleichzeitig. Der Kampagnenwechsel erfolgt durch Start einer neuen Sitzung; laufende Sitzungen zuerst beenden.</p><label for="campaignKind">Bereich</label><select id="campaignKind"><option value="npc">NPCs</option><option value="quest">Quests</option><option value="journal">Gruppenjournal</option><option value="node">Story-Knoten</option><option value="edge">Story-Verbindungen</option><option value="statblock">Statblock-Bibliothek</option><option value="encounter">Encounter-Planer</option></select><button id="campaignNewRecord" type="button">Neuer Eintrag</button><form id="campaignEditor" class="campaign-editor" hidden><h3 id="campaignEditorTitle">Eintrag bearbeiten</h3><label>Titel<input name="title" maxlength="100" required></label><label>Beschreibung / Inhalt<textarea name="body" maxlength="6000" rows="4"></textarea></label><label>Private GM-Notizen<textarea name="private_notes" maxlength="12000" rows="3"></textarea></label><div id="campaignExtra"></div><p class="note">Speichern ändert nur den privaten Entwurf. „Gespeicherten Stand freigeben“ veröffentlicht Titel, Beschreibung und die vorgesehenen Bereichsfelder. GM-Notizen, Statblocks und Encounter-Pläne bleiben privat.</p><div class="buttonbar"><button type="submit">Entwurf speichern</button><button id="campaignClose" type="button">Editor schließen</button></div><p id="campaignEditorState" role="status"></p></form><div id="campaignResources"></div></div><div id="campaignGraph"></div><div id="campaignRecords"></div>`;
  if(tabletop)host.insertBefore(panel,host.querySelector('.columns'));else document.getElementById('account').after(panel);
  const $=id=>document.getElementById(id),form=$('campaignEditor'),meta=$('campaignMeta');
  let identity=null,generation=0,selected=null,snapshot=null,edit=null,dirty=false,metaDirty=false,busy=false,loading=false,pending=null,newMeta=false,loadDone=Promise.resolve();
  const owner=()=>identity?.actor==='gm',records=()=>snapshot?.records||[],current=()=>snapshot?.campaign;
  const note=t=>{$('campaignNotice').textContent=String(t||'').slice(0,300);};
  const changes=()=>dirty||metaDirty||busy||!!pending;
  canLeave=()=>!changes()||confirm('Nicht gespeicherte Kampagneneingaben oder eine unbestätigte Aktion verwerfen?');
  function layout(){panel.hidden=!identity||(owner()?(!tabletop||location.hash!=='#campaign'):!current());$('campaignOwner').hidden=!owner();}
  async function load(force=false){
   if(!identity)return;if(loading){if(force){await loadDone;return load(force);}return;}loading=true;let finish;loadDone=new Promise(resolve=>finish=resolve);const mine=generation;
   try{const data=await DND.api.request('campaign.snapshot',owner()&&selected?{campaign_id:selected}:{});if(mine!==generation)return;
    if(!force&&changes()){layout();return;}snapshot=data;selected=data.campaign?.id||null;render();layout();
   }catch(err){if(mine===generation)note(err.message||'Kampagnenstand konnte nicht geladen werden.');}finally{if(mine===generation)loading=false;finish();}
  }
  async function command(action,payload){
   if(busy)return;const mine=generation;
   const proposed={action,payload:{...payload}};
   if(pending&&JSON.stringify([pending.action,pending.original])!==JSON.stringify([action,payload])){note('Eine Aktion ist noch unbestätigt. Wiederhole zuerst dieselbe Aktion.');return;}
   if(!pending)pending={...proposed,original:payload,payload:{...payload,request_id:crypto.randomUUID()}};
   busy=true;panel.inert=true;note('Server bestätigt …');
   try{const result=await DND.api.request('campaign.'+pending.action,pending.payload);if(mine!==generation)return;pending=null;dirty=metaDirty=false;note('Gespeichert und vom Server bestätigt.');return result;
   }catch(err){if(mine===generation){if(err.code&&!['08000','57014'].includes(err.code))pending=null;note(err.message||'Antwort unklar. Dieselbe Aktion erneut ausführen.');}throw err;}
   finally{panel.inert=false;if(mine===generation){busy=false;$('campaignRetry').hidden=!pending;$('campaignOwner').inert=!!pending;}}
  }
  async function run(fn){try{await fn();}catch{/* The command/load boundary shows actionable errors and retains form drafts. */}}
  function options(items,value=''){return items.map(x=>`<option value="${x.id}"${x.id===value?' selected':''}>${e(x.title)}</option>`).join('');}
  function button(action,label,id){return `<button type="button" data-campaign="${action}" data-id="${id}">${e(label)}</button>`;}
  const titles={npc:'NPC',quest:'Quest',journal:'Journal',node:'Story-Knoten',edge:'Verbindung',statblock:'Statblock',encounter:'Encounter'};
  function render(){
   if(owner()){
    $('campaignSelect').innerHTML=options(snapshot.campaigns||[],selected);$('campaignActive').textContent=`${selected===snapshot.active_campaign_id?'Aktuelle Spielkampagne':'Vorbereitung · andere Spielkampagne aktiv'}${current()?.archived?' · Archiviert':''}`;
    if(!metaDirty&&!newMeta){meta.elements.title.value=current()?.title||'';meta.elements.description.value=current()?.description||'';meta.elements.archived.checked=!!current()?.archived;}
    const resources=snapshot.resources||[];
    $('campaignResources').innerHTML=`<details><summary>Verknüpfte Sitzungen, Begegnungen & Karten (${resources.length})</summary><p>Neue Vorbereitungen in den bisherigen Bereichen gehören zur aktuellen Spielkampagne. Unbenutzte Vorbereitungen können hier zugeordnet werden.</p>${resources.map(r=>`<article><strong>${e(r.title)}</strong> · ${r.encounter_id?'Kampf':r.map_id?'Karte':'Sitzungsplan'} ${r.encounter_id?button('combat','Im Kampfmanager öffnen',r.encounter_id):r.map_id?'<a href="#map">Kartenverwaltung</a>':button('plan.start','Diesen Sitzungsplan starten',r.plan_id)}<label>Zielkampagne<select data-resource="${r.id}">${options((snapshot.campaigns||[]).filter(c=>!c.archived),selected)}</select></label>${button('resource.assign','Vorbereitung zuordnen',r.id)}</article>`).join('')||'<p>Noch keine Vorbereitungen verknüpft.</p>'}</details>`;
   }
   const list=owner()?records().filter(r=>r.kind===$('campaignKind').value):records();
   $('campaignRecords').innerHTML=`${!owner()?`<h3>${e(current()?.title||'Kampagne')}</h3><p>Freigegebene NPCs, Quests, Journal und Story. Deine eigenen Notizen bleiben im Charakterbogen.</p>`:''}`+(list.map(r=>`<article data-record="${r.id}"><h3>${e(r.title)} <small>· ${titles[r.kind]}</small></h3>${owner()?`<p class="campaign-state">${r.published?'Freigegebener Stand vorhanden':'Privat · nicht freigegeben'}</p>`:''}<p class="preserve-lines">${e(r.body)}</p>${r.kind==='quest'?`<p>Status: ${e(({open:'Offen',active:'Aktiv',completed:'Abgeschlossen',failed:'Gescheitert'})[(owner()?r.data:r).status]||'Offen')}</p><p class="preserve-lines">${e((owner()?r.data:r).objectives)}</p><p>Belohnung: ${e((owner()?r.data:r).reward)}</p>`:''}${r.kind==='statblock'?`<p>Vorlage · ${r.data.hp} maximale TP · RK ${r.data.ac} · ${r.data.xp} EP</p><p class="preserve-lines">${e(r.data.actions)}</p>`:''}${owner()?`<p class="preserve-lines">GM: ${e(r.private_notes)}</p><div class="buttonbar">${button('edit','Bearbeiten',r.id)}${!['statblock','encounter'].includes(r.kind)?button('record.publish','Gespeicherten Stand freigeben',r.id)+ (r.published?button('record.withdraw','Freigabe zurückziehen',r.id):''):''}${r.kind==='encounter'?button('encounter.build','Neue Kampfinstanz vorbereiten',r.id):''}</div>`:''}</article>`).join('')||'<p>Noch keine Einträge in diesem Bereich.</p>');
   renderGraph();
  }
  function renderGraph(){
   const nodes=records().filter(r=>r.kind==='node'),edges=records().filter(r=>r.kind==='edge'),positions=new Map(nodes.map((r,i)=>[r.id,{x:30+(i%3)*190,y:35+Math.floor(i/3)*90}]));
   const height=Math.max(110,Math.ceil(nodes.length/3)*90+25);$('campaignGraph').innerHTML=!nodes.length?'':`<details${!owner()?' open':''}><summary>Story Graph · ${nodes.length} Knoten</summary><svg viewBox="0 0 600 ${height}" role="img" aria-label="Story Graph. Verbindungen stehen in der folgenden Liste.">${edges.map(r=>{const d=owner()?r.data:r,a=positions.get(d.from),b=positions.get(d.to);return a&&b?`<line x1="${a.x+70}" y1="${a.y+20}" x2="${b.x+70}" y2="${b.y+20}"/>`:'';}).join('')}${nodes.map(r=>{const p=positions.get(r.id);return `<g><title>${e(r.title)}</title><rect x="${p.x}" y="${p.y}" width="160" height="40" rx="5"/><text x="${p.x+7}" y="${p.y+25}">${e(r.title.slice(0,20))}</text></g>`;}).join('')}</svg><ul>${edges.map(r=>{const d=owner()?r.data:r,a=nodes.find(n=>n.id===d.from),b=nodes.find(n=>n.id===d.to);return a&&b?`<li>${e(a.title)} → ${e(b.title)}: ${e(r.title)} · ${e(r.body)}</li>`:'';}).join('')}</ul><p>Verbindungen sind gerichtet. Freigaben bleiben einzeln steuerbar; verborgene Knoten entfernen ihre Verbindungen aus Spielerantworten.</p></details>`;
  }
  function openEditor(record=null){
   edit=record;dirty=false;form.hidden=false;form.reset();for(const key of ['title','body','private_notes'])form.elements[key].value=record?.[key]||'';
   const kind=record?.kind||$('campaignKind').value,d=record?.data||{};$('campaignEditorTitle').textContent=`${titles[kind]} ${record?'bearbeiten':'anlegen'}`;
   let extra='';
   if(kind==='quest')extra=`<label>Status<select name="status">${[['open','Offen'],['active','Aktiv'],['completed','Abgeschlossen'],['failed','Gescheitert']].map(([v,l])=>`<option value="${v}"${v===d.status?' selected':''}>${l}</option>`).join('')}</select></label><label>Ziele<textarea name="objectives" maxlength="6000">${e(d.objectives||'')}</textarea></label><label>Belohnungsbeschreibung<textarea name="reward" maxlength="2000">${e(d.reward||'')}</textarea></label>`;
   if(kind==='statblock')extra='<div class="campaign-fields">'+[['hp','Maximale TP',1,9999,10],['ac','RK',0,100,12],['dex','Geschicklichkeit',1,30,10],['init_bonus','Initiativebonus',-100,100,0],['speed','Bewegung in ft',0,1000,30],['xp','EP pro Gegner',0,1000000,50]].map(([key,label,min,max,value])=>`<label>${label}<input name="${key}" type="number" min="${min}" max="${max}" required value="${d[key]??value}"></label>`).join('')+`</div><label>Aktionen / Statblocktext<textarea name="actions" maxlength="6000">${e(d.actions||'')}</textarea></label>`;
   if(kind==='edge')extra=`<label>Von Knoten<select name="from" required>${options(records().filter(r=>r.kind==='node'),d.from)}</select></label><label>Zu Knoten<select name="to" required>${options(records().filter(r=>r.kind==='node'),d.to)}</select></label>`;
   if(kind==='encounter')extra=`<label>Gruppenstufen · durch Kommas getrennt<input name="levels" value="${e((d.levels||[3,3,3,3]).join(','))}" required></label><div id="campaignMembers"></div><button id="campaignAddMember" type="button">Statblock hinzufügen</button><p id="campaignDifficulty" role="status"></p><p class="note">Schätzung nach DMG 2014. Kleine/große Gruppen verändern den Multiplikator. Angepasste EP dienen nur der Schwierigkeit, nicht als Belohnung. Sehr schwache Gegner ggf. manuell ignorieren; Gelände, Synergien und Tagesressourcen selbst beurteilen.</p><label>Eigene Schwierigkeitseinschätzung<input name="difficulty_note" maxlength="1000" value="${e(d.difficulty_note||'')}"></label><label>Geplante Beute · keine Inventarbuchung<textarea name="loot" maxlength="6000">${e(d.loot||'')}</textarea></label>`;
   $('campaignExtra').innerHTML=extra;if(kind==='encounter'){for(const member of d.members||[])addMember(member);if(!d.members?.length)addMember();estimate();}
   $('campaignEditorState').textContent=record?'Gespeicherten Eintrag geladen.':'Neuer Entwurf.';
  }
  function addMember(member={}){const row=document.createElement('div');row.className='campaign-member';row.innerHTML=`<label>Statblock<select data-template required>${options(records().filter(r=>r.kind==='statblock'),member.template_id)}</select></label><label>Anzahl<input data-count type="number" min="1" max="46" value="${member.count||1}" required></label><button type="button" data-remove-member>Entfernen</button>`;$('campaignMembers').append(row);}
  function memberData(){return [...$('campaignMembers').children].map(row=>({template_id:row.querySelector('[data-template]').value,count:Number(row.querySelector('[data-count]').value)}));}
  function levels(){return form.elements.levels.value.split(',').map(x=>Number(x.trim()));}
  function estimate(){if(!$('campaignDifficulty'))return;try{const members=memberData().map(m=>({...m,xp:records().find(r=>r.id===m.template_id)?.data.xp})),v=DND.campaignRules.difficulty(levels(),members);$('campaignDifficulty').textContent=`${v.label} · ${v.count} Gegner · ${v.xp} EP · ×${v.multiplier} = ${v.adjusted} angepasste EP · Schwellen ${v.thresholds.join(' / ')}`;}catch(err){$('campaignDifficulty').textContent=err.message;}}
  form.addEventListener('input',()=>{dirty=true;estimate();});form.addEventListener('change',()=>{dirty=true;estimate();});meta.addEventListener('input',()=>{metaDirty=true;});
  panel.addEventListener('click',event=>run(async()=>{
   const b=event.target.closest('button');if(!b)return;
   if(b.id==='campaignRetry'){if(!pending)return;const action=pending.action,result=await command(action,pending.original);if(!result)return;if(action==='campaign.save'){selected=result.id;newMeta=false;}if(action==='record.save')edit=result;form.hidden=true;await load(true);return;}
   if(b.id==='campaignAddMember'){addMember();dirty=true;estimate();return;}
   if(b.hasAttribute('data-remove-member')){b.parentElement.remove();dirty=true;estimate();return;}
   if(b.id==='campaignNewRecord'){if(canLeave())openEditor();return;}
   if(b.id==='campaignClose'){if(canLeave()){form.hidden=true;dirty=false;edit=null;}return;}
   if(b.id==='campaignNew'){if(!canLeave())return;newMeta=true;meta.reset();metaDirty=true;note('Neue Kampagne: Titel eingeben und speichern.');return;}
   if(b.id==='campaignReload'){if(!canLeave())return;dirty=metaDirty=false;newMeta=false;form.hidden=true;await load(true);return;}
   if(b.id==='campaignStart'){if(!canLeave())return;await command('session.start',{campaign_id:selected});await load(true);return;}
   const action=b.dataset.campaign,id=b.dataset.id;if(!action)return;
   if(action==='edit'){if(canLeave())openEditor(records().find(r=>r.id===id));return;}
   if(action==='combat'){if(canLeave())await DND.combat.open(id);return;}
   if(action==='plan.start'){
    if(!canLeave())return;const plan=await DND.api.request('workspace.plan.load',{id});await command('session.start',{campaign_id:selected,plan_id:id,plan_version:plan.version});await load(true);return;
   }
   if(action==='resource.assign'){if(!canLeave())return;const target=[...panel.querySelectorAll('[data-resource]')].find(x=>x.dataset.resource===id).value;await command(action,{campaign_id:target,id,source_campaign_id:selected});await load(true);return;}
   if(!canLeave())return;const r=records().find(r=>r.id===id);if(!r)return;
   if(action==='record.publish'&&!confirm('Gespeicherten Stand für die Gruppe dieser Kampagne freigeben?'))return;
   const result=await command(action,{campaign_id:selected,id,version:r.version});if(!result)return;
   if(action==='encounter.build'){note('Neue, verborgene Kampfinstanz angelegt. Initiative, Sichtbarkeit und Kartentoken im Kampf-/Kartenbereich verwalten.');await DND.combat.open(result.id);}
   form.hidden=true;await load(true);
  }));
  form.addEventListener('submit',event=>{event.preventDefault();run(async()=>{
   const kind=edit?.kind||$('campaignKind').value,f=Object.fromEntries(new FormData(form));let data={};
   if(kind==='quest')for(const k of ['status','objectives','reward'])data[k]=f[k];
   if(kind==='statblock'){for(const k of ['hp','ac','dex','init_bonus','speed','xp'])data[k]=Number(f[k]);data.actions=f.actions;}
   if(kind==='edge')data={from:f.from,to:f.to};
   if(kind==='encounter')data={members:memberData(),levels:levels(),loot:f.loot,difficulty_note:f.difficulty_note};
   const result=await command('record.save',{campaign_id:selected,kind,id:edit?.id||null,version:edit?.version||null,title:f.title,body:f.body,private_notes:f.private_notes,data});if(!result)return;edit=result;openEditor(result);await load(true);
  });});
  meta.addEventListener('submit',event=>{event.preventDefault();run(async()=>{const result=await command('campaign.save',{campaign_id:newMeta?null:selected,version:newMeta?null:current()?.version,title:meta.elements.title.value,description:meta.elements.description.value,archived:meta.elements.archived.checked});if(!result)return;newMeta=false;selected=result.id;await load(true);});});
  $('campaignKind').addEventListener('change',()=>{if(!canLeave()){ $('campaignKind').value=edit?.kind||'npc';return;}form.hidden=true;dirty=false;edit=null;render();});
  $('campaignSelect').addEventListener('change',()=>{if(!canLeave()){$('campaignSelect').value=selected;return;}selected=$('campaignSelect').value;dirty=metaDirty=false;newMeta=false;edit=null;form.hidden=true;load(true);});
  DND.store.subscribe(state=>{if(state.identity===identity)return;identity=state.identity;generation++;selected=null;snapshot=null;edit=null;pending=null;dirty=metaDirty=busy=loading=newMeta=false;panel.inert=false;$('campaignOwner').inert=false;$('campaignRetry').hidden=true;form.reset();meta.reset();form.hidden=true;for(const id of ['campaignRecords','campaignGraph','campaignResources','campaignExtra','campaignActive','campaignNotice','campaignSelect'])$(id).replaceChildren();layout();if(identity)load(true);});
  root.addEventListener('dnd:live-refresh',()=>load());root.addEventListener('hashchange',layout);root.addEventListener('beforeunload',event=>{if(changes()){event.preventDefault();event.returnValue='';}});
 }
})(globalThis);
