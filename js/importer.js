const IMP_FIELDS=[
['name','Product name',1,['name','product','drug','brand','item','description','medicine','trade name']],
['generic','Generic',0,['generic','active','ingredient','inn','molecule']],
['strength','Strength',0,['strength','dose','dosage','mg','concentration']],
['form','Dosage form',0,['form','type','dosage form','presentation']],
['category','Category',0,['category','class','group','therapeutic','department']],
['sku','SKU / barcode',0,['sku','barcode','code','ean','upc','gtin','ndc','item code','id']],
['unit','Unit',0,['unit','uom','pack']],
['price','Sell price',0,['price','sell','retail','selling','mrp','unit price']],
['reorder','Reorder level',0,['reorder','min','minimum','par','safety']],
['lot','Lot / batch',0,['lot','batch']],
['expiry','Expiry date',0,['expiry','expiration','exp','expires','best before','use by']],
['qty','Quantity',0,['qty','quantity','stock','on hand','onhand','count','units','balance']],
['cost','Unit cost',0,['cost','purchase','buy','wholesale']],
['supplier','Supplier',0,['supplier','vendor','distributor','wholesaler']],
['received','Received date',0,['received','receipt','date received','delivery','purchase date']]];
let IMP=null,xlsxP=null;
function loadXLSX(){if(window.XLSX)return Promise.resolve();return xlsxP||(xlsxP=new Promise((ok,no)=>{const s=document.createElement('script');s.src='js/vendor/xlsx.full.min.js';s.onload=ok;s.onerror=()=>{xlsxP=null;no(new Error('Could not load the spreadsheet reader'))};document.head.append(s)}))}
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function parseNum(v){if(typeof v==='number')return v;let s=String(v??'').replace(/[^\d.,\-]/g,'');if(!s)return NaN;const c=s.lastIndexOf(','),d=s.lastIndexOf('.');if(c>-1&&d>-1)s=c>d?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else if(c>-1)s=/,\d{1,2}$/.test(s)&&s.split(',').length===2?s.replace(',','.'):s.replace(/,/g,'');return parseFloat(s)}
function cellDate(v,mode){if(v===''||v==null)return'';if(typeof v==='number'){if(v>20000&&v<80000){const p=XLSX.SSF.parse_date_code(v);return vdate(p.y,p.m-1,p.d)}return null}if(v instanceof Date)return ymd(v);return parseDate(v,mode)}
function pickFile(accept,cb){const i=document.createElement('input');i.type='file';i.accept=accept;i.onchange=()=>i.files[0]&&cb(i.files[0]);i.click()}
function openImporter(file){
  if(!file)return pickFile('.csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods,.json',openImporter);
  if(/\.json$/i.test(file.name))return handleImport(file);
  if(file.size>15e6)return toast('File is too large (max 15 MB)','err');
  openDrawer(`<div class="panel"><header class="panel-head"><h3>Import spreadsheet</h3>${closeBtn}</header><div class="panel-body"><div class="empty"><strong>Reading ${esc(file.name)}…</strong></div></div></div>`);
  loadXLSX().then(()=>file.arrayBuffer()).then(buf=>{
    const csvLike=/\.(csv|tsv|txt)$/i.test(file.name);
    const wb=csvLike?XLSX.read(new TextDecoder().decode(buf).replace(/^\ufeff/,''),{type:'string',raw:true}):XLSX.read(buf,{type:'array'});
    const sheets=wb.SheetNames.map(n=>{const rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:'',raw:true,blankrows:false});return{n,rows}}).filter(s=>s.rows.length);
    if(!sheets.length)return impFail('This file has no data.');
    IMP={file:file.name,sheets,sheet:null,update:true};
    sheets.length===1?impSheet(0):impSheetStep();
  }).catch(e=>impFail(e.message||'Could not read this file.'));
}
function impFail(m){openDrawer(`<div class="panel"><header class="panel-head"><h3>Import spreadsheet</h3>${closeBtn}</header><div class="panel-body"><div class="empty"><strong>Import failed</strong>${esc(m)}</div></div><footer class="panel-foot"><button class="btn primary" data-act="imp-pick">Choose another file</button></footer></div>`)}
function impSheetStep(){
  openDrawer(`<div class="panel"><header class="panel-head"><div><h3>Choose a sheet</h3><div class="sub">${esc(IMP.file)} · ${IMP.sheets.length} sheets</div></div>${closeBtn}</header><div class="panel-body"><div class="list">${IMP.sheets.map((s,i)=>`<button class="sheet-opt" data-act="imp-sheet" data-i="${i}"><span>${ic('box')}<b>${esc(s.n)}</b></span><span class="sub">${fnum(s.rows.length)} rows · ${fnum(Math.max(...s.rows.slice(0,20).map(r=>r.length)))} columns</span></button>`).join('')}</div></div></div>`);
}
function guessHeader(rows){let best=0,score=-1;rows.slice(0,15).forEach((r,i)=>{const s=r.filter(c=>typeof c==='string'&&c.trim()&&isNaN(+c)).length*2+IMP_FIELDS.filter(f=>r.some(c=>f[3].some(a=>norm(c).includes(a)))).length*3;if(s>score){score=s;best=i}});return best}
function guessMap(hdr){const map={},used=new Set();IMP_FIELDS.forEach(([k,,,al])=>{let bi=-1,bs=0;hdr.forEach((h,i)=>{if(used.has(i))return;const n=norm(h);if(!n||(k==='price'&&/cost|purchase|buy/.test(n))||(k==='name'&&/generic|supplier|vendor/.test(n))||(k==='sku'&&/batch|lot/.test(n)))return;al.forEach((a,ai)=>{const s=n===a?100-ai:(` ${n} `).includes(` ${a} `)?60-ai:n.includes(a)?30-ai:0;if(s>bs){bs=s;bi=i}})});if(bi>-1){map[k]=bi;used.add(bi)}});return map}
function impSheet(i){const s=IMP.sheets[i];IMP.sheet=i;IMP.hr=guessHeader(s.rows);IMP.map=guessMap(s.rows[IMP.hr]||[]);impMapStep()}
function impData(){const s=IMP.sheets[IMP.sheet];return s.rows.slice(IMP.hr+1).filter(r=>r.some(c=>String(c).trim()))}
function impMapStep(){
  const s=IMP.sheets[IMP.sheet],hdr=s.rows[IMP.hr]||[],data=impData(),cols=Math.max(hdr.length,...s.rows.slice(0,30).map(r=>r.length));
  const colName=i=>String(hdr[i]||'').trim()||'Column '+XLSX.utils.encode_col(i);
  const mapped=IMP_FIELDS.filter(f=>IMP.map[f[0]]!=null);
  const res=impRun(true);
  openDrawer(`<div class="panel"><header class="panel-head"><div><h3>Match columns</h3><div class="sub">${esc(IMP.file)}${IMP.sheets.length>1?` · <a href="javascript:void 0" data-act="imp-sheets" style="color:var(--accent)">${esc(s.n)} ▾</a>`:''} · ${fnum(data.length)} data rows</div></div>${closeBtn}</header>
  <div class="panel-body">
    <div class="row" style="margin-bottom:14px"><div class="field" style="flex:1"><label>Header row</label><select class="input" id="imp-hr">${s.rows.slice(0,15).map((r,i)=>`<option value="${i}" ${i===IMP.hr?'selected':''}>Row ${i+1}: ${esc(r.filter(Boolean).slice(0,4).join(' · ').slice(0,60))}</option>`).join('')}</select></div></div>
    <div class="map-grid">${IMP_FIELDS.map(([k,l,req])=>`<label class="map-row ${IMP.map[k]!=null?'on':''}"><span>${l}${req?' <b style="color:var(--accent)">*</b>':''}</span><select class="input" data-imp-map="${k}"><option value="">— Skip —</option>${[...Array(cols)].map((_,i)=>`<option value="${i}" ${IMP.map[k]===i?'selected':''}>${esc(colName(i))}</option>`).join('')}</select></label>`).join('')}</div>
    <div class="section-label">Preview · first 5 rows</div>
    ${mapped.length?`<div class="card table-wrap"><table><thead><tr>${mapped.map(f=>`<th>${f[1]}</th>`).join('')}</tr></thead><tbody>${data.slice(0,5).map(r=>`<tr>${mapped.map(f=>{const v=r[IMP.map[f[0]]];const shown=['expiry','received'].includes(f[0])?(()=>{const d=cellDate(v,f[0]==='expiry'?'expiry':'');return d?fdate(d):d===null?`<span class="err-text">${esc(v)}</span>`:''})():esc(v);return`<td class="${['qty','price','cost','reorder'].includes(f[0])?'num mono':''}">${shown}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`:'<p class="muted">Map at least the product name.</p>'}
    <div class="section-label">Result</div>
    <label class="check"><input type="checkbox" id="imp-update" ${IMP.update?'checked':''}> Update details of products that already exist (matched by SKU, else name + strength)</label>
    <div class="imp-sum">${res.ok?`<span class="pill p-ok">${res.newD} new products</span><span class="pill p-info">${res.updD} matched</span><span class="pill p-ok">${res.batches} batches · ${fnum(res.units)} units</span>${res.skipped.length?`<span class="pill p-warn">${res.skipped.length} rows skipped</span>`:''}${res.expired?`<span class="pill p-bad">${res.expired} expired batches</span>`:''}`:`<span class="err-text">${esc(res.error)}</span>`}</div>
    ${res.skipped.length?`<details class="skips"><summary class="sub">Why rows are skipped</summary>${res.skipped.slice(0,30).map(s=>`<div class="sub">Row ${s[0]}: ${esc(s[1])}</div>`).join('')}</details>`:''}
  </div>
  <footer class="panel-foot"><button class="btn ghost" data-act="imp-pick">Other file</button><span style="flex:1"></span><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="imp-run" ${res.ok&&(res.newD||res.updD)?'':'disabled'}>${ic('upload')}Import ${fnum(res.rows)} rows</button></footer></div>`);
}
function impRun(dry){
  const m=IMP.map,data=impData(),out={ok:true,newD:0,updD:0,batches:0,units:0,expired:0,skipped:[],rows:0};
  if(m.name==null)return{...out,ok:false,error:'Choose which column holds the product name.'};
  const drugs=dry?S.drugs.map(d=>({...d})):S.drugs,batches=dry?S.batches.map(b=>({...b})):S.batches,tx=[];
  const g=(r,k)=>m[k]==null?'':r[m[k]];const gs=(r,k)=>String(g(r,k)??'').trim();
  const seen=new Set(),now=new Date().toISOString(),ref='Import · '+IMP.file.slice(0,40);
  data.forEach((r,ri)=>{
    const rn=IMP.hr+ri+2,name=gs(r,'name');
    if(!name)return out.skipped.push([rn,'no product name']);
    const sku=gs(r,'sku'),strength=gs(r,'strength');
    let d=(sku&&drugs.find(x=>x.sku&&x.sku.toLowerCase()===sku.toLowerCase()))||drugs.find(x=>x.name.toLowerCase()===name.toLowerCase()&&(x.strength||'').toLowerCase()===strength.toLowerCase());
    const fr=gs(r,'form'),form=fr?FORMS.find(f=>norm(fr).startsWith(norm(f).slice(0,4)))||'Other':'';
    const price=parseNum(g(r,'price')),reorder=parseNum(g(r,'reorder'));
    const patch={generic:gs(r,'generic'),strength,form,category:gs(r,'category'),sku,unit:gs(r,'unit')};
    if(!d){d={id:uid(),name,generic:'',strength:'',form:'Tablet',category:'',sku:'',unit:'unit',price:0,reorder:10,notes:'',created:now};drugs.push(d);out.newD++;seen.add(d.id);Object.keys(patch).forEach(k=>{if(patch[k])d[k]=patch[k]});if(price>=0)d.price=+price.toFixed(2);if(reorder>=0)d.reorder=Math.round(reorder)}
    else{if(!seen.has(d.id)){out.updD++;seen.add(d.id)}if(IMP.update){Object.keys(patch).forEach(k=>{if(patch[k])d[k]=patch[k]});if(price>=0)d.price=+price.toFixed(2);if(reorder>=0)d.reorder=Math.round(reorder)}}
    out.rows++;
    const qv=g(r,'qty');if(m.qty==null||qv===''||qv==null)return;
    const qty=Math.round(parseNum(qv));if(!(qty>0))return qty===0?null:out.skipped.push([rn,`quantity “${qv}” is not a positive number`]);
    const exp=cellDate(g(r,'expiry'),'expiry');if(!exp)return out.skipped.push([rn,exp===null?`can’t read expiry “${g(r,'expiry')}”`:'stock without an expiry date']);
    if(daysTo(exp)<0)out.expired++;
    const rc=cellDate(g(r,'received'),'')||today(),cost=parseNum(g(r,'cost')),c=cost>=0?cost:0,lot=gs(r,'lot')||'IMP-'+exp.replace(/-/g,'');
    let b=batches.find(x=>x.drugId===d.id&&x.lot===lot&&x.expiry===exp);
    if(b){b.cost=+((b.qty*b.cost+qty*c)/(b.qty+qty)).toFixed(4);b.qty+=qty}else{b={id:uid(),drugId:d.id,lot,expiry:exp,qty,cost:c,supplier:gs(r,'supplier'),received:rc};batches.push(b)}
    out.batches++;out.units+=qty;
    tx.push({id:uid(),type:'in',date:rc===today()?now:new Date(rc+'T12:00:00').toISOString(),drugId:d.id,drugName:dname(d),batchId:b.id,lot,qty,unitCost:c,unitPrice:0,ref,note:'Imported'});
  });
  if(!dry)S.tx.push(...tx);
  return out;
}
function impTemplate(){download('pillbug-import-template.csv','\ufeff'+csv([IMP_FIELDS.map(f=>f[1]),['Paracetamol','Acetaminophen','500 mg','Tablet','Analgesic','SKU-2001','unit','0.10','200','L55120','12/2027','500','0.05','MedSupply Co.',today()]]),'text/csv')}
function exportXLSX(){
  loadXLSX().then(()=>{
    const wb=XLSX.utils.book_new(),add=(n,rows,w)=>{const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=w.map(x=>({wch:x}));XLSX.utils.book_append_sheet(wb,ws,n)};
    add('Products',[['Name','Generic','Strength','Form','Category','SKU','Unit','Price','Reorder','Sellable','On hand','Value at cost','Status'],...S.drugs.slice().sort(byName).map(d=>{const bs=liveBatches(d.id);return[d.name,d.generic,d.strength,d.form,d.category,d.sku,d.unit,+d.price,+d.reorder,sellable(d.id),bs.reduce((s,b)=>s+b.qty,0),+bs.reduce((s,b)=>s+b.qty*b.cost,0).toFixed(2),stockState(d)[1]]})],[26,22,12,12,16,12,8,9,9,9,9,12,12]);
    add('Batches',[['Product','Lot','Expiry','Days left','Qty','Unit cost','Value','Supplier','Received'],...S.batches.filter(b=>b.qty>0).sort((a,b)=>a.expiry.localeCompare(b.expiry)).map(b=>[dname(drug(b.drugId)),b.lot,b.expiry,daysTo(b.expiry),b.qty,+b.cost,+(b.qty*b.cost).toFixed(2),b.supplier,b.received])],[28,12,12,9,8,9,10,20,12]);
    add('Ledger',[['Date','Type','Product','Lot','Qty','Unit price','Unit cost','Reference','Note','Returned'],...S.tx.slice().sort(byDateDesc).map(t=>[t.date.replace('T',' ').slice(0,16),TX[t.type]?.[0]||t.type,t.drugName,t.lot,t.qty,+t.unitPrice||0,+t.unitCost||0,t.ref,t.note,t.reversed?'yes':''])],[17,11,28,12,7,9,9,16,24,8]);
    XLSX.writeFile(wb,`pillbug-${today()}.xlsx`);toast('Workbook exported');
  }).catch(e=>toast(e.message,'err'));
}
Object.assign(A,{
  'imp-pick':()=>openImporter(),
  'imp-sheet':ds=>impSheet(+ds.i),
  'imp-sheets':()=>impSheetStep(),
  'imp-template':impTemplate,
  'export-xlsx':exportXLSX,
  'imp-run':()=>{const r=impRun(false);save();closeAll();toast(`Imported ${r.newD} new, ${r.updD} updated · ${fnum(r.units)} units`);IMP=null;route()}
});
document.addEventListener('change',e=>{const t=e.target;if(!IMP)return;if(t.dataset.impMap){const k=t.dataset.impMap;if(t.value==='')delete IMP.map[k];else{const v=+t.value;Object.keys(IMP.map).forEach(x=>{if(IMP.map[x]===v)delete IMP.map[x]});IMP.map[k]=v}impMapStep()}else if(t.id==='imp-hr'){IMP.hr=+t.value;IMP.map=guessMap(IMP.sheets[IMP.sheet].rows[IMP.hr]||[]);impMapStep()}else if(t.id==='imp-update'){IMP.update=t.checked;impMapStep()}});
