const {JSDOM}=require('jsdom'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const order=[...html.matchAll(/<script src="(js\/[^"]+)"/g)].map(m=>m[1]);
function boot(url){
  const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true,beforeParse(w){
    w.matchMedia=q=>({matches:false,addEventListener(){},removeEventListener(){}});
    w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
    w.HTMLDialogElement.prototype.close=function(){if(this.hasAttribute('open')){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'))}};
    w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};
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

const views=['dashboard','inventory','receive','dispense','history','expiry','settings','orders'];
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

  console.log('errors:',errs.length?errs:'none');
  console.log(`pass ${pass}  fail ${fail}`);
  process.exit(fail||errs.length?1:0);
})();
