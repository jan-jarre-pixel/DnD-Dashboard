/*
 * D&D Charakterbögen – no-email Supabase adapter.
 * Your random, private character code authenticates via restricted Postgres RPC.
 * Direct table access remains blocked by RLS / GRANTs; GM has read-only access.
 */
(() => {
  'use strict';
  const api = DND.api;
  const allowed = new Set(IDS);
  const state = { workspace:null, activeView:'dashboard', role:'guest', char:'', busy:false, refreshing:false, polling:null, revision:{}, saving:{}, versions:{}, pending:{}, conflict:null };
  const original = { draw, overview, codeCard, hp, adj, pip, ds, insp, rest, cast, setv, tog };
  const safeMessage = e => {
    const msg = String(e?.message || 'Verbindung fehlgeschlagen.');
    if (/Zugangscode ungültig|Ungültiger.*Code|Ungültiger Charaktercode|Ungültiger Spielleiter-Code/i.test(msg)) return 'Code ungültig. Bitte den privaten Code prüfen.';
    if (e?.code==='28000') return 'Sitzung abgelaufen. Bitte erneut anmelden.';
    if (/Failed to fetch|network|timeout/i.test(msg)) return 'Keine Verbindung. Bitte Internetverbindung prüfen.';
    return msg.slice(0,200);
  };
  const note = msg => { setSt(msg); tst(msg); };
  function normalizeSheet(raw,id) { return DND.model.normalizeSheet(raw,id,D,SK); }
  function showLogin() {
    return `<div class="card"><h3>Online-Charakterbögen</h3><h2>Mit deinem privaten Code anmelden</h2>
      <p>Wähle deinen Charakter und gib den <b>persönlichen Zugangscode</b> ein, den du vom Spielleiter bekommen hast. Keine E-Mail und kein Benutzerkonto erforderlich.</p>
      <form onsubmit="cloudLogin();return false">
        <div class="ed"><div><label for="loginCharacter">Meine Rolle</label><select id="loginCharacter" class="w" required>
          <option value="">Bitte auswählen</option>
          ${IDS.map(k=>`<option value="${k}">${esc(D[k].name)} · ${esc(D[k].cls)}</option>`).join('')}
          <option value="gm">Spielleiter · Control Room</option>
        </select></div>
        <div><label for="loginCode">Privater Zugangscode</label><input id="loginCode" class="w" type="password" required autocomplete="off" placeholder="Zugangscode"></div></div>
        <p class="note">Deine Sitzung gilt bis zu zwölf Stunden in diesem Tab. Der private Code wird nach der Anmeldung nicht gespeichert. Teile deinen Code nicht weiter. Jeder mit diesem Code könnte deine Daten bearbeiten.</p>
        <button class="b" type="submit">Command Center öffnen</button>
      </form></div>`;
  }
  function accountLine() {
    const a = document.getElementById('account');
    if (!a) return;
    if (state.role==='guest') { a.style.display='none'; a.innerHTML=''; return; }
    a.style.display='block';
    a.innerHTML=`<div class="row" style="justify-content:space-between">
       <span class="note">${state.role==='gm'?'Spielleiter · alle Charaktere (nur lesen)':`${esc(S[state.char]?.name||D[state.char].name)} · automatisch online gespeichert`}</span>
       <a class="b" href="spieltisch.html" style="text-decoration:none">🎲 Live-Spieltisch</a> <button class="b" onclick="cloudLogout()">Abmelden</button></div>`;
  }
  overview = function () {
    return original.overview().replace(
      'Spieler schicken dir ihren Code (Button „Code erzeugen“ in ihrem Bogen), den du unten einfügst. So siehst du ihren aktuellen Stand. Jeder Spieler sieht und ändert ausschließlich seinen eigenen.',
      'Live-Gruppenübersicht (automatisch synchronisiert). Diese Charakteransicht ist nur lesbar; Kampfwerte steuerst du im Control Room.');
  };
  codeCard = function () {
    if (state.role!=='player') return '';
    return original.codeCard().replace(
      'Mit dem Code kann ein Stand auf ein anderes Gerät oder zum Spielleiter. Alles wird sonst nur in diesem Browser gespeichert.',
      'Dein Charakter wird automatisch in Supabase gespeichert. Dies ist nur eine zusätzliche Sicherung für dich.');
  };
  draw = function (soft=false) {
    const nav=document.getElementById('nav'),sheetRoot=document.getElementById('sheet');
    accountLine();
    if (state.role==='guest') { nav.innerHTML='';sheetRoot.innerHTML=showLogin();return; }
    if(state.role==='player'){
      const focused=document.activeElement;if(soft&&focused?.closest('#sheet')&&/INPUT|TEXTAREA|SELECT/.test(focused.tagName))return;
      cur=state.char;nav.innerHTML='';
      if(['dashboard','actions','character','inventory','journal'].includes(location.hash.slice(1)))state.activeView=location.hash.slice(1);const active=state.activeView;
      sheetRoot.innerHTML=DND.player.render(active,cur,S[cur],state.workspace,{parts,skills:SK,attributes:AB,mod,signed:sg,sheet,combat:(id,c)=>combat(id,c,pbOf(c),c.ab.map(mod))});return;
    }
    original.draw(soft);
    if (state.role==='gm') {
      if(cur!=='all'&&S[cur])sheetRoot.innerHTML+=`<section class="card"><h2>Zustände & Quest-Notizen</h2><p>${esc(S[cur].conditions.join(', ')||'Keine Zustände eingetragen')}</p><p class="preserve-lines">${esc(S[cur].questNotes||'Keine persönlichen Quest-Notizen')}</p></section>`;
      for (const b of sheetRoot.querySelectorAll('button')) {
        if (!['Kampfmodus','Bogen'].includes(b.textContent.trim())) b.disabled=true;
      }
      for (const e of sheetRoot.querySelectorAll('textarea,input,select')) e.disabled=true;
      for (const e of sheetRoot.querySelectorAll('[onclick].pip')) e.removeAttribute('onclick');
      // The overview table is navigable; database writes remain blocked even if the UI is bypassed.
    }
  };
  function requirePlayer(id) {
    if (state.role==='player' && id===state.char) return true;
    note('Diese Ansicht ist nur lesbar.'); return false;
  }
  for (const name of ['hp','adj','pip','ds','insp','rest','cast']) {
    const wrapped = (...args) => {
      if(!requirePlayer(args[0]))return;
      if(name==='hp'){const value=Number(document.getElementById('amt')?.value);if(!Number.isInteger(value)||value<1||value>9999){note('Bitte eine ganze Zahl zwischen 1 und 9999 eingeben.');return;}}
      return original[name](...args);
    };
    if (name==='hp') hp=wrapped;
    if (name==='adj') adj=wrapped;
    if (name==='pip') pip=wrapped;
    if (name==='ds') ds=wrapped;
    if (name==='insp') insp=wrapped;
    if (name==='rest') rest=wrapped;
    if (name==='cast') cast=wrapped;
  }
  setv = function (el) {if (requirePlayer(cur)) return original.setv(el);};
  tog = function () {if (requirePlayer(cur)) return original.tog();};
  imp = function () {
    if (!requirePlayer(cur)) return;
    try {
      const code=String(document.getElementById('code')?.value||'');
      if (code.length>600000) throw Error('Zu groß');
      const imported=dec(code);
      if (imported?.char!==state.char) throw Error('Falscher Charakter');
      S[state.char]=normalizeSheet(imported,state.char);
      save(state.char);draw();setSt('Sicherung geladen – wird online gespeichert');
    } catch (_) { note('Sicherungscode ungültig oder für einen anderen Charakter.'); }
  };
  async function readPlayer(id){const {data,error}=await api.rpc('sync.character.read',{key:id});if(error)return {error};return {data:data.sheet,version:data.version,error:null};}
  async function loadData(silent=false) {
    if (state.role==='guest' || state.refreshing) return false;
    if (state.role==='player' && (dirty[state.char] || edit)) return false;
    state.refreshing=true;
    try {
      let data,error,version;
      if (state.role==='gm') ({data,error}=await api.rpc('sync.party.read',{}));
      else ({data,error,version}=await readPlayer(state.char));
      if (error) throw error;
      if (state.role==='gm') {
        if (!Array.isArray(data)) throw Error('Ungültige Gruppendaten');
        const all={};
        for (const id of IDS) {
          const row=data.find(x=>x.char_key===id);
          all[id]=normalizeSheet(row?.sheet||{},id);
        }
        S=all;mode='d';isDM=true;mchar='';if (cur!=='all'&&!allowed.has(cur)) cur='all';
      } else {
        if (data===null || typeof data!=='object') throw Error('Ungültige Charakterdaten');
        if(dirty[state.char]||edit)return false;
        const id=state.char;state.versions[id]=version;
        S={[id]:normalizeSheet(data,id)};
        mchar=id;mode='p';isDM=false;cur=id;
      }
      try{state.workspace=await apiWorkspace();}catch{}
      if (!silent) setSt('Online verbunden ✓');
      draw(silent);
      return true;
    } catch (e) { if (!silent) setSt(`Online-Verbindung fehlgeschlagen: ${safeMessage(e)}`); return false; }
    finally { state.refreshing=false; }
  }
  let debounce={};
  save = function (id) {
    if (!requirePlayer(id)) return;
    dirty[id]=1;
    state.revision[id]=(state.revision[id]||0)+1;
    clearTimeout(debounce[id]);
    setSt('Speichern …');
    debounce[id]=setTimeout(()=>persist(id),450);
  };
  async function persist(id) {
    if (state.saving[id] || state.role!=='player' || state.char!==id) return;
    state.saving[id]=true;
    if(state.conflict){state.saving[id]=false;return;}
    if(!state.pending[id])state.pending[id]={revision:state.revision[id],payload:{key:id,version:state.versions[id],sheet:normalizeSheet(S[id],id),request_id:crypto.randomUUID()}};
    const {revision,payload}=state.pending[id];
    try {
      const {data,error}=await api.rpc('sync.character.save',payload);
      if(error)throw error;state.versions[id]=data.version;delete state.pending[id];
      if (revision===state.revision[id]) { delete dirty[id];setSt('Online gespeichert ✓'); }
      else {clearTimeout(debounce[id]);debounce[id]=setTimeout(()=>persist(id),150);}
    } catch (e) {
      if(e.code==='40001'||/Versionskonflikt/.test(e.message||'')){delete state.pending[id];state.conflict=id;showConflict();setSt('Versionskonflikt – Entwurf behalten. Bitte prüfen.');return;}
      setSt(`Nicht gespeichert! ${safeMessage(e)} · neuer Versuch in 10 Sekunden`);
      clearTimeout(debounce[id]);debounce[id]=setTimeout(()=>persist(id),10000);
    } finally { state.saving[id]=false; }
  }
  function showConflict(){
    let el=document.getElementById('syncConflict');if(!el){el=document.createElement('section');el.id='syncConflict';el.className='card';document.getElementById('account').after(el);}
    el.hidden=false;el.innerHTML='<h2>Charakter wurde gleichzeitig geändert</h2><p>Dein Entwurf bleibt hier erhalten. Es wurde nichts überschrieben. Sichere den Entwurf und lade danach den aktuellen Serverstand, um deine Änderungen dort neu einzutragen.</p><button class="b" id="conflictDraft">Lokalen Entwurf anzeigen</button> <button class="b" id="conflictReload">Serverstand laden</button><textarea id="conflictText" aria-label="Lokaler Entwurf zum Kopieren" rows="6" readonly hidden></textarea>';
    document.getElementById('conflictDraft').onclick=()=>{const t=document.getElementById('conflictText');t.value=JSON.stringify(normalizeSheet(S[state.char],state.char),null,2);t.hidden=false;t.focus();t.select();};
    document.getElementById('conflictReload').onclick=async()=>{if(!confirm('Lokalen Entwurf verwerfen und Serverstand laden?'))return;const id=state.char;try{const result=await readPlayer(id);if(result.error)throw result.error;state.versions[id]=result.version;S[id]=normalizeSheet(result.data,id);delete dirty[id];delete state.pending[id];state.conflict=null;el.remove();edit=false;draw();setSt('Aktueller Serverstand geladen ✓');}catch(e){note(safeMessage(e));}};
  }
  function startPolling() {
    if (state.polling) clearInterval(state.polling);
    state.polling=setInterval(() => {
      if (document.visibilityState!=='hidden') loadData(true);
    },30000);
  }
  async function loginInternal(role,id,code,isRestore=false) {
    if (state.busy) return;
    state.busy=true;
    setSt(isRestore?'Gespeicherten Zugang prüfen …':'Online-Zugang prüfen …');
    try {
      if (!isRestore && ((role==='player' && !allowed.has(id)) || !/^[A-Za-z0-9_-]{20,100}$/.test(code))) throw Error('Ungültiger Charaktercode');
      const identity=isRestore?await DND.auth.restore():await DND.auth.signIn(role==='gm'?'gm':id,code);
      if(!identity){setSt('Privaten Zugangscode eingeben.');return;}
      const loginInput=document.getElementById('loginCode');if(loginInput)loginInput.value='';
      role=identity.role==='owner'?'gm':'player'; id=identity.actor==='gm'?'':identity.actor;
      let data,error,version;
      if(role==='gm')({data,error}=await api.rpc('sync.party.read',{}));
      else ({data,error,version}=await readPlayer(id));
      if(error)throw error;
      state.role=role;state.char=id;
      dirty={};edit=false;view='sheet';
      if (role==='gm') {
        S={};for(const key of IDS){const row=data.find(x=>x.char_key===key);S[key]=normalizeSheet(row?.sheet||{},key);}
        isDM=true;mode='d';mchar='';cur='all';
      } else {
        state.versions[id]=version;S={[id]:normalizeSheet(data,id)};
        isDM=false;mode='p';mchar=id;cur=id;
      }
      try{state.workspace=await apiWorkspace();}catch{}
      if(role==='gm'&&!location.hash){location.replace('spieltisch.html');return;}
      startPolling();draw();setSt('Online verbunden ✓');
    } catch (e) {
      if (isRestore) setSt('Gespeicherte Sitzung konnte nicht geladen werden. Bitte erneut anmelden.');
      else note(`Anmeldung fehlgeschlagen: ${safeMessage(e)}`);
      state.role='guest';state.char='';S={};mode='';draw();
    } finally {state.busy=false;}
  }
  const apiWorkspace=()=>DND.api.request('workspace.snapshot',{});
  window.addEventListener('dnd:live-refresh',()=>loadData(true));
  window.addEventListener('hashchange',()=>{edit=false;draw();});
  window.addEventListener('dnd:dice-rolled',event=>{const result=event.detail;if(state.role==='player'&&result.actor_key===state.char&&result.label==='Initiative'&&state.workspace?.session?.id===result.session_id){state.workspace={...state.workspace,initiative:{total:result.total}};draw(true);}});
  window.playerCondition=function(value){if(!requirePlayer(cur)||!value)return;const c=S[cur];if(!DND.player.conditions.includes(value)&&!c.conditions.includes(value))return;c.conditions=c.conditions.includes(value)?c.conditions.filter(x=>x!==value):[...c.conditions,value];c.status=c.conditions.join(', ').slice(0,100)||'bereit';save(cur);draw();};
  window.playerLongRest=()=>{if(confirm('Lange Rast durchführen und die entsprechenden Ressourcen zurücksetzen?'))rest(cur,'l');};
  window.playerSkill=()=>{const skill=SK[Number(document.getElementById('quick-skill').value)];if(skill)roll('1d20'+sg(skb(S[cur],skill,pbOf(S[cur]))[0]),skill[0]);};
  window.playerSave=()=>{const index=Number(document.getElementById('quick-save').value);if(AB[index])roll('1d20'+sg(mod(S[cur].ab[index])+(S[cur].sv[index]?pbOf(S[cur]):0)),'Rettungswurf '+AB[index]);};
  window.playerInitiative=()=>roll('1d20'+sg(mod(S[cur].ab[1])+S[cur].initX),'Initiative');
  window.playerItemNote=()=>{if(!requirePlayer(cur))return;const name=document.getElementById('item-use').value.trim();if(!name)return;S[cur].n+=(S[cur].n?'\n':'')+new Date().toLocaleDateString('de-DE')+': '+name+' verwendet (Bestand manuell prüfen).';save(cur);draw();note('Verwendung im persönlichen Journal notiert.');};
  window.cloudLogin = function () {
    const choice=String(document.getElementById('loginCharacter')?.value||'');
    const code=String(document.getElementById('loginCode')?.value||'').trim();
    if (!choice || !code) {note('Bitte Charakter und privaten Code eingeben.');return;}
    loginInternal(choice==='gm'?'gm':'player',choice==='gm'?'':choice,code);
  };
  window.cloudLogout = async function () {
    if(DND.combat?.allowLogout?.()===false||DND.vtt?.allowLogout?.()===false)return;
    if(Object.keys(dirty).length&&!confirm('Ungespeicherte Änderungen verwerfen und abmelden?'))return;
    try{await DND.auth.logout();}catch{note('Lokal abgemeldet. Server-Widerruf fehlgeschlagen; die Sitzung läuft spätestens nach zwölf Stunden ab.');}
    if (state.polling) clearInterval(state.polling);
    for (const t of Object.values(debounce)) clearTimeout(t);
    state.pending={};state.versions={};state.conflict=null;document.getElementById('syncConflict')?.remove();
    state.role='guest';state.char='';S={};mode='';cur='all';dirty={};draw();
    setSt('Abgemeldet.');
  };
  document.addEventListener('visibilitychange',()=>{
    if (document.visibilityState==='visible') loadData(true);
  });
  window.addEventListener('dnd:session-ended',()=>{clearInterval(state.polling);for(const t of Object.values(debounce))clearTimeout(t);state.pending={};state.versions={};state.conflict=null;document.getElementById('syncConflict')?.remove();state.role='guest';state.char='';S={};dirty={};draw();setSt('Sitzung abgelaufen. Bitte erneut anmelden.');});
  window.addEventListener('beforeunload',event=>{if(Object.keys(dirty).length){event.preventDefault();event.returnValue='';}});
  // Never reuse legacy offline player choice or local player copies without explicit import.
  S={}; mode='';isDM=false;mchar='';cur='all';draw();
  loginInternal('player','','',true);
})();