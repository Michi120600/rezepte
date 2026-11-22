(()=>{
const R=window.REZEPTE,K=window.KATEGORIEN;
const $=s=>document.querySelector(s);
const norm=s=>s.toLowerCase().replace(/ß/g,'ss').normalize('NFD').replace(/[̀-ͯ]/g,'');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store={get(k,d){try{return JSON.parse(localStorage.getItem('rezepte.'+k))??d}catch{return d}},set(k,v){try{localStorage.setItem('rezepte.'+k,JSON.stringify(v))}catch{}}};
const COL={'Salate':'#5b8c3a','Beilagen':'#b08a3e','Fischgerichte':'#2f6f8f','Fleischgerichte':'#8a2a1f','Vegetarische Gerichte':'#4f8a4a','Desserts':'#b04a7a','Marmeladen':'#a8452f','Brotrezepte':'#a9732a','Liköre und Säfte':'#6a3a7a','Indisch':'#c2791c','Marinaden und Saucen':'#7a4a2a','Speck und Würste':'#7c3a3a'};
const devOf=r=>{const g=norm(r.geraet),o=[];
 if(/dampf/.test(g))o.push('Dampfgarer');
 if(/kombi|heissluft|backofen|brotback|backstufe|umluft/.test(g)&&!/holz/.test(g)||/kombi/.test(g))o.push('Kombibackofen');
 if(/holz/.test(g))o.push('Holzbackofen');
 if(/herd/.test(g))o.push('Herd');
 if(/grill|bbq/.test(g))o.push('Grill');
 if(/raeuch/.test(g))o.push('Räuchern');
 if(/stehen|ziehen/.test(g))o.push('Ansetzen');
 return o.length?[...new Set(o)]:['Sonstiges']};
R.forEach(r=>{r.dev=devOf(r);r.hz=norm(r.titel);r.hzu=norm(r.zutaten.join(' | '));r.hr=norm([r.kategorie,r.geraet,r.portionen,r.anleitung.join(' '),r.tipp.join(' ')].join(' '))});
const DEVS=['Dampfgarer','Kombibackofen','Holzbackofen','Herd','Grill','Räuchern','Ansetzen'];
const TIMES=[['≤ 30 Min.',30],['≤ 1 Std.',60],['≤ 2 Std.',120]];
let st={q:'',cat:null,dev:null,time:0,fav:false,any:false,sort:'rel'};
let favs=new Set(store.get('fav',[]));
const chipHTML=(label,on,attr,n)=>`<button class="chip" aria-pressed="${on}" ${attr}>${esc(label)}${n!=null?`<small>${n}</small>`:''}</button>`;
function match(r,tok){ // returns score list
 let s=0;for(const t of tok.pos){const ti=r.hz.includes(t),zi=r.hzu.includes(t),ri=r.hr.includes(t);
  const v=ti?10:zi?4:ri?1:0;if(!v&&!st.any)return -1;s+=v;if(v)s+=0.001}
 if(st.any&&tok.pos.length&&s<=0)return -1;
 for(const t of tok.neg)if(r.hz.includes(t)||r.hzu.includes(t)||r.hr.includes(t))return -1;
 return s}
function parseQ(q){const w=norm(q).split(/\s+/).filter(Boolean);return{pos:w.filter(x=>x[0]!='-'&&x.length>0),neg:w.filter(x=>x[0]=='-'&&x.length>1).map(x=>x.slice(1))}}
function filtered(skip){const tok=parseQ(st.q);let L=[];
 for(const r of R){if(skip!=='cat'&&st.cat&&r.kategorie!==st.cat)continue;if(skip!=='dev'&&st.dev&&!r.dev.includes(st.dev))continue;
  if(st.time&&!(r.minuten>0&&r.minuten<=st.time))continue;if(st.fav&&!favs.has(r.id))continue;
  const s=tok.pos.length||tok.neg.length?match(r,tok):0;if(s<0)continue;
  let hits=0;if(st.any)for(const t of tok.pos)if(r.hz.includes(t)||r.hzu.includes(t))hits++;
  L.push({r,s,hits})}
 return{L,tok}}
function hi(text,toks){let o=esc(text);for(const t of toks){if(!t)continue;const n=norm(text);let out='',i=0;const raw=text;
  // Markierung auf normalisiertem Text; Längen stimmen, solange norm 1:1 abbildet
  if(n.length!==raw.length)return o;let p;const parts=[];while((p=n.indexOf(t,i))>-1){parts.push([p,p+t.length]);i=p+t.length}
  if(parts.length){let last=0;out='';for(const[a,b]of parts){out+=esc(raw.slice(last,a))+'<mark>'+esc(raw.slice(a,b))+'</mark>';last=b}out+=esc(raw.slice(last));o=out}}
 return o}
function renderChips(){
 const base=filtered('cat').L;const cc={};base.forEach(x=>cc[x.r.kategorie]=(cc[x.r.kategorie]||0)+1);
 const tab=(l,on,at,n)=>`<button class="tab" aria-pressed="${on}" ${at}>${esc(l)}${n!=null?`<small>${n}</small>`:''}</button>`;
 $('#cats').innerHTML=tab('Alle',!st.cat,'data-cat=""',null)+K.map(c=>tab(c,st.cat===c,`data-cat="${esc(c)}"`,cc[c]||0)).join('');
 const bd=filtered('dev').L;const dc={};bd.forEach(x=>x.r.dev.forEach(d=>dc[d]=(dc[d]||0)+1));
 $('#devs').innerHTML=chipHTML('Alle',!st.dev,'data-dev=""',null)+DEVS.filter(d=>dc[d]).map(d=>chipHTML(d,st.dev===d,`data-dev="${d}"`,dc[d])).join('');
 $('#times').innerHTML=chipHTML('Beliebig',!st.time,'data-time="0"',null)+TIMES.map(([l,m])=>chipHTML(l,st.time===m,`data-time="${m}"`)).join('')+chipHTML('♥ Merkliste ('+favs.size+')',st.fav,'data-favf="1"')}
function card(x,toks){const r=x.r,img=r.bilder[0];
 let hit='';if(toks.length){const m=r.zutaten.filter(z=>toks.some(t=>norm(z).includes(t))).slice(0,2);if(m.length&&!toks.every(t=>r.hz.includes(t)))hit=`<div class="hit">Zutat: ${m.map(z=>hi(z,toks)).join(' · ')}</div>`}
 const meta=[r.zeit&&r.zeit.replace(/^ca\.\s*/,''),r.dev[0]!=='Sonstiges'?r.dev[0]:''].filter(Boolean);
 return`<a class="rc" href="#r${r.id}"><div class="im" style="--c:${COL[r.kategorie]||'#667'}">${img?`<img src="${img}" alt="" loading="lazy">`:esc(r.titel[0])}</div><div class="tx"><div class="m">${esc(r.kategorie)}</div><h3>${hi(r.titel,toks)}</h3><div class="m">${esc(meta.join(' · '))}</div>${st.any&&x.hits>1?`<div class="m"><b>${x.hits} Treffer</b></div>`:''}${hit}</div><button class="fav" data-fav="${r.id}" aria-label="Merken" aria-pressed="${favs.has(r.id)}">${favs.has(r.id)?'♥':'♡'}</button></a>`}
function render(){
 const{L,tok}=filtered();const toks=tok.pos;
 const s=st.sort,rel=toks.length&&s==='rel';
 L.sort((a,b)=>rel?(b.s-a.s)||a.r.titel.localeCompare(b.r.titel,'de'):s==='fast'?(a.r.minuten||9e9)-(b.r.minuten||9e9):s==='cat'?K.indexOf(a.r.kategorie)-K.indexOf(b.r.kategorie)||a.r.titel.localeCompare(b.r.titel,'de'):a.r.titel.localeCompare(b.r.titel,'de'));
 $('#count').textContent=L.length+(L.length===1?' Rezept':' Rezepte')+(L.length<R.length?' von '+R.length:'');
 $('#grid').innerHTML=L.length?L.map(x=>card(x,toks)).join(''):'<div class="empty" style="grid-column:1/-1"><h3>Nichts gefunden</h3><p>Probier ein anderes Wort oder setz die Filter zurück.</p></div>';
 renderChips()}
// ----- Detail
const NUM=/^(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?(\s*)(.*)$/;
const FR={'½':.5,'¼':.25,'¾':.75};
const fmt=n=>{n=Math.round(n*100)/100;let s=String(n).replace('.',',');return s};
function scale(line,f){if(f===1)return esc(line);let m=line.match(/^(\d+)\/(\d+)(\s+)(.*)$/);if(m)return esc(fmt(m[1]/m[2]*f)+' '+m[4]);
 m=line.match(NUM);if(!m)return esc(line);const a=parseFloat(m[1].replace(',','.'))*f,b=m[2]?parseFloat(m[2].replace(',','.'))*f:null;
 return esc(fmt(a)+(b!=null?'–'+fmt(b):'')+m[3]+m[4])}
function portNum(p){const m=p.match(/(\d+)/);return m?+m[1]:null}
function showDetail(id,keep){const r=R.find(x=>x.id===id);if(!r){location.hash='';return}
 document.body.classList.add('detail');document.title=r.titel+' – Meine Rezepte';if(!keep)scrollTo(0,0);
 const base=portNum(r.portionen),cur=(r._p||base);const f=base&&cur?cur/base:1;
 const checked=new Set(store.get('chk'+r.id,[]));
 const head=l=>!/^\d/.test(l)&&/:$/.test(l)&&l.length<45;
 const zut=r.zutaten.map((l,i)=>!l?'':head(l)?`<h4>${esc(l.replace(/:$/,''))}</h4>`:`<li class="${checked.has(i)?'done':''}"><label><input type="checkbox" data-chk="${i}" ${checked.has(i)?'checked':''}><span>${scale(l,f)}</span></label></li>`).join('').replace(/(<li[\s\S]*?<\/li>)+/g,m=>'<ul>'+m+'</ul>');
 const joined=[];r.anleitung.forEach(l=>{const p=joined[joined.length-1];if(p&&l&&!/[.!?:)]$/.test(p)&&/^[a-zäöüß0-9(]/.test(l)&&!/^\d+[.)]/.test(l))joined[joined.length-1]=p+' '+l;else joined.push(l)});
 const anl=joined.map(l=>!l?'':head(l)?`<h4>${esc(l.replace(/:$/,''))}</h4>`:`<p class="st">${esc(l)}</p>`).join('');
 const g=r.gar,cell=(v,u,l)=>`<div class="cell"><b>${esc(v)}<i>${esc(u)}</i></b><span>${esc(l)}</span></div>`;
 const disp=g&&(g.temp||g.min)?`<div class="disp" role="group" aria-label="Gardaten">${g.temp?cell(g.temp,'°C','Temperatur'):''}${g.feuchte?cell(g.feuchte,'%','Dampf'):''}${(g.min||r.minuten)?cell(g.min||r.minuten,'Min','Dauer'):''}</div>`:(r.minuten?`<div class="disp" role="group" aria-label="Zeit">${cell(r.minuten,'Min','Dauer')}</div>`:'');
 const rel=R.filter(x=>x.id!==r.id&&x.kategorie===r.kategorie).sort(()=>.5-Math.random()).slice(0,3);
 $('#detail').innerHTML=`<a class="back" href="#" data-back>Alle Rezepte</a><h1>${esc(r.titel)}</h1>
 <p class="sub">${esc(r.kategorie)}${r.portionen?` · für ${esc(r.portionen.replace(/^für\s+/i,''))}`:''}${r.geraet?` · ${esc(r.geraet.replace(/\s*;-\)/,''))}`:''}</p>
 ${r.bilder.length?` <div class="photos">${r.bilder.map(b=>`<img src="${b}" alt="${esc(r.titel)}">`).join('')}</div>${r.fotoquelle?`<p class="fq">${r.fotoquelle.ki?'KI-generiertes Bild, nur zur Illustration':`Foto${r.fotoquelle.aehnlich?' (ähnliches Gericht)':''}: ${esc(r.fotoquelle.autor||'')} ${esc(r.fotoquelle.lizenz||'')}`}</p>`:''}`:''}
 ${disp}<div class="actions"><button class="chip" data-fav="${r.id}" aria-pressed="${favs.has(r.id)}">${favs.has(r.id)?'Gemerkt':'Merken'}</button><button class="chip" id="wake" aria-pressed="false">Display anlassen</button><button class="chip" onclick="print()">Drucken</button><button class="chip" id="share">Teilen</button></div>
 <div class="cols2"><div class="zut"><h2>Zutaten</h2>${base?`<div class="stepper"><button data-p="-1" aria-label="Weniger">−</button><b>${cur}</b><button data-p="1" aria-label="Mehr">+</button><span>Portionen/Menge (Basis ${base})</span></div>`:''}${zut}</div>
 <div class="anl"><h2>Zubereitung</h2>${anl}${r.tipp.length?`<div class="tipp"><b>Tipp</b>${r.tipp.filter(Boolean).map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}</div></div>
 ${rel.length?`<h2 class="more-h">Mehr aus „${esc(r.kategorie)}“</h2><div class="grid">${rel.map(x=>card({r:x,hits:0},[])).join('')}</div>`:''}`;
 $('#detail').dataset.id=id}
function hideDetail(){document.body.classList.remove('detail');document.title="Meine Rezepte"}
function route(){const m=location.hash.match(/^#r(\d+)$/);m?showDetail(+m[1]):hideDetail()}
addEventListener('hashchange',route);
document.addEventListener('click',e=>{
 const fv=e.target.closest('[data-fav]');if(fv){e.preventDefault();e.stopPropagation();const id=+fv.dataset.fav;favs.has(id)?favs.delete(id):favs.add(id);store.set('fav',[...favs]);
  if(document.body.classList.contains('detail'))showDetail(+$('#detail').dataset.id,1);else render();return}
 const b=e.target.closest('[data-back]');if(b){e.preventDefault();location.hash=''; if(history.length>1&&false)history.back();return}
 const c=e.target.closest('[data-cat]');if(c){st.cat=c.dataset.cat||null;render()}
 const d=e.target.closest('[data-dev]');if(d){st.dev=d.dataset.dev||null;render()}
 const t=e.target.closest('[data-time]');if(t){st.time=+t.dataset.time;render()}
 if(e.target.closest('[data-favf]')){st.fav=!st.fav;render()}
 const p=e.target.closest('[data-p]');if(p){const r=R.find(x=>x.id===+$('#detail').dataset.id),base=portNum(r.portionen);r._p=Math.max(1,(r._p||base)+ +p.dataset.p);showDetail(r.id,1)}
 if(e.target.closest('#wake')){toggleWake(e.target.closest('#wake'))}
 if(e.target.closest('#share')){const r=R.find(x=>x.id===+$('#detail').dataset.id);const u=location.href;navigator.share?navigator.share({title:r.titel,url:u}).catch(()=>{}):navigator.clipboard?.writeText(u)}
});
document.addEventListener('change',e=>{const c=e.target.closest('[data-chk]');if(c){const id=+$('#detail').dataset.id,k='chk'+id,s=new Set(store.get(k,[]));c.checked?s.add(+c.dataset.chk):s.delete(+c.dataset.chk);store.set(k,[...s]);c.closest('li').classList.toggle('done',c.checked)}});
let wl=null;async function toggleWake(btn){try{if(wl){await wl.release();wl=null;btn.setAttribute('aria-pressed','false')}else{wl=await navigator.wakeLock.request('screen');btn.setAttribute('aria-pressed','true')}}catch{btn.textContent='Nicht verfügbar'}}
$('#q').addEventListener('input',e=>{st.q=e.target.value;render()});
$('#any').onclick=e=>{st.any=!st.any;e.currentTarget.setAttribute('aria-pressed',st.any);render()};
$('#sort').onchange=e=>{st.sort=e.target.value;render()};
$('#reset').onclick=()=>{st={q:'',cat:null,dev:null,time:0,fav:false,any:false,sort:'rel'};$('#q').value='';$('#any').setAttribute('aria-pressed','false');$('#sort').value='rel';render()};
addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement.tagName!=='INPUT'){e.preventDefault();$('#q').focus()}if(e.key==='Escape'&&location.hash){location.hash=''}});
render();route();
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
