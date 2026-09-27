const KEY='pillbug.v1';
const FORMS=['Tablet','Capsule','Syrup','Suspension','Injection','Cream','Ointment','Drops','Inhaler','Patch','Other'];
const CURR=['USD','EUR','GBP','EGP','SAR','AED','INR','CAD','AUD','JPY','CHF'];
const TX={in:['Received','p-ok'],out:['Dispensed','p-info'],return:['Returned','p-mute'],adjust:['Adjusted','p-warn'],dispose:['Disposed','p-bad']};
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>ymd(new Date());
const addDays=(n,base=new Date())=>{const d=new Date(base);d.setDate(d.getDate()+n);return d};
const daysTo=s=>Math.round((new Date(s+'T00:00:00')-new Date(today()+'T00:00:00'))/864e5);
const fdate=s=>s?new Date(s.length<=10?s+'T00:00:00':s).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'—';
const ftime=s=>new Date(s).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const fnum=n=>(+n||0).toLocaleString();
const ic=n=>`<svg class="ic"><use href="#i-${n}"/></svg>`;
const byName=(a,b)=>a.name.localeCompare(b.name);
const byDateDesc=(a,b)=>b.date.localeCompare(a.date);
let _mf,_mfc;
const money=n=>{if(_mfc!==S.settings.currency){try{_mf=new Intl.NumberFormat(undefined,{style:'currency',currency:S.settings.currency})}catch(e){_mf=new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'})}_mfc=S.settings.currency}return _mf.format(+n||0)};

function blank(){return{version:1,drugs:[],batches:[],tx:[],pos:[],settings:{currency:'USD',warnDays:90,theme:'system'}}}
function normalize(d){const b=blank();return{version:1,drugs:Array.isArray(d.drugs)?d.drugs:[],batches:Array.isArray(d.batches)?d.batches:[],tx:Array.isArray(d.tx)?d.tx:[],pos:Array.isArray(d.pos)?d.pos:[],settings:{...b.settings,...(d.settings||{})}}}
function load(){try{const raw=localStorage.getItem(KEY);if(raw)return normalize(JSON.parse(raw))}catch(e){}const s=seed();localStorage.setItem(KEY,JSON.stringify(s));return s}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('Storage is full — export a backup and clear old data','err')}updateBadge()}

function seed(keep){
  const d=blank();if(keep)d.settings=keep;
  const list=[['Amoxicillin','Amoxicillin','500 mg','Capsule','Antibiotic',0.45,100],['Paracetamol','Acetaminophen','500 mg','Tablet','Analgesic',0.08,300],['Ibuprofen','Ibuprofen','400 mg','Tablet','Analgesic',0.12,200],['Metformin','Metformin HCl','850 mg','Tablet','Antidiabetic',0.15,150],['Atorvastatin','Atorvastatin','20 mg','Tablet','Cardiovascular',0.35,90],['Amlodipine','Amlodipine besylate','5 mg','Tablet','Cardiovascular',0.2,90],['Omeprazole','Omeprazole','20 mg','Capsule','Gastro',0.25,120],['Ventolin','Salbutamol','100 mcg','Inhaler','Respiratory',6.5,10],['Cetirizine','Cetirizine HCl','10 mg','Tablet','Antihistamine',0.1,100],['Azithromycin','Azithromycin','250 mg','Tablet','Antibiotic',1.2,40],['Lantus','Insulin glargine','100 U/mL','Injection','Antidiabetic',28,6],['Hydrocortisone','Hydrocortisone','1%','Cream','Dermatology',4.2,10],['Augmentin Susp.','Amoxicillin/Clavulanate','228 mg/5 mL','Suspension','Antibiotic',7.8,8],['Loratadine','Loratadine','10 mg','Tablet','Antihistamine',0.11,100],['Lisinopril','Lisinopril','10 mg','Tablet','Cardiovascular',0.18,90]];
  const sup=['MedSupply Co.','PharmaDirect','HealthLine Wholesale'];
  let r=11;const rnd=()=>(r=(r*9301+49297)%233280)/233280;
  list.forEach(([name,generic,strength,form,category,price,reorder],i)=>{
    const id='d'+uid()+i;
    d.drugs.push({id,name,generic,strength,form,category,sku:'SKU-'+(1001+i),unit:['Tablet','Capsule'].includes(form)?'unit':'pack',price,reorder,notes:'',created:new Date().toISOString()});
    const nb=i===14?0:1+Math.floor(rnd()*3);
    for(let k=0;k<nb;k++){
      const recv=addDays(-18-Math.floor(rnd()*50));
      const b={id:'b'+uid()+i+k,drugId:id,lot:'L'+(24000+Math.floor(rnd()*9000)),expiry:ymd(addDays(Math.floor(rnd()*420)-35)),qty:Math.max(1,Math.floor(reorder*(0.3+rnd()*2.4))),cost:+(price*0.62).toFixed(2),supplier:sup[(i+k)%3],received:ymd(recv)};
      d.batches.push(b);
      d.tx.push({id:'t'+uid()+i+k,type:'in',date:recv.toISOString(),drugId:id,drugName:name,batchId:b.id,lot:b.lot,qty:b.qty,unitCost:b.cost,unitPrice:0,ref:'PO-'+(500+i*3+k),note:''});
    }
  });
  for(let n=0;n<60;n++){
    const dd=d.drugs[Math.floor(rnd()*d.drugs.length)];
    const b=d.batches.filter(x=>x.drugId===dd.id&&x.qty>0&&daysTo(x.expiry)>=0).sort((a,c)=>a.expiry.localeCompare(c.expiry))[0];
    if(!b)continue;
    const q=Math.min(b.qty,1+Math.floor(rnd()*(dd.reorder/6+2)));
    b.qty-=q;
    const dt=addDays(-Math.floor(rnd()*14));dt.setHours(9+Math.floor(rnd()*9),Math.floor(rnd()*60));
    d.tx.push({id:'t'+uid()+'o'+n,type:'out',date:dt.toISOString(),drugId:dd.id,drugName:dd.name,batchId:b.id,lot:b.lot,qty:q,unitCost:b.cost,unitPrice:dd.price,ref:'RX-'+(7000+n),note:''});
  }
  return d;
}

let S=load();
const drug=id=>S.drugs.find(x=>x.id===id);
const liveBatches=id=>S.batches.filter(b=>b.drugId===id&&b.qty>0).sort((a,b)=>a.expiry.localeCompare(b.expiry));
const onHand=id=>liveBatches(id).reduce((s,b)=>s+b.qty,0);
const sellable=id=>liveBatches(id).filter(b=>daysTo(b.expiry)>=0).reduce((s,b)=>s+b.qty,0);
function stockState(d){const q=sellable(d.id);if(q<=0)return['out','Out of stock','p-bad'];if(q<=d.reorder)return['low','Low stock','p-warn'];return['ok','In stock','p-ok']}
function expState(date){const n=daysTo(date);if(n<0)return['expired',`Expired ${-n}d ago`,'p-bad'];if(n<=30)return['critical',`${n}d left`,'p-warn'];if(n<=S.settings.warnDays)return['soon',`${n}d left`,'p-info'];return['ok',fdate(date),'p-mute']}
const dname=d=>d?`${d.name}${d.strength?' '+d.strength:''}`:'';

const mq=matchMedia('(prefers-color-scheme: dark)');
function applyTheme(){const t=S.settings.theme;document.documentElement.dataset.theme=t==='system'?(mq.matches?'dark':'light'):t;$('meta[name=theme-color]').content=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();$('#theme-toggle').innerHTML=themeTabs('theme-sm')}
function themeTabs(){return['light','dark','system'].map(t=>`<span data-act="theme" data-t="${t}" class="${S.settings.theme===t?'on':''}" title="${t[0].toUpperCase()+t.slice(1)}">${ic(t==='light'?'sun':t==='dark'?'moon':'system')}</span>`).join('')}
mq.addEventListener('change',applyTheme);

function toast(msg,type=''){const el=document.createElement('div');el.className='toast '+type;el.textContent=msg;$('#toasts').append(el);setTimeout(()=>el.remove(),3000)}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
const csvCell=v=>{const s=String(v??'');return/[",\n;]/.test(s)?`"${s.replace(/"/g,'""')}"`:s};
const csv=rows=>rows.map(r=>r.map(csvCell).join(',')).join('\n');

const closeBtn=`<button type="button" class="btn ghost icon" data-act="close" aria-label="Close">${ic('x')}</button>`;
function openDrawer(html){const d=$('#drawer');d.innerHTML=html;if(!d.open)d.showModal();$('input,select',d)?.focus()}
function closeAll(){$$('dialog[open]').forEach(d=>d.close())}
let pending=null;
function openModal(html){const m=$('#modal');m.innerHTML=html;if(!m.open)m.showModal()}
function confirmBox(title,msg,ok,fn,danger=true){pending=fn;openModal(`<div class="panel"><div class="card-pad"><h3 style="margin:0 0 6px;font:500 21px var(--serif)">${esc(title)}</h3><p class="t2" style="margin:0">${msg}</p></div><div class="panel-foot"><button class="btn" data-act="modal-close">Cancel</button><button class="btn ${danger?'danger':'primary'}" data-act="modal-ok">${esc(ok)}</button></div></div>`)}
function fld(label,name,val,o={}){const a=o.attrs||'';const inner=o.options?`<select class="input" name="${name}" ${a}>${o.options.map(x=>`<option ${String(x)===String(val)?'selected':''}>${esc(x)}</option>`).join('')}</select>`:o.area?`<textarea class="input" name="${name}" ${a}>${esc(val)}</textarea>`:`<input class="input" name="${name}" type="${o.type||'text'}" value="${esc(val)}" ${a}>`;return`<div class="field ${o.full?'full':''}"><label>${label}</label>${inner}${o.hint?`<span class="hint">${o.hint}</span>`:''}</div>`}
const head=(t,p,actions='')=>`<div class="page-head"><div><h1>${t}</h1><p>${p}</p></div><div class="row">${actions}</div></div>`;

const ui={inv:{q:'',cat:'',st:'',sort:'name',dir:1},disp:{q:'',cart:[],ref:'',note:''},led:{type:'',q:'',from:'',to:''},exp:{tab:'soon'},recvDrug:''};
let importData=null;

function dashboard(){
  const live=S.batches.filter(b=>b.qty>0);
  const units=live.reduce((s,b)=>s+b.qty,0);
  const value=live.reduce((s,b)=>s+b.qty*b.cost,0);
  const since=addDays(-30).toISOString();
  const outs=S.tx.filter(t=>t.type==='out'&&!t.reversed);
  const rev30=outs.filter(t=>t.date>=since).reduce((s,t)=>s+t.qty*t.unitPrice,0);
  const cost30=outs.filter(t=>t.date>=since).reduce((s,t)=>s+t.qty*t.unitCost,0);
  const low=S.drugs.map(d=>({d,st:stockState(d),q:sellable(d.id)})).filter(x=>x.st[0]!=='ok').sort((a,b)=>a.q-b.q);
  const exp=live.filter(b=>daysTo(b.expiry)<=S.settings.warnDays).sort((a,b)=>a.expiry.localeCompare(b.expiry));
  const risk=exp.reduce((s,b)=>s+b.qty*b.cost,0);
  const days=[...Array(14)].map((_,i)=>ymd(addDays(i-13)));
  const perDay=days.map(k=>outs.filter(t=>ymd(new Date(t.date))===k).reduce((s,t)=>s+t.qty*t.unitPrice,0));
  const max=Math.max(...perDay,1);
  const recent=S.tx.slice().sort(byDateDesc).slice(0,7);
  const greet=new Date().getHours()<12?'Good morning':new Date().getHours()<18?'Good afternoon':'Good evening';
  return head(greet,`Here is how the shelves look on ${fdate(today())}.`,`<a class="btn" href="#/receive">${ic('in')}Receive</a><a class="btn primary" href="#/dispense">${ic('out')}Dispense</a>`)+`
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><div class="k">Products</div><div class="v">${fnum(S.drugs.length)}</div><div class="s">${fnum(units)} units on hand</div></div>
    <div class="card stat"><div class="k">Stock value at cost</div><div class="v">${money(value)}</div><div class="s">${fnum(live.length)} active batches</div></div>
    <div class="card stat accent"><div class="k">Revenue · 30 days</div><div class="v">${money(rev30)}</div><div class="s">Margin ${money(rev30-cost30)}</div></div>
    <div class="card stat"><div class="k">Value at expiry risk</div><div class="v" style="color:${risk?'var(--warn)':'inherit'}">${money(risk)}</div><div class="s">${exp.length} batches ≤ ${S.settings.warnDays} days</div></div>
  </div>
  <div class="grid g2" style="margin-bottom:16px">
    <section class="card card-pad"><h2>Dispensing · last 14 days <span class="sub">${money(perDay.reduce((a,b)=>a+b,0))}</span></h2>
      <div class="chart">${perDay.map((v,i)=>`<div class="col" title="${fdate(days[i])}: ${money(v)}"><b style="height:${Math.max(2,v/max*100)}%;${i===13?'background:var(--accent)':''}"></b><span>${new Date(days[i]+'T00:00').getDate()}</span></div>`).join('')}</div>
    </section>
    <section class="card card-pad"><h2>Needs reordering <span class="row" style="gap:4px">${low.length?`<button class="btn sm ghost" data-act="po-gen" title="Draft purchase orders">${ic('doc')}Order</button>`:''}<a class="btn sm ghost" href="#/inventory" data-act="goto-inv" data-k="low">View all</a></span></h2>
      ${low.length?`<div class="list">${low.slice(0,5).map(x=>`<div class="list-item click" data-act="drug" data-id="${x.d.id}" style="cursor:pointer"><div><div class="name">${esc(dname(x.d))}</div><div class="sub">Reorder at ${fnum(x.d.reorder)}</div></div><div class="row"><span class="mono">${fnum(x.q)}</span><span class="pill ${x.st[2]}">${x.st[1]}</span></div></div>`).join('')}</div>`:`<div class="empty"><strong>All stocked up</strong>Nothing below reorder level.</div>`}
    </section>
  </div>
  <div class="grid g2">
    <section class="card card-pad"><h2>Expiring soon <a class="btn sm ghost" href="#/expiry">Review</a></h2>
      ${exp.length?`<div class="list">${exp.slice(0,5).map(b=>{const d=drug(b.drugId),e=expState(b.expiry);return`<div class="list-item"><div><div class="name">${esc(dname(d))}</div><div class="sub mono">Lot ${esc(b.lot)} · ${fnum(b.qty)} units</div></div><span class="pill ${e[2]}">${e[1]}</span></div>`}).join('')}</div>`:`<div class="empty"><strong>Nothing expiring</strong>No batches inside the warning window.</div>`}
    </section>
    <section class="card card-pad"><h2>Recent activity <a class="btn sm ghost" href="#/history">Ledger</a></h2>
      ${recent.length?`<div class="list">${recent.map(txItem).join('')}</div>`:`<div class="empty"><strong>No activity yet</strong>Receive stock to get started.</div>`}
    </section>
  </div>`;
}
function txItem(t){const [l,c]=TX[t.type]||['',''];const sign=['in','return'].includes(t.type)||(t.type==='adjust'&&t.qty>0)?'+':'−';return`<div class="list-item"><div><div class="name">${esc(t.drugName)}</div><div class="sub">${ftime(t.date)} · ${esc(t.ref||'')}</div></div><div class="row"><span class="mono">${sign}${fnum(Math.abs(t.qty))}</span><span class="pill ${c}">${l}</span></div></div>`}

function inventory(){
  const cats=[...new Set(S.drugs.map(d=>d.category).filter(Boolean))].sort();
  return head('Inventory',`${S.drugs.length} products · ${fnum(S.batches.reduce((s,b)=>s+Math.max(0,b.qty),0))} units on hand`,`<button class="btn" data-act="imp-pick">${ic('upload')}<span class="hide-sm">Import</span></button><button class="btn" data-act="export-xlsx">${ic('download')}<span class="hide-sm">Export</span></button><button class="btn primary" data-act="new-drug">${ic('plus')}New product</button>`)+`
  <div class="row" style="margin-bottom:14px">
    <label class="search">${ic('search')}<input class="input" id="inv-q" type="search" placeholder="Search name, generic, SKU, lot…" value="${esc(ui.inv.q)}" data-search></label>
    <select class="input" id="inv-cat" style="width:auto"><option value="">All categories</option>${cats.map(c=>`<option ${c===ui.inv.cat?'selected':''}>${esc(c)}</option>`).join('')}</select>
    <div class="tabs">${[['','All'],['low','Low'],['out','Out'],['exp','Expiring']].map(([k,l])=>`<button data-act="inv-st" data-k="${k}" class="${ui.inv.st===k?'on':''}">${l}</button>`).join('')}</div>
  </div>
  <div class="card table-wrap" id="inv-table"></div>`;
}
function invRows(){
  const {q,cat,st,sort,dir}=ui.inv,qq=q.toLowerCase().trim();
  const keys={name:x=>x.d.name.toLowerCase(),category:x=>(x.d.category||'').toLowerCase(),onhand:x=>x.sell,price:x=>+x.d.price,value:x=>x.val,expiry:x=>x.ne||'9999'};
  return S.drugs.map(d=>{const bs=liveBatches(d.id);return{d,bs,oh:bs.reduce((s,b)=>s+b.qty,0),sell:sellable(d.id),ne:bs[0]?.expiry||'',val:bs.reduce((s,b)=>s+b.qty*b.cost,0),st:stockState(d)}})
    .filter(r=>(!cat||r.d.category===cat)&&(!st||(st==='exp'?r.ne&&daysTo(r.ne)<=S.settings.warnDays:r.st[0]===st))&&(!qq||[r.d.name,r.d.generic,r.d.sku,r.d.category,r.d.strength,...r.bs.map(b=>b.lot)].join(' ').toLowerCase().includes(qq)))
    .sort((a,b)=>{const A=keys[sort](a),B=keys[sort](b);return(A>B?1:A<B?-1:0)*dir});
}
function renderInvTable(){
  const el=$('#inv-table');if(!el)return;
  const rows=invRows();
  const th=(k,l,cls='')=>`<th data-act="sort" data-sort="${k}" class="${cls}">${l}${ui.inv.sort===k?`<span class="arr">${ui.inv.dir>0?'↑':'↓'}</span>`:''}</th>`;
  el.innerHTML=`<table><thead><tr>${th('name','Product')}${th('category','Category','hide-sm')}${th('onhand','Sellable','num')}${th('price','Price','num hide-sm')}${th('value','Value','num hide-sm')}${th('expiry','Next expiry')}<th>Status</th></tr></thead><tbody>${rows.length?rows.map(r=>{const e=r.ne?expState(r.ne):null;return`<tr class="click" data-act="drug" data-id="${r.d.id}"><td><div class="name">${esc(dname(r.d))}</div><div class="sub">${esc(r.d.generic||'')} · ${esc(r.d.form)}${r.d.sku?` · <span class="mono">${esc(r.d.sku)}</span>`:''}</div></td><td class="t2 hide-sm">${esc(r.d.category||'—')}</td><td class="num mono">${fnum(r.sell)}${r.oh!==r.sell?`<div class="sub">${fnum(r.oh-r.sell)} expired</div>`:''}</td><td class="num hide-sm">${money(r.d.price)}</td><td class="num hide-sm">${money(r.val)}</td><td>${e?`<span class="pill ${e[2]}">${e[1]}</span>`:'<span class="muted">—</span>'}</td><td><span class="pill ${r.st[2]}">${r.st[1]}</span></td></tr>`}).join(''):`<tr><td colspan="7"><div class="empty"><strong>No products match</strong>Try a different search or filter.</div></td></tr>`}</tbody></table>`;
}

function drugDetail(id){
  const d=drug(id);if(!d)return;
  const bs=liveBatches(id),st=stockState(d),val=bs.reduce((s,b)=>s+b.qty*b.cost,0);
  const txs=S.tx.filter(t=>t.drugId===id).sort(byDateDesc).slice(0,8);
  openDrawer(`<div class="panel"><header class="panel-head"><div><h3>${esc(d.name)} <span class="t2" style="font-size:17px">${esc(d.strength)}</span></h3><div class="sub">${esc([d.generic,d.form,d.category,d.sku].filter(Boolean).join(' · '))}</div></div>${closeBtn}</header>
  <div class="panel-body">
    <div class="kv"><div><small>Sellable</small><b>${fnum(sellable(id))}</b> <span class="pill ${st[2]}">${st[1]}</span></div><div><small>Reorder level</small><b>${fnum(d.reorder)}</b></div><div><small>Sell price / ${esc(d.unit||'unit')}</small><b>${money(d.price)}</b></div><div><small>Stock value at cost</small><b>${money(val)}</b></div></div>
    <div class="section-label">Batches · first expiry first out</div>
    ${bs.length?`<div class="card table-wrap"><table><thead><tr><th>Lot</th><th>Expiry</th><th class="num">Qty</th><th class="num">Cost</th><th></th></tr></thead><tbody>${bs.map(b=>{const e=expState(b.expiry);return`<tr><td><div class="mono">${esc(b.lot)}</div><div class="sub">${esc(b.supplier||'')}</div></td><td><span class="pill ${e[2]}">${e[0]==='ok'?fdate(b.expiry):e[1]}</span></td><td class="num mono">${fnum(b.qty)}</td><td class="num">${money(b.cost)}</td><td class="num" style="white-space:nowrap"><button class="btn sm ghost icon" title="Print labels" data-act="label" data-id="${b.id}" data-n="${b.qty}">${ic('print')}</button><button class="btn sm ghost icon" title="Adjust quantity" data-act="adjust" data-id="${b.id}">${ic('edit')}</button><button class="btn sm ghost icon danger" title="Dispose batch" data-act="dispose" data-id="${b.id}">${ic('trash')}</button></td></tr>`}).join('')}</tbody></table></div>`:`<div class="card empty"><strong>No stock on hand</strong>Receive a batch to start selling this product.</div>`}
    <div class="section-label">Recent activity</div>
    ${txs.length?`<div class="list">${txs.map(txItem).join('')}</div>`:'<p class="muted">No transactions yet.</p>'}
    ${d.notes?`<div class="section-label">Notes</div><p class="t2" style="white-space:pre-wrap;margin:0">${esc(d.notes)}</p>`:''}
  </div>
  <footer class="panel-foot"><button class="btn danger" data-act="del-drug" data-id="${id}">${ic('trash')}Delete</button><span style="flex:1"></span><button class="btn" data-act="edit-drug" data-id="${id}">${ic('edit')}Edit</button><button class="btn primary" data-act="receive-for" data-id="${id}">${ic('in')}Receive</button></footer></div>`);
}
function drugForm(id,from='',pre=''){
  const d=id?drug(id):{name:pre,generic:'',strength:'',form:'Tablet',category:'',sku:'',unit:'unit',price:'',reorder:10,notes:''};
  const cats=[...new Set(S.drugs.map(x=>x.category).filter(Boolean))].sort();
  openDrawer(`<form class="panel" data-form="drug" data-id="${id||''}" data-from="${from}" novalidate><header class="panel-head"><h3>${id?'Edit product':'New product'}</h3>${closeBtn}</header>
  <div class="panel-body"><div class="form-grid">
    ${fld('Brand / name *','name',d.name,{full:1,attrs:'required maxlength="80" autocomplete="off"'})}
    ${fld('Generic name','generic',d.generic,{attrs:'maxlength="80"'})}
    ${fld('Strength','strength',d.strength,{attrs:'placeholder="500 mg"'})}
    ${fld('Dosage form','form',d.form,{options:FORMS})}
    ${fld('Category','category',d.category,{attrs:'list="cat-list" placeholder="Analgesic"'})}<datalist id="cat-list">${cats.map(c=>`<option value="${esc(c)}">`).join('')}</datalist>
    ${fld('SKU / barcode','sku',d.sku,{attrs:'autocomplete="off"'})}
    ${fld('Dispensing unit','unit',d.unit,{attrs:'placeholder="unit, pack, bottle"'})}
    ${fld('Sell price per unit *','price',d.price,{type:'number',attrs:'required min="0" step="0.01"'})}
    ${fld('Reorder level *','reorder',d.reorder,{type:'number',attrs:'required min="0" step="1"',hint:'Flag as low when sellable stock falls to this.'})}
    ${fld('Notes','notes',d.notes,{area:1,full:1})}
  </div><p class="err-text" id="drug-err"></p></div>
  <footer class="panel-foot"><button type="button" class="btn" data-act="${id?'drug':'close'}" data-id="${id||''}">Cancel</button><button class="btn primary">${id?'Save changes':'Create product'}</button></footer></form>`);
}

function receive(){
  const opts=S.drugs.slice().sort(byName).map(d=>`<option value="${d.id}" ${d.id===ui.recvDrug?'selected':''}>${esc(dname(d))} · ${esc(d.form)}</option>`).join('');
  const sups=[...new Set(S.batches.map(b=>b.supplier).filter(Boolean))].sort();
  const last=S.tx.filter(t=>t.type==='in').sort(byDateDesc).slice(0,8);
  const lb=ui.recvDrug?S.batches.filter(b=>b.drugId===ui.recvDrug).slice(-1)[0]:null;
  return head('Receive stock','Log a delivery. Each lot and expiry is tracked as its own batch.')+`
  <div class="grid g2" style="align-items:start">
    <form class="card card-pad" data-form="receive" novalidate><h2>Delivery</h2>
      <div class="form-grid">
        <div class="field full"><label>Product *</label><div class="row" style="flex-wrap:nowrap">${productCombo('drugId',ui.recvDrug,{hid:'recv-drug',attrs:ui.recvDrug?'':'autofocus'})}<button type="button" class="btn" data-act="new-drug" data-from="receive">${ic('plus')}New</button></div><span class="hint">${ui.recvDrug&&drug(ui.recvDrug)?`${fnum(sellable(ui.recvDrug))} sellable now · ${liveBatches(ui.recvDrug).length} batches`:''}</span></div>
        ${fld('Lot / batch no. *','lot','',{attrs:`required autocomplete="off" ${ui.recvDrug?'autofocus':''}`})}
        ${dateField('Expiry date *','expiry','',{mode:'expiry',min:today(),chips:[['+6 mo','+6m'],['+1 yr','+1y'],['+2 yr','+2y'],['+3 yr','+3y']],hint:'Type 12/27 for end of month'})}
        ${fld('Quantity *','qty','',{type:'number',attrs:'required min="1" step="1"'})}
        ${fld('Unit cost','cost',lb?lb.cost:'',{type:'number',attrs:'min="0" step="0.01" id="recv-cost"'})}
        ${fld('Supplier','supplier',lb?lb.supplier:'',{attrs:'list="sup-list" id="recv-sup"'})}<datalist id="sup-list">${sups.map(s=>`<option value="${esc(s)}">`).join('')}</datalist>
        ${dateField('Received on','received',today(),{max:today(),chips:[['Today','t'],['Yesterday','y']]})}
        ${fld('PO / invoice ref','ref','',{attrs:'autocomplete="off"'})}
        ${fld('New sell price','price','',{type:'number',attrs:`min="0" step="0.01" id="recv-price" placeholder="${ui.recvDrug?esc(drug(ui.recvDrug)?.price):'Keep current'}"`,hint:'Leave empty to keep the current price.'})}
      </div>
      <p class="err-text" id="recv-err"></p>
      <div class="row" style="justify-content:flex-end;margin-top:8px"><span class="sub" style="margin-right:auto">Enter moves to next field</span><button type="button" class="btn ghost" data-act="recv-clear">Clear</button><button class="btn primary">${ic('in')}Receive stock</button></div>
    </form>
    <section class="card card-pad"><h2>Recent receipts <button class="btn sm" data-act="imp-pick">${ic('upload')}Import file</button></h2>${last.length?`<div class="list">${last.map(t=>`<div class="list-item"><div><div class="name">${esc(t.drugName)}</div><div class="sub">${fdate(t.date)} · Lot <span class="mono">${esc(t.lot)}</span>${t.ref?' · '+esc(t.ref):''}</div></div><div class="row" style="flex-wrap:nowrap"><div style="text-align:right"><div class="mono">+${fnum(t.qty)}</div><div class="sub">${money(t.qty*t.unitCost)}</div></div>${S.batches.some(b=>b.id===t.batchId)?`<button class="btn ghost icon" data-act="label" data-id="${t.batchId}" data-n="${t.qty}" title="Print labels">${ic('print')}</button>`:''}</div></div>`).join('')}</div>`:`<div class="empty"><strong>No receipts yet</strong></div>`}</section>
  </div>`;
}

function dispense(){
  return head('Dispense','Stock is drawn automatically from the batch that expires first. Expired stock is never dispensed.')+`
  <div class="dispense-layout">
    <section class="card"><div style="padding:14px;border-bottom:1px solid var(--line)"><label class="search">${ic('search')}<input class="input" id="disp-q" type="search" placeholder="Search or scan SKU · Enter adds top match" value="${esc(ui.disp.q)}" data-search autocomplete="off" autofocus></label></div><div class="pick-list" id="pick-list"></div></section>
    <aside class="card card-pad cart" id="cart"></aside>
  </div>`;
}
function renderPick(){
  const el=$('#pick-list');if(!el)return;
  const q=ui.disp.q.toLowerCase().trim();
  const list=S.drugs.filter(d=>!q||[d.name,d.generic,d.sku,d.strength].join(' ').toLowerCase().includes(q)).sort(byName);
  el.innerHTML=list.length?list.map(d=>{const a=sellable(d.id),inCart=ui.disp.cart.find(l=>l.id===d.id);return`<div class="pick ${a?'':'disabled'}" data-act="${a?'add-cart':''}" data-id="${d.id}"><div><div class="name">${esc(dname(d))}</div><div class="sub">${esc(d.generic||d.form)} · ${money(d.price)} / ${esc(d.unit||'unit')}</div></div><div class="row">${inCart?`<span class="pill p-info">${inCart.qty} in cart</span>`:''}<span class="mono ${a?'':'muted'}">${a?fnum(a)+' avail.':'Out'}</span></div></div>`}).join(''):`<div class="empty"><strong>No products found</strong></div>`;
}
function cartTotal(){return ui.disp.cart.reduce((s,l)=>s+(drug(l.id)?.price||0)*(+l.qty||0),0)}
function renderCart(){
  const el=$('#cart');if(!el)return;
  const c=ui.disp.cart;
  el.innerHTML=`<h2>${ic('cart')} Order <span class="sub">${c.length} item${c.length===1?'':'s'}</span></h2>
  ${c.length?c.map(l=>{const d=drug(l.id),a=sellable(l.id),bad=!(l.qty>0&&Number.isInteger(+l.qty))||l.qty>a;return`<div class="cart-line"><div><div class="name">${esc(dname(d))}</div><div class="sub ${bad?'err-text':''}">${bad?`Max ${fnum(a)} available`:money(d.price)+' each'}</div></div><input class="input" type="number" min="1" max="${a}" step="1" value="${l.qty}" data-cart-qty="${l.id}" aria-label="Quantity"><button class="btn ghost icon" data-act="rm-cart" data-id="${l.id}" aria-label="Remove">${ic('x')}</button></div>`}).join(''):`<div class="empty" style="padding:30px 10px"><strong>Order is empty</strong>Pick products from the list.</div>`}
  <div class="cart-total"><span>Total</span><span id="cart-total">${money(cartTotal())}</span></div>
  <div class="form-grid" style="margin-top:12px"><div class="field full"><label>Prescription / patient ref</label><input class="input" id="disp-ref" value="${esc(ui.disp.ref)}" placeholder="Auto-generated if empty" autocomplete="off"></div><div class="field full"><label>Note</label><input class="input" id="disp-note" value="${esc(ui.disp.note)}" autocomplete="off"></div></div>
  <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" data-act="clear-cart" ${c.length?'':'disabled'}>Clear</button><button class="btn primary" data-act="checkout" ${c.length?'':'disabled'}>${ic('out')}Dispense</button></div>`;
}
function checkout(){
  const c=ui.disp.cart;if(!c.length)return;
  for(const l of c){const d=drug(l.id),a=sellable(l.id);if(!d)return toast('A product in the order no longer exists','err');if(!(l.qty>0&&Number.isInteger(+l.qty)))return toast(`Invalid quantity for ${d.name}`,'err');if(l.qty>a)return toast(`Only ${a} ${d.name} available`,'err')}
  const ref=ui.disp.ref.trim()||'RX-'+Date.now().toString(36).toUpperCase().slice(-6);
  const now=new Date().toISOString();let total=0;
  for(const l of c){const d=drug(l.id);let need=+l.qty;for(const b of liveBatches(l.id).filter(b=>daysTo(b.expiry)>=0)){if(!need)break;const take=Math.min(need,b.qty);b.qty-=take;need-=take;total+=take*d.price;S.tx.push({id:uid(),type:'out',date:now,drugId:d.id,drugName:dname(d),batchId:b.id,lot:b.lot,qty:take,unitPrice:+d.price,unitCost:+b.cost,ref,note:ui.disp.note.trim()})}}
  save();ui.disp={q:'',cart:[],ref:'',note:''};route();receiptPrompt(ref,total);
}

function history(){
  return head('Ledger','Every movement of stock, in one auditable list.',`<button class="btn" data-act="csv-led">${ic('download')}<span class="hide-sm">Export CSV</span></button>`)+`
  <div class="row" style="margin-bottom:14px">
    <label class="search">${ic('search')}<input class="input" id="led-q" type="search" placeholder="Search product, lot, reference…" value="${esc(ui.led.q)}" data-search></label>
    <div class="led-dates">${dateField('','from',ui.led.from,{hid:'led-from',max:today(),ph:'From',nohint:1})}<span class="muted">–</span>${dateField('','to',ui.led.to,{hid:'led-to',ph:'To',nohint:1})}</div>
    <div class="tabs">${[['Today',0],['7d',6],['30d',29],['90d',89],['All','']].map(([l,n])=>{const f=n===''?'':ymd(addDays(-n));return`<button data-act="led-range" data-n="${n}" class="${ui.led.from===f&&(ui.led.to===''||n==='')?'on':''}">${l}</button>`}).join('')}</div>
  </div>
  <div class="row" style="margin-bottom:14px">
    <div class="tabs">${[['','All'],...Object.entries(TX).map(([k,v])=>[k,v[0]])].map(([k,l])=>`<button data-act="led-type" data-k="${k}" class="${ui.led.type===k?'on':''}">${l}</button>`).join('')}</div>
  </div>
  <div id="led-sum" class="grid g4" style="margin-bottom:14px"></div>
  <div class="card table-wrap" id="led-table"></div>`;
}
function ledRows(){const {type,q,from,to}=ui.led,qq=q.toLowerCase().trim();return S.tx.filter(t=>(!type||t.type===type)&&(!from||ymd(new Date(t.date))>=from)&&(!to||ymd(new Date(t.date))<=to)&&(!qq||[t.drugName,t.lot,t.ref,t.note].join(' ').toLowerCase().includes(qq))).sort(byDateDesc)}
function renderLedger(){
  const el=$('#led-table');if(!el)return;
  const rows=ledRows();
  const outs=rows.filter(t=>t.type==='out'&&!t.reversed);
  const rev=outs.reduce((s,t)=>s+t.qty*t.unitPrice,0),cost=outs.reduce((s,t)=>s+t.qty*t.unitCost,0);
  const inU=rows.filter(t=>t.type==='in').reduce((s,t)=>s+t.qty,0),outU=outs.reduce((s,t)=>s+t.qty,0);
  const loss=rows.filter(t=>t.type==='dispose'||(t.type==='adjust'&&t.qty<0)).reduce((s,t)=>s+Math.abs(t.qty)*t.unitCost,0);
  $('#led-sum').innerHTML=`<div class="card stat"><div class="k">Units received</div><div class="v">${fnum(inU)}</div></div><div class="card stat"><div class="k">Units dispensed</div><div class="v">${fnum(outU)}</div></div><div class="card stat accent"><div class="k">Revenue</div><div class="v">${money(rev)}</div><div class="s">Margin ${money(rev-cost)}</div></div><div class="card stat"><div class="k">Write-offs</div><div class="v">${money(loss)}</div></div>`;
  const shown=rows.slice(0,400);
  el.innerHTML=`<table><thead><tr><th>Date</th><th>Type</th><th>Product</th><th class="hide-sm">Lot</th><th class="num">Qty</th><th class="num hide-sm">Value</th><th class="hide-sm">Ref</th><th></th></tr></thead><tbody>${shown.length?shown.map(t=>{const [l,c]=TX[t.type]||['?',''];const plus=['in','return'].includes(t.type)||(t.type==='adjust'&&t.qty>0);const v=t.type==='out'?t.qty*t.unitPrice:Math.abs(t.qty)*t.unitCost;return`<tr style="${t.reversed?'opacity:.5':''}"><td class="t2" style="white-space:nowrap">${ftime(t.date)}</td><td><span class="pill ${c}">${l}</span></td><td><div class="name">${esc(t.drugName)}</div>${t.note?`<div class="sub">${esc(t.note)}</div>`:''}</td><td class="mono hide-sm">${esc(t.lot||'')}</td><td class="num mono">${plus?'+':'−'}${fnum(Math.abs(t.qty))}</td><td class="num hide-sm">${money(v)}</td><td class="mono hide-sm">${esc(t.ref||'')}</td><td class="num" style="white-space:nowrap">${t.type==='out'?`<button class="btn sm ghost icon" data-act="receipt" data-ref="${esc(t.ref)}" title="Print receipt">${ic('print')}</button>`:''}${t.type==='in'&&S.batches.some(b=>b.id===t.batchId)?`<button class="btn sm ghost icon" data-act="label" data-id="${t.batchId}" data-n="${t.qty}" title="Print labels">${ic('print')}</button>`:''}${t.type==='out'&&!t.reversed&&S.batches.some(b=>b.id===t.batchId)?`<button class="btn sm ghost" data-act="reverse" data-id="${t.id}">Return</button>`:t.reversed?'<span class="sub">Returned</span>':''}</td></tr>`}).join(''):`<tr><td colspan="8"><div class="empty"><strong>No transactions</strong>Adjust the filters to see more.</div></td></tr>`}</tbody></table>${rows.length>400?`<div class="sub" style="padding:10px 14px">Showing 400 of ${fnum(rows.length)} — export CSV for everything.</div>`:''}`;
}

function expiry(){
  const w=S.settings.warnDays;
  const tabs=[['expired','Expired',b=>daysTo(b.expiry)<0],['30','≤ 30 days',b=>{const n=daysTo(b.expiry);return n>=0&&n<=30}],['soon',`≤ ${w} days`,b=>{const n=daysTo(b.expiry);return n>=0&&n<=w}],['all','All batches',()=>true]];
  const live=S.batches.filter(b=>b.qty>0);
  const cur=tabs.find(t=>t[0]===ui.exp.tab)||tabs[2];
  const rows=live.filter(cur[2]).sort((a,b)=>a.expiry.localeCompare(b.expiry));
  const val=rows.reduce((s,b)=>s+b.qty*b.cost,0);
  const expiredCount=live.filter(tabs[0][2]).length;
  return head('Expiry',`${rows.length} batches · ${money(val)} at cost`,cur[0]==='expired'&&rows.length?`<button class="btn danger" data-act="dispose-all">${ic('trash')}Dispose all expired</button>`:'')+`
  <div class="row" style="margin-bottom:14px"><div class="tabs">${tabs.map(t=>`<button data-act="exp-tab" data-k="${t[0]}" class="${t[0]===cur[0]?'on':''}">${t[1]}${t[0]==='expired'&&expiredCount?` <b style="color:var(--bad)">${expiredCount}</b>`:''}</button>`).join('')}</div></div>
  <div class="card table-wrap"><table><thead><tr><th>Product</th><th>Lot</th><th>Expiry</th><th class="num">Qty</th><th class="num hide-sm">Value</th><th class="hide-sm">Supplier</th><th></th></tr></thead><tbody>${rows.length?rows.map(b=>{const d=drug(b.drugId),e=expState(b.expiry);return`<tr><td><a class="name" href="javascript:void 0" data-act="drug" data-id="${b.drugId}">${esc(dname(d)||'Unknown')}</a></td><td class="mono">${esc(b.lot)}</td><td><span class="pill ${e[2]}">${e[1]}</span><div class="sub">${fdate(b.expiry)}</div></td><td class="num mono">${fnum(b.qty)}</td><td class="num hide-sm">${money(b.qty*b.cost)}</td><td class="t2 hide-sm">${esc(b.supplier||'—')}</td><td class="num"><button class="btn sm danger" data-act="dispose" data-id="${b.id}">Dispose</button></td></tr>`}).join(''):`<tr><td colspan="7"><div class="empty"><strong>Nothing here</strong>No batches in this window.</div></td></tr>`}</tbody></table></div>`;
}

function settings(){
  const kb=(new Blob([localStorage.getItem(KEY)||'']).size/1024).toFixed(1);
  return head('Settings','Preferences and your data. Everything lives in this browser.')+`
  <div class="grid g2" style="align-items:start">
    <section class="card card-pad"><h2>Preferences</h2>
      <div class="form-grid">
        <div class="field full"><label>Appearance</label><div class="tabs">${['light','dark','system'].map(t=>`<button data-act="theme" data-t="${t}" class="${S.settings.theme===t?'on':''}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div></div>
        <div class="field"><label>Currency</label><select class="input" id="set-cur">${CURR.map(c=>`<option ${c===S.settings.currency?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Expiry warning (days)</label><input class="input" id="set-warn" type="number" min="7" max="365" value="${S.settings.warnDays}"></div>
      </div>
    </section>
    <section class="card card-pad"><h2>Backup &amp; restore <span class="sub">${kb} KB stored</span></h2>
      <div class="row" style="margin-bottom:14px"><button class="btn primary" data-act="export-json">${ic('download')}Backup .json</button><button class="btn" data-act="export-xlsx">${ic('download')}Excel workbook</button><button class="btn" data-act="csv-inv">${ic('download')}Inventory CSV</button><button class="btn" data-act="csv-led">${ic('download')}Ledger CSV</button></div>
      <label class="dropzone" id="dropzone">${ic('upload')}<div style="margin-top:6px"><strong>Import a file</strong></div><div class="sub">Drop a Pillbug backup (.json) or a stock list (.csv, .xlsx, .xls, .ods) — or click to browse</div><input type="file" id="import-file" accept=".json,.csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods" hidden></label>
      <p class="sub" style="margin:10px 0 0">Spreadsheets: pick the sheet, match columns, preview, then import. <a href="javascript:void 0" data-act="imp-template" style="color:var(--accent)">Download a template</a></p>
    </section>
    <section class="card card-pad"><h2>Pharmacy details <span class="sub">Printed on receipts &amp; orders</span></h2><div class="form-grid">${[['sn','Pharmacy name','name'],['sp','Phone','phone'],['sa','Address','address'],['sf','Receipt footer','footer']].map(([i,l,k])=>`<div class="field ${k==='address'||k==='footer'?'full':''}"><label>${l}</label><input class="input" id="set-${i}" data-store="${k}" value="${esc((S.settings.store||{})[k]||'')}"></div>`).join('')}</div></section>
    <section class="card card-pad"><h2>Demo data</h2><p class="t2" style="margin-top:0">Reload the sample pharmacy, or start from an empty shelf.</p><div class="row"><button class="btn" data-act="load-demo">Load sample data</button><button class="btn danger" data-act="wipe">${ic('trash')}Erase everything</button></div></section>
    <section class="card card-pad"><h2>About</h2><p class="t2" style="margin:0">Pillbug is a local-first demo. Data is kept in <span class="mono">localStorage</span> on this device only — export a backup regularly. Shortcuts: <span class="mono">/</span> search, <span class="mono">Esc</span> close panels.</p></section>
  </div>`;
}

function handleImport(file){
  if(!file)return;
  if(file.size>5e6)return toast('File is too large','err');
  const r=new FileReader();
  r.onload=()=>{
    let d;try{d=JSON.parse(r.result)}catch(e){return toast('That file is not valid JSON','err')}
    if(!d||!Array.isArray(d.drugs)||!Array.isArray(d.batches)||!Array.isArray(d.tx))return toast('Not a Pillbug backup','err');
    const okD=d.drugs.every(x=>x&&x.id&&x.name),okB=d.batches.every(x=>x&&x.id&&x.drugId&&x.expiry&&Number.isFinite(+x.qty));
    if(!okD||!okB)return toast('Backup contains malformed records','err');
    importData=normalize(d);
    openModal(`<div class="panel"><div class="card-pad"><h3 style="margin:0 0 6px;font:500 21px var(--serif)">Import backup</h3><p class="t2" style="margin:0 0 12px">${esc(file.name)} contains ${d.drugs.length} products, ${d.batches.length} batches and ${d.tx.length} transactions.</p><p class="sub" style="margin:0"><b>Merge</b> adds new records and updates matching ones. <b>Replace</b> discards current data.</p></div><div class="panel-foot"><button class="btn" data-act="modal-close">Cancel</button><button class="btn" data-act="import" data-mode="merge">Merge</button><button class="btn primary" data-act="import" data-mode="replace">Replace</button></div></div>`);
  };
  r.readAsText(file);
}
function doImport(mode){
  const d=importData;if(!d)return;
  if(mode==='replace')S=d;
  else{for(const k of['drugs','batches','tx','pos']){const m=new Map(S[k].map(x=>[x.id,x]));d[k].forEach(x=>m.set(x.id,x));S[k]=[...m.values()]}}
  S.batches.forEach(b=>{b.qty=Math.max(0,Math.round(+b.qty||0));b.cost=+b.cost||0});
  S.drugs.forEach(x=>{x.price=+x.price||0;x.reorder=+x.reorder||0;x.form=x.form||'Other'});
  importData=null;save();applyTheme();closeAll();toast(mode==='replace'?'Backup restored':'Backup merged');route();
}

const A={
  close:closeAll,
  'modal-close':()=>{$('#modal').close();pending=null},
  'modal-ok':()=>{const f=pending;pending=null;$('#modal').close();f&&f()},
  theme:ds=>{S.settings.theme=ds.t;save();applyTheme();if(cur==='settings')route()},
  drug:ds=>drugDetail(ds.id),
  'new-drug':ds=>drugForm(null,ds.from),
  'edit-drug':ds=>drugForm(ds.id),
  'del-drug':ds=>{const d=drug(ds.id);confirmBox('Delete product?',`<b>${esc(dname(d))}</b> and its ${liveBatches(d.id).length} batches will be removed. Ledger entries are kept for audit.`,'Delete',()=>{S.drugs=S.drugs.filter(x=>x.id!==d.id);S.batches=S.batches.filter(b=>b.drugId!==d.id);ui.disp.cart=ui.disp.cart.filter(l=>l.id!==d.id);save();closeAll();toast('Product deleted');route()})},
  'receive-for':ds=>{ui.recvDrug=ds.id;closeAll();if(cur==='receive')route();else location.hash='#/receive'},
  'goto-inv':ds=>{ui.inv.st=ds.k;location.hash='#/inventory';if(cur==='inventory')route()},
  sort:ds=>{const k=ds.sort;ui.inv.dir=ui.inv.sort===k?-ui.inv.dir:1;ui.inv.sort=k;renderInvTable()},
  'inv-st':ds=>{ui.inv.st=ds.k;route()},
  'led-type':ds=>{ui.led.type=ds.k;route()},
  'led-range':ds=>{ui.led.from=ds.n===''?'':ymd(addDays(-ds.n));ui.led.to='';route()},
  'recv-clear':()=>{ui.recvDrug='';route()},
  'reorder-csv':()=>{const rows=S.drugs.map(d=>({d,q:sellable(d.id)})).filter(x=>x.q<=x.d.reorder).sort((a,b)=>a.d.name.localeCompare(b.d.name));const sup=id=>S.batches.filter(b=>b.drugId===id).slice(-1)[0];download(`pillbug-reorder-${today()}.csv`,'\ufeff'+csv([['Product','Strength','Form','SKU','Sellable','Reorder level','Suggested order','Last supplier','Last unit cost','Est. cost'],...rows.map(({d,q})=>{const b=sup(d.id),n=Math.max(d.reorder*2-q,d.reorder||1);return[d.name,d.strength,d.form,d.sku,q,d.reorder,n,b?.supplier||'',b?.cost??'',b?+(n*b.cost).toFixed(2):'']})]),'text/csv');toast('Purchase list downloaded')},
  'exp-tab':ds=>{ui.exp.tab=ds.k;route()},
  adjust:ds=>{const b=S.batches.find(x=>x.id===ds.id),d=drug(b.drugId);openModal(`<form class="panel" data-form="adjust" data-id="${b.id}" novalidate><div class="card-pad"><h3 style="margin:0 0 4px;font:500 21px var(--serif)">Adjust quantity</h3><p class="sub" style="margin:0 0 16px">${esc(dname(d))} · Lot <span class="mono">${esc(b.lot)}</span> · currently ${fnum(b.qty)}</p><div class="form-grid">${fld('Counted quantity','qty',b.qty,{type:'number',attrs:'required min="0" step="1"'})}${fld('Reason','reason','Stock count',{options:['Stock count','Damaged','Lost / stolen','Data correction','Other']})}${fld('Note','note','',{full:1})}</div><p class="err-text" id="adj-err"></p></div><div class="panel-foot"><button type="button" class="btn" data-act="modal-close">Cancel</button><button class="btn primary">Save</button></div></form>`)},
  dispose:ds=>{const b=S.batches.find(x=>x.id===ds.id),d=drug(b.drugId);confirmBox('Dispose batch?',`Write off <b>${fnum(b.qty)}</b> × ${esc(dname(d))}, lot <span class="mono">${esc(b.lot)}</span> (${money(b.qty*b.cost)} at cost).`,'Dispose',()=>{disposeBatch(b,'Disposed');save();toast('Batch disposed');afterMutation(d.id)})},
  'dispose-all':()=>{const bs=S.batches.filter(b=>b.qty>0&&daysTo(b.expiry)<0);confirmBox('Dispose all expired?',`${bs.length} batches worth ${money(bs.reduce((s,b)=>s+b.qty*b.cost,0))} at cost will be written off.`,'Dispose all',()=>{bs.forEach(b=>disposeBatch(b,'Expired — bulk disposal'));save();toast(`${bs.length} batches disposed`);route()})},
  'add-cart':ds=>{const l=ui.disp.cart.find(x=>x.id===ds.id);const a=sellable(ds.id);if(l){if(l.qty<a)l.qty++;else return toast('No more stock available','err')}else ui.disp.cart.push({id:ds.id,qty:1});renderPick();renderCart()},
  'rm-cart':ds=>{ui.disp.cart=ui.disp.cart.filter(l=>l.id!==ds.id);renderPick();renderCart()},
  'clear-cart':()=>{ui.disp.cart=[];renderPick();renderCart()},
  checkout,
  reverse:ds=>{const t=S.tx.find(x=>x.id===ds.id);confirmBox('Return to stock?',`Return <b>${fnum(t.qty)}</b> × ${esc(t.drugName)} to lot <span class="mono">${esc(t.lot)}</span> and void ${money(t.qty*t.unitPrice)} of revenue.`,'Return',()=>{const b=S.batches.find(x=>x.id===t.batchId);if(!b)return toast('Batch no longer exists','err');b.qty+=t.qty;t.reversed=true;S.tx.push({...t,id:uid(),type:'return',date:new Date().toISOString(),reversed:false,note:'Return of '+(t.ref||'dispense')});save();toast('Returned to stock');route()},false)},
  'export-json':()=>{download(`pillbug-backup-${today()}.json`,JSON.stringify({...S,exportedAt:new Date().toISOString(),app:'pillbug'},null,1),'application/json');toast('Backup exported')},
  'csv-inv':()=>{const rows=[['Name','Generic','Strength','Form','Category','SKU','Unit','Price','Reorder','Lot','Expiry','Qty','Unit cost','Supplier','Received']];S.drugs.slice().sort(byName).forEach(d=>{const bs=liveBatches(d.id);if(!bs.length)rows.push([d.name,d.generic,d.strength,d.form,d.category,d.sku,d.unit,d.price,d.reorder,'','',0,'','','']);bs.forEach(b=>rows.push([d.name,d.generic,d.strength,d.form,d.category,d.sku,d.unit,d.price,d.reorder,b.lot,b.expiry,b.qty,b.cost,b.supplier,b.received]))});download(`pillbug-inventory-${today()}.csv`,'\ufeff'+csv(rows),'text/csv')},
  'csv-led':()=>{const src=cur==='history'?ledRows():S.tx.slice().sort(byDateDesc);download(`pillbug-ledger-${today()}.csv`,'\ufeff'+csv([['Date','Type','Product','Lot','Qty','Unit price','Unit cost','Reference','Note','Returned'],...src.map(t=>[t.date,t.type,t.drugName,t.lot,t.qty,t.unitPrice,t.unitCost,t.ref,t.note,t.reversed?'yes':''])]),'text/csv')},
  import:ds=>doImport(ds.mode),
  'load-demo':()=>confirmBox('Load sample data?','Current products, batches and ledger will be replaced by the sample pharmacy. Export a backup first if you need it.','Load sample',()=>{S=seed(S.settings);save();toast('Sample data loaded');route()}),
  wipe:()=>confirmBox('Erase everything?','All products, batches and transactions will be permanently deleted from this browser.','Erase',()=>{S={...blank(),settings:S.settings};ui.disp.cart=[];save();toast('All data erased');route()})
};
function disposeBatch(b,note){const d=drug(b.drugId);S.tx.push({id:uid(),type:'dispose',date:new Date().toISOString(),drugId:b.drugId,drugName:dname(d),batchId:b.id,lot:b.lot,qty:b.qty,unitCost:b.cost,unitPrice:0,ref:'',note});b.qty=0}
function afterMutation(drugId){route();if($('#drawer').open&&drugId)drugDetail(drugId)}

const F={
  drug:(f,v)=>{
    const err=$('#drug-err'),id=f.dataset.id;
    const name=v.name.trim(),price=parseFloat(v.price),reorder=parseInt(v.reorder,10);
    if(!name)return err.textContent='Name is required.';
    if(!(price>=0))return err.textContent='Enter a valid sell price.';
    if(!(reorder>=0))return err.textContent='Enter a valid reorder level.';
    const key=x=>[x.name,x.strength,x.form].map(s=>String(s||'').trim().toLowerCase()).join('|');
    const rec={name,generic:v.generic.trim(),strength:v.strength.trim(),form:v.form,category:v.category.trim(),sku:v.sku.trim(),unit:v.unit.trim()||'unit',price:+price.toFixed(2),reorder,notes:v.notes.trim()};
    if(S.drugs.some(x=>x.id!==id&&key(x)===key(rec)))return err.textContent='A product with this name, strength and form already exists.';
    if(rec.sku&&S.drugs.some(x=>x.id!==id&&x.sku===rec.sku))return err.textContent='SKU is already in use.';
    let nid=id;
    if(id)Object.assign(drug(id),rec);else{nid=uid();S.drugs.push({id:nid,...rec,created:new Date().toISOString()})}
    save();toast(id?'Product updated':'Product created');
    if(f.dataset.from==='receive'){ui.recvDrug=nid;closeAll();route()}else{route();drugDetail(nid)}
  },
  receive:(f,v)=>{
    const err=$('#recv-err');const d=drug(v.drugId);const qty=Number(v.qty),cost=v.cost===''?0:parseFloat(v.cost);
    if(!d)return err.textContent='Choose a product.';
    if(!v.lot.trim())return err.textContent='Lot number is required.';
    if(!v.expiry)return err.textContent='Expiry date is required.';
    if(daysTo(v.expiry)<0)return err.textContent='This lot is already expired — it cannot be received.';
    if(!(qty>0&&Number.isInteger(qty)))return err.textContent='Quantity must be a whole number above zero.';
    if(!(cost>=0))return err.textContent='Unit cost is invalid.';
    if(v.price!==''){const p=parseFloat(v.price);if(!(p>=0))return err.textContent='Sell price is invalid.';d.price=+p.toFixed(2)}
    const lot=v.lot.trim();
    let b=S.batches.find(x=>x.drugId===d.id&&x.lot===lot&&x.expiry===v.expiry);
    if(b){b.cost=b.qty+qty?+(((b.qty*b.cost)+(qty*cost))/(b.qty+qty)).toFixed(4):cost;b.qty+=qty}
    else{b={id:uid(),drugId:d.id,lot,expiry:v.expiry,qty,cost,supplier:v.supplier.trim(),received:v.received||today()};S.batches.push(b)}
    const dt=v.received&&v.received!==today()?new Date(v.received+'T12:00:00').toISOString():new Date().toISOString();
    S.tx.push({id:uid(),type:'in',date:dt,drugId:d.id,drugName:dname(d),batchId:b.id,lot,qty,unitCost:cost,unitPrice:0,ref:v.ref.trim(),note:''});
    save();toast(`Received ${qty} × ${d.name}`);ui.recvDrug=d.id;route();$('[name=lot]')?.focus();
  },
  adjust:(f,v)=>{
    const b=S.batches.find(x=>x.id===f.dataset.id),q=Number(v.qty);
    if(!(q>=0&&Number.isInteger(q)))return $('#adj-err').textContent='Enter a whole number, 0 or more.';
    const delta=q-b.qty;if(!delta){$('#modal').close();return}
    const d=drug(b.drugId);
    S.tx.push({id:uid(),type:'adjust',date:new Date().toISOString(),drugId:b.drugId,drugName:dname(d),batchId:b.id,lot:b.lot,qty:delta,unitCost:b.cost,unitPrice:0,ref:v.reason,note:v.note.trim()});
    b.qty=q;save();$('#modal').close();toast('Quantity adjusted');afterMutation(d.id);
  }
};

const views={dashboard,inventory,receive,dispense,history,expiry,settings};
const after={inventory:renderInvTable,dispense:()=>{renderPick();renderCart()},history:renderLedger};
let cur='';
function route(){
  const v=(location.hash.slice(2)||'dashboard').split('?')[0];
  const view=views[v]?v:'dashboard';
  if(view!==cur)$$('#drawer[open]').forEach(d=>d.close());
  $$('.nav a').forEach(a=>{a.classList.toggle('active',a.dataset.v===view);a.toggleAttribute('aria-current',a.dataset.v===view)});
  const y=view===cur?scrollY:0;
  cur=view;
  $('#main').innerHTML=views[view]();
  after[view]?.();
  scrollTo(0,y);
  if(matchMedia('(pointer:fine)').matches)$('#main [autofocus]')?.focus({preventScroll:true});
  document.title=`${$('.nav a.active span')?.textContent||''} · Pillbug`;
}
function updateBadge(){const n=S.batches.filter(b=>b.qty>0&&daysTo(b.expiry)<=30).length;const el=$('#exp-badge');el.hidden=!n;el.textContent=n}

document.addEventListener('click',e=>{
  const dlg=e.target.tagName==='DIALOG'?e.target:null;if(dlg){dlg.close();return}
  const el=e.target.closest('[data-act]');if(!el||!el.dataset.act)return;
  const f=A[el.dataset.act];if(!f)return;
  if(el.tagName==='A'&&el.getAttribute('href')?.startsWith('#/')&&el.dataset.act!=='goto-inv')return;
  e.preventDefault();f(el.dataset,el);
});
document.addEventListener('submit',e=>{const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();F[f.dataset.form](f,Object.fromEntries(new FormData(f)))});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.id==='inv-q'){ui.inv.q=t.value;renderInvTable()}
  else if(t.id==='disp-q'){ui.disp.q=t.value;renderPick()}
  else if(t.id==='led-q'){ui.led.q=t.value;renderLedger()}
  else if(t.dataset.cartQty){const l=ui.disp.cart.find(x=>x.id===t.dataset.cartQty);if(l){l.qty=t.value===''?0:Number(t.value);$('#cart-total').textContent=money(cartTotal())}}
  else if(t.id==='disp-ref')ui.disp.ref=t.value;
  else if(t.id==='disp-note')ui.disp.note=t.value;
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='inv-cat'){ui.inv.cat=t.value;renderInvTable()}
  else if(t.id==='led-from'||t.id==='led-to'){ui.led[t.id.slice(4)]=t.value;renderLedger()}
  else if(t.dataset.cartQty){renderCart();renderPick()}
  else if(t.id==='recv-drug'){ui.recvDrug=t.value;const hn=t.closest('.field').querySelector(':scope > .hint');if(hn)hn.textContent=t.value?`${fnum(sellable(t.value))} sellable now · ${liveBatches(t.value).length} batches`:'';const lb=S.batches.filter(b=>b.drugId===t.value).slice(-1)[0];const c=$('#recv-cost'),s=$('#recv-sup');if(lb){if(!c.value)c.value=lb.cost;if(!s.value)s.value=lb.supplier||''}$('#recv-price').placeholder=drug(t.value)?String(drug(t.value).price):'Keep current'}
  else if(t.id==='set-cur'){S.settings.currency=t.value;save();toast('Currency updated')}
  else if(t.id==='set-warn'){const n=parseInt(t.value,10);if(n>=7&&n<=365){S.settings.warnDays=n;save();toast('Warning window updated')}else{t.value=S.settings.warnDays;toast('Use 7–365 days','err')}}
  else if(t.id==='import-file'){importAny(t.files[0]);t.value=''}
});
document.addEventListener('dragover',e=>{const z=e.target.closest?.('.dropzone');if(z){e.preventDefault();z.classList.add('over')}});
document.addEventListener('dragleave',e=>{e.target.closest?.('.dropzone')?.classList.remove('over')});
document.addEventListener('drop',e=>{const z=e.target.closest?.('.dropzone');if(z){e.preventDefault();z.classList.remove('over');importAny(e.dataTransfer.files[0])}});
function importAny(f){if(!f)return;/\.json$/i.test(f.name)?handleImport(f):openImporter(f)}
document.addEventListener('keydown',e=>{
  const t=e.target;
  if(t.id==='disp-q'&&e.key==='Enter'){e.preventDefault();const q=t.value.trim().toLowerCase();if(!q)return;const d=S.drugs.find(x=>x.sku&&x.sku.toLowerCase()===q)||S.drugs.filter(x=>drugMatch(x,q)&&sellable(x.id)>0).sort(byName)[0];if(!d)return toast('No product in stock matches','err');A['add-cart']({id:d.id});ui.disp.q='';t.value='';renderPick()}
  else if(e.key==='Enter'&&t.closest('form[data-form=receive]')&&t.tagName==='INPUT'&&!t.matches('[data-date-text],[data-combo-text]')){const f=t.closest('form');const last=[...f.querySelectorAll('input:not([type=hidden])')].filter(x=>x.offsetParent).pop();if(t!==last&&!e.ctrlKey&&!e.metaKey){e.preventDefault();focusNext(t)}}
});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!$('dialog[open]')){const s=$('[data-search]');if(s){e.preventDefault();s.focus()}}});
window.addEventListener('storage',e=>{if(e.key===KEY){S=load();route();updateBadge()}});
window.addEventListener('hashchange',route);

applyTheme();route();updateBadge();
