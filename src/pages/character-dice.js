document.addEventListener('DOMContentLoaded', () => {
/* Uses the existing character-sheet dice buttons, but delegates the actual dice roll
   to a trusted Supabase RPC while a player or GM is signed in. */
(() => {
  'use strict';
  const api=DND.api;
  let pending=false;
  const status=message=>{try{setSt(message);tst(message);}catch{}};
  window.DND_ONLINE_ROLL=async (formula,label)=>{
    if(pending)return;
    if(!DND.auth.identity()){status('Bitte zuerst mit deinem privaten Code anmelden.');return;}
    const f=String(formula||'').replace(/\s/g,'').toLowerCase();
    const name=String(label||'Freier Wurf').slice(0,100);
    const advantage=(/^1?d20(?:[+-]\d+)?$/.test(f)&&typeof advm!=='undefined')?Number(advm)||0:0;
    pending=true;status('Wurf wird sicher auf dem Server erzeugt …');
    try{
      const {data,error}=await api.rpc('dnd_roll',{
        p_formula:f,p_label:name||'Freier Wurf',
        p_visibility:'public',p_request_id:crypto.randomUUID(),p_adv:advantage
      });
      if(error)throw error;
      const raw=Array.isArray(data.individual_rolls)?data.individual_rolls:[];
      const chosen=Array.isArray(data.chosen_rolls)?data.chosen_rolls:raw;
      const faces=Number(data.faces)||20,bonus=Number(data.modifier)||0,total=Number(data.total)||0;
      const resultType=faces===20&&chosen.length===1?(chosen[0]===20?' ★ Krit!':chosen[0]===1?' ✖ Patzer':''):'';
      const details=`${name}: ${data.formula} → [${raw.join(', ')}]${bonus?' ('+(bonus>0?'+':'')+bonus+')':''} = ${total}${resultType}`;
      hist.unshift(details);hist.length=Math.min(hist.length,10);
      const log=document.getElementById('dlog');
      if(log)log.innerHTML=hist.map(x=>`<div>${esc(x)}</div>`).join('');
      anim(total,faces,details,resultType);
      setSt('Wurf für alle Spieler gespeichert ✓');
      window.dispatchEvent(new CustomEvent('dnd:dice-rolled',{detail:data}));
      return data;
    }catch(e){
      const message=String(e?.message||'Unbekannter Fehler');
      status(/Sitzung starten|Spielleiter muss Sitzung starten/.test(message)?'Noch keine aktive Spielsitzung. Bitte den Spielleiter starten lassen.':
        'Live-Wurf fehlgeschlagen: '+message.slice(0,120));
    }finally{pending=false;}
  };
})();

});
