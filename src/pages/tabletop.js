document.addEventListener('DOMContentLoaded', () => {
/* D&D multiplayer tabletop — free-tier polling, all authorization inside Supabase RPC. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names = {len:'Lennox',gra:'Grandia Rythna',sas:'Sashee',pei:'Peisinoe',gm:'Spielleiter'};
  const defaults = {len:[21,13],gra:[28,16],sas:[21,12],pei:[24,15]};
  const state={actor:'',role:'',sessionId:'',snapshot:null,onlineSince:0,busy:false,loading:false,refreshTimer:null,heartbeatTimer:null,first:true,failures:0};
  let noticeTimer;
  const notice = text => {
    const el=$('notice');el.textContent=String(text).slice(0,240);el.hidden=false;
    clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.hidden=true,5000);
  };
  const friendly = error => {
    const m=String(error?.message||error||'Verbindungsproblem');
    if (/Zugangscode ungültig|invalid.*code|Unauthorized|403/i.test(m)) return 'Zugangscode ungültig oder Zugriff verweigert.';
    if (/fetch|network|timeout/i.test(m)) return 'Keine Netzwerkverbindung zu Supabase.';
    return m.slice(0,160);
  };
  const rpc=(name,params)=>DND.api.request(name,params);
  const isGM=()=>state.actor==='gm';
  const sessionActive=()=>state.snapshot?.session?.status==='active';
  const work=DND.gm.init({getSnapshot:()=>state.snapshot,rpc,notice,defaults,refreshRoom:()=>refreshAfterAction()});
  function showGate(){
    $('dashboard').hidden=true;$('loginPanel').hidden=false;$('logout').hidden=true;
    $('connection').textContent='Bitte anmelden';
  }
  function resetSession(){
    clearInterval(state.refreshTimer);clearInterval(state.heartbeatTimer);
    state.actor='';state.role='';state.snapshot=null;state.sessionId='';state.onlineSince=0;
    state.first=true;state.busy=false;state.loading=false;
    $('accessCode').value='';showGate();
  }
  async function signIn(actor,code,restore=false){
    if(!restore&&(!names[actor]||!(/^[A-Za-z0-9_-]{20,100}$/.test(code)))) {notice('Bitte einen gültigen Code eingeben.');return;}
    if(state.busy)return;state.busy=true;$('connection').textContent='Zugang wird geprüft …';
    try{
      const identity=restore?await DND.auth.restore():await DND.auth.signIn(actor,code);
      if(!identity){showGate();return;}
      actor=identity.actor;$('accessCode').value='';
      const snap=await rpc('dnd_snapshot',{p_after:0});
      if(!snap||!Array.isArray(snap.party))throw Error('Ungültige Serverantwort');
      state.actor=actor;state.role=actor==='gm'?'gm':'player';
      state.first=true;state.sessionId='';state.onlineSince=0;state.failures=0;
      $('loginPanel').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;
      $('gmPanel').hidden=!isGM();$('visibilityWrap').hidden=!isGM();
      if(!isGM())$('rollVisibility').value='public';
      await processSnapshot(snap);
      await work.refresh(true);
      await heartbeat();
      clearInterval(state.refreshTimer);clearInterval(state.heartbeatTimer);
      state.refreshTimer=setInterval(()=>{if(!document.hidden)refresh();},3200);
      state.heartbeatTimer=setInterval(()=>{if(!document.hidden)heartbeat();},18000);
      $('connection').textContent='● Online';
    }catch(e){
      if(restore)showGate();
      notice('Anmeldung fehlgeschlagen: '+friendly(e));$('connection').textContent='Zugang fehlgeschlagen';
    }finally{state.busy=false; if(state.actor&&state.snapshot)render((state.snapshot.rolls||[]).slice().sort((a,b)=>Number(b.id)-Number(a.id)),state.snapshot);}
  }
  async function heartbeat(){
    if(!state.actor)return;
    try{await rpc('dnd_heartbeat',{});}catch(e){$('connection').textContent='Verbindung gestört';}
  }
  function displayTime(date){
    const d=new Date(date);return Number.isNaN(d.getTime())?'':d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
  }
  function rollDescription(r){
    const raw=Array.isArray(r.individual_rolls)?r.individual_rolls:[];
    const chosen=Array.isArray(r.chosen_rolls)?r.chosen_rolls:raw;
    const adv=r.advantage===1?' · Vorteil':r.advantage===-1?' · Nachteil':'';
    const bonus=Number(r.modifier||0);
    return `${String(r.formula||'')} → [${raw.join(', ')}]${bonus?' · Mod '+(bonus>0?'+':'')+bonus:''}${adv}${raw.length!==chosen.length?' · zählt '+chosen.join(', '):''}`;
  }
  function isCritical(r){
    if(Number(r.faces)!==20||!Array.isArray(r.chosen_rolls)||r.chosen_rolls.length!==1)return '';
    return r.chosen_rolls[0]===20?'crit':r.chosen_rolls[0]===1?'fail':'';
  }
  function showLast(r){
    const el=$('lastResult');el.hidden=false;
    const privateText=r.visibility==='gm'?' · nur für Spielleiter':'';
    el.innerHTML=`<strong>${Number(r.total)||0}</strong><span>${escapeHtml(names[r.actor_key]||r.actor_key)} · ${escapeHtml(r.label)}${privateText}</span><span>${escapeHtml(rollDescription(r))}</span>`;
    el.className='result '+isCritical(r);
    // Restart a purely decorative animation; the signed-in backend generated the result.
    void el.offsetWidth;
  }
  async function processSnapshot(snap){
    if(!snap||!snap.session||!Array.isArray(snap.rolls))throw Error('Ungültige Serverantwort');
    const previous=state.snapshot;
    const prevMax=state.onlineSince;
    const newSession=state.sessionId!==snap.session.id;
    state.snapshot=snap;state.sessionId=snap.session.id;
    const rolls=snap.rolls.slice().sort((a,b)=>Number(b.id)-Number(a.id));
    const maxId=rolls.length?Math.max(...rolls.map(r=>Number(r.id))):0;
    const canNotify=!state.first&&!newSession;
    if(canNotify){
      const fresh=rolls.filter(r=>Number(r.id)>prevMax);
      if(fresh.length){showLast(fresh[0]);if(fresh[0].actor_key!==state.actor)notice(`${names[fresh[0].actor_key]||'Spielleiter'} hat ${fresh[0].label} gewürfelt: ${fresh[0].total}`);}
    }
    state.onlineSince=Math.max(maxId,Number(snap.latest_id)||0);
    state.first=false;
    render(rolls,previous);
  }
  async function refresh(){
    if(!state.actor||state.loading||state.busy)return;
    state.loading=true;
    try{
      const data=await rpc('dnd_snapshot',{p_after:0});
      await processSnapshot(data);await work.refresh();state.failures=0;
      $('connection').textContent='● Online';
    }catch(e){
      state.failures++;
      $('connection').textContent=state.failures>1?'● Offline / Wiederverbindung':'Verbindung gestört';
      if(state.failures===2)notice(friendly(e)+' Automatischer Neuversuch läuft.');
    }finally{state.loading=false;}
  }
  function render(rolls,previous){
    const snap=state.snapshot, session=snap.session||{},party=Array.isArray(snap.party)?snap.party:[];
    const online=new Set((snap.online||[]).map(x=>x.key));
    $('sessionTitleDisplay').textContent=session.title||'D&D-Spieltisch';
    const labels={waiting:'Noch keine Sitzung',active:'Sitzung aktiv',paused:'Sitzung pausiert',ended:'Sitzung beendet'};
    $('sessionStatus').textContent=labels[session.status]||'Unbekannt';
    $('sessionMessage').textContent=session.status==='active'?'Alle öffentlichen Würfe erscheinen automatisch in der Runde.':session.status==='paused'?'Der Spielleiter hat die Würfe pausiert.':'Der Spielleiter kann hier eine neue Runde starten.';
    $('onlineText').textContent=`${online.size} / 5 Teilnehmer online`;
    $('partyInfo').textContent=`${party.length} Charaktere`;
    $('party').innerHTML=party.map(p=>{
      const fallback=defaults[p.key]||[20,10];
      const max=Math.max(1,Math.min(9999,Number(p.hpMax??fallback[0])||fallback[0]));
      const hp=Math.max(0,Math.min(9999,Number(p.hp??fallback[0])||0));
      const temp=Math.max(0,Math.min(9999,Number(p.tmp)||0));
      const ac=Number(p.ac??fallback[1])||fallback[1];
      const percent=Math.max(0,Math.min(100,Math.round(hp/max*100)));
      const isOnline=online.has(p.key);
      return `<article class="party-card"><div class="pc-top"><strong>${escapeHtml(p.name||names[p.key]||'Charakter')}</strong><span class="${isOnline?'online':'offline'}">● ${isOnline?'Online':'Offline'}</span></div>
        <div class="pc-class">${escapeHtml(p.class||'')}${p.level?' · Stufe '+escapeHtml(p.level):''}</div><div class="hp-track"><span style="width:${percent}%"></span></div>
        <div class="pc-bottom"><span>${hp}/${max} TP${temp?' (+'+temp+' temp)':''}</span><span>RK ${Number.isFinite(ac)?ac:'–'}</span></div></article>`;
    }).join('')||'<div class="empty">Keine Charaktere gefunden.</div>';
    const nameFor=k=>names[k]||k;
    $('rolls').innerHTML=rolls.length?rolls.map(r=>`<article class="roll-entry ${isCritical(r)} ${r.visibility==='gm'?'secret':''}">
        <div><strong>${escapeHtml(nameFor(r.actor_key))} · ${escapeHtml(r.label)}</strong>
        <div class="detail">${escapeHtml(rollDescription(r))}${r.visibility==='gm'?' · 🔒 Geheim':''}</div><div class="detail">${escapeHtml(displayTime(r.created_at))}</div></div>
        <div class="number" aria-label="Ergebnis ${Number(r.total)||0}">${Number(r.total)||0}</div></article>`).join(''):
      '<div class="empty">Noch keine Würfe in dieser Sitzung. Starte mit dem ersten W20!</div>';
    $('rollCountText').textContent=rolls.length?`${rolls.length} letzte Ergebnisse`:'Noch keine Würfe';
    $('rollButton').disabled=session.status!=='active'||state.busy;
    $('rollButton').textContent=session.status==='active'?'🎲 Würfeln & mit allen teilen':'Würfeln erst bei aktiver Sitzung';
    $('gmPanel').hidden=!isGM();
    if(isGM()){
      document.querySelectorAll('[data-gm]').forEach(b=>{
        const a=b.dataset.gm;
        b.disabled=state.busy||(a==='start'&&['active','paused'].includes(session.status))||(a==='pause'&&session.status!=='active')||(a==='resume'&&session.status!=='paused')||(a==='end'&&!['active','paused'].includes(session.status));
      });
      if(!previous || previous.session.id!==session.id){$('gmNotes').value=snap.gm_notes||'';}
    }
    work.update();
  }
  async function roll(ev){
    ev.preventDefault();if(state.busy)return;
    if(!sessionActive()){notice('Der Spielleiter muss die Sitzung zunächst starten.');return;}
    const count=Number($('rollCount').value),faces=Number($('rollFaces').value),mod=Number($('rollBonus').value),adv=Number($('advantage').value);
    if(!Number.isInteger(count)||count<1||count>20||![4,6,8,10,12,20,100].includes(faces)||!Number.isInteger(mod)||Math.abs(mod)>100){notice('Bitte gültige Würfelwerte eingeben.');return;}
    if(adv!==0&&(count!==1||faces!==20)){notice('Vorteil/Nachteil gilt nur für einen einzelnen W20.');return;}
    const label=($('rollLabel').value||'Wurf').trim().slice(0,100);
    const formula=`${count}d${faces}${mod?(mod>0?'+':'')+mod:''}`;
    state.busy=true;$('rollButton').disabled=true;
    try{
      const data=await rpc('dnd_roll',{p_formula:formula,p_label:label||'Wurf',p_visibility:isGM()?$('rollVisibility').value:'public',p_request_id:crypto.randomUUID(),p_adv:adv});
      showLast(data);await refreshAfterAction();
    }catch(e){notice('Wurf fehlgeschlagen: '+friendly(e));}
    finally{state.busy=false;$('rollButton').disabled=!sessionActive();}
  }
  async function refreshAfterAction(){
    // Bypass the normal busy guard for immediate feedback after a user action.
    const data=await rpc('dnd_snapshot',{p_after:0});
    await processSnapshot(data);
  }
  async function gmAction(action){
    if(!isGM()||state.busy)return;
    if(action==='end'&&!confirm('Die aktuelle Sitzung wirklich beenden?'))return;
    state.busy=true;
    try{
      await work.control(action,action==='start'?$('newTitle').value.trim():null);
      await refreshAfterAction();notice(action==='start'?'Sitzung gestartet':action==='end'?'Sitzung beendet':action==='pause'?'Sitzung pausiert':'Sitzung fortgesetzt');
    }catch(e){notice('Aktion fehlgeschlagen: '+friendly(e));}
    finally{state.busy=false;render((state.snapshot?.rolls||[]).slice().sort((a,b)=>Number(b.id)-Number(a.id)),state.snapshot);}
  }
  async function saveNotes(){
    if(!isGM()||state.busy)return;state.busy=true;
    try{await rpc('dnd_gm_manage',{p_action:'notes',p_title:null,p_notes:$('gmNotes').value});work.notesSaved();notice('Private Notizen gespeichert.');}
    catch(e){notice('Notizen nicht gespeichert: '+friendly(e));}
    finally{state.busy=false;}
  }
  $('loginForm').addEventListener('submit',ev=>{ev.preventDefault();signIn($('role').value,$('accessCode').value.trim());});
  $('rollForm').addEventListener('submit',roll);
  document.querySelectorAll('[data-gm]').forEach(b=>b.addEventListener('click',()=>gmAction(b.dataset.gm)));
  $('saveNotes').addEventListener('click',saveNotes);
  $('logout').addEventListener('click',async()=>{if(!work.allowLogout())return;resetSession();try{await DND.auth.logout();}catch{notice('Lokal abgemeldet; Server-Widerruf fehlgeschlagen.');}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.actor){heartbeat();refresh();}});
  window.addEventListener('dnd:session-ended',()=>{resetSession();notice('Sitzung abgelaufen. Bitte erneut anmelden.');});
  signIn('','',true);
})();

});
