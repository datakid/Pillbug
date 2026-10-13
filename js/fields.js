const MON=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const DMY=(()=>{try{const p=new Intl.DateTimeFormat().formatToParts(new Date(2000,10,22)).filter(x=>x.type==='day'||x.type==='month');return p[0].type==='day'}catch(e){return true}})();
const eom=(y,m)=>new Date(y,m+1,0);
const yr=n=>n<100?2000+n:n;
const vdate=(y,m,d)=>{const t=new Date(y,m,d);return t.getFullYear()===y&&t.getMonth()===m&&t.getDate()===d?ymd(t):null};
function parseDate(raw,mode){
  const s=String(raw??'').trim().toLowerCase();if(!s)return'';
  const now=new Date(),cy=now.getFullYear();
  if(/^(t|today|now)$/.test(s))return today();
  if(/^(y|yesterday)$/.test(s))return ymd(addDays(-1));
  let m=s.match(/^([+-])\s*(\d+)\s*([dwmy]?)$/);
  if(m){const n=(m[1]==='-'?-1:1)*+m[2],u=m[3]||'d';if(u==='d')return ymd(addDays(n));if(u==='w')return ymd(addDays(7*n));const mo=now.getMonth()+(u==='y'?12*n:n),t=new Date(cy,mo,1);t.setDate(Math.min(now.getDate(),eom(t.getFullYear(),t.getMonth()).getDate()));return ymd(t)}
  if(m=s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))return vdate(+m[1],m[2]-1,+m[3]);
  const mi=MON.findIndex(x=>new RegExp('(^|[^a-z])'+x).test(s));
  if(mi>=0){const nums=(s.replace(/[a-z]+/g,' ').match(/\d+/g)||[]).map(Number);
    if(!nums.length)return mode==='expiry'?ymd(eom(cy,mi)):vdate(cy,mi,1);
    if(nums.length===1){const n=nums[0];return mode==='expiry'||n>31?ymd(eom(yr(n),mi)):vdate(cy,mi,n)}
    const y=nums.find(n=>n>31)??nums[1],d=nums.find(n=>n!==y)??nums[0];return vdate(yr(y),mi,d)}
  let p=s.split(/[\/.\-\s,]+/).filter(Boolean);
  if(p.length===1&&/^\d+$/.test(s)){const L=s.length;
    if(L===8&&/^(19|20)/.test(s))return vdate(+s.slice(0,4),s.slice(4,6)-1,+s.slice(6));
    if(L===4)p=[s.slice(0,2),s.slice(2)];else if(L===6||L===8)p=[s.slice(0,2),s.slice(2,4),s.slice(4)];else if(L>2)return null}
  const n=p.map(Number);if(n.some(isNaN))return null;
  if(p.length===1)return vdate(cy,now.getMonth(),n[0]);
  if(p.length===2){if(mode==='expiry'){if(n[0]<1||n[0]>12)return null;return ymd(eom(yr(n[1]),n[0]-1))}const[d,mo]=DMY?n:[n[1],n[0]];return vdate(cy,mo-1,d)??vdate(cy,d-1,mo)}
  if(p.length===3){if(p[0].length===4)return vdate(n[0],n[1]-1,n[2]);const[d,mo]=DMY?n:[n[1],n[0]];return vdate(yr(n[2]),mo-1,d)??vdate(yr(n[2]),d-1,mo)}
  return null;
}
const relDays=v=>{const n=daysTo(v);if(!n)return'today';const a=Math.abs(n),t=a>=60?Math.round(a/30.44)+' months':a+(a===1?' day':' days');return n>0?'in '+t:t+' ago'};
function dateField(label,name,val,o={}){
  const shown=val?fdate(val):'';
  return`<div class="field ${o.full?'full':''}">${label?`<label>${label}</label>`:''}<div class="date-in" data-mode="${o.mode||''}" data-min="${o.min||''}" data-max="${o.max||''}"><input class="input" data-date-text value="${esc(shown)}" data-shown="${esc(shown)}" placeholder="${o.ph||(o.mode==='expiry'?'MM/YY · 12/27 · +2y':'today · 3/9 · -2d')}" autocomplete="off" spellcheck="false" ${o.attrs||''}><input type="hidden" name="${name}" value="${val||''}" ${o.hid?`id="${o.hid}"`:''}><button type="button" class="date-btn" data-cal-open tabindex="-1" aria-label="Open calendar">${ic('cal')}</button></div>${o.chips?`<div class="chips">${o.chips.map(([l,v])=>`<button type="button" class="chip" data-chip="${v}">${l}</button>`).join('')}</div>`:''}${o.nohint?'':`<span class="hint" data-date-hint data-base="${esc(o.hint||'')}">${val?esc(relDays(val)):esc(o.hint||'')}</span>`}</div>`;
}
function dateHint(w,text,bad){const h=w.parentElement.querySelector('[data-date-hint]');if(!h)return;h.textContent=text??h.dataset.base;h.classList.toggle('err-text',!!bad)}
function rangeMsg(w,v){const{min,max}=w.dataset;if(v&&min&&v<min)return'Must be on or after '+fdate(min);if(v&&max&&v>max)return'Must be on or before '+fdate(max);return''}
function setDate(w,v){const h=$('input[type=hidden]',w),t=$('[data-date-text]',w),s=v?fdate(v):'';t.value=s;t.dataset.shown=s;const r=rangeMsg(w,v);dateHint(w,r||(v?relDays(v):null),!!r);if(h.value!==(v||'')){h.value=v||'';h.dispatchEvent(new Event('change',{bubbles:true}))}}
function commitDate(t){const w=t.closest('.date-in');if(t.value===t.dataset.shown)return true;const v=parseDate(t.value,w.dataset.mode);if(v===null){dateHint(w,'Couldn’t read that date — try 31/12/27, 12/27, dec 27 or +6m',true);return false}setDate(w,v);return true}
function focusNext(el){const f=el.closest('form')||el.closest('main')||document;const all=$$('input:not([type=hidden]):not([disabled]),.sel-btn,textarea,button.primary',f).filter(x=>x.offsetParent);const i=all.indexOf(el);all[i+1]?.focus()}
let pop=null,quiet=0;
function popClose(){if(!pop)return;const p=pop;pop=null;clearTimeout(p.tm);p.el.remove();p.src.setAttribute('aria-expanded','false')}
function popOpen(src,html,o){
  popClose();
  const el=document.createElement('div');el.className='menu '+(o.cls||'');el.innerHTML=html;
  (src.closest('dialog')||document.body).append(el);
  src.setAttribute('aria-expanded','true');
  pop={el,src,anchor:o.anchor,fit:!!o.fit,kind:'',i:-1};
  popPlace();
  return el;
}
function popFill(src,html,o){if(pop&&pop.src===src){pop.el.innerHTML=html;popPlace();return pop.el}return popOpen(src,html,o)}
function popPlace(){
  if(!pop)return;
  if(!pop.src.isConnected||!pop.anchor.isConnected)return popClose();
  const {el,anchor}=pop,r=anchor.getBoundingClientRect();
  if(pop.fit)el.style.minWidth=r.width+'px';
  el.style.maxHeight='';
  const need=Math.min(el.scrollHeight,360),below=innerHeight-r.bottom-14,above=r.top-14,up=below<need&&above>below;
  el.style.maxHeight=Math.max(120,Math.min(360,up?above:below))+'px';
  el.style.left=Math.max(8,Math.min(r.left,innerWidth-el.offsetWidth-8))+'px';
  el.style.top=up?'auto':r.bottom+6+'px';
  el.style.bottom=up?innerHeight-r.top+6+'px':'auto';
  el.style.transformOrigin=up?'bottom left':'top left';
}
function hiSet(i){if(!pop)return;const o=$$('.opt',pop.el);if(!o.length)return;pop.i=(i+o.length)%o.length;o.forEach((x,k)=>x.classList.toggle('hi',k===pop.i));o[pop.i].scrollIntoView({block:'nearest'})}
function hiPick(){const o=pop&&$$('.opt',pop.el)[pop.i];if(o)optPick(o)}
function optPick(o){
  if(!pop)return;
  if(pop.kind==='sel')selPick(+o.dataset.i);
  else if(pop.kind==='sug')sugPick(o.dataset.v);
  else if(pop.kind==='combo'){if(o.dataset.comboId)comboPick(pop.t,o.dataset.comboId);else if(o.dataset.comboNew!=null){const v=o.dataset.comboNew;popClose();drugForm(null,'receive',v)}}
}
function selectBox(name,list,val,o={}){
  const ps=list.map(x=>Array.isArray(x)?x:[x,x]),cur=ps.find(p=>String(p[0])===String(val))||ps[0]||['',''];
  return`<div class="sel ${o.cls||''}"><select class="sel-native" ${name?`name="${name}"`:''} ${o.id?`id="${o.id}"`:''} ${o.attrs||''} tabindex="-1" aria-hidden="true">${ps.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(cur[0])?'selected':''}>${esc(l)}</option>`).join('')}</select><button type="button" class="input sel-btn" data-sel-open role="combobox" aria-haspopup="listbox" aria-expanded="false"${o.label?` aria-label="${esc(o.label)}"`:''}><span class="sel-val">${esc(cur[1])}</span>${ic('chev')}</button></div>`;
}
function selOpen(btn){
  btn.focus();
  if(pop&&pop.src===btn)return popClose();
  const n=$('select',btn.parentElement),cur=n.selectedIndex;
  popOpen(btn,`<div class="opts" role="listbox">${[...n.options].map((o,i)=>`<div class="opt${i===cur?' on':''}" role="option" aria-selected="${i===cur}" data-i="${i}"><span>${esc(o.text)}</span>${i===cur?ic('check'):''}</div>`).join('')}</div>`,{anchor:btn,fit:1,cls:'menu-sel'});
  pop.kind='sel';pop.n=n;pop.buf='';hiSet(Math.max(0,cur));
}
function selPick(i){
  const{n,src}=pop;popClose();
  if(n.selectedIndex!==i){n.selectedIndex=i;$('.sel-val',src).textContent=n.options[i].text;n.dispatchEvent(new Event('change',{bubbles:true}))}
  src.focus();
}
function selType(ch){
  clearTimeout(pop.tm);pop.buf=(pop.buf||'')+ch.toLowerCase();const p=pop;pop.tm=setTimeout(()=>{p.buf=''},700);
  const o=$$('.opt',pop.el),n=o.length,s=pop.buf.length>1?pop.i:pop.i+1;
  for(let k=0;k<n;k++){const j=(s+k)%n;if(o[j].textContent.trim().toLowerCase().startsWith(pop.buf))return hiSet(j)}
}
function sugOpen(t,full){
  const all=JSON.parse(t.dataset.suggest||'[]'),cur=t.value.trim().toLowerCase(),q=full?'':cur;
  const list=all.filter(x=>full||x.toLowerCase()!==q).filter(x=>!q||x.toLowerCase().includes(q)).slice(0,full?20:8);
  if(!list.length)return popClose();
  popFill(t,`<div class="opts" role="listbox">${list.map(x=>{const i=q?x.toLowerCase().indexOf(q):-1;return`<div class="opt${full&&x.toLowerCase()===cur?' on':''}" role="option" data-v="${esc(x)}"><span>${i>=0?`${esc(x.slice(0,i))}<mark>${esc(x.slice(i,i+q.length))}</mark>${esc(x.slice(i+q.length))}`:esc(x)}</span>${full&&x.toLowerCase()===cur?ic('check'):''}</div>`}).join('')}</div>`,{anchor:t,fit:1,cls:'menu-sel'});
  pop.kind='sug';pop.t=t;
}
function sugPick(v){const t=pop.t;popClose();t.value=v;quiet=1;t.dispatchEvent(new Event('input',{bubbles:true}));quiet=0;t.dispatchEvent(new Event('change',{bubbles:true}))}
const calOpen=w=>!!pop&&pop.kind==='cal'&&pop.w===w;
function closeCal(){if(pop&&pop.kind==='cal')popClose()}
function openCal(w){closeCal();const v=$('input[type=hidden]',w).value||(w.dataset.mode==='expiry'?ymd(addDays(365)):today());const d=new Date(v+'T00:00');const c=popOpen($('[data-cal-open]',w),'',{anchor:w,cls:'cal'});pop.kind='cal';pop.w=w;c._w=w;c._s={y:d.getFullYear(),m:d.getMonth(),view:'days'};renderCal(c)}
function renderCal(c){
  const w=c._w,{y,m,view}=c._s,sel=$('input[type=hidden]',w).value,{min,max}=w.dataset,exp=w.dataset.mode==='expiry',td=today();
  const title=view==='days'?new Date(y,m,1).toLocaleDateString(undefined,{month:'long',year:'numeric'}):y;
  let body;
  if(view==='days'){const first=(new Date(y,m,1).getDay()+6)%7,n=eom(y,m).getDate();let h=[...Array(7)].map((_,i)=>`<span class="cal-wd">${new Date(2024,0,1+i).toLocaleDateString(undefined,{weekday:'narrow'})}</span>`).join('')+'<span></span>'.repeat(first);
    for(let i=1;i<=n;i++){const v=`${y}-${pad(m+1)}-${pad(i)}`,dis=(min&&v<min)||(max&&v>max);h+=`<button type="button" data-cal-d="${v}" class="${v===sel?'sel':''}${v===td?' today':''}" ${dis?'disabled':''}>${i}</button>`}
    body=`<div class="cal-grid">${h}</div>`}
  else body=`<div class="cal-months">${[...Array(12)].map((_,i)=>{const e=ymd(eom(y,i)),s=`${y}-${pad(i+1)}-01`,dis=(min&&e<min)||(max&&s>max);return`<button type="button" data-cal-m="${i}" class="${sel.startsWith(`${y}-${pad(i+1)}`)?'sel':''}" ${dis?'disabled':''}>${new Date(y,i,1).toLocaleDateString(undefined,{month:'short'})}</button>`}).join('')}</div>`;
  c.innerHTML=`<div class="cal-head"><button type="button" data-cal="prev" aria-label="Previous">‹</button><button type="button" class="cal-title" data-cal="view">${title}</button><button type="button" data-cal="next" aria-label="Next">›</button></div>${body}<div class="cal-foot"><button type="button" data-cal="today">Today</button>${exp?`<button type="button" data-cal="${view==='days'?'view':'days'}">${view==='days'?'Pick month':'Pick day'}</button>`:''}<button type="button" data-cal="clear">Clear</button></div>`;popPlace();
}
function calAct(c,t){
  const w=c._w,s=c._s,a=t.dataset.cal;
  if(t.dataset.calD){setDate(w,t.dataset.calD);closeCal();focusNext($('[data-date-text]',w));return}
  if(t.dataset.calM){const i=+t.dataset.calM;if(w.dataset.mode==='expiry'){setDate(w,ymd(eom(s.y,i)));closeCal();focusNext($('[data-date-text]',w));return}s.m=i;s.view='days'}
  else if(a==='prev'||a==='next'){const k=a==='prev'?-1:1;if(s.view==='days'){const d=new Date(s.y,s.m+k,1);s.y=d.getFullYear();s.m=d.getMonth()}else s.y+=k}
  else if(a==='view')s.view=s.view==='days'?'months':'days';
  else if(a==='days')s.view='days';
  else if(a==='today'){setDate(w,today());closeCal();return}
  else if(a==='clear'){setDate(w,'');closeCal();return}
  renderCal(c);
}
function productCombo(name,val,o={}){const d=val?drug(val):null;return`<div class="combo"><input class="input" data-combo-text value="${d?esc(dname(d)):''}" placeholder="Type a name, generic or scan a SKU…" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" ${o.attrs||''}><input type="hidden" name="${name}" value="${val||''}" ${o.hid?`id="${o.hid}"`:''}></div>`}
const drugMatch=(d,q)=>[d.name,d.generic,d.sku,d.strength,d.category].join(' ').toLowerCase().includes(q);
function comboRender(t){
  const q=t.value.toLowerCase().trim();
  const list=S.drugs.filter(d=>!q||drugMatch(d,q)).sort((a,b)=>{const A=a.name.toLowerCase().startsWith(q),B=b.name.toLowerCase().startsWith(q);return B-A||a.name.localeCompare(b.name)}).slice(0,8);
  const exact=S.drugs.some(d=>dname(d).toLowerCase()===q||d.name.toLowerCase()===q);
  const rows=list.map(d=>`<div class="opt" role="option" data-combo-id="${d.id}"><div><div class="name">${esc(dname(d))}</div><div class="sub">${esc([d.generic,d.form,d.sku].filter(Boolean).join(' · '))}</div></div><span class="mono sub">${fnum(sellable(d.id))}</span></div>`).join('')+(q&&!exact?`<div class="opt combo-new" data-combo-new="${esc(t.value.trim())}">${ic('plus')}<span>Create “${esc(t.value.trim())}”</span></div>`:'');
  popFill(t,`<div class="opts" role="listbox">${rows||'<div class="opt-empty">No products yet</div>'}</div>`,{anchor:t.parentElement,fit:1,cls:'menu-combo'});
  pop.kind='combo';pop.t=t;hiSet(0);
}
function comboClose(){if(pop&&pop.kind==='combo')popClose()}
function comboPick(t,id){const d=drug(id),h=t.parentElement.querySelector('input[type=hidden]');t.value=dname(d);comboClose();if(h.value!==id){h.value=id;h.dispatchEvent(new Event('change',{bubbles:true}))}focusNext(t)}
document.addEventListener('click',e=>{
  const t=e.target;
  const sb=t.closest('[data-sel-open]');if(sb){selOpen(sb);return}
  const op=t.closest('[data-cal-open]');if(op){const w=op.closest('.date-in');calOpen(w)?popClose():openCal(w);return}
  const ch=t.closest('[data-chip]');if(ch){const w=ch.closest('.field').querySelector('.date-in');setDate(w,parseDate(ch.dataset.chip,w.dataset.mode));closeCal();return}
  const cb=t.closest('.cal button');if(cb){calAct(cb.closest('.cal'),cb);return}
  if(t.matches('[data-combo-text]'))comboRender(t);
  else if(t.matches('[data-suggest]'))sugOpen(t,1);
});
document.addEventListener('mousedown',e=>{
  const o=e.target.closest('.menu .opt');
  if(o){e.preventDefault();optPick(o);return}
  if(e.target.closest('.menu'))return;
  if(pop&&!pop.anchor.contains(e.target))popClose();
},true);
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.matches('[data-date-text]')){const w=t.closest('.date-in');if(!t.value.trim()){dateHint(w,null);return}const v=parseDate(t.value,w.dataset.mode);v?dateHint(w,'→ '+new Date(v+'T00:00').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'})+' · '+relDays(v),!!rangeMsg(w,v)):dateHint(w,'Keep typing…')}
  else if(t.matches('[data-combo-text]'))comboRender(t);
  else if(t.matches('[data-suggest]')&&!quiet)sugOpen(t);
});
document.addEventListener('focusin',e=>{if(e.target.matches('[data-combo-text]'))e.target.select()});
document.addEventListener('focusout',e=>{
  const t=e.target;
  if(t.matches('[data-date-text]'))commitDate(t);
  else if(t.matches('[data-combo-text]')){const h=t.parentElement.querySelector('input[type=hidden]');setTimeout(()=>{comboClose();if(!t.value.trim()&&h.value){h.value='';h.dispatchEvent(new Event('change',{bubbles:true}))}else if(h.value&&drug(h.value))t.value=dname(drug(h.value))},120)}
});
document.addEventListener('keydown',e=>{
  const t=e.target;
  if(t.matches('[data-date-text]')){const w=t.closest('.date-in');
    if(e.key==='Enter'){e.preventDefault();if(commitDate(t)){closeCal();focusNext(t)}}
    else if(e.key==='ArrowDown'&&!calOpen(w)){e.preventDefault();openCal(w)}
    else if(e.key==='Escape'&&calOpen(w)){e.preventDefault();e.stopPropagation();closeCal()}
    else if((e.key==='ArrowUp'||e.key==='ArrowDown')&&calOpen(w))e.preventDefault();
    return;
  }
  const isSel=t.matches('.sel-btn'),isCombo=t.matches('[data-combo-text]'),isSug=t.matches('[data-suggest]');
  if(!isSel&&!isCombo&&!isSug)return;
  const open=!!pop&&pop.src===t;
  if(e.key==='Escape'){if(open){e.preventDefault();e.stopPropagation();popClose()}return}
  if(e.key==='Tab'){if(open)popClose();return}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();const d=e.key==='ArrowDown'?1:-1;
    if(!open){isSel?selOpen(t):isCombo?comboRender(t):sugOpen(t,1);if(pop&&pop.src===t&&pop.i<0)hiSet(0)}
    else hiSet(pop.i<0?(d>0?0:-1):pop.i+d);
    return;
  }
  if(isSel){
    if(e.key==='Enter'||e.key===' '){e.preventDefault();open?hiPick():selOpen(t);return}
    if(open&&(e.key==='Home'||e.key==='End')){e.preventDefault();hiSet(e.key==='Home'?0:-1);return}
    if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(!open)selOpen(t);selType(e.key)}
    return;
  }
  if(isCombo&&e.key==='Enter'){e.preventDefault();const q=t.value.trim().toLowerCase(),sku=S.drugs.find(d=>d.sku&&d.sku.toLowerCase()===q);if(sku)return comboPick(t,sku.id);if(open)hiPick();return}
  if(isSug&&e.key==='Enter'&&open&&pop.i>=0){e.preventDefault();e.stopPropagation();hiPick()}
},true);
document.addEventListener('keyup',e=>{if(e.key===' '&&e.target.matches('.sel-btn'))e.preventDefault()},true);
document.addEventListener('submit',e=>{$$('[data-date-text]',e.target).forEach(commitDate)},true);
document.addEventListener('close',popClose,true);
addEventListener('resize',popPlace);
addEventListener('scroll',e=>{if(pop&&!pop.el.contains(e.target))popPlace()},true);
