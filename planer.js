(()=>{
const R=window.REZEPTE,$=s=>document.querySelector(s);
const norm=s=>s.toLowerCase().replace(/ß/g,'ss').normalize('NFD').replace(/[̀-ͯ]/g,'');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const S={get(k,d){try{return JSON.parse(localStorage.getItem('rz.'+k))??d}catch{return d}},set(k,v){try{localStorage.setItem('rz.'+k,JSON.stringify(v))}catch{}}};
const cand=R.filter(r=>r.gar||r.dampfbar);
const pad=n=>String(n).padStart(2,'0');
const hm=ms=>{const d=new Date(ms);return pad(d.getHours())+':'+pad(d.getMinutes())};
const mmss=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return(h?h+':'+pad(m):m)+':'+pad(s%60)};
let tab=S.get('tab','plan'),items=S.get('items',[]),run=S.get('run',null),mute=S.get('mute',false),wl=null;
const root=document.createElement('section');root.id='planer';
root.innerHTML='<details open><summary><span>Dampfgar-Planer<small>Was kochst du? Ich sage dir wann was rein muss · Stoppuhr · Timer</small></span></summary><div class="in"><div class="tabs" id="pl-tabs"></div><div id="pl-body"></div></div></details>';
const top=document.querySelector('.app-top');top.parentNode.insertBefore(root,top);
const det=root.querySelector('details');det.open=!!run;
function tabs(){$('#pl-tabs').innerHTML=[['plan','Planer'],['sw','Stoppuhr'],['tm','Timer']].map(([k,l])=>`<button class="tab" data-tab="${k}" aria-pressed="${tab===k}">${l}</button>`).join('')}
function draw(){tabs();$('#pl-body').innerHTML=tab==='plan'?(run?drawRun():drawPlan()):tab==='sw'?drawSw():drawTm();bind()}
// ---------- Plan
function defaults(r){const g=r.gar||{};return{id:r.id,titel:r.titel,temp:g.temp||100,feuchte:g.feuchte??(r.dampfbar?100:0),min:g.min||r.minuten||30,satz:g.satz||r.geraet||''}}
function drawPlan(){
 return`<p style="margin:0 0 10px;color:var(--mut)">Wähle, was du kochen willst. Der Planer sagt dir, wie du das Gerät einstellst und wann was hinein muss.</p>
 <div class="pl-pick"><input id="pl-q" type="search" placeholder="Gericht hinzufügen … (z. B. Reis, Knödel, Gemüse)" autocomplete="off"><div class="pl-res" id="pl-res" hidden></div></div>
 ${items.length?items.map((it,i)=>`<div class="row"><b>${esc(it.titel)}</b><span class="sm">${it.temp} °C${+it.feuchte?` · ${it.feuchte} %`:''} · ${it.min} Min.</span><button class="x" data-rm="${i}" aria-label="Entfernen">×</button>
  <details class="ed"><summary>Werte ändern</summary><div class="edg"><label>Temp. °C<input type="number" data-f="temp" data-i="${i}" value="${it.temp}" inputmode="numeric"></label>
  <label>Feuchte %<input type="number" data-f="feuchte" data-i="${i}" value="${it.feuchte}" inputmode="numeric"></label><label>Minuten<input type="number" data-f="min" data-i="${i}" value="${it.min}" inputmode="numeric"></label></div>
  <div class="why">Laut Rezept: ${esc(it.satz||'–')}</div></details></div>`).join(''):'<p class="note" style="margin-top:12px">Noch nichts gewählt.</p>'}
 ${items.length?`<div class="rowbtn" style="align-items:end"><label style="display:grid;font-size:13px;color:var(--mut)">Fertig um (optional)<input type="time" id="pl-end" value="${S.get('end','')}" style="width:130px"></label>
 <button class="btn" id="pl-go">Plan starten</button><button class="chip" id="pl-prev">Nur Ablauf ansehen</button></div><div id="pl-out"></div>`:''}`}
function plan(startAt){
 const g={};items.forEach(it=>{const k=it.temp+'|'+(it.feuchte||0);(g[k]=g[k]||[]).push(it)});
 const groups=Object.values(g).sort((a,b)=>a[0].temp-b[0].temp);
 let t=0;const ev=[],stages=[];
 groups.forEach((G,gi)=>{const dur=Math.max(...G.map(x=>+x.min||0));const s0=t;
  stages.push({temp:G[0].temp,feuchte:G[0].feuchte,start:s0,dur,names:G.map(x=>x.titel)});
  ev.push({at:s0,type:'setup',text:`Gerät einstellen: ${G[0].temp} °C${+G[0].feuchte?`, ${G[0].feuchte} % Feuchte`:''} – vorheizen${gi?' (vorherige Gerichte vorher herausnehmen)':''}`});
  G.sort((a,b)=>b.min-a.min).forEach(x=>ev.push({at:s0+(dur-x.min),type:'in',text:`${x.titel} ins Gerät (${x.min} Min.)`}));
  G.forEach(x=>ev.push({at:s0+dur,type:'out',text:`${x.titel} fertig – herausnehmen`}));
  t=s0+dur});
 // gleiche Zeitpunkte: setup vor in vor out
 const ord={setup:0,in:1,out:2};ev.sort((a,b)=>a.at-b.at||ord[a.type]-ord[b.type]);
 // 'out' mehrerer Gerichte zusammenfassen
 return{ev,total:t,stages,warn:groups.length>1}}
function preview(){const p=plan();const end=$('#pl-end').value;S.set('end',end);
 let base=null;if(end){const[h,m]=end.split(':').map(Number),d=new Date();d.setHours(h,m,0,0);if(d<Date.now())d.setDate(d.getDate()+1);base=d.getTime()-p.total*60000}
 $('#pl-out').innerHTML=(p.warn?'<div class="warn">Die Gerichte brauchen unterschiedliche Temperaturen. Sie laufen deshalb nacheinander. Ganz gleiche Temperatur spart Zeit.</div>':'')+
  `<div class="setup"><b>Gesamtdauer: ${p.total} Min.</b>${base?` · Starten um <b>${hm(base)}</b>`:''}</div><ul class="tl">${p.ev.map(e=>`<li><span class="t">${base?hm(base+e.at*60000):'+'+e.at+' Min.'}</span>${esc(e.text)}</li>`).join('')}</ul>`}
function start(){const p=plan(),end=$('#pl-end').value;S.set('end',end);let t0=Date.now();
 if(end){const[h,m]=end.split(':').map(Number),d=new Date();d.setHours(h,m,0,0);if(d<Date.now())d.setDate(d.getDate()+1);t0=d.getTime()-p.total*60000}
 if(end)run={t0,total:p.total,ev:p.ev.map(e=>({...e,ms:t0+e.at*60000,seen:false})),end:t0+p.total*60000};
 else{const s0=p.stages[0];run={pre:true,p0:Date.now(),total:p.total,evRel:p.ev,temp:s0.temp,feuchte:s0.feuchte,names:p.ev.filter(e=>e.type==='in').map(e=>e.text)};}
 S.set('run',run);
 if('Notification'in window&&Notification.permission==='default')Notification.requestPermission();
 wake();draw()}
// ---------- Lauf
function preheatDone(){const t0=Date.now();run.pre=false;run.t0=t0;run.ev=run.evRel.map(e=>({...e,ms:t0+e.at*60000,seen:e.type==='setup'&&e.at===0}));run.end=t0+run.total*60000;delete run.evRel;S.set('run',run);alarmUntil=0;draw()}
function drawRun(){return`<div id="rn"></div><div class="rowbtn"><button class="chip" id="rn-mute" aria-pressed="${mute}">Ton ${mute?'aus':'an'}</button><button class="chip" id="rn-stop">Beenden</button></div>`}
function beep(){if(mute)return;try{const c=new (window.AudioContext||window.webkitAudioContext)();[0,.25,.5].forEach(d=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=880;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.2,c.currentTime+d);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d+.2);o.start(c.currentTime+d);o.stop(c.currentTime+d+.22)})}catch{}}
function alarm(text){beep();navigator.vibrate&&navigator.vibrate([300,150,300]);try{if(Notification.permission==='granted')new Notification('Rezepte',{body:text})}catch{}}
let alarmUntil=0,alarmText='';
function tickRun(){const el=$('#rn');if(!el||!run)return;const now=Date.now();
 if(run.pre){if(!el.dataset.pre){el.dataset.pre='1';el.innerHTML=`<div class="cur"><b>Gerät vorheizen</b><br>Auf <b>${run.temp} °C</b>${+run.feuchte?` und <b>${run.feuchte} % Dampf</b>`:''} einstellen und aufheizen lassen.<div class="big" id="pre-t">0:00</div><div class="pre-s">Vorheizen seit dieser Zeit. Der Timer läuft noch nicht.</div></div><div class="rowbtn"><button class="btn" id="pre-ok">Gerät ist vorgeheizt – Timer starten</button></div><p>Danach geht es los mit: ${run.names.map(esc).join('; ')}</p>`}
  const t=$('#pre-t');if(t)t.textContent=mmss((now-run.p0)/1000);return}
 run.ev.forEach(e=>{if(!e.seen&&now>=e.ms){e.seen=true;alarmUntil=now+8000;alarmText=e.text;alarm(e.text);S.set('run',run)}});
 const next=run.ev.find(e=>e.ms>now),fin=now>=run.end;
 if(now<run.ms0&&0){}
 const waiting=now<run.t0;
 el.innerHTML=`${now<alarmUntil?`<div class="cur alarm">${esc(alarmText)}</div>`:''}
  <div class="setup">${waiting?`Start um <b>${hm(run.t0)}</b> – noch ${mmss((run.t0-now)/1000)}`:fin?'<b>Alles fertig. Guten Appetit!</b>':`Gesamt noch <b>${mmss((run.end-now)/1000)}</b> · fertig um <b>${hm(run.end)}</b>`}</div>
  ${!fin&&next?`<div class="cur">Als Nächstes: <b>${esc(next.text)}</b><div class="big">${mmss((next.ms-now)/1000)}</div></div>`:''}
  <ul class="tl">${run.ev.map(e=>`<li class="${e.ms<=now?'done':e===next?'now':''}"><span class="t">${hm(e.ms)}</span>${esc(e.text)}</li>`).join('')}</ul>`}
async function wake(){try{wl=await navigator.wakeLock.request('screen')}catch{}}
// ---------- Stoppuhr
let sw=S.get('sw',{run:false,t0:0,acc:0,laps:[]});
const swNow=()=>sw.acc+(sw.run?Date.now()-sw.t0:0);
function drawSw(){return`<div class="big" id="sw-t">0:00.0</div><div class="rowbtn" style="justify-content:center"><button class="btn" id="sw-go">${sw.run?'Stopp':'Start'}</button><button class="chip" id="sw-lap">Runde</button><button class="chip" id="sw-rs">Zurücksetzen</button></div><ol class="sw-laps" id="sw-l"></ol>`}
const fmtSw=ms=>{const s=ms/1000,m=Math.floor(s/60);return m+':'+pad(Math.floor(s%60))+'.'+Math.floor(s*10%10)};
function tickSw(){const e=$('#sw-t');if(!e)return;e.textContent=fmtSw(swNow());$('#sw-l').innerHTML=sw.laps.map(l=>`<li>${fmtSw(l)}</li>`).reverse().join('')}
// ---------- Timer
let tm=S.get('tm',{end:0,len:0,fired:true});
function drawTm(){return`<div class="big" id="tm-t">${tm.end&&!tm.fired?'':'0:00'}</div><div class="rowbtn" style="justify-content:center">${[1,5,10,15,20,30,45,60].map(m=>`<button class="chip" data-tm="${m}">${m} Min.</button>`).join('')}</div><div class="rowbtn" style="justify-content:center"><input type="number" id="tm-c" min="1" placeholder="Minuten" style="width:110px" inputmode="numeric"><button class="btn" id="tm-s">Timer starten</button><button class="chip" id="tm-x">Stopp</button></div>`}
function tickTm(){const e=$('#tm-t');if(!tm.end)return;const left=(tm.end-Date.now())/1000;if(e)e.textContent=left>0?mmss(left):'0:00';if(left<=0&&!tm.fired){tm.fired=true;S.set('tm',tm);alarm('Timer abgelaufen');alarmUntil=Date.now()+8000;alarmText='Timer abgelaufen'}}
// ---------- Events
function bind(){
 const q=$('#pl-q');if(q){q.oninput=()=>{const w=norm(q.value).split(/\s+/).filter(Boolean),b=$('#pl-res');if(!w.length){b.hidden=true;return}
   const L=cand.filter(r=>w.every(x=>norm(r.titel+' '+r.kategorie).includes(x))).slice(0,12);b.hidden=!L.length;
   b.innerHTML=L.map(r=>`<button data-add="${r.id}">${esc(r.titel)} <small>${esc(r.kategorie)}</small></button>`).join('')};
  q.onfocus=()=>{if(!q.value){const b=$('#pl-res');b.hidden=false;b.innerHTML=cand.slice(0,12).map(r=>`<button data-add="${r.id}">${esc(r.titel)} <small>${esc(r.kategorie)}</small></button>`).join('')}}}
}
document.addEventListener('click',e=>{
 const t=e.target,c=s=>t.closest(s);
 if(!c('#planer')){const b=$('#pl-res');if(b)b.hidden=true;return}
 let x;
 if(x=c('[data-tab]')){tab=x.dataset.tab;S.set('tab',tab);draw();return}
 if(x=c('[data-add]')){const r=R.find(r=>r.id==x.dataset.add);items.push(defaults(r));S.set('items',items);draw();return}
 if(x=c('[data-rm]')){items.splice(+x.dataset.rm,1);S.set('items',items);draw();return}
 if(c('#pl-go')){start();return}
 if(c('#pl-prev')){preview();return}
 if(c('#pre-ok')){preheatDone();return}
 if(c('#rn-stop')){run=null;S.set('run',null);try{wl&&wl.release()}catch{};draw();return}
 if(c('#rn-mute')){mute=!mute;S.set('mute',mute);draw();return}
 if(c('#sw-go')){if(sw.run){sw.acc+=Date.now()-sw.t0;sw.run=false}else{sw.t0=Date.now();sw.run=true;wake()}S.set('sw',sw);draw();return}
 if(c('#sw-lap')){if(sw.run||sw.acc){sw.laps.push(swNow());S.set('sw',sw);tickSw()}return}
 if(c('#sw-rs')){sw={run:false,t0:0,acc:0,laps:[]};S.set('sw',sw);draw();return}
 if(x=c('[data-tm]')){tm={end:Date.now()+x.dataset.tm*60000,fired:false};S.set('tm',tm);wake();draw();return}
 if(c('#tm-s')){const m=+$('#tm-c').value;if(m>0){tm={end:Date.now()+m*60000,fired:false};S.set('tm',tm);wake();draw()}return}
 if(c('#tm-x')){tm={end:0,fired:true};S.set('tm',tm);draw();return}
});
document.addEventListener('change',e=>{const f=e.target.dataset&&e.target.dataset.f;if(f){items[+e.target.dataset.i][f]=Math.max(0,+e.target.value);S.set('items',items)}});
setInterval(()=>{if(tab==='plan'&&run)tickRun();if(tab==='sw')tickSw();tickTm()},250);
draw();
})();
