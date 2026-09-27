const C128='212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232'.split(' ');
function barcode(txt,h=34){
  const s=String(txt).replace(/[^\x20-\x7e]/g,'').slice(0,40);if(!s)return'';
  const codes=[104,...[...s].map(c=>c.charCodeAt(0)-32)];codes.push(codes.reduce((a,c,i)=>a+(i?c*i:c),0)%103);
  const w=[...codes.map(c=>C128[c]).join(''),...'2331112'].map(Number);
  let x=10,r='';w.forEach((n,i)=>{if(i%2===0)r+=`<rect x="${x}" y="0" width="${n}" height="${h}"/>`;x+=n});
  return`<svg class="bc" viewBox="0 0 ${x+10} ${h}" preserveAspectRatio="none" height="${h}">${r}</svg>`;
}
const store=()=>S.settings.store||{};
const PCSS=`*{box-sizing:border-box}body{margin:0;font:12px/1.4 -apple-system,'Segoe UI',Inter,Helvetica,Arial,sans-serif;color:#1F1E1B}h1,h2{font-family:Georgia,'Newsreader',serif;font-weight:500;margin:0}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:5px 4px}.r{text-align:right}.m{font-family:ui-monospace,Menlo,monospace}.mut{color:#6b6a64}.bc{display:block;width:100%}`;
function printDoc(title,css,body){
  const f=document.createElement('iframe');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.append(f);
  const d=f.contentDocument;d.open();d.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PCSS}${css}</style></head><body>${body}</body></html>`);d.close();
  setTimeout(()=>{f.contentWindow.focus();f.contentWindow.print();setTimeout(()=>f.remove(),60000)},300);
}
function storeHead(){const s=store();return`<h2>${esc(s.name||'Pillbug Pharmacy')}</h2>${s.address?`<div class="mut">${esc(s.address)}</div>`:''}${s.phone?`<div class="mut">${esc(s.phone)}</div>`:''}`}
function printReceipt(ref){
  const lines=S.tx.filter(t=>t.type==='out'&&t.ref===ref);if(!lines.length)return toast('No sale found for '+ref,'err');
  const g={};lines.forEach(t=>{const k=t.drugId+'|'+t.unitPrice;(g[k]=g[k]||{n:t.drugName,p:t.unitPrice,q:0,r:0,lots:new Set()});g[k].q+=t.qty;if(t.reversed)g[k].r+=t.qty;g[k].lots.add(t.lot)});
  const rows=Object.values(g),total=rows.reduce((s,x)=>s+(x.q-x.r)*x.p,0),ret=rows.reduce((s,x)=>s+x.r*x.p,0),note=lines[0].note;
  printDoc('Receipt '+ref,`@page{size:80mm auto;margin:4mm}body{width:72mm;margin:0 auto;font-size:11.5px}.c{text-align:center}hr{border:0;border-top:1px dashed #999;margin:8px 0}td{padding:2px 0;vertical-align:top}.tot td{font-size:14px;font-weight:700;padding-top:6px}`,
  `<div class="c">${storeHead()}</div><hr><table><tr><td>${esc(ref)}</td><td class="r">${ftime(lines[0].date)}</td></tr></table>${note?`<div class="mut">${esc(note)}</div>`:''}<hr><table>${rows.map(x=>`<tr><td colspan="2"><b>${esc(x.n)}</b><div class="mut m" style="font-size:10px">Lot ${esc([...x.lots].join(', '))}</div></td></tr><tr><td class="mut">${x.q} × ${money(x.p)}${x.r?` · ${x.r} returned`:''}</td><td class="r">${money((x.q-x.r)*x.p)}</td></tr>`).join('')}${ret?`<tr><td class="mut">Returns</td><td class="r">−${money(ret)}</td></tr>`:''}<tr class="tot"><td>Total</td><td class="r">${money(total)}</td></tr></table><hr><div style="height:30px">${barcode(ref,30)}</div><p class="c mut">${esc(store().footer||'Thank you. Keep medicines out of reach of children.')}</p>`);
}
function receiptPrompt(ref,total){
  openModal(`<div class="panel"><div class="card-pad" style="text-align:center"><div style="width:44px;height:44px;border-radius:50%;background:var(--ok-soft);color:var(--ok);display:grid;place-items:center;margin:0 auto 10px">${ic('out')}</div><h3 style="margin:0 0 4px;font:500 22px var(--serif)">Dispensed · ${money(total)}</h3><p class="sub mono" style="margin:0">${esc(ref)}</p></div><div class="panel-foot" style="justify-content:center"><button class="btn" data-act="modal-close">Done</button><button class="btn primary" data-act="receipt" data-ref="${esc(ref)}" data-close="1" autofocus>${ic('print')}Print receipt</button></div></div>`);
  setTimeout(()=>$('#modal [autofocus]')?.focus(),30);
}
function labelDialog(bid,n){
  const b=S.batches.find(x=>x.id===bid),d=b&&drug(b.drugId);if(!d)return;
  openModal(`<form class="panel" data-form="labels" data-id="${bid}" novalidate><div class="card-pad"><h3 style="margin:0 0 4px;font:500 21px var(--serif)">Print labels</h3><p class="sub" style="margin:0 0 16px">${esc(dname(d))} · Lot <span class="mono">${esc(b.lot)}</span> · Exp ${fdate(b.expiry)}</p><div class="form-grid">${fld('Copies','n',Math.min(Math.max(1,+n||1),300),{type:'number',attrs:'min="1" max="300" step="1"'})}${fld('Format','fmt',S.settings.labelFmt||'Sheet · A4 3×8',{options:['Sheet · A4 3×8','Sheet · Letter 3×10','Roll · 50×25 mm','Roll · 38×25 mm']})}</div><label class="check" style="margin-top:14px"><input type="checkbox" name="price" ${S.settings.labelPrice!==false?'checked':''}> Show sell price</label><label class="check"><input type="checkbox" name="bc" ${S.settings.labelBc!==false?'checked':''}> Barcode (SKU, or lot if no SKU)</label></div><div class="panel-foot"><button type="button" class="btn" data-act="modal-close">Cancel</button><button class="btn primary">${ic('print')}Print</button></div></form>`);
}
function printLabels(b,n,fmt,withPrice,withBc){
  const d=drug(b.drugId),code=d.sku||b.lot;
  const lab=`<div class="lb"><div class="nm">${esc(d.name)} <span>${esc(d.strength)}</span></div><div class="mut sm">${esc([d.generic,d.form].filter(Boolean).join(' · '))}</div><div class="rw"><span class="m">LOT ${esc(b.lot)}</span><span class="m">EXP ${esc(b.expiry.slice(0,7))}</span></div>${withPrice?`<div class="pr">${money(d.price)}<small> / ${esc(d.unit||'unit')}</small></div>`:''}${withBc?`<div class="bw">${barcode(code,22)}<div class="m ct">${esc(code)}</div></div>`:''}</div>`;
  const roll=fmt.startsWith('Roll'),w=fmt.includes('38')?38:50;
  const css=roll?`@page{size:${w}mm 25mm;margin:0}.lb{width:${w}mm;height:25mm;padding:1.5mm 2mm;page-break-after:always;overflow:hidden}`:fmt.includes('Letter')?`@page{size:letter;margin:12.7mm 4.8mm}.sh{display:grid;grid-template-columns:repeat(3,66.7mm);grid-auto-rows:25.4mm;column-gap:3.2mm}.lb{padding:2mm 3mm;overflow:hidden;border:.2mm dashed #ddd}`:`@page{size:A4;margin:10mm 7mm}.sh{display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:34.5mm;gap:0 2.5mm}.lb{padding:2.5mm 3.5mm;overflow:hidden;border:.2mm dashed #ddd}`;
  printDoc('Labels '+d.name,css+`.lb{font-size:8pt;line-height:1.25;display:flex;flex-direction:column;gap:.6mm}.nm{font-weight:700;font-size:9.5pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nm span{font-weight:500}.sm{font-size:7pt;white-space:nowrap;overflow:hidden}.rw{display:flex;justify-content:space-between;font-size:7pt}.pr{font-weight:700;font-size:10pt}.pr small{font-weight:400;font-size:7pt}.bw{margin-top:auto}.bw svg{height:${roll?'5mm':'7mm'}}.ct{text-align:center;font-size:6.5pt}`,`<div class="${roll?'':'sh'}">${lab.repeat(n)}</div>`);
}

const PO_ST={draft:['Draft','p-mute'],sent:['Sent','p-info'],partial:['Part received','p-warn'],received:['Received','p-ok'],cancelled:['Cancelled','p-bad']};
const po=id=>S.pos.find(p=>p.id===id);
const poTotal=p=>p.lines.reduce((s,l)=>s+l.qty*l.cost,0);
const poOpen=p=>['draft','sent','partial'].includes(p.status);
const lastBatch=id=>S.batches.filter(b=>b.drugId===id).sort((a,b)=>(a.received||'').localeCompare(b.received||'')).pop();
const suggestQty=d=>Math.max(d.reorder*2-sellable(d.id),d.reorder||1);
function poNumber(){const y=new Date().getFullYear(),n=S.pos.filter(p=>p.number.startsWith(`PO-${y}-`)).map(p=>+p.number.split('-')[2]||0);return`PO-${y}-${String(Math.max(0,...n)+1).padStart(4,'0')}`}
function newPO(supplier,lines){const p={id:uid(),number:poNumber(),supplier:supplier||'',status:'draft',created:new Date().toISOString(),sent:'',expected:'',note:'',lines};S.pos.push(p);return p}
function generatePOs(){
  const onOrder=new Set(S.pos.filter(poOpen).flatMap(p=>p.lines.filter(l=>l.qty>l.received).map(l=>l.drugId)));
  const low=S.drugs.filter(d=>sellable(d.id)<=d.reorder&&!onOrder.has(d.id));
  if(!low.length)return toast(onOrder.size?'Low items are already on open orders':'Nothing needs reordering');
  const g={};low.forEach(d=>{const b=lastBatch(d.id),s=b?.supplier||'';(g[s]=g[s]||[]).push({drugId:d.id,qty:suggestQty(d),cost:+(b?.cost??+(d.price*0.6).toFixed(2)),received:0})});
  const made=Object.entries(g).sort().map(([s,l])=>newPO(s,l));
  save();toast(`${made.length} draft order${made.length>1?'s':''} · ${low.length} products`);ui.po='open';location.hash='#/orders';route();if(made.length===1)poDrawer(made[0].id);
}
function orders(){
  const tab=ui.po||'open',tabs=[['open','Open',poOpen],['received','Received',p=>p.status==='received'],['cancelled','Cancelled',p=>p.status==='cancelled'],['all','All',()=>true]];
  const rows=S.pos.filter(tabs.find(t=>t[0]===tab)[2]).sort((a,b)=>b.created.localeCompare(a.created));
  const lowN=S.drugs.filter(d=>sellable(d.id)<=d.reorder).length;
  return head('Purchase orders',`${S.pos.filter(poOpen).length} open · ${money(S.pos.filter(poOpen).reduce((s,p)=>s+poTotal(p),0))} committed`,`<button class="btn" data-act="po-new">${ic('plus')}<span class="hide-sm">Blank order</span></button><button class="btn primary" data-act="po-gen">${ic('doc')}From reorder list${lowN?` · ${lowN}`:''}</button>`)+`
  <div class="row" style="margin-bottom:14px"><div class="tabs">${tabs.map(t=>`<button data-act="po-tab" data-k="${t[0]}" class="${t[0]===tab?'on':''}">${t[1]}</button>`).join('')}</div></div>
  <div class="card table-wrap"><table><thead><tr><th>Order</th><th>Supplier</th><th>Status</th><th class="num hide-sm">Lines</th><th class="num">Total</th><th class="hide-sm">Created</th></tr></thead><tbody>${rows.length?rows.map(p=>{const s=PO_ST[p.status];return`<tr class="click" data-act="po" data-id="${p.id}"><td class="mono">${esc(p.number)}</td><td class="name">${esc(p.supplier||'—')}</td><td><span class="pill ${s[1]}">${s[0]}</span></td><td class="num hide-sm">${p.lines.length}</td><td class="num">${money(poTotal(p))}</td><td class="t2 hide-sm">${fdate(p.created.slice(0,10))}</td></tr>`}).join(''):`<tr><td colspan="6"><div class="empty"><strong>No orders here</strong>${tab==='open'?'Generate drafts from the reorder list — grouped by each product’s last supplier.':''}</div></td></tr>`}</tbody></table></div>`;
}
function poDrawer(id){
  const p=po(id);if(!p)return;const ed=p.status==='draft',st=PO_ST[p.status];
  const sups=[...new Set([...S.batches.map(b=>b.supplier),...S.pos.map(x=>x.supplier)].filter(Boolean))].sort();
  openDrawer(`<div class="panel"><header class="panel-head"><div><h3>${esc(p.number)} <span class="pill ${st[1]}" style="vertical-align:middle">${st[0]}</span></h3><div class="sub">Created ${fdate(p.created.slice(0,10))}${p.sent?` · sent ${fdate(p.sent.slice(0,10))}`:''}</div></div>${closeBtn}</header>
  <div class="panel-body">
    <div class="form-grid">${ed?`<div class="field"><label>Supplier</label><input class="input" data-po-f="supplier" value="${esc(p.supplier)}" list="po-sups" placeholder="Supplier name"><datalist id="po-sups">${sups.map(s=>`<option value="${esc(s)}">`).join('')}</datalist></div>${dateField('Expected delivery','po-exp',p.expected,{min:today(),hid:'po-exp',chips:[['+3 d','+3d'],['+1 wk','+1w']],nohint:1})}<div class="field full"><label>Note to supplier</label><input class="input" data-po-f="note" value="${esc(p.note)}"></div>`:`<div class="kv full"><div><small>Supplier</small><b>${esc(p.supplier||'—')}</b></div><div><small>Expected</small><b>${p.expected?fdate(p.expected):'—'}</b></div></div>${p.note?`<p class="t2 full" style="margin:0">${esc(p.note)}</p>`:''}`}</div>
    <div class="section-label">Lines</div>
    <div class="card table-wrap"><table><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Unit cost</th><th class="num">Total</th>${ed?'<th></th>':'<th class="num">Rcvd</th>'}</tr></thead><tbody>${p.lines.length?p.lines.map((l,i)=>{const d=drug(l.drugId);return`<tr><td><div class="name">${esc(d?dname(d):'Deleted product')}</div><div class="sub">${d?`${fnum(sellable(d.id))} in stock · reorder ${fnum(d.reorder)}`:''}</div></td><td class="num">${ed?`<input class="input" style="width:74px;height:32px;text-align:right" type="number" min="1" step="1" value="${l.qty}" data-po-line="${i}" data-k="qty">`:fnum(l.qty)}</td><td class="num">${ed?`<input class="input" style="width:84px;height:32px;text-align:right" type="number" min="0" step="0.01" value="${l.cost}" data-po-line="${i}" data-k="cost">`:money(l.cost)}</td><td class="num">${money(l.qty*l.cost)}</td>${ed?`<td><button class="btn ghost icon" data-act="po-rm" data-i="${i}" aria-label="Remove">${ic('x')}</button></td>`:`<td class="num mono">${fnum(l.received)}</td>`}</tr>`}).join(''):`<tr><td colspan="5"><div class="empty">No lines yet</div></td></tr>`}</tbody></table></div>
    ${ed?`<div class="field" style="margin-top:12px"><label>Add product</label>${productCombo('po-add','',{hid:'po-add'})}</div>`:''}
    <div class="cart-total"><span>Order total</span><span>${money(poTotal(p))}</span></div>
  </div>
  <footer class="panel-foot">${ed?`<button class="btn danger" data-act="po-del">${ic('trash')}Delete</button>`:poOpen(p)?`<button class="btn danger" data-act="po-cancel">Cancel order</button>`:''}<span style="flex:1"></span><button class="btn" data-act="po-print">${ic('print')}Print</button>${ed?`<button class="btn primary" data-act="po-send" ${p.lines.length?'':'disabled'}>Mark as sent</button>`:''}${['sent','partial'].includes(p.status)?`<button class="btn primary" data-act="po-recv">${ic('in')}Receive delivery</button>`:''}</footer></div>`);
  $('#drawer').dataset.po=id;
}
function poReceive(id){
  const p=po(id),open=p.lines.map((l,i)=>({l,i,d:drug(l.drugId)})).filter(x=>x.d&&x.l.qty>x.l.received);
  openDrawer(`<form class="panel" data-form="po-recv" data-id="${id}" novalidate><header class="panel-head"><div><h3>Receive ${esc(p.number)}</h3><div class="sub">${esc(p.supplier||'')} · enter lot and expiry for each line, set qty 0 to skip</div></div>${closeBtn}</header>
  <div class="panel-body">${open.map(({l,i,d})=>`<div class="card card-pad" style="margin-bottom:10px;padding:14px"><div class="row" style="justify-content:space-between;margin-bottom:10px"><span class="name">${esc(dname(d))}</span><span class="sub">${fnum(l.received)} of ${fnum(l.qty)} received</span></div><div class="form-grid" style="grid-template-columns:90px 1fr 1.3fr">${fld('Qty','q'+i,l.qty-l.received,{type:'number',attrs:'min="0" step="1"'})}${fld('Lot','l'+i,'',{attrs:'autocomplete="off"'})}${dateField('Expiry','e'+i,'',{mode:'expiry',min:today(),nohint:1})}</div></div>`).join('')}<p class="err-text" id="por-err"></p></div>
  <footer class="panel-foot"><button type="button" class="btn" data-act="po" data-id="${id}">Back</button><button class="btn primary">${ic('in')}Receive into stock</button></footer></form>`);
}
function printPO(p){
  const s=store();
  printDoc(p.number,`@page{size:A4;margin:16mm}body{font-size:11.5px}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #C96442;padding-bottom:12px;margin-bottom:18px}.top h1{font-size:28px;color:#C96442}.meta td{padding:1px 0 1px 14px}.box{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}.box div{border:1px solid #ddd;border-radius:6px;padding:10px}.box small{display:block;color:#6b6a64;text-transform:uppercase;font-size:9px;letter-spacing:.06em;margin-bottom:3px}.ln th{background:#F4F1EA;border-bottom:1px solid #ccc;font-size:10px;text-transform:uppercase;letter-spacing:.04em}.ln td{border-bottom:1px solid #eee}.tot td{font-weight:700;font-size:14px;border:0;padding-top:10px}.sig{display:flex;gap:40px;margin-top:60px}.sig div{flex:1;border-top:1px solid #999;padding-top:4px;color:#6b6a64}`,
  `<div class="top"><div>${storeHead()}</div><div style="text-align:right"><h1>Purchase order</h1><table class="meta" style="width:auto;margin-left:auto"><tr><td class="mut">Number</td><td class="m"><b>${esc(p.number)}</b></td></tr><tr><td class="mut">Date</td><td>${fdate((p.sent||p.created).slice(0,10))}</td></tr>${p.expected?`<tr><td class="mut">Deliver by</td><td>${fdate(p.expected)}</td></tr>`:''}</table></div></div>
  <div class="box"><div><small>Supplier</small><b>${esc(p.supplier||'—')}</b></div><div><small>Deliver to</small><b>${esc(s.name||'Pillbug Pharmacy')}</b>${s.address?`<br>${esc(s.address)}`:''}</div></div>
  <table class="ln"><thead><tr><th>#</th><th>Product</th><th>Form</th><th>SKU</th><th class="r">Qty</th><th class="r">Unit cost</th><th class="r">Amount</th></tr></thead><tbody>${p.lines.map((l,i)=>{const d=drug(l.drugId)||{};return`<tr><td class="mut">${i+1}</td><td><b>${esc(dname(d)||'—')}</b>${d.generic?`<div class="mut">${esc(d.generic)}</div>`:''}</td><td>${esc(d.form||'')}</td><td class="m">${esc(d.sku||'')}</td><td class="r">${fnum(l.qty)}</td><td class="r">${money(l.cost)}</td><td class="r">${money(l.qty*l.cost)}</td></tr>`}).join('')}<tr class="tot"><td colspan="6" class="r">Total</td><td class="r">${money(poTotal(p))}</td></tr></tbody></table>
  ${p.note?`<p style="margin-top:18px"><b>Note:</b> ${esc(p.note)}</p>`:''}<div class="sig"><div>Authorised by</div><div>Date</div></div>`);
}
const curPO=()=>po($('#drawer').dataset.po);
Object.assign(A,{
  receipt:ds=>{if(ds.close)$('#modal').close();printReceipt(ds.ref)},
  label:ds=>labelDialog(ds.id,ds.n),
  'po-gen':generatePOs,
  'po-new':()=>{const p=newPO('',[]);save();ui.po='open';if(cur!=='orders')location.hash='#/orders';else route();poDrawer(p.id)},
  'po-tab':ds=>{ui.po=ds.k;route()},
  po:ds=>poDrawer(ds.id),
  'po-rm':ds=>{const p=curPO();p.lines.splice(+ds.i,1);save();poDrawer(p.id);route()},
  'po-del':()=>{const p=curPO();confirmBox('Delete draft?',`${esc(p.number)} will be removed.`,'Delete',()=>{S.pos=S.pos.filter(x=>x.id!==p.id);save();closeAll();route()})},
  'po-cancel':()=>{const p=curPO();confirmBox('Cancel order?',`${esc(p.number)} will be marked cancelled. Stock already received stays.`,'Cancel order',()=>{p.status='cancelled';save();route();poDrawer(p.id)})},
  'po-send':()=>{const p=curPO();if(!p.lines.length)return;p.status='sent';p.sent=new Date().toISOString();save();route();poDrawer(p.id);toast(p.number+' marked as sent')},
  'po-print':()=>printPO(curPO()),
  'po-recv':()=>poReceive(curPO().id)
});
Object.assign(F,{
  labels:(f,v)=>{const b=S.batches.find(x=>x.id===f.dataset.id),n=Math.round(+v.n);if(!(n>=1&&n<=300))return toast('Copies must be 1–300','err');S.settings.labelFmt=v.fmt;S.settings.labelPrice=!!v.price;S.settings.labelBc=!!v.bc;save();$('#modal').close();printLabels(b,n,v.fmt,!!v.price,!!v.bc)},
  'po-recv':(f,v)=>{
    const p=po(f.dataset.id),err=$('#por-err'),work=[];
    for(const[i,l]of p.lines.entries()){if(v['q'+i]===undefined)continue;const q=Number(v['q'+i]);if(!q)continue;const d=drug(l.drugId);
      if(!(q>0&&Number.isInteger(q)))return err.textContent=`${d.name}: quantity must be a whole number.`;
      if(!v['l'+i].trim())return err.textContent=`${d.name}: lot number is required.`;
      if(!v['e'+i])return err.textContent=`${d.name}: expiry date is required.`;
      if(daysTo(v['e'+i])<0)return err.textContent=`${d.name}: this lot is already expired.`;
      work.push({l,d,q,lot:v['l'+i].trim(),exp:v['e'+i]})}
    if(!work.length)return err.textContent='Enter a quantity for at least one line.';
    const now=new Date().toISOString();
    work.forEach(({l,d,q,lot,exp})=>{let b=S.batches.find(x=>x.drugId===d.id&&x.lot===lot&&x.expiry===exp);if(b){b.cost=+((b.qty*b.cost+q*l.cost)/(b.qty+q)).toFixed(4);b.qty+=q}else{b={id:uid(),drugId:d.id,lot,expiry:exp,qty:q,cost:+l.cost,supplier:p.supplier,received:today()};S.batches.push(b)}l.received+=q;S.tx.push({id:uid(),type:'in',date:now,drugId:d.id,drugName:dname(d),batchId:b.id,lot,qty:q,unitCost:+l.cost,unitPrice:0,ref:p.number,note:''})});
    p.status=p.lines.every(l=>l.received>=l.qty||!drug(l.drugId))?'received':'partial';
    save();toast(`Received ${work.reduce((s,w)=>s+w.q,0)} units on ${p.number}`);route();poDrawer(p.id);
  }
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset.poLine){const p=curPO(),l=p.lines[+t.dataset.poLine],k=t.dataset.k,n=Number(t.value);if(k==='qty'&&n>=1&&Number.isInteger(n))l.qty=n;else if(k==='cost'&&n>=0)l.cost=+n.toFixed(2);else toast('Invalid value','err');save();poDrawer(p.id);route()}
  else if(t.dataset.poF){const p=curPO();p[t.dataset.poF]=t.value.trim();save();route()}
  else if(t.id==='po-exp'){const p=curPO();p.expected=t.value;save()}
  else if(t.id==='po-add'&&t.value){const p=curPO(),d=drug(t.value);if(p.lines.some(l=>l.drugId===d.id)){toast('Already on this order','err')}else{const b=lastBatch(d.id);p.lines.push({drugId:d.id,qty:suggestQty(d),cost:+(b?.cost??0),received:0});if(!p.supplier&&b?.supplier)p.supplier=b.supplier;save();route()}poDrawer(p.id);$('#drawer [data-combo-text]')?.focus()}
  else if(t.dataset.store){S.settings.store={...store(),[t.dataset.store]:t.value.trim()};save();toast('Saved')}
});
views.orders=orders;
const _ubase=updateBadge;
updateBadge=function(){_ubase();const n=S.pos.filter(poOpen).length,el=$('#po-badge');el.hidden=!n;el.textContent=n};
updateBadge();
if(location.hash.startsWith('#/orders'))route();
