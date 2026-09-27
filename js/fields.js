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
function focusNext(el){const f=el.closest('form')||el.closest('main')||document;const all=$$('input:not([type=hidden]):not([disabled]),select,textarea,button.primary',f).filter(x=>x.offsetParent);const i=all.indexOf(el);all[i+1]?.focus()}
function closeCal(){$$('.cal').forEach(c=>c.remove())}
function openCal(w){closeCal();const v=$('input[type=hidden]',w).value||(w.dataset.mode==='expiry'?ymd(addDays(365)):today());const d=new Date(v+'T00:00');const c=document.createElement('div');c.className='cal';c._s={y:d.getFullYear(),m:d.getMonth(),view:'days'};w.append(c);renderCal(c)}
function renderCal(c){
  const w=c.parentElement,{y,m,view}=c._s,sel=$('input[type=hidden]',w).value,{min,max}=w.dataset,exp=w.dataset.mode==='expiry',td=today();
  const title=view==='days'?new Date(y,m,1).toLocaleDateString(undefined,{month:'long',year:'numeric'}):y;
  let body;
  if(view==='days'){const first=(new Date(y,m,1).getDay()+6)%7,n=eom(y,m).getDate();let h=[...Array(7)].map((_,i)=>`<span class="cal-wd">${new Date(2024,0,1+i).toLocaleDateString(undefined,{weekday:'narrow'})}</span>`).join('')+'<span></span>'.repeat(first);
    for(let i=1;i<=n;i++){const v=`${y}-${pad(m+1)}-${pad(i)}`,dis=(min&&v<min)||(max&&v>max);h+=`<button type="button" data-cal-d="${v}" class="${v===sel?'sel':''}${v===td?' today':''}" ${dis?'disabled':''}>${i}</button>`}
    body=`<div class="cal-grid">${h}</div>`}
  else body=`<div class="cal-months">${[...Array(12)].map((_,i)=>{const e=ymd(eom(y,i)),s=`${y}-${pad(i+1)}-01`,dis=(min&&e<min)||(max&&s>max);return`<button type="button" data-cal-m="${i}" class="${sel.startsWith(`${y}-${pad(i+1)}`)?'sel':''}" ${dis?'disabled':''}>${new Date(y,i,1).toLocaleDateString(undefined,{month:'short'})}</button>`}).join('')}</div>`;
  c.innerHTML=`<div class="cal-head"><button type="button" data-cal="prev" aria-label="Previous">‹</button><button type="button" class="cal-title" data-cal="view">${title}</button><button type="button" data-cal="next" aria-label="Next">›</button></div>${body}<div class="cal-foot"><button type="button" data-cal="today">Today</button>${exp?`<button type="button" data-cal="${view==='days'?'view':'days'}">${view==='days'?'Pick month':'Pick day'}</button>`:''}<button type="button" data-cal="clear">Clear</button></div>`;
}
function calAct(c,t){
  const w=c.parentElement,s=c._s,a=t.dataset.cal;
  if(t.dataset.calD){setDate(w,t.dataset.calD);closeCal();focusNext($('[data-date-text]',w));return}
  if(t.dataset.calM){const i=+t.dataset.calM;if(w.dataset.mode==='expiry'){setDate(w,ymd(eom(s.y,i)));closeCal();focusNext($('[data-date-text]',w));return}s.m=i;s.view='days'}
  else if(a==='prev'||a==='next'){const k=a==='prev'?-1:1;if(s.view==='days'){const d=new Date(s.y,s.m+k,1);s.y=d.getFullYear();s.m=d.getMonth()}else s.y+=k}
  else if(a==='view')s.view=s.view==='days'?'months':'days';
  else if(a==='days')s.view='days';
  else if(a==='today'){setDate(w,today());closeCal();return}
  else if(a==='clear'){setDate(w,'');closeCal();return}
  renderCal(c);
}
function productCombo(name,val,o={}){const d=val?drug(val):null;return`<div class="combo"><input class="input" data-combo-text value="${d?esc(dname(d)):''}" placeholder="Type a name, generic or scan a SKU…" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" ${o.attrs||''}><input type="hidden" name="${name}" value="${val||''}" ${o.hid?`id="${o.hid}"`:''}><div class="combo-list" role="listbox" hidden></div></div>`}
const drugMatch=(d,q)=>[d.name,d.generic,d.sku,d.strength,d.category].join(' ').toLowerCase().includes(q);
function comboRender(t){
  const box=t.parentElement.querySelector('.combo-list'),q=t.value.toLowerCase().trim();
  const list=S.drugs.filter(d=>!q||drugMatch(d,q)).sort((a,b)=>{const A=a.name.toLowerCase().startsWith(q),B=b.name.toLowerCase().startsWith(q);return B-A||a.name.localeCompare(b.name)}).slice(0,8);
  const exact=S.drugs.some(d=>dname(d).toLowerCase()===q||d.name.toLowerCase()===q);
  box._items=list;box._i=0;
  box.innerHTML=list.map((d,i)=>`<div class="combo-opt${i?'':' hi'}" role="option" data-combo-id="${d.id}"><div><div class="name">${esc(dname(d))}</div><div class="sub">${esc([d.generic,d.form,d.sku].filter(Boolean).join(' · '))}</div></div><span class="mono sub">${fnum(sellable(d.id))}</span></div>`).join('')+(q&&!exact?`<div class="combo-opt combo-new" data-combo-new="${esc(t.value.trim())}">${ic('plus')}<span>Create “${esc(t.value.trim())}”</span></div>`:'')||'<div class="combo-opt muted">No products yet</div>';
  box.hidden=false;t.setAttribute('aria-expanded','true');
}
function comboClose(){$$('.combo-list').forEach(b=>{b.hidden=true;b.previousElementSibling?.previousElementSibling?.setAttribute('aria-expanded','false')})}
function comboPick(t,id){const d=drug(id),h=t.parentElement.querySelector('input[type=hidden]');t.value=dname(d);comboClose();if(h.value!==id){h.value=id;h.dispatchEvent(new Event('change',{bubbles:true}))}focusNext(t)}
function comboHi(box,k){const o=$$('.combo-opt[data-combo-id],.combo-new',box);if(!o.length)return;box._i=(box._i+k+o.length)%o.length;o.forEach((x,i)=>x.classList.toggle('hi',i===box._i));o[box._i].scrollIntoView({block:'nearest'})}

document.addEventListener('click',e=>{
  const t=e.target;
  const op=t.closest('[data-cal-open]');if(op){const w=op.closest('.date-in');$('.cal',w)?closeCal():openCal(w);return}
  const ch=t.closest('[data-chip]');if(ch){const w=ch.closest('.field').querySelector('.date-in');setDate(w,parseDate(ch.dataset.chip,w.dataset.mode));closeCal();return}
  const cb=t.closest('.cal button');if(cb){calAct(cb.closest('.cal'),cb);return}
  if(t.closest('.cal'))return;
  closeCal();
  if(!t.closest('.combo'))comboClose();
});
document.addEventListener('mousedown',e=>{const o=e.target.closest('.combo-opt');if(!o)return;e.preventDefault();const t=o.closest('.combo').querySelector('[data-combo-text]');if(o.dataset.comboId)comboPick(t,o.dataset.comboId);else if(o.dataset.comboNew!=null){comboClose();drugForm(null,'receive',o.dataset.comboNew)}});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.matches('[data-date-text]')){const w=t.closest('.date-in');if(!t.value.trim()){dateHint(w,null);return}const v=parseDate(t.value,w.dataset.mode);v?dateHint(w,'→ '+new Date(v+'T00:00').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'})+' · '+relDays(v),!!rangeMsg(w,v)):dateHint(w,'Keep typing…')}
  else if(t.matches('[data-combo-text]'))comboRender(t);
});
document.addEventListener('focusin',e=>{if(e.target.matches('[data-combo-text]'))e.target.select()});
document.addEventListener('click',e=>{if(e.target.matches('[data-combo-text]'))comboRender(e.target)});
document.addEventListener('focusout',e=>{
  const t=e.target;
  if(t.matches('[data-date-text]'))commitDate(t);
  else if(t.matches('[data-combo-text]')){const h=t.parentElement.querySelector('input[type=hidden]');setTimeout(()=>{comboClose();if(!t.value.trim()&&h.value){h.value='';h.dispatchEvent(new Event('change',{bubbles:true}))}else if(h.value&&drug(h.value))t.value=dname(drug(h.value))},120)}
});
document.addEventListener('keydown',e=>{
  const t=e.target;
  if(t.matches('[data-date-text]')){const w=t.closest('.date-in');
    if(e.key==='Enter'){e.preventDefault();if(commitDate(t)){closeCal();focusNext(t)}}
    else if(e.key==='ArrowDown'&&!$('.cal',w)){e.preventDefault();openCal(w)}
    else if(e.key==='Escape'&&$('.cal',w)){e.preventDefault();e.stopPropagation();closeCal()}
    else if((e.key==='ArrowUp'||e.key==='ArrowDown')&&e.altKey===false&&$('.cal',w)){e.preventDefault()}
  }
  else if(t.matches('[data-combo-text]')){const box=t.parentElement.querySelector('.combo-list');
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(box.hidden)comboRender(t);else comboHi(box,e.key==='ArrowDown'?1:-1)}
    else if(e.key==='Enter'){e.preventDefault();const q=t.value.trim().toLowerCase();const sku=S.drugs.find(d=>d.sku&&d.sku.toLowerCase()===q);if(sku)return comboPick(t,sku.id);const o=$$('.combo-opt[data-combo-id],.combo-new',box)[box._i||0];if(!o)return;if(o.dataset.comboId)comboPick(t,o.dataset.comboId);else{comboClose();drugForm(null,'receive',o.dataset.comboNew)}}
    else if(e.key==='Escape'&&!box.hidden){e.preventDefault();e.stopPropagation();comboClose()}
  }
},true);
document.addEventListener('submit',e=>{$$('[data-date-text]',e.target).forEach(commitDate)},true);
