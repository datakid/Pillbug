const {JSDOM}=require('jsdom'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const order=[...html.matchAll(/<script src="(js\/[^"]+)"/g)].map(m=>m[1]);
function boot(url,pre){
  const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true,beforeParse(w){
    w.matchMedia=q=>({matches:false,addEventListener(){},removeEventListener(){}});
    w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
    w.HTMLDialogElement.prototype.close=function(){if(this.hasAttribute('open')){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'))}};
    w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};
    if(pre)w.localStorage.setItem('pillbug.v1',pre);
  }});
  const w=dom.window,ctx=dom.getInternalVMContext(),run=c=>new vm.Script(c).runInContext(ctx),errs=[];
  w.addEventListener('error',e=>errs.push(e.message));
  for(const f of order)run(fs.readFileSync(path.join(root,f),'utf8'));
  run(fs.readFileSync(path.join(root,'js/vendor/xlsx.full.min.js'),'utf8'));
  return{w,run,errs};
}
const{w,run,errs}=boot('http://localhost/');
let pass=0,fail=0;
const ok=(c,m)=>{c?pass++:(fail++,console.log('FAIL',m))};
const $=(s,r=w.document)=>r.querySelector(s),$$=(s,r=w.document)=>[...r.querySelectorAll(s)];
const ev=(el,t,o={})=>el.dispatchEvent(new w.MouseEvent(t,{bubbles:true,cancelable:true,...o}));
const key=(el,k,o={})=>{const e=new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true,...o});el.dispatchEvent(e);return e};
const pick=(i)=>ev($$('.menu .opt')[i],'mousedown');
const go=h=>{w.location.hash=h;run('route()')};

const views=['dashboard','inventory','receive','dispense','history','expiry','settings','orders','stocktake'];
const acts=new Set();
for(const v of views){
  try{go('#/'+v)}catch(e){ok(false,'route '+v+' threw '+e.message);continue}
  ok($('#main').innerHTML.length>200,'render '+v);
  ok(!$('#main select:not(.sel-native)'),'no visible native select in '+v);
  ok(!$('#main datalist'),'no datalist in '+v);
  $$('.sel').forEach(s=>{const n=$('select',s),b=$('.sel-btn',s);ok(n&&b&&$('.sel-val',b).textContent===n.options[n.selectedIndex].text,'sel label matches native in '+v)});
  $$('[data-act]').forEach(e=>acts.add(e.dataset.act));
}
go('#/inventory');
const A=run('Object.keys(A)');
const missing=[...acts].filter(a=>a&&!A.includes(a));
ok(!missing.length,'every rendered data-act has a handler; missing: '+missing.join(','));

go('#/inventory');
let btn=$('#inv-cat').parentElement.querySelector('.sel-btn');
ev(btn,'click');
ok($('.menu .opts'),'inventory category menu opens');
ok($('.menu').parentElement===w.document.body,'menu hosted on body when no dialog');
ok(btn.getAttribute('aria-expanded')==='true','aria-expanded true');
const n0=$$('.menu .opt').length;ok(n0===$('#inv-cat').options.length,'menu options match native ('+n0+')');
pick(2);
ok(!$('.menu'),'menu closed after pick');
ok(run('ui.inv.cat')===$('#inv-cat').value&&run('ui.inv.cat')!=='','change reached ui.inv.cat = '+run('ui.inv.cat'));
btn=$('#inv-cat').parentElement.querySelector('.sel-btn');
key(btn,'ArrowDown');ok($('.menu'),'ArrowDown opens');
key(btn,'Home');ok($('.menu .opt.hi')===$$('.menu .opt')[0],'Home highlights first');
key(btn,'End');ok($('.menu .opt.hi')===$$('.menu .opt').pop(),'End highlights last');
key(btn,'Enter');ok(!$('.menu'),'Enter picks and closes');
ok(run('ui.inv.cat')===$$('#inv-cat option').pop().value,'Enter selected last option');
key(btn,'ArrowDown');key(btn,'Escape');ok(!$('.menu'),'Escape closes');
key(btn,'a');ok($('.menu'),'type-ahead opens menu');key(btn,'Tab');ok(!$('.menu'),'Tab closes');

go('#/settings');
btn=$('#set-cur').parentElement.querySelector('.sel-btn');ev(btn,'click');
const eur=$$('.menu .opt').findIndex(o=>o.textContent.trim()==='EUR');pick(eur);
ok(run('S.settings.currency')==='EUR','currency change persisted through change handler');
ok(w.localStorage.getItem('pillbug.v1').includes('"currency":"EUR"'),'saved to storage');

go('#/inventory');
run("drugForm(null,'')");
const dr=$('#drawer');
ok(dr.open,'drawer open');
ok(w.document.activeElement===$('input[name=name]',dr),'first focus is the name input, not hidden select');
btn=$('select[name=form]',dr).parentElement.querySelector('.sel-btn');ev(btn,'click');
ok($('.menu').parentElement===dr,'menu hosted inside the dialog (top layer safe)');
const cap=$$('.menu .opt').findIndex(o=>o.textContent.trim()==='Capsule');pick(cap);
$('input[name=name]',dr).value='Zinc Plus';$('input[name=price]',dr).value='2.5';
const cat=$('input[name=category]',dr);cat.value='an';cat.dispatchEvent(new w.Event('input',{bubbles:true}));
ok($('.menu'),'category suggestions open on typing');
ok($$('.menu .opt mark').length>0,'match highlighted');
key(cat,'ArrowDown');key(cat,'Enter');
ok(!$('.menu')&&cat.value.toLowerCase().includes('an'),'suggestion picked via keyboard -> '+cat.value);
ok(!$('.menu'),'picking did not re-open menu (quiet guard)');
const before=run('S.drugs.length');
$('form',dr).requestSubmit();
ok(run('S.drugs.length')===before+1,'form submitted through FormData pipeline');
const nd=run("S.drugs.find(d=>d.name==='Zinc Plus')");
ok(nd&&nd.form==='Capsule'&&nd.category===cat.value,'saved form='+(nd&&nd.form)+' category='+(nd&&nd.category));
w.document.getElementById('drawer').close();

go('#/receive');
const combo=$('[data-combo-text]');combo.value='para';combo.dispatchEvent(new w.Event('input',{bubbles:true}));
ok($('.menu .opt[data-combo-id]'),'product combo opens');
ok($('.menu .opt.hi'),'first option highlighted');
key(combo,'Enter');
ok($('#recv-drug').value!=='','hidden product id set via combo pick');
ok(!$('.menu'),'combo closed');
const sup=$('#recv-sup');ev(sup,'click');
ok($('.menu .opt'),'supplier suggestions open on click');popCloseTest();
function popCloseTest(){ev(w.document.body,'mousedown');ok(!$('.menu'),'outside mousedown closes menu')}
const dbtn=$$('[data-cal-open]')[0];ev(dbtn,'click');
ok($('.menu.cal'),'calendar opens in floating layer');
ok($('.menu.cal').parentElement===w.document.body,'calendar hosted on body');
const day=$$('.menu.cal [data-cal-d]:not([disabled])')[5];day.click();
ok(!$('.menu.cal'),'calendar closed after day');
ok($('input[name=expiry]').value===day.dataset.calD,'hidden expiry value set '+day.dataset.calD);
ev(dbtn,'click');ev(dbtn,'click');ok(!$('.menu.cal'),'calendar button toggles');
ev(dbtn,'click');go('#/dashboard');ok(!$('.menu'),'route change closes open menu');

run(`IMP={file:'t.csv',sheets:[{n:'S',rows:[['Name','Strength','Qty','Expiry','Lot'],['Panadol','500 mg',20,'12/2028','L1'],['Brufen','400 mg',5,'06/2029','L2']]}],sheet:null,update:true};impSheet(0)`);
const dr2=$('#drawer');
ok(dr2.open,'importer drawer open');
ok($$('.sel',dr2).length===16,'importer renders 16 custom selects (1 header + 15 fields): '+$$('.sel',dr2).length);
ok(run('IMP.map.name')===0&&run('IMP.map.qty')===2,'auto column matching intact');
const strengthSel=$('select[data-imp-map=lot]',dr2);
const mb=strengthSel.parentElement.querySelector('.sel-btn');ev(mb,'click');
ok($('.menu').parentElement===$('#drawer'),'importer menu hosted in dialog');
const skip=$$('.menu .opt')[0];ev(skip,'mousedown');
ok(run('IMP.map.lot')===undefined,'Skip removes mapping via change handler');
const mb2=$('select[data-imp-map=lot]',$('#drawer')).parentElement.querySelector('.sel-btn');ev(mb2,'click');
pick(5);
ok(run('IMP.map.lot')===undefined||run('typeof IMP.map.lot')==='number','pick beyond columns handled');
ev($('#drawer .sel-btn'),'click');
ok(run('IMP.hr')===0,'header row select present');
$('#drawer').close();

go('#/orders');
run("S.drugs.forEach(d=>{});generatePOs()");
const pid=run('S.pos.length')?run('S.pos[0].id'):null;
ok(!!pid,'purchase orders generated');
if(pid){run(`poDrawer('${pid}')`);
  const d3=$('#drawer');const ps=$('[data-po-f=supplier]',d3);
  ps.value='Med';ps.dispatchEvent(new w.Event('input',{bubbles:true}));
  ok($('.menu')&&$('.menu').parentElement===d3,'PO supplier suggestion menu hosted in drawer');
  const add=$('[data-combo-text]',d3);add.value='a';add.dispatchEvent(new w.Event('input',{bubbles:true}));
  ok($('.menu .opt[data-combo-id]')&&$('.menu').parentElement===d3,'PO add-product combo is no longer clipped by panel body (hosted on dialog)');
  w.document.getElementById('drawer').close();ok(!$('.menu'),'closing dialog removes menu (close event)');
}

go('#/dispense');
run("ui.disp.cart.push({id:S.drugs[0].id,qty:1});renderCart()");
const before2=run('S.tx.length');
run('checkout()');
ok(run('S.tx.length')>before2,'dispense pipeline still writes ledger');
w.document.getElementById('modal').close();
go('#/history');ok($('#led-table table'),'ledger renders');
run("labelDialog(S.batches[0].id,3)");
const fm=$('#modal select[name=fmt]');ok(fm&&$('#modal .sel-btn'),'label format is a custom select');
w.document.getElementById('modal').close();
run("A.adjust({id:S.batches[0].id})");
ok($('#modal select[name=reason]')&&$('#modal .sel-btn'),'adjust reason is a custom select');
$('#modal form').requestSubmit();
ok(!$('#modal').open,'unchanged adjustment closes the dialog');

(async()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const toasts=()=>$$('.toast').map(t=>t.textContent).join('|');

  go('#/orders');
  const did=run('S.pos[0].lines[0].drugId');
  run(`A['del-drug']({id:'${did}'})`);
  ok(/open purchase orders/.test(toasts())&&!!run(`drug('${did}')`),'product on an open PO cannot be deleted');
  ok(!$('#modal').open,'no delete dialog for a guarded product');

  go('#/settings');
  ok($('[data-act=audit]'),'integrity button present in settings');
  ok(run('audit().length')===0,'sample data reconciles with its ledger');
  run('A.audit()');
  ok($('#modal').open&&/Everything reconciles/.test($('#modal').textContent),'clean result dialog');
  w.document.getElementById('modal').close();
  run('S.batches[0].qty+=7;save()');
  ok(run('audit().length')===1,'tampered batch detected');
  run('A.audit()');
  ok($('[data-act=audit-fix]'),'fix offered for a mismatch');
  run("A['audit-fix']()");
  ok(run('audit().length')===0,'reconciling adjustment restores consistency');
  ok(run("S.tx.some(t=>t.type==='adjust'&&t.ref==='Reconcile'&&t.qty===7)"),'reconciling entry written to ledger with the exact gap');
  run('S.batches[1].qty=-3;save()');
  ok(run('audit().length')===1&&!run('audit().some(fixable)'),'invalid quantity reported but not auto-fixed');
  run('S.batches[1].qty=0;S.tx=S.tx.filter(t=>t.batchId!==S.batches[1].id);save()');
  run('S.batches[1].qty=0;save()');

  const base=run('S.drugs.length');
  run("A.__boom=()=>{S.drugs.length=0;throw new Error('x')}");
  const b1=w.document.createElement('button');b1.dataset.act='__boom';$('#main').append(b1);b1.click();
  ok(run('S.drugs.length')===base,'failed action is rolled back in memory');
  ok(run("JSON.parse(localStorage.getItem('pillbug.v1')).drugs.length")===base,'storage untouched by failed action');
  ok(/nothing was changed/.test(toasts()),'user told nothing changed');
  run("A.__boom2=()=>{S.drugs.pop();save();throw new Error('y')}");
  const b2=w.document.createElement('button');b2.dataset.act='__boom2';$('#main').append(b2);b2.click();
  ok(run('S.drugs.length')===base-1,'action that already saved is not rolled back');
  ok(run("JSON.parse(localStorage.getItem('pillbug.v1')).drugs.length")===base-1,'storage matches memory after committed action');

  const real=w.Storage.prototype.setItem;
  w.Storage.prototype.setItem=()=>{throw new Error('quota')};
  run('save()');
  ok(!$('#save-warn').hidden,'not-saved banner shown when storage refuses');
  w.Storage.prototype.setItem=real;
  run('save()');
  ok($('#save-warn').hidden,'banner clears after a successful save');

  const good=JSON.parse(run('JSON.stringify(S)'));
  const imp=async d=>{$('#toasts').innerHTML='';$('#modal').open&&w.document.getElementById('modal').close();run('handleImport')(new w.File([JSON.stringify(d)],'b.json'));for(let i=0;i<100&&!toasts()&&!$('#modal').open;i++)await wait(10)};
  await imp({...good,tx:[{id:'x',type:'bogus',date:'2026-01-01',qty:1}]});
  ok(/malformed/.test(toasts())&&!$('#modal').open,'backup with an unknown ledger type rejected');
  await imp({...good,batches:[...good.batches,{id:'zz',drugId:'nope',expiry:'2027-01-01',qty:1,cost:1,lot:'Z'}]});
  ok(/malformed/.test(toasts())&&!$('#modal').open,'backup with an orphan batch rejected');
  await imp({...good,pos:[{id:'p',number:'PO-1'}]});
  ok(/malformed/.test(toasts())&&!$('#modal').open,'backup with a broken purchase order rejected');
  await imp(good);
  ok($('#modal').open&&/Import backup/.test($('#modal').textContent),'valid backup reaches the import dialog');
  run("A.import({mode:'replace'})");
  ok(run('S.drugs.length')===good.drugs.length&&run('audit().length')===0,'replace import restores a reconciling state');

  run(`IMP={file:'t.csv',sheets:[{n:'S',rows:[['Name','Qty','Expiry','Lot'],['Panadol',20,'12/2028','L1']]}],sheet:null,update:true};impSheet(0)`);
  const dd=$('#drawer');dd.querySelector('.panel-body').scrollTop=0;
  const lot=$('select[data-imp-map=lot]',dd).parentElement.querySelector('.sel-btn');
  ev(lot,'click');ev($$('.menu .opt')[0],'mousedown');
  ok(run('IMP.map.lot')===undefined,'mapping change applied');
  ok(w.document.activeElement!==$('#drawer .sel-btn'),'importer re-render no longer steals focus to the first control');
  w.document.getElementById('drawer').close();

  const fresh=boot('http://localhost/#/orders');
  ok(fresh.w.document.title.startsWith('Orders'),'deep link to #/orders renders orders on first paint');
  ok(fresh.w.document.querySelector('#main h1').textContent==='Purchase orders','orders view registered before boot');
  ok(fresh.errs.length===0,'boot raises no errors');
  fresh.run('S.pos.push({id:"q",number:"PO-2026-0001",supplier:"",status:"draft",created:new Date().toISOString(),sent:"",expected:"",note:"",lines:[]});save()');
  ok(fresh.w.document.querySelector('#po-badge').textContent==='1'&&!fresh.w.document.querySelector('#po-badge').hidden,'single updateBadge drives the orders badge');


  const mk=i=>{const w=i.w,$=(q,r=w.document)=>r.querySelector(q),$$=(q,r=w.document)=>[...r.querySelectorAll(q)];return{w,run:i.run,errs:i.errs,$,$$,ev:(el,t)=>el.dispatchEvent(new w.MouseEvent(t,{bubbles:true,cancelable:true})),go:h=>{w.location.hash=h;i.run('route()')},toasts:()=>$$('.toast').map(t=>t.textContent).join('|'),type:(el,v)=>{el.value=v;el.dispatchEvent(new w.Event('input',{bubbles:true}))},enter:el=>el.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))}};

  const T=mk(boot('http://localhost/'));
  T.go('#/inventory');
  ok(T.$('a[href="#/stocktake"]'),'inventory page links to stocktake');
  T.go('#/stocktake');
  ok(T.$('.nav a[data-v=stocktake]')&&T.w.document.title.startsWith('Stocktake'),'stocktake route and nav item');
  const ids=T.run('cntRows().map(b=>b.id)');
  ok(ids.length>3&&T.$$('[data-cnt]').length===ids.length,'one count box per live batch');
  ok(!/Expected/.test(T.$('#cnt-table thead').textContent),'blind count hides expected quantities');
  ok(T.$('#cnt-prog').textContent===`0 of ${ids.length} counted`,'progress starts at zero');
  const cb=T.$('#cnt-blind');cb.checked=false;cb.dispatchEvent(new T.w.Event('change',{bubbles:true}));
  const bq=id=>T.run(`S.batches.find(b=>b.id==='${id}').qty`);
  ok(/Expected/.test(T.$('#cnt-table thead').textContent)&&T.$('#cnt-table tbody tr .num.mono').textContent.replace(/\D/g,'')===String(bq(ids[0])),'unblinding shows the system quantity');
  cb.checked=true;cb.dispatchEvent(new T.w.Event('change',{bubbles:true}));
  ok(!/Expected/.test(T.$('#cnt-table thead').textContent),'blind again');

  const [i0,i1,i2]=ids,[q0,q1,q2]=[i0,i1,i2].map(bq);
  const box=id=>T.$(`[data-cnt="${id}"]`);
  T.type(box(i0),String(q0));T.type(box(i1),String(q1-3));T.type(box(i2),String(q2+5));
  ok(T.$('#cnt-prog').textContent===`3 of ${ids.length} counted`,'progress follows typing');
  const txBefore=T.run('S.tx.length');
  T.run('A["cnt-review"]()');
  ok(T.$('#modal').open&&/3 batches counted · 2 differ/.test(T.$('#modal').textContent),'review summarises counts and differences');
  const net=T.run(`money(-3*S.batches.find(b=>b.id==='${i1}').cost+5*S.batches.find(b=>b.id==='${i2}').cost)`);
  ok(T.$('#modal').textContent.includes('net '+net),'review shows net value at cost '+net);
  T.$('[data-act=cnt-apply]').click();
  ok(bq(i0)===q0&&bq(i1)===q1-3&&bq(i2)===q2+5,'quantities applied');
  ok(T.run('S.tx.length')===txBefore+2,'one ledger entry per differing batch');
  ok(T.run("S.tx.filter(t=>t.ref==='Stocktake').map(t=>t.qty).sort((a,b)=>a-b).join()")==='-3,5','ledger deltas are -3 and +5');
  ok(T.run('audit().length')===0,'ledger still reconciles after a stocktake');
  ok(T.run('Object.keys(ui.count.counts).length')===0&&!T.$('#modal').open,'counts cleared and dialog closed');
  ok(T.$('#cnt-prog').textContent===`0 of ${T.run('cntRows().length')} counted`,'progress reset after apply');
  ok(T.run(`JSON.parse(localStorage.getItem('pillbug.v1')).batches.find(b=>b.id==='${i1}').qty`)===q1-3,'applied stocktake persisted');

  const [j0,j1]=T.run('cntRows().map(b=>b.id)');
  const tx2=T.run('S.tx.length'),a0=bq(j0),a1=bq(j1);
  T.type(box(j0),'1.5');T.type(box(j1),String(a1-1));
  T.run('A["cnt-review"]()');
  ok(/not whole numbers/.test(T.$('#modal').textContent)&&T.$('[data-act=cnt-apply]').disabled,'invalid count blocks apply');
  T.run('A["cnt-apply"]()');
  ok(T.run('S.tx.length')===tx2&&bq(j0)===a0&&bq(j1)===a1,'nothing changes while a count is invalid');
  T.w.document.getElementById('modal').close();
  ok(T.run("[cntParse(''),cntParse('  '),cntParse('007'),cntParse('-1'),cntParse('abc'),cntParse('2.5')].map(String).join()")==='null,null,7,NaN,NaN,NaN','count parsing edge cases');

  T.run('A["cnt-clear"]()');
  ok(T.$$('[data-cnt]').every(i=>i.value==='')&&T.run('Object.keys(ui.count.counts).length')===0,'clear empties every box');
  T.type(box(j0),String(a0));
  T.run('A["cnt-review"]()');
  ok(/Finish — all match/.test(T.$('[data-act=cnt-apply]').textContent),'all-match review');
  T.$('[data-act=cnt-apply]').click();
  ok(T.run('S.tx.length')===tx2&&/everything matches/.test(T.toasts()),'all-match adds no ledger entries');

  T.type(box(j1),'0');T.run('A["cnt-review"]()');T.$('[data-act=cnt-apply]').click();
  ok(bq(j1)===0&&T.run('audit().length')===0,'zero count empties the batch and still reconciles');
  ok(!T.run(`cntRows().some(b=>b.id==='${j1}')`),'emptied batch leaves the count list');
  T.run('A["cnt-review"]()');
  ok(!T.$('#modal').open&&/at least one count/.test(T.toasts()),'review without counts is refused');

  const cats=T.run("[...new Set(S.drugs.map(d=>d.category).filter(Boolean))].sort()");
  const outId=T.run(`cntRows().find(b=>drug(b.drugId).category!==${JSON.stringify(cats[0])}).id`);
  T.type(box(outId),'1');
  const total=T.run('cntRows().length');
  T.ev(T.$('#cnt-cat').parentElement.querySelector('.sel-btn'),'click');T.ev(T.$$('.menu .opt')[1],'mousedown');
  ok(T.run('ui.count.cat')===cats[0]&&T.run('cntRows().length')<total,'category scope narrows the list');
  ok(T.run('cntPlan().counted')===0,'counts outside the scope are ignored');
  ok(T.$$('[data-cnt]').length===T.run('cntRows().length'),'table re-rendered for the scope');

  T.run("ui.count.cat='';ui.count.counts={};route()");
  const boxes=T.$$('[data-cnt]');boxes[0].focus();T.enter(boxes[0]);
  ok(T.w.document.activeElement===boxes[1],'Enter moves to the next count box');
  const lastBox=boxes[boxes.length-1];lastBox.focus();T.enter(lastBox);
  ok(T.w.document.activeElement===T.$('[data-act=cnt-review]'),'Enter on the last box moves to Review');

  const F=mk(boot('http://localhost/'));
  F.run(`S=blank();S.drugs.push({id:'dx',name:'Testol',generic:'',strength:'',form:'Tablet',category:'Test',sku:'T1',unit:'unit',price:2,reorder:10,notes:''});S.batches.push({id:'bA',drugId:'dx',lot:'A',expiry:ymd(addDays(10)),qty:100,cost:1,supplier:'Acme',received:today()},{id:'bB',drugId:'dx',lot:'B',expiry:ymd(addDays(60)),qty:50,cost:1,supplier:'Acme',received:today()});S.tx.push({id:'o1',type:'out',date:addDays(-5).toISOString(),drugId:'dx',drugName:'Testol',batchId:'bA',lot:'A',qty:30,unitCost:1,unitPrice:2,ref:'R',note:''});save()`);
  ok(F.run("demand('dx')")===1,'demand is 30 units over 30 days');
  F.run("S.tx.push({id:'o2',type:'out',date:addDays(-40).toISOString(),drugId:'dx',qty:90},{id:'o3',type:'out',date:new Date().toISOString(),drugId:'dx',qty:60,reversed:true},{id:'o4',type:'return',date:new Date().toISOString(),drugId:'dx',qty:5})");
  ok(F.run("demand('dx')")===1,'old, reversed and return entries are excluded from demand');
  ok(F.run("unsold(S.batches[0])")===90&&F.run("unsold(S.batches[1])")===50,'projected unsold follows FEFO: 90 and 50');
  F.run("S.batches.push({id:'bX',drugId:'dx',lot:'X',expiry:ymd(addDays(-3)),qty:7,cost:1,supplier:'Acme',received:today()},{id:'bF',drugId:'dx',lot:'F',expiry:ymd(addDays(200)),qty:9,cost:1,supplier:'Acme',received:today()})");
  ok(F.run("unsold(S.batches[2])")===7,'expired batch is wholly unsold');
  ok(F.run("unsold(S.batches[3])")===null,'no projection beyond the warning window');
  F.run("ui.exp.tab='all';save()");F.go('#/expiry');
  const trs=F.$$('#main tbody tr').map(r=>r.textContent);
  ok(/Likely unsold/.test(F.$('#main thead').textContent)&&trs.some(t=>/Testol\s*A/.test(t)&&t.includes('90'))&&trs.some(t=>t.includes('—')),'expiry view shows 90 for lot A and a dash beyond the window');
  ok(F.run("suggestQty(S.drugs[0])")===10,'plenty of stock floors the suggestion at the reorder level');
  F.run("S.batches=S.batches.filter(b=>b.id==='bA');S.batches[0].qty=5;save()");
  ok(F.run("suggestQty(S.drugs[0])")===25,'low stock suggests demand × cover − stock');
  F.run("S.settings.coverDays=14;save()");
  ok(F.run("suggestQty(S.drugs[0])")===10,'shorter cover still floors at the reorder level');
  F.run("S.settings.coverDays=30;S.drugs.push({id:'dy',name:'Quiet',generic:'',strength:'',form:'Tablet',category:'Test',sku:'Q1',unit:'unit',price:1,reorder:8,notes:''});S.batches.push({id:'bQ',drugId:'dy',lot:'Q',expiry:ymd(addDays(300)),qty:3,cost:1,supplier:'Beta',received:today()});save()");
  ok(F.run("suggestQty(S.drugs[1])")===13,'no recent sales falls back to 2×reorder − stock');
  F.run('generatePOs()');
  ok(F.run("S.pos.flatMap(p=>p.lines).map(l=>l.drugId+':'+l.qty).sort().join()")==='dx:25,dy:13','generated PO lines use the new quantities');

  F.go('#/settings');
  const sc=F.$('#set-cover');
  ok(sc&&sc.value==='30','cover setting present with default');
  const setc=v=>{sc.value=v;sc.dispatchEvent(new F.w.Event('change',{bubbles:true}))};
  setc('21');
  ok(F.run('S.settings.coverDays')===21&&F.run("JSON.parse(localStorage.getItem('pillbug.v1')).settings.coverDays")===21,'valid cover saved');
  for(const bad of ['0','400','abc','']){setc(bad);ok(F.run('S.settings.coverDays')===21&&sc.value==='21','invalid cover "'+bad+'" rejected and restored')}
  ok(F.run("[0,999,undefined,'abc',14,12.6,-5].map(v=>normalize({settings:{coverDays:v}}).settings.coverDays).join()")==='30,365,30,30,14,13,1','normalize clamps cover days');
  ok(F.run("normalize({drugs:[],batches:[],tx:[]}).settings.coverDays")===30,'backups without the setting get the default');
  ok(!T.errs.length&&!F.errs.length,'no script errors in the v3 instances');


  const D=mk(boot('http://localhost/'));
  D.go('#/stocktake');
  const dId=D.run('cntRows()[0].id'),dKey='pillbug.count.v1';
  D.type(D.$(`[data-cnt="${dId}"]`),'5');
  ok(JSON.parse(D.w.localStorage.getItem(dKey))[dId]==='5','typed count saved as a draft');
  D.run('ui.count.counts={};cntLoad()');
  ok(D.run('ui.count.counts')[dId]==='5','draft restored after a simulated reload');
  D.run('route()');
  ok(D.$(`[data-cnt="${dId}"]`).value==='5','restored draft shown in the box');
  D.w.localStorage.setItem(dKey,'not json');D.run('cntLoad()');
  ok(D.run('Object.keys(ui.count.counts).length')===0,'corrupt draft ignored');
  D.w.localStorage.setItem(dKey,'[1,2]');D.run('cntLoad()');
  ok(D.run('Object.keys(ui.count.counts).length')===0,'array draft ignored');
  D.run('ui.count.counts={};route()');D.type(D.$(`[data-cnt="${dId}"]`),String(D.run(`S.batches.find(b=>b.id==='${dId}').qty`)-1));
  D.run('A["cnt-review"]()');D.$('[data-act=cnt-apply]').click();
  ok(D.w.localStorage.getItem(dKey)===null,'draft removed after applying');
  D.type(D.$(`[data-cnt="${D.run('cntRows()[0].id')}"]`),'3');
  D.run('A["cnt-clear"]()');
  ok(D.w.localStorage.getItem(dKey)===null,'draft removed after clearing');
  D.run("S.batches.length=0;save()");D.run('cntLoad();route()');
  ok(D.$('#cnt-table').textContent.includes('Nothing to count'),'empty stock shows the empty state');
  const deep=boot('http://localhost/#/stocktake');
  ok(deep.w.document.title.startsWith('Stocktake')&&deep.errs.length===0,'deep link to #/stocktake renders on first paint');
  ok(!D.errs.length,'no script errors in the draft instance');


  const old=boot('http://localhost/',JSON.stringify({version:1,drugs:[],batches:[],tx:[],pos:[],settings:{currency:'EUR',warnDays:60,theme:'dark'}}));
  ok(old.run('S.settings.coverDays')===30&&old.run('S.settings.currency')==='EUR'&&old.run('S.settings.warnDays')===60,'a v2.5-shaped saved state loads: new setting defaulted, old settings kept');
  ok(old.w.document.querySelector('#main h1')&&old.errs.length===0,'upgraded state renders without errors');

  const E=mk(boot('http://localhost/'));
  const clean=m=>ok(E.run('audit().length')===0,'ledger reconciles '+m);
  clean('on a fresh sample');
  E.go('#/receive');
  const eid=E.run('S.drugs[0].id');
  E.run(`F.receive(null,{drugId:'${eid}',lot:'E2E-1',expiry:ymd(addDays(200)),qty:'40',cost:'1.5',price:'',supplier:'Gamma',received:'',ref:'GRN-1',note:''})`);
  ok(E.run("S.batches.find(b=>b.lot==='E2E-1').qty")===40,'receive created the batch');
  clean('after receiving');
  E.go('#/dispense');
  const stockBefore=E.run(`sellable('${eid}')`);
  E.run(`ui.disp.cart.push({id:'${eid}',qty:25});checkout()`);
  ok(E.run(`sellable('${eid}')`)===stockBefore-25,'dispense removed 25 units');
  if(E.$('#modal').open)E.w.document.getElementById('modal').close();
  clean('after dispensing');
  E.go('#/stocktake');
  const [e0,e1]=E.run('cntRows().map(b=>b.id)');
  const eq=id=>E.run(`S.batches.find(b=>b.id==='${id}').qty`),e0q=eq(e0),e1q=eq(e1);
  E.type(E.$(`[data-cnt="${e0}"]`),String(e0q+2));E.type(E.$(`[data-cnt="${e1}"]`),String(Math.max(0,e1q-1)));
  E.run('A["cnt-review"]()');E.$('[data-act=cnt-apply]').click();
  ok(eq(e0)===e0q+2&&eq(e1)===Math.max(0,e1q-1),'stocktake applied through the UI');
  clean('after the stocktake');
  const snap=E.run('JSON.stringify(S)'),txN=E.run('S.tx.length');
  E.run(`S=normalize(JSON.parse(${JSON.stringify(snap)}));save();route()`);
  ok(E.run('S.tx.length')===txN&&E.run('audit().length')===0,'backup round trip keeps every entry and still reconciles');
  E.go('#/orders');E.run('generatePOs()');
  ok(E.run('S.pos.length')>0&&E.run('S.pos.flatMap(p=>p.lines).every(l=>Number.isInteger(l.qty)&&l.qty>0)'),'purchase orders generated with positive whole quantities');
  clean('after generating orders');
  ok(!E.errs.length,'no script errors across the end-to-end chain');


  const G=mk(boot('http://localhost/')),gKey='pillbug.count.v1';
  const arm=()=>{G.go('#/stocktake');G.type(G.$('[data-cnt]'),'7');return G.w.localStorage.getItem(gKey)!==null&&G.run('Object.keys(ui.count.counts).length')===1};
  const gone=()=>G.w.localStorage.getItem(gKey)===null&&G.run('Object.keys(ui.count.counts).length')===0;
  ok(arm(),'draft armed');
  G.run("A['load-demo']()");G.$$('#modal button').pop().click();
  ok(gone(),'loading sample data drops the draft');
  ok(arm(),'draft armed again');
  G.run('A.wipe()');G.$$('#modal button').pop().click();
  ok(gone()&&G.run('S.batches.length')===0,'erasing everything drops the draft');
  G.run('S=seed(S.settings);save()');
  const full=JSON.stringify(JSON.parse(G.run('JSON.stringify(S)')));
  ok(arm(),'draft armed for imports');
  G.run(`importData=normalize(JSON.parse(${JSON.stringify(full)}))`);G.run("A.import({mode:'merge'})");
  ok(G.w.localStorage.getItem(gKey)!==null,'merge import keeps the draft (batch ids unchanged)');
  G.run(`importData=normalize(JSON.parse(${JSON.stringify(full)}))`);G.run("A.import({mode:'replace'})");
  ok(gone(),'replace import drops the draft');
  ok(!G.errs.length,'no script errors in the draft-reset instance');

  console.log('errors:',errs.length?errs:'none');
  console.log(`pass ${pass}  fail ${fail}`);
  process.exit(fail||errs.length?1:0);
})();
