const AB=["STR","GES","KON","INT","WEI","CHA"];
const SK=[["Akrobatik",1],["Arkane Kunde",3],["Athletik",0],["Auftreten",5],["Einschüchtern",5],["Fingerfertigkeit",1],["Geschichte",3],["Heilkunde",4],["Heimlichkeit",1],["Mit Tieren umgehen",4],["Motiv erkennen",4],["Nachforschungen",3],["Naturkunde",3],["Religion",3],["Täuschen",5],["Überlebenskunst",4],["Überzeugen",5],["Wahrnehmung",4]];
const P=(a,e)=>{const o={};a.forEach(n=>o[n]=1);(e||[]).forEach(n=>o[n]=2);return o};
const base={tmp:0,hdUsed:0,ds:[0,0],insp:0,slU:{},rsU:{},n:"",sa:5,initX:0,joat:0,lvl:3,sv:[0,0,0,0,0,0]};
const D={
len:{...base,name:"Lennox",player:"",cls:"Schurke · Dieb",race:"Drow",bg:"Krimineller",ab:[8,17,13,15,12,10],sv:[0,1,0,1,0,0],sk:P(["Akrobatik","Athletik","Wahrnehmung"],["Fingerfertigkeit","Heimlichkeit"]),ac:13,initX:2,speed:"30 ft",hpMax:21,hp:21,hd:8,
 langs:"Gemeinsprache, Diebessprache, Elfisch · Diebeswerkzeug",
 atk:"Dolch (2×) | +5 | 1W4+3 Stich (Nick; Wurf 20/60)\nSchleichangriff | – | +2W6, 1×/Zug",
 sp:"0: Dancing Lights\n1: Faerie Fire (Drow)",sl:"",rs:"Faerie Fire (Drow) | 1 | lr",
 ft:"Schleichangriff 2W6: 1×/Zug Extraschaden bei Vorteil oder Verbündetem am Ziel.\nRaffinierte Aktion: Bonusaktion Spurt, Rückzug oder Verstecken.\nSteady Aim: Bonusaktion, Vorteil auf nächsten Angriff, wenn du dich nicht bewegt hast.\nDieb: Schnelle Hände und Kletterer.\nWachsam: Initiative + Übungsbonus.\nDrow: Dunkelsicht 120 ft, Feenblut, Trance.",
 gear:"2 Dolche."},
gra:{...base,name:"Grandia Rythna",player:"",cls:"Paladin · Eid der Hingabe",race:"Leonin",bg:"Soldat",ab:[17,10,15,8,12,13],sv:[0,0,0,0,1,1],sk:P(["Athletik","Motiv erkennen","Einschüchtern","Überzeugen"]),ac:16,speed:"35 ft",hpMax:28,hp:28,hd:10,
 langs:"Gemeinsprache, Leonin · Alle Rüstungen, Schilde, Kriegswaffen",
 atk:"Kriegshammer (Hammersberg) | +5 | 1W12+5 Wucht (einhändig, inkl. Duell +2)\nKlauen | +5 | 1W4+3 Hieb\nDivine Smite | – | 2W8 gleißend (+1W8/Stufe)",
 sp:"1: Bless\n1: Cure Wounds\n1: Command\n1: Heroism\n1: Divine Smite (immer)\n1: Shield of Faith (Eid)\n1: Protection from Evil and Good (Eid)",sl:"1 | 3 | lr",
 rs:"Handauflegen (1 Pip = 5 TP) | 3 | lr\nKanalisieren: Göttlichkeit | 2 | sr1\nDaunting Roar (SG 12) | 1 | sr\nPaladin’s Smite gratis | 1 | lr",
 ft:"Handauflegen: Pool 15 TP, Bonusaktion.\nPaladin’s Smite: 1×/lange Rast Divine Smite ohne Zauberplatz.\nKampfstil Duell: +2 Schaden mit einer einhändigen Waffe.\nKanalisieren: Divine Sense, Sacred Weapon (CHA-Bonus auf Treffer, 10 Min).\nLeonin: Dunkelsicht 60 ft, Klauen, Daunting Roar.",
 gear:"Rüstung von Hammersberg (RK 16), Kriegshammer (1W12)."},
sas:{...base,name:"Sashee",player:"",cls:"Barde · Kolleg des Wissens",race:"Wasserelf",bg:"Offen",ab:[8,15,13,10,12,17],sv:[0,1,0,0,0,1],sk:P(["Akrobatik","Motiv erkennen","Täuschen","Wahrnehmung","Heimlichkeit"],["Auftreten","Überzeugen"]),joat:1,ac:12,speed:"30 ft, Schwimmen 30 ft",hpMax:21,hp:21,hd:8,
 langs:"Gemeinsprache, Elfisch · Harfe",
 atk:"Kriegsspeer | +1 | 1W6-1 Stich (zweihändig 1W8-1; Wurf 20/60)\nVicious Mockery | SG 13 | 1W6 psychisch",
 sp:"0: Vicious Mockery\n0: Mage Hand\n1: Healing Word\n1: Dissonant Whispers\n1: Faerie Fire\n1: Thunderwave\n1: Charm Person\n2: Invisibility",sl:"1 | 4 | lr\n2 | 2 | lr",rs:"Bardische Inspiration (W6) | 3 | lr",
 ft:"Bardische Inspiration: W6, Bonusaktion.\nExpertise: Auftreten, Überzeugen.\nJack of All Trades: halber Übungsbonus auf Würfe ohne Übung.\nCutting Words: Reaktion, Inspirationswürfel von gegnerischem Wurf abziehen.\nWasserelf: Schwimmen 30 ft, Wasseratmung (Merkmale abstimmen).",
 gear:"Kriegsspeer, Harfe (Instrument und Zauberfokus)."},
pei:{...base,name:"Peisinoe",player:"",cls:"Hexenmeisterin · Meeresgott",race:"Mensch",bg:"Offen",ab:[8,14,14,10,12,17],sv:[0,0,0,0,1,1],sk:P(["Arkane Kunde","Einschüchtern","Fingerfertigkeit"]),ac:15,speed:"30 ft",hpMax:24,hp:24,hd:8,
 langs:"Gemeinsprache · Leichte Rüstung, einfache Waffen",
 atk:"Eldritch Blast | +5 | 1W10+3 Kraft\nArms of Hadar | SG 13 | 3W6 nekrotisch (Platz Stufe 2)\nHellish Rebuke | SG 13 | 3W10 Feuer (Platz Stufe 2)\nHex | – | +1W6 nekrotisch",
 sp:"0: Eldritch Blast\n0: Mage Hand\n1: Armor of Agathys\n1: Hex\n1: Hellish Rebuke\n1: Arms of Hadar",sl:"2 | 2 | sr",rs:"Meeresschleier (Pip = verbraucht) | 2 | -",
 ft:"Pakt-Magie: 2 Plätze Stufe 2, kurze Rast stellt sie wieder her.\nInvocations: Agonizing Blast, Pact of the Chain, Armor of Shadows.\nPatron Meeresgott: mit dem Spielleiter abstimmen.",
 gear:"Beutel mit 2 Kräutern „Meeresschleier“ (Wirkung noch zu klären). Keine Waffe, keine Rüstung: RK 15 durch Armor of Shadows."}
};
const CB={
len:`Aktion | Dolch (2×) | Nahkampf oder Wurf (20/60 ft). Nick: Der zweite Dolch greift als Teil derselben Aktion an. | 1d20+5 | 1d4+3
Aktion | Schleichangriff | 1×/Zug Extraschaden bei Vorteil oder wenn ein Verbündeter neben dem Ziel steht. | 2d6
Bonusaktion | Raffinierte Aktion | Spurt, Rückzug oder Verstecken. Als Dieb auch Fingerfertigkeit, Gegenstand nutzen, Diebeswerkzeug.
Bonusaktion | Steady Aim | Vorteil auf den nächsten Angriff, wenn du dich diese Runde nicht bewegt hast.
Reaktion | Gelegenheitsangriff | Gegner verlässt deine Reichweite: ein Dolchangriff. | 1d20+5 | 1d4+3
Zauber | Faerie Fire (1×/lange Rast) | 20-ft-Würfel, GES-RW SG 10: Ziele leuchten, Angriffe gegen sie mit Vorteil. Konzentration.
Zauber | Dancing Lights | Zaubertrick: bis zu 4 Lichter, 60 ft; Bewegen per Bonusaktion.`,
gra:`Aktion | Kriegshammer (Hammersberg) | Nahkampf mit Wucht. Einhändig geführt gilt Duell (+2 Schaden), zweihändig nur +3. | 1d20+5 | 1d12+5
Aktion | Klauen | Unbewaffneter Angriff (Hieb). | 1d20+5 | 1d4+3
Bonusaktion | Divine Smite | Direkt nach einem Treffer. Kostet einen Zauberplatz (einmal pro langer Rast gratis). +1W8 gegen Untote und Unholde. | | | 1~2d8~2W8 gleißend;2~3d8~3W8 gleißend
Bonusaktion | Handauflegen | Berührung: bis zu 15 TP aus dem Pool heilen (1 Pip = 5 TP).
Bonusaktion | Daunting Roar | 1×/kurze Rast: 10 ft, WEI-RW SG 12 oder verängstigt bis Ende deiner nächsten Runde.
Bonusaktion | Shield of Faith | +2 RK auf ein Ziel, Konzentration, 10 Min. Höhere Stufe bringt nichts. | | | 1~~+2 RK
Bonusaktion | Sacred Weapon (Kanalisieren) | Waffe leuchtet 10 Min: +1 (CHA) auf Angriffe.
Aktion | Bless | Bis zu 3 Ziele: +1W4 auf Angriffe und Rettungswürfe, Konzentration. Je höherer Stufe ein Ziel mehr. | 1d4 | | 1~~3 Ziele;2~~4 Ziele
Aktion | Cure Wounds | Berührung: Heilung. Jede Platzstufe über 1 gibt +2W8. | | | 1~2d8+1~2W8+1 TP;2~4d8+1~4W8+1 TP
Aktion | Command | Ein Wort als Befehl, WEI-RW SG 11. Je höherer Stufe ein Ziel mehr. | | | 1~~1 Ziel;2~~2 Ziele
Aktion | Divine Sense (Kanalisieren) | Celestials, Unholde und Untote in 60 ft spüren.
Reaktion | Gelegenheitsangriff | Gegner verlässt deine Reichweite. | 1d20+5 | 1d12+5`,
sas:`Aktion | Kriegsspeer | Nahkampf oder Wurf (20/60 ft), zweihändig 1W8. Nutzt STR (nicht finesse). | 1d20+1 | 1d6-1
Aktion | Vicious Mockery | 60 ft, WEI-RW SG 13: 1W6 psychisch und Nachteil auf nächsten Angriff. | | 1d6
Aktion | Faerie Fire | 20-ft-Würfel, GES-RW SG 13: Ziele leuchten, Vorteil auf Angriffe gegen sie. Konzentration. | | | 1~~Wirkt ab Stufe 1
Aktion | Dissonant Whispers | 60 ft, WEI-RW SG 13: Psychischer Schaden (halb bei Erfolg), Ziel flieht. Je Platzstufe +1W6. | | | 1~3d6~3W6 psychisch;2~4d6~4W6 psychisch
Aktion | Thunderwave | 15-ft-Würfel, KON-RW SG 13: Schall, Stoß 10 ft. Je Platzstufe +1W8. | | | 1~2d8~2W8 Schall;2~3d8~3W8 Schall
Aktion | Charm Person | WEI-RW SG 13, bezaubert 1 Std. Je höherer Stufe ein Ziel mehr. | | | 1~~1 Ziel;2~~2 Ziele
Aktion | Invisibility | Berührung: 1 Std. unsichtbar. Konzentration. Braucht Platz Stufe 2. | | | 2~~1 Ziel unsichtbar
Bonusaktion | Healing Word | 60 ft Heilung. Jede Platzstufe über 1 gibt +2W4. | | | 1~2d4+3~2W4+3 TP;2~4d4+3~4W4+3 TP
Bonusaktion | Bardische Inspiration | Verbündeter (60 ft) erhält einen W6, 3×/lange Rast. | | 1d6
Reaktion | Cutting Words | Zieht einen Inspirationswürfel von einem Wurf eines Gegners ab. | | 1d6
Sonstiges | Jack of All Trades | Halber Übungsbonus (+1) auf Würfe ohne Übung.`,
pei:`Aktion | Eldritch Blast | Fernkampfzauber, 120 ft. Bei Stufe 3 noch ein Strahl. | 1d20+5 | 1d10+3
Aktion | Arms of Hadar | Flutwelle aus Finsternis, 10 ft um dich: STR-RW SG 13, halber Schaden bei Erfolg. Betroffene können bis zu ihrem nächsten Zug keine Reaktionen nutzen. | | | 2~3d6~3W6 nekrotisch
Reaktion | Hellish Rebuke | Wenn dich jemand in 60 ft verletzt: GES-RW SG 13 für den Angreifer, halber Schaden bei Erfolg. Als siedendes Meerwasser darstellbar. | | | 2~3d10~3W10 Feuer
Bonusaktion | Hex | Fluch auf ein Ziel, Konzentration: +1W6 nekrotisch bei deinen Treffern, Nachteil auf einen Attributscheck. | | 1d6 | 2~~1 Std. Fluch
Aktion | Armor of Agathys | Temp. TP; Angreifer im Nahkampf erleiden Kälteschaden in gleicher Höhe, solange temp. TP bleiben. | | | 2~~10 temp. TP, 10 Kälteschaden
Aktion | Mage Hand | Zaubertrick: spektrale Hand, 30 ft.
Sonstiges | Pakt-Magie | Dein Zauberplatz ist immer Stufe 2. Zauber der 1. Stufe wirkst du daher ebenfalls auf Stufe 2.
Sonstiges | Meeresschleier (2 Kräuter) | Verbrauchbar. Wirkung mit dem Spielleiter klären.`
};
Object.keys(CB).forEach(k=>D[k].cb=CB[k]);
const IDS=["len","gra","sas","pei"];
const mod=s=>Math.floor((s-10)/2),sg=n=>(n>=0?"+":"")+n,esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pbOf=c=>Math.floor((c.lvl-1)/4)+2;
let db=null,S={},CL={},cur="all",view="sheet",edit=false,timers={},dirty={},me="",isDM=false,advm=0,hist=[];
const clone=o=>JSON.parse(JSON.stringify(o));
function get(id){return S[id]}
function own(id){return S[id]}
function lines(t){return String(t||"").split("\n").map(s=>s.trim()).filter(Boolean)}
function parts(t){return lines(t).map(l=>l.split("|").map(x=>x.trim()))}
function save(id){
 dirty[id]=1;clearTimeout(timers[id]);
 const t=timers[id]=setTimeout(async()=>{
  try{if(db){await db.doc("sheets/"+id).set(clone(S[id]));setSt(isDM?"Gespeichert":"Live gespeichert")}else{localStorage.setItem("i_"+id,JSON.stringify(S[id]));setSt("Nur lokal gespeichert")}}
  catch(e){setSt("Speichern nicht erlaubt – Contributor-Rechte nötig.")}
  if(timers[id]===t)delete dirty[id]},350)}
function rl(f,label){if(window.DND_ONLINE_ROLL){window.DND_ONLINE_ROLL(f,label);return;}const m=/^\s*(\d*)d(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i.exec(f);if(!m)return;
 const n=+m[1]||1,sd=+m[2],mo=m[3]?(m[3]=="-"?-1:1)*(+m[4]):0,R=()=>1+Math.floor(Math.random()*sd);
 let r=[];for(let i=0;i<n;i++)r.push(R());let ex="";
 if(sd==20&&n==1&&advm){const b=R();ex=` (${advm>0?"Vorteil":"Nachteil"}: ${r[0]}, ${b})`;r=[advm>0?Math.max(r[0],b):Math.min(r[0],b)]}
 const sum=r.reduce((a,b)=>a+b,0)+mo,k=sd==20&&n==1?(r[0]==20?" ★ Krit!":r[0]==1?" ✖ Patzer":""):"";
 const t=`${label?label+": ":""}${f.replace(/\s/g,"")} → [${r.join("+")}]${mo?sg(mo):""} = ${sum}${ex}${k}`;
 hist.unshift(t);hist.length=Math.min(hist.length,10);
 document.getElementById("dlog").innerHTML=hist.map((h,i)=>`<div ${i?"":'style="font-weight:700"'}>${esc(h)}</div>`).join("");
 anim(sum,sd,t,k)}
function anim(sum,sd,t,k){
 if(matchMedia('(prefers-reduced-motion:reduce)').matches){const o=document.getElementById('dice');o.style.display='flex';o.firstChild.className='die';o.firstChild.textContent=sum;o.lastChild.textContent=t;clearInterval(o._i);clearTimeout(o._t);o._t=setTimeout(()=>o.style.display='none',2800);return;}
 const o=document.getElementById("dice"),d=o.firstChild,l=o.lastChild;
 clearInterval(o._i);clearTimeout(o._t);o.style.display="flex";l.textContent="";d.className="die roll";d.textContent="";
 o._i=setInterval(()=>{d.textContent=1+Math.floor(Math.random()*sd)},60);
 o._t=setTimeout(()=>{clearInterval(o._i);d.textContent=sum;d.className="die land"+(k.includes("Krit")?" crit":k.includes("Patzer")?" fail":"");l.textContent=t;o._t=setTimeout(()=>o.style.display="none",2800)},800)}
const jsArg=s=>encodeURIComponent(String(s)).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const roll=rl;
function rf(sd){const n=+document.getElementById("dcnt").value||1,mo=+document.getElementById("dmod").value||0;rl(`${n}d${sd}${mo?(mo>0?"+":"")+mo:""}`,"Wurf")}
function setSt(t){document.getElementById("st").textContent=t}
function skb(c,s,pb){const b=mod(c.ab[s[1]]),l=(c.sk||{})[s[0]]||0;
 if(l==2)return[b+2*pb,"●●"];if(l==1)return[b+pb,"●"];if(c.joat)return[b+Math.floor(pb/2),"½"];return[b,""]}
function resourceParts(t){return parts(t).slice(0,30)}
function resourceNotice(c){return [c.sl,c.rs].some(t=>parts(t).length>30||parts(t).some(p=>!Number.isFinite(Number(p[1]))||Number(p[1])>99))?'<p class="note">Die Anzeige ist auf 30 Ressourcenzeilen je Liste und 99 Einheiten je Zeile begrenzt. Die vollständigen Angaben bleiben im Bogen-Text erhalten.</p>':""}
function pips(kind,i,n,used,id){n=Number(n);if(!Number.isFinite(n))return "";n=Math.max(0,Math.min(99,Math.floor(n)));let h="";for(let j=0;j<n;j++)h+=`<button type="button" class="pip ${j<used?"u":""}" aria-label="Ressource ${i+1}, Einheit ${j+1}" aria-pressed="${j<used}" onclick="pip('${id}','${kind}',${i},${j})">${j<used?"−":"+"}</button>`;return h}
function pip(id,k,i,j){const c=own(id),u=c[k][i]||0;c[k][i]=j<u?u-1:u+1;save(id);draw()}
function hp(id,s){const c=own(id);let v=parseInt(document.getElementById("amt").value)||0;if(!v)return;
 if(s<0){const a=Math.min(c.tmp,v);c.tmp-=a;v-=a;c.hp=Math.max(0,c.hp-v)}else c.hp=Math.min(c.hpMax,c.hp+v);save(id);draw()}
function adj(id,k,d,min,max){const c=own(id);c[k]=Math.min(max??1e9,Math.max(min??0,(c[k]||0)+d));save(id);draw()}
function ds(id,t,i){const c=own(id);c.ds[t]=c.ds[t]==i+1?i:i+1;save(id);draw()}
function insp(id){const c=own(id);c.insp=c.insp?0:1;save(id);draw()}
function rest(id,t){const c=own(id);
 parts(c.sl).forEach((p,i)=>{if(t=="l"||p[2]=="sr")c.slU[i]=0});
 parts(c.rs).forEach((p,i)=>{if(t=="l"||p[2]=="sr")c.rsU[i]=0;else if(p[2]=="sr1")c.rsU[i]=Math.max(0,(c.rsU[i]||0)-1)});
 if(t=="l"){c.hp=c.hpMax;c.tmp=0;c.hdUsed=Math.max(0,c.hdUsed-Math.ceil(c.lvl/2));c.ds=[0,0]}save(id);draw()}
function setv(el){const id=cur,c=own(id),k=el.dataset.k.split(".");let v=el.type=="checkbox"?+el.checked:el.type=="number"||el.tagName=="SELECT"?+el.value:el.value;
 let o=c;for(let i=0;i<k.length-1;i++)o=o[k[i]]??(o[k[i]]={});o[k[k.length-1]]=v;save(id)}
function tog(){edit=!edit;draw()}
function f(label,k,v,t){return`<div><label for="field-${k}">${label}</label><input id="field-${k}" class="w" data-k="${k}" type="${t||"text"}" value="${esc(v)}" oninput="setv(this)"></div>`}
function overview(){const ids=Object.keys(S);
 return`<div class="card"><h3>Gruppenübersicht</h3>`+(ids.length?`<table><tr><th>Charakter</th><th>Stufe</th><th>TP</th><th>RK</th><th>Pass. Wahrn.</th><th>Zauberplätze frei</th></tr>`+ids.map(id=>{const c=S[id],pb=pbOf(c),pw=10+skb(c,SK[17],pb)[0];
 const sl=parts(c.sl).map((p,i)=>`${p[0]}: ${(+p[1])-(c.slU[i]||0)}/${p[1]}`).join(", ")||"–";
 return`<tr><td><button type="button" class="character-link" onclick="cur='${id}';draw()"><b>${esc(c.name)}${id.startsWith("tpl_")?" (Vorlage)":""}</b></button><br><small>${esc(c.cls)}${c.player?" · "+esc(c.player):""}</small></td><td>${c.lvl}</td><td>${c.hp}/${c.hpMax}${c.tmp?` (+${c.tmp})`:""}</td><td>${c.ac}</td><td>${pw}</td><td>${esc(sl)}</td></tr>`}).join("")+`</table>`:`<p class="note">Noch hat niemand einen Charakter gewählt.</p>`)+`<p class="note">Spieler schicken dir ihren Code (Button „Code erzeugen“ in ihrem Bogen), den du unten einfügst. So siehst du ihren aktuellen Stand. Jeder Spieler sieht und ändert ausschließlich seinen eigenen.</p></div>${codeCard()}`}
function picker(){return`<div class="card"><h3>Wähle deinen Charakter</h3><div class="grid">`+IDS.map(k=>{const d=D[k],t=CL[k]&&CL[k].uid!=me;return`<div class="act"><b>${esc(d.name)}</b><p>${esc(d.cls)} · ${esc(d.race)}</p><button class="b" ${t?"disabled":""} onclick="claim('${k}')">${t?"Schon vergeben":"Das bin ich"}</button></div>`}).join("")+`</div></div>`}
async function claim(k){try{await db.doc("claims/"+k).set({uid:me});const x=clone(D[k]);x.char=k;await db.doc("sheets/"+me).set(x)}catch(e){setSt("Auswahl nicht möglich – Contributor-Rechte nötig.")}}
function tst(t){const o=document.getElementById("toast");o.textContent=t;o.style.display="block";clearTimeout(o._t);o._t=setTimeout(()=>o.style.display="none",2600)}
function cast(id,l,f,n){const c=own(id),sl=parts(c.sl),i=sl.findIndex(p=>+p[0]==l);if(i<0)return;
 const u=c.slU[i]||0;if(u>=(+sl[i][1]||0))return;c.slU[i]=u+1;save(id);draw();
 if(f)rl(f,n+" (Platz Stufe "+l+")");else tst(n+": Zauberplatz Stufe "+l+" verbraucht")}
function spb(id,c,t,n){if(!t)return"";const sl=parts(c.sl);
 return`<div class="note" style="margin:6px 0 4px">Kostet 1 Zauberplatz. Wirkung je Platzstufe:</div><div class="row">`+t.split(";").map(x=>x.split("~")).filter(x=>x.length>=3).map(([l,f,x])=>{
 const i=sl.findIndex(p=>+p[0]==+l),fr=i<0?0:(+sl[i][1]||0)-(c.slU[i]||0);
 return`<button class="b" ${fr?"":"disabled"} onclick="cast('${id}',${+l},decodeURIComponent('${jsArg(f)}'),decodeURIComponent('${jsArg(n)}'))">Stufe ${esc(l)}: ${esc(x)} <small>(${fr} frei)</small></button>`}).join("")+`</div>`}
function combat(id,c,pb,m){
 const sl=resourceParts(c.sl),rs=resourceParts(c.rs),acts=parts(c.cb||(D[c.char||id]||{}).cb||""),ini=m[1]+c.initX;
 const cats=[...new Set(["Aktion","Bonusaktion","Reaktion","Zauber","Sonstiges",...acts.map(a=>a[0])])];
 const g=cats.map(k=>{const l=acts.filter(a=>a[0]==k);return l.length?`<div class="cat">${esc(k)}</div>`+l.map(a=>`<div class="act"><b>${esc(a[1])}</b><p>${esc(a[2])}</p><div class="row">${[a[3],a[4]].filter(Boolean).map(r=>`<button class="b" onclick="roll(decodeURIComponent('${jsArg(r)}'),decodeURIComponent('${jsArg(a[1])}'))">🎲 ${esc(r)}</button>`).join("")}</div>${spb(id,c,a[5],a[1])}</div>`).join(""):""}).join("");
 return`<div class="card"><div class="row" style="justify-content:space-between"><b style="font-size:24px">${c.hp}/${c.hpMax} TP${c.tmp?` <span style="color:var(--acc)">+${c.tmp}</span>`:""}</b><span>RK <b>${c.ac}</b></span></div><div class="bar"><i style="width:${Math.round(c.hp/c.hpMax*100)}%"></i></div>
 <div class="row"><input aria-label="Lebenspunkte ändern um" id="amt" class="n" type="number" min="0" placeholder="Zahl"><button class="b" onclick="hp('${id}',-1)">Schaden</button><button class="b" onclick="hp('${id}',1)">Heilen</button><button class="b" onclick="roll('1d20${sg(ini)}','Initiative')">Initiative ${sg(ini)}</button><button class="b" onclick="roll('1d20','Todesrettung')">Todesrettung</button></div>
 ${resourceNotice(c)}<div style="margin-top:6px">${sl.map((p,i)=>`<div class="ln"><span>Zauberplätze Stufe ${esc(p[0])}</span><span>${pips("slU",i,+p[1]||0,c.slU[i]||0,id)}</span></div>`).join("")}${rs.map((p,i)=>`<div class="ln"><span>${esc(p[0])}</span><span>${pips("rsU",i,+p[1]||0,c.rsU[i]||0,id)}</span></div>`).join("")}</div></div>`+g}
function sheet(id){
 const c=get(id),pb=pbOf(c),m=c.ab.map(mod),pw=10+skb(c,SK[17],pb)[0],pct=Math.round(c.hp/c.hpMax*100);
 const sk=SK.map(k=>{const [b,t]=skb(c,k,pb);return`<${edit?'div':'button type="button"'} class="ln" ${edit?"":`style="cursor:pointer" onclick="roll('1d20${sg(b)}','${k[0]}')"`}><span>${t?`<em>${t}</em>`:""}${k[0]} <small>(${AB[k[1]]})</small></span>${edit?`<select aria-label="${k[0]}: Übung" data-k="sk.${k[0]}" onchange="setv(this)">${["–","geübt","Expertise"].map((x,i)=>`<option value="${i}" ${((c.sk||{})[k[0]]||0)==i?"selected":""}>${x}</option>`).join("")}</select>`:`<b>${sg(b)}</b>`}</${edit?'div':'button'}>`}).join("");
 const sv=AB.map((a,i)=>`<${edit?'div':'button type="button"'} class="ln" ${edit?"":`style="cursor:pointer" onclick="roll('1d20${sg(m[i]+(c.sv[i]?pb:0))}','RW ${a}')"`}><span>${c.sv[i]?"<em>●</em>":""}${a}</span>${edit?`<input aria-label="Rettungswurf ${a}: geübt" type="checkbox" data-k="sv.${i}" ${c.sv[i]?"checked":""} onchange="setv(this)">`:`<b>${sg(m[i]+(c.sv[i]?pb:0))}</b>`}</${edit?'div':'button'}>`).join("");
 const spP=parts(c.sp.replace(/:/g,"|")),has=spP.length>0,sa=c.sa??5;
 const spl=l=>spP.filter(p=>p[0]==l).map(p=>p[1]).filter(Boolean);
 const slots=resourceParts(c.sl),res=resourceParts(c.rs);
 const head=`<div class="card"><div class="row" style="justify-content:space-between"><div><h2 class="name">${esc(c.name)}</h2><div class="sub">${esc(c.cls)} · Stufe ${c.lvl} · ${esc(c.race)} · ${esc(c.bg)}${c.player?` · ${esc(c.player)}`:""}</div></div>
 <div class="row"><button class="b" onclick="insp('${id}')">${c.insp?"★":"☆"} Inspiration</button><button class="b" onclick="rest('${id}','s')">Kurze Rast</button><button class="b" onclick="rest('${id}','l')">Lange Rast</button><button class="b" onclick="view=view=='cb'?'sheet':'cb';edit=false;draw()">${view=="cb"?"Bogen":"Kampfmodus"}</button><button class="b" onclick="tog()">${edit?"Fertig":"Bearbeiten"}</button></div></div></div>`;
 if(view=="cb"&&!edit)return head+combat(id,c,pb,m);
 const editor=edit?`<div class="card"><h3>Stammdaten bearbeiten</h3><div class="ed">${f("Name","name",c.name)}${f("Spieler/in","player",c.player)}${f("Klasse / Unterklasse","cls",c.cls)}${f("Volk","race",c.race)}${f("Hintergrund","bg",c.bg)}${f("Stufe","lvl",c.lvl,"number")}${f("Rüstungsklasse","ac",c.ac,"number")}${f("Initiative-Extra","initX",c.initX,"number")}${f("Bewegungsrate","speed",c.speed)}${f("TP Maximum","hpMax",c.hpMax,"number")}${f("Trefferwürfel (Seiten)","hd",c.hd,"number")}${f("Jack of All Trades (1/0)","joat",c.joat,"number")}
 <div><label for="field-sa">Zauberattribut</label><select id="field-sa" data-k="sa" onchange="setv(this)">${AB.map((a,i)=>`<option value="${i}" ${sa==i?"selected":""}>${a}</option>`).join("")}</select></div></div>
 <div class="ed" style="margin-top:8px">${c.ab.map((a,i)=>f(AB[i],"ab."+i,a,"number")).join("")}</div></div>`:"";
 const txt=(label,k,hint)=>`<div class="card"><h3>${label}</h3>${edit?`<textarea aria-label="${label}" data-k="${k}" oninput="setv(this)">${esc(c[k])}</textarea><div class="note">${hint}</div>`:""}</div>`;
 return head+editor+`<div class="card"><div class="abs">${c.ab.map((a,i)=>`<div class="ab"><small>${AB[i]}</small><b>${sg(m[i])}</b><small>${a}</small></div>`).join("")}</div></div>
 <div class="card"><div class="stats"><div class="st"><small>Rüstungsklasse</small><b>${c.ac}</b></div><div class="st"><small>Initiative</small><b>${sg(m[1]+c.initX)}</b></div><div class="st"><small>Übungsbonus</small><b>${sg(pb)}</b></div><div class="st"><small>Passive Wahrn.</small><b>${pw}</b></div><div class="st" style="grid-column:span 2"><small>Bewegungsrate</small><b style="font-size:15px">${esc(c.speed)}</b></div></div></div>
 <div class="grid"><div>
 <div class="card"><h3>Lebenspunkte</h3><div class="hp">${c.hp}<span style="font-size:18px;color:var(--mut)"> / ${c.hpMax}</span>${c.tmp?`<span style="font-size:16px;color:var(--acc)"> +${c.tmp} temp</span>`:""}</div><div class="bar"><i style="width:${pct}%"></i></div>
 <div class="row"><input aria-label="Lebenspunkte ändern um" id="amt" class="n" type="number" min="0" placeholder="Zahl"><button class="b" onclick="hp('${id}',-1)">Schaden</button><button class="b" onclick="hp('${id}',1)">Heilen</button><button class="b" onclick="adj('${id}','tmp',1)">+1 temp</button><button class="b" onclick="adj('${id}','tmp',-1)">−1 temp</button></div>
 <div class="row" style="margin-top:8px"><span class="note">Trefferwürfel ${c.lvl}W${c.hd}: ${c.lvl-c.hdUsed} übrig</span><button class="b" onclick="adj('${id}','hdUsed',1,0,${c.lvl})">verbraucht</button><button class="b" onclick="adj('${id}','hdUsed',-1,0,${c.lvl})">zurück</button></div>
 <div style="margin-top:8px"><span class="note">Todesrettungen Erfolge</span> ${[0,1,2].map(i=>`<button type="button" class="pip ${c.ds[0]>i?"u":""}" aria-label="Todesrettung Erfolg ${i+1}" aria-pressed="${c.ds[0]>i}" onclick="ds('${id}',0,${i})">${c.ds[0]>i?"✓":"+"}</button>`).join("")} <span class="note">Fehlschläge</span> ${[0,1,2].map(i=>`<button type="button" class="pip ${c.ds[1]>i?"u":""}" aria-label="Todesrettung Fehlschlag ${i+1}" aria-pressed="${c.ds[1]>i}" onclick="ds('${id}',1,${i})">${c.ds[1]>i?"×":"+"}</button>`).join("")}</div></div>
 ${slots.length||res.length?`<div class="card"><h3>Ressourcen</h3>${resourceNotice(c)}${slots.map((p,i)=>`<div class="ln"><span>Zauberplätze Stufe ${esc(p[0])}</span><span>${pips("slU",i,+p[1]||0,c.slU[i]||0,id)}</span></div>`).join("")}${res.map((p,i)=>`<div class="ln"><span>${esc(p[0])}</span><span>${pips("rsU",i,+p[1]||0,c.rsU[i]||0,id)}</span></div>`).join("")}</div>`:""}
 <div class="card"><h3>Angriffe</h3><table><tr><th>Name</th><th>Treffer</th><th>Schaden</th></tr>${parts(c.atk).map(a=>`<tr><td>${esc(a[0])}</td><td>${esc(a[1])}</td><td>${esc(a[2])}</td></tr>`).join("")}</table></div>
 <div class="card"><h3>Rettungswürfe</h3>${sv}</div></div><div>
 <div class="card"><h3>Fertigkeiten</h3>${sk}<div class="note" style="margin-top:6px">● geübt · ●● Expertise${c.joat?" · ½ Jack of All Trades":""}</div></div>
 ${has?`<div class="card"><h3>Zauber · SG ${8+pb+m[sa]} · Angriff ${sg(pb+m[sa])} · ${AB[sa]}</h3>${spl("0").length?`<div class="note">Zaubertricks</div>${spl("0").map(x=>`<span class="tag">${esc(x)}</span>`).join("")}`:""}${[1,2,3,4,5,6,7,8,9].map(l=>spl(String(l)).length?`<div class="note" style="margin-top:6px">Stufe ${l}</div>${spl(String(l)).map(x=>`<div class="ln"><span style="color:var(--ink)">${esc(x)}</span></div>`).join("")}`:"").join("")}</div>`:""}
 </div></div>`+
 (edit?txt("Angriffe","atk","Pro Zeile: Name | Bonus | Schaden")+txt("Zauber","sp","Pro Zeile: Stufe: Name (0 = Zaubertrick)")+txt("Zauberplätze","sl","Pro Zeile: Stufe | Anzahl | lr (lange Rast) oder sr (kurze Rast)")+txt("Klassenressourcen","rs","Pro Zeile: Name | Anzahl | lr, sr oder sr1 (1 Anwendung pro kurzer Rast)")+txt("Kampfaktionen","cb","Pro Zeile: Kategorie | Name | Beschreibung | Wurf 1 | Wurf 2 | Platzstufen (Würfe optional, z. B. 1d20+5; Platzstufen z. B. 1~2d8~2W8 Schaden;2~3d8~3W8 Schaden)")+txt("Sprachen & Übungen","langs",""):"")+
 `<div class="card"><h3>Merkmale</h3>${edit?`<textarea aria-label="Merkmale" data-k="ft" oninput="setv(this)">${esc(c.ft)}</textarea><div class="note">Pro Zeile ein Merkmal, z. B. Neues Talent oder Level-4-Feature.</div>`:lines(c.ft).map(l=>{const i=l.indexOf(":");return i>0&&i<45?`<p class="f"><b>${esc(l.slice(0,i))}:</b>${esc(l.slice(i+1))}</p>`:`<p class="f">${esc(l)}</p>`}).join("")}</div>
 ${edit?"":`<div class="card"><h3>Sprachen &amp; Übungen</h3><div class="note">${esc(c.langs)}</div></div>`}
 <div class="card"><h3>Ausrüstung &amp; Items</h3>${edit?`<textarea aria-label="Ausrüstung und Items" data-k="gear" oninput="setv(this)">${esc(c.gear)}</textarea>`:`<div style="white-space:pre-wrap">${esc(c.gear)}</div>`}</div>
 <div class="card"><h3>Notizen</h3><textarea aria-label="Notizen" data-k="n" oninput="setv(this)" placeholder="Hintergrund, Bindungen, Session-Notizen …">${esc(c.n)}</textarea></div>${codeCard()}`}
function draw(soft){
 const a=document.activeElement;if(soft&&a&&a.closest&&a.closest("#sheet")&&/INPUT|TEXTAREA/.test(a.tagName)&&a.id!="amt")return;
 const ids=Object.keys(S),nav=document.getElementById("nav"),sh=document.getElementById("sheet");
 if(!mode){nav.innerHTML="";sh.innerHTML=chooser();return}
 if(isDM)nav.innerHTML=`<button class="${cur=="all"?"on":""}" onclick="cur='all';draw()">Übersicht</button>`+ids.map(id=>`<button class="${id==cur?"on":""}" onclick="cur='${id}';edit=false;draw()">${esc(S[id].name)}${id.startsWith("tpl_")?" (Vorlage)":""}</button>`).join("");else nav.innerHTML="";
 if(!isDM){if(!ids.length){sh.innerHTML=db?picker():"";return}cur=ids[0]}
 else if(cur!="all"&&!S[cur])cur="all";
 sh.innerHTML=cur=="all"?overview():sheet(cur)}
let mode="",mchar="";
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k)||"";localStorage.setItem(k,v)}catch(e){return ""}};
function enc(o){return btoa(unescape(encodeURIComponent(JSON.stringify(o))))}
function dec(t){return JSON.parse(decodeURIComponent(escape(atob(t.trim()))))}
function codeCard(){return`<div class="card"><h3>Stand sichern &amp; weitergeben</h3><div class="note">Mit dem Code kann ein Stand auf ein anderes Gerät oder zum Spielleiter. Alles wird sonst nur in diesem Browser gespeichert.</div><textarea aria-label="Charaktercode für Sicherung und Import" id="code" placeholder="Code hier einfügen"></textarea><div class="row">${S[cur]?`<button class="b" onclick="mk()">Code erzeugen &amp; kopieren</button>`:""}<button class="b" onclick="imp()">Code laden</button></div></div>`}
function mk(){if(!S[cur])return;const c=document.getElementById("code");c.value=enc(S[cur]);c.select();try{navigator.clipboard.writeText(c.value);setSt("Code kopiert")}catch(e){setSt("Code markieren und kopieren")}}
function imp(){try{const c=dec(document.getElementById("code").value),k=c.char;if(!IDS.includes(k)||(!isDM&&k!=mchar))throw 0;S[k]=c;save(k);cur=isDM?k:cur;draw();setSt("Code geladen")}catch(e){setSt("Code ungültig oder gehört zu einem anderen Charakter")}}
function chooser(){return`<div class="card"><h3>Wer bist du?</h3><div class="grid">`+IDS.map(k=>`<div class="act"><b>${esc(D[k].name)}</b><p>${esc(D[k].cls)} · ${esc(D[k].race)}</p><button class="b" onclick="pick('${k}')">Das bin ich</button></div>`).join("")+`</div><p class="note" style="margin-top:10px">Spielleiter? <button class="b" onclick="ls('mode','d');start()">Spielleiter-Ansicht</button></p></div>`}
function pick(k){ls("mode","p");ls("mchar",k);start()}
function load(k){let x=null;try{x=JSON.parse(ls("i_"+k))}catch(e){}x=x||clone(D[k]);x.char=k;S[k]=x}
function start(){mode=ls("mode");mchar=ls("mchar");S={};
 if(mode=="d"){isDM=true;IDS.forEach(load);cur="all"}else if(mode=="p"&&IDS.includes(mchar)){isDM=false;load(mchar);cur=mchar}else mode="";
 draw()}
// Online entry initializes after server identity verification.
