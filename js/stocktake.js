ui.count={cat:'',blind:true,counts:{}};
const CKEY='pillbug.count.v1';
function cntLoad(){try{const v=JSON.parse(localStorage.getItem(CKEY));ui.count.counts=v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(e){ui.count.counts={}}}
function cntStore(){try{Object.keys(ui.count.counts).length?localStorage.setItem(CKEY,JSON.stringify(ui.count.counts)):localStorage.removeItem(CKEY)}catch(e){}}
function dropDrafts(){ui.count.counts={};cntStore()}
cntLoad();
function stocktake(){
  const c=ui.count,cats=[...new Set(S.drugs.map(d=>d.category).filter(Boolean))].sort();
  return head('Stocktake','Count what is on the shelf, review the differences, then record them in the ledger.',`<button class="btn" data-act="cnt-clear">Clear counts</button><button class="btn primary" data-act="cnt-review">${ic('check')}Review</button>`)+`
  <div class="row" style="margin-bottom:14px">${selectBox('',[['','All categories'],...cats],c.cat,{id:'cnt-cat',cls:'sel-auto',label:'Category'})}<label class="check" style="margin:0"><input type="checkbox" id="cnt-blind" ${c.blind?'checked':''}> Blind count</label><span class="sub" id="cnt-prog"></span></div>
  <div class="card table-wrap" id="cnt-table"></div>`;
}
function cntRows(){return S.batches.filter(b=>b.qty>0&&drug(b.drugId)&&(!ui.count.cat||drug(b.drugId).category===ui.count.cat)).sort((a,b)=>dname(drug(a.drugId)).localeCompare(dname(drug(b.drugId)))||a.expiry.localeCompare(b.expiry))}
function cntParse(v){if(v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isInteger(n)&&n>=0?n:NaN}
function cntPlan(){
  const lines=[],bad=[];let counted=0;
  cntRows().forEach(b=>{const n=cntParse(ui.count.counts[b.id]);if(n===null)return;counted++;if(Number.isNaN(n))return bad.push(b);if(n!==b.qty)lines.push({b,n,delta:n-b.qty})});
  return{lines,bad,counted};
}
function cntProgress(){const p=$('#cnt-prog');if(p)p.textContent=`${cntPlan().counted} of ${cntRows().length} counted`}
function renderCount(){
  const el=$('#cnt-table');if(!el)return;
  const rows=cntRows(),c=ui.count;
  el.innerHTML=`<table><thead><tr><th>Product</th><th>Lot</th><th>Expiry</th>${c.blind?'':'<th class="num">Expected</th>'}<th class="num">Counted</th></tr></thead><tbody>${rows.length?rows.map(b=>{const d=drug(b.drugId),e=expState(b.expiry);return`<tr><td><div class="name">${esc(dname(d))}</div><div class="sub">${esc(d.category||'')}</div></td><td class="mono">${esc(b.lot)}</td><td><span class="pill ${e[2]}">${e[1]}</span></td>${c.blind?'':`<td class="num mono">${fnum(b.qty)}</td>`}<td class="num"><input class="input" type="number" min="0" step="1" style="width:92px;text-align:right" value="${esc(c.counts[b.id]??'')}" data-cnt="${b.id}" aria-label="Counted quantity"></td></tr>`}).join(''):`<tr><td colspan="5"><div class="empty"><strong>Nothing to count</strong>No batches in this scope.</div></td></tr>`}</tbody></table>`;
  cntProgress();
}
function cntReview(){
  const p=cntPlan();
  if(!p.counted)return toast('Enter at least one count first','err');
  const net=p.lines.reduce((s,l)=>s+l.delta*l.b.cost,0);
  openModal(`<div class="panel"><div class="card-pad"><h3 style="margin:0 0 6px;font:500 21px var(--serif)">Review stocktake</h3><p class="t2" style="margin:0 0 10px">${fnum(p.counted)} batches counted · ${p.lines.length} differ · net ${money(net)} at cost</p>${p.bad.length?`<p class="err-text" style="margin:0 0 10px">${p.bad.length} counts are not whole numbers of zero or more. Fix them first.</p>`:''}<div class="list">${p.lines.slice(0,8).map(l=>`<div class="list-item"><div><div class="name">${esc(dname(drug(l.b.drugId)))}</div><div class="sub mono">Lot ${esc(l.b.lot)} · ${fnum(l.b.qty)} → ${fnum(l.n)}</div></div><span class="mono">${l.delta>0?'+':'−'}${fnum(Math.abs(l.delta))}</span></div>`).join('')}</div>${p.lines.length>8?`<div class="sub">and ${p.lines.length-8} more</div>`:''}</div><div class="panel-foot"><button class="btn" data-act="modal-close">Back</button><button class="btn primary" data-act="cnt-apply" ${p.bad.length?'disabled':''}>${p.lines.length?`Apply ${p.lines.length} adjustment${p.lines.length>1?'s':''}`:'Finish — all match'}</button></div></div>`);
}
function cntApply(){
  const p=cntPlan();if(p.bad.length||!p.counted)return;
  const now=new Date().toISOString(),note='Stocktake '+today();
  p.lines.forEach(({b,n,delta})=>{const d=drug(b.drugId);S.tx.push({id:uid(),type:'adjust',date:now,drugId:d.id,drugName:dname(d),batchId:b.id,lot:b.lot,qty:delta,unitCost:b.cost,unitPrice:0,ref:'Stocktake',note});b.qty=n});
  save();$('#modal').close();dropDrafts();
  toast(p.lines.length?`${p.lines.length} adjustment${p.lines.length>1?'s':''} recorded`:'Stocktake complete — everything matches');route();
}
views.stocktake=stocktake;
after.stocktake=renderCount;
Object.assign(A,{'cnt-review':cntReview,'cnt-apply':cntApply,'cnt-clear':()=>{dropDrafts();renderCount()}});
document.addEventListener('input',e=>{const t=e.target;if(t.dataset&&t.dataset.cnt!==undefined){ui.count.counts[t.dataset.cnt]=t.value;cntStore();cntProgress()}});
document.addEventListener('change',e=>{const t=e.target;if(t.id==='cnt-cat'){ui.count.cat=t.value;renderCount()}else if(t.id==='cnt-blind'){ui.count.blind=t.checked;renderCount()}});
document.addEventListener('keydown',e=>{const t=e.target;if(e.key==='Enter'&&t.dataset&&t.dataset.cnt!==undefined){e.preventDefault();const all=$$('[data-cnt]');(all[all.indexOf(t)+1]||$('[data-act=cnt-review]'))?.focus()}});
