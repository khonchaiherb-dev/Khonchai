/* KHONCHAIHERB v1.38.0 — contextual after-sales care */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.38.0';
  if(window.__KCH_CONTEXTUAL_CARE__===BUILD)return;
  window.__KCH_CONTEXTUAL_CARE__=BUILD;

  const path=String(location.pathname||'/').toLowerCase();
  if(/\/(?:support|seller(?:-[^/]+)?|seller-center(?:-v2)?|login|register|account|member)\.html$/.test(path))return;

  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const orderPattern=/\bKCH[A-Z0-9-]{6,30}\b/i;
  let verifiedOrder=null;

  function detectOrderNo(){
    const candidates=[
      $('[data-order-no]')?.getAttribute?.('data-order-no'),
      $('.order-no')?.textContent,
      $('.order-number')?.textContent,
      $('.success')?.textContent,
      $('[class*="order"]')?.textContent,
      document.body?.textContent
    ];
    for(const value of candidates){
      const match=clean(value).match(orderPattern);
      if(match)return match[0].toUpperCase();
    }
    return '';
  }

  function supportUrl({category='',subject='',focus='',knowledge=false,orderNo=''}={}){
    const url=new URL('/support.html',location.origin);
    const no=clean(orderNo)||detectOrderNo();
    if(category)url.searchParams.set('category',category);
    if(subject)url.searchParams.set('subject',subject);
    if(focus)url.searchParams.set('focus',focus);
    if(no)url.searchParams.set('orderNo',no);
    if(knowledge)url.hash='knowledge';
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function action(label,description,{category='',subject='',focus='',knowledge=false,kind='secondary'}={}){
    const a=document.createElement('a');
    a.className=`kch-v137-care-action ${kind}`;
    a.href=supportUrl({category,subject,focus,knowledge});
    a.dataset.kchCategory=category;
    a.dataset.kchSubject=subject;
    a.dataset.kchFocus=focus;
    a.dataset.kchKnowledge=knowledge?'1':'0';
    const b=document.createElement('b');b.textContent=label;
    const s=document.createElement('small');s.textContent=description;
    a.append(b,s);
    return a;
  }

  function refreshContextLinks(scope=document){
    scope.querySelectorAll?.('[data-kch-category],[data-kch-focus],[data-kch-knowledge]').forEach(a=>{
      a.href=supportUrl({
        category:a.dataset.kchCategory||'',
        subject:a.dataset.kchSubject||'',
        focus:a.dataset.kchFocus||'',
        knowledge:a.dataset.kchKnowledge==='1',
        orderNo:a.dataset.kchOrderNo||''
      });
    });
  }

  const root=document.createElement('aside');
  root.className='kch-v137-care';
  root.setAttribute('aria-label','ผู้ช่วยหลังการขาย KHONCHAIHERB');

  const trigger=document.createElement('button');
  trigger.type='button';
  trigger.className='kch-v137-care-trigger';
  trigger.setAttribute('aria-expanded','false');
  trigger.setAttribute('aria-controls','kch-v137-care-panel');
  trigger.innerHTML='<span aria-hidden="true">?</span><b>ช่วยเหลือ</b>';

  const panel=document.createElement('div');
  panel.id='kch-v137-care-panel';
  panel.className='kch-v137-care-panel';
  panel.hidden=true;

  const head=document.createElement('div');
  head.className='kch-v137-care-head';
  const title=document.createElement('div');
  title.innerHTML='<span>KHONCHAIHERB CARE</span><h2>ผู้ช่วยหลังการขาย</h2><p>ตรวจสถานะจริง ดูข้อมูลพัสดุ ใบเสร็จ และขอความช่วยเหลือได้ในที่เดียว</p>';
  const close=document.createElement('button');
  close.type='button';close.className='kch-v137-care-close';close.setAttribute('aria-label','ปิดศูนย์ช่วยเหลือ');close.textContent='×';
  head.append(title,close);

  const actions=document.createElement('div');
  actions.className='kch-v137-care-actions';

  const trackAction=document.createElement('button');
  trackAction.type='button';
  trackAction.className='kch-v137-care-action primary kch-v138-track-action';
  trackAction.innerHTML='<b>ตรวจสถานะคำสั่งซื้อ</b><small>ยืนยันด้วยเลขออเดอร์และเบอร์โทร เพื่อดูสถานะจากระบบจริง</small>';

  actions.append(
    trackAction,
    action('แจ้งปัญหาคำสั่งซื้อ','ส่งเลขออเดอร์ให้ทีมตรวจสอบได้เร็วขึ้น',{category:'order',subject:'ขอความช่วยเหลือเกี่ยวกับคำสั่งซื้อ'}),
    action('การจัดส่งและพัสดุ','เลขติดตาม พัสดุล่าช้า หรือส่งไม่สำเร็จ',{category:'shipping',subject:'ขอความช่วยเหลือเกี่ยวกับการจัดส่ง'}),
    action('คืนสินค้า / คืนเงิน','เปิดเคสให้ทีมตรวจสอบ หรือเข้าสู่ระบบสมาชิกเพื่อใช้คำขอคืนสินค้า',{category:'return',subject:'ขอความช่วยเหลือเรื่องคืนสินค้า / คืนเงิน'}),
    action('คำถาม COD และใบเสร็จ','ดูคำตอบเรื่องการชำระเงินและเอกสารหลังรับชำระ',{knowledge:true}),
    action('ติดตามเคสเดิม','ใช้เลขเคสและรหัสเข้าถึงจากครั้งก่อน',{focus:'track'})
  );

  const tracker=document.createElement('section');
  tracker.className='kch-v138-tracker';
  tracker.hidden=true;
  tracker.innerHTML='<div class="kch-v138-tracker-head"><b>ตรวจสถานะออเดอร์</b><small>ข้อมูลตรงจากระบบคำสั่งซื้อ KHONCHAIHERB</small></div><form class="kch-v138-tracker-form"><label>เลขคำสั่งซื้อ<input name="orderNo" autocomplete="off" inputmode="text" placeholder="เช่น KCH..."></label><label>เบอร์โทรที่ใช้สั่งซื้อ<input name="phone" autocomplete="tel" inputmode="tel" placeholder="08X-XXX-XXXX"></label><button type="submit">ตรวจสถานะ</button></form><p class="kch-v138-privacy">ใช้เบอร์โทรเพื่อยืนยันออเดอร์เท่านั้น และจะไม่ใส่เบอร์โทรไว้ในลิงก์ Support</p><div class="kch-v138-order-result" aria-live="polite"></div>';

  const trust=document.createElement('p');
  trust.className='kch-v137-care-trust';
  trust.textContent='สถานะออเดอร์และพัสดุดึงจากระบบจริง • ใบเสร็จออกได้หลังรับชำระสำเร็จ • ทุกเคส Support มีเลขอ้างอิง';

  panel.append(head,actions,tracker,trust);
  root.append(trigger,panel);
  document.body.appendChild(root);

  const trackerForm=$('.kch-v138-tracker-form',tracker);
  const trackerResult=$('.kch-v138-order-result',tracker);

  function setOpen(open){
    panel.hidden=!open;
    trigger.setAttribute('aria-expanded',String(open));
    root.classList.toggle('is-open',open);
    if(open){refreshContextLinks(panel);close.focus({preventScroll:true})}
  }

  function openTracker(orderNo=''){
    refreshContextLinks(panel);
    tracker.hidden=false;
    if(orderNo)trackerForm.elements.orderNo.value=orderNo;
    setOpen(true);
    setTimeout(()=>trackerForm.elements[orderNo?'phone':'orderNo']?.focus({preventScroll:true}),20);
  }

  function statusLabel(data){
    if(data.status==='cancelled')return 'ยกเลิกแล้ว';
    const value=clean(data.fulfillmentStatus||data.shipmentStatus||data.status).toLowerCase();
    if(value==='delivered')return 'จัดส่งสำเร็จ';
    if(['shipping','shipped','in_transit'].includes(value))return 'กำลังจัดส่ง';
    if(value==='packing')return 'กำลังแพ็กสินค้า';
    if(['ready_to_ship','packed'].includes(value))return 'เตรียมส่งสินค้า';
    return 'รับคำสั่งซื้อแล้ว';
  }

  function dateText(value){
    if(!value)return '';
    const d=new Date(value);if(Number.isNaN(d.getTime()))return '';
    try{return new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short'}).format(d)}catch{return d.toLocaleString('th-TH')}
  }

  function money(value){
    try{return new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(Number(value)||0)}catch{return `฿${Number(value)||0}`}
  }

  function clearResult(){while(trackerResult.firstChild)trackerResult.firstChild.remove()}
  function resultMessage(text,kind='info'){
    clearResult();
    const p=document.createElement('p');p.className=`kch-v138-result-message ${kind}`;p.textContent=text;trackerResult.appendChild(p);
  }

  function makeResultAction(label,href,kind='secondary'){
    const a=document.createElement('a');a.className=`kch-v138-result-action ${kind}`;a.href=href;a.textContent=label;return a;
  }

  async function getJson(url){
    const res=await fetch(url,{headers:{Accept:'application/json'},credentials:'same-origin'});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){const error=new Error(data.error||'request_failed');error.status=res.status;throw error}
    return data;
  }

  function renderTimeline(data,container){
    const events=[];
    if(data.createdAt)events.push({label:'รับคำสั่งซื้อ',at:data.createdAt});
    if(data.shippedAt)events.push({label:'ส่งสินค้าออกจากระบบ',at:data.shippedAt});
    if(data.deliveredAt)events.push({label:'จัดส่งสำเร็จ',at:data.deliveredAt});
    if(data.codCollectedAt)events.push({label:'ยืนยันการรับเงิน COD',at:data.codCollectedAt});
    if(!events.length)return;
    const box=document.createElement('div');box.className='kch-v138-timeline';
    const h=document.createElement('b');h.textContent='ลำดับสถานะ';box.appendChild(h);
    events.forEach(item=>{const row=document.createElement('div');const dot=document.createElement('i');const copy=document.createElement('span');const b=document.createElement('b');const s=document.createElement('small');b.textContent=item.label;s.textContent=dateText(item.at);copy.append(b,s);row.append(dot,copy);box.appendChild(row)});
    container.appendChild(box);
  }

  async function issueReceipt(orderNo,phone,button,output){
    button.disabled=true;button.textContent='กำลังตรวจใบเสร็จ...';
    try{
      const data=await getJson(`/api/receipt?orderNo=${encodeURIComponent(orderNo)}&phone=${encodeURIComponent(phone)}`);
      if(!data.eligible){output.textContent=data.message||'ใบเสร็จยังไม่พร้อม';return}
      output.textContent='';
      const box=document.createElement('div');box.className='kch-v138-receipt-box';
      const b=document.createElement('b');b.textContent=`ใบเสร็จ ${clean(data.receipt_no||data.receiptNo)}`;
      const s=document.createElement('small');s.textContent=`ยอด ${money(data.amount)}${data.issued_at?` • ออกเมื่อ ${dateText(data.issued_at)}`:''}`;
      box.append(b,s);output.appendChild(box);
      button.textContent='ตรวจใบเสร็จแล้ว';
    }catch{output.textContent='ยังเปิดข้อมูลใบเสร็จไม่ได้ กรุณาลองอีกครั้ง';button.disabled=false;button.textContent='รับใบเสร็จ'}
  }

  function renderOrder(data,phone){
    clearResult();
    verifiedOrder={orderNo:clean(data.orderNo),phone,data};
    const card=document.createElement('article');card.className='kch-v138-order-card';
    const top=document.createElement('div');top.className='kch-v138-order-top';
    const copy=document.createElement('span');const label=document.createElement('small');const state=document.createElement('b');
    label.textContent=data.orderNo||'คำสั่งซื้อ';state.textContent=statusLabel(data);copy.append(label,state);
    const total=document.createElement('strong');total.textContent=money(data.total);top.append(copy,total);card.appendChild(top);

    const facts=document.createElement('div');facts.className='kch-v138-order-facts';
    if(data.paymentMethod){const x=document.createElement('span');x.textContent=data.paymentMethod==='COD'?'ชำระเงิน: COD':`ชำระเงิน: ${clean(data.paymentMethod)}`;facts.appendChild(x)}
    if(data.carrier){const x=document.createElement('span');x.textContent=`ขนส่ง: ${clean(data.carrier)}`;facts.appendChild(x)}
    if(data.trackingNo){const x=document.createElement('span');x.textContent=`เลขพัสดุ: ${clean(data.trackingNo)}`;facts.appendChild(x)}
    card.appendChild(facts);
    renderTimeline(data,card);

    const buttons=document.createElement('div');buttons.className='kch-v138-result-actions';
    buttons.append(
      makeResultAction('แจ้งปัญหาออเดอร์',supportUrl({category:'order',subject:'ขอความช่วยเหลือเกี่ยวกับคำสั่งซื้อ',orderNo:data.orderNo})),
      makeResultAction('ปัญหาการจัดส่ง',supportUrl({category:'shipping',subject:'ขอความช่วยเหลือเกี่ยวกับการจัดส่ง',orderNo:data.orderNo}))
    );
    if(data.fulfillmentStatus==='delivered')buttons.append(makeResultAction('คืนสินค้า / คืนเงิน',supportUrl({category:'return',subject:'ขอความช่วยเหลือเรื่องคืนสินค้า / คืนเงิน',orderNo:data.orderNo})));

    const receiptOutput=document.createElement('div');receiptOutput.className='kch-v138-receipt-output';
    if(['paid','cod_collected'].includes(clean(data.paymentStatus).toLowerCase())){
      const receipt=document.createElement('button');receipt.type='button';receipt.className='kch-v138-result-action primary';receipt.textContent='รับใบเสร็จ';
      receipt.addEventListener('click',()=>issueReceipt(data.orderNo,phone,receipt,receiptOutput),{once:false});buttons.prepend(receipt);
    }else{
      const note=document.createElement('small');note.className='kch-v138-receipt-note';note.textContent='ใบเสร็จจะพร้อมหลังระบบยืนยันการรับชำระ หรือรับเงิน COD สำเร็จ';card.appendChild(note);
    }
    card.append(buttons,receiptOutput);trackerResult.appendChild(card);
  }

  async function lookupOrder(event){
    event.preventDefault();
    const orderNo=clean(trackerForm.elements.orderNo.value).toUpperCase();
    const phone=clean(trackerForm.elements.phone.value);
    if(!orderPattern.test(orderNo)||phone.replace(/\D/g,'').length<9){resultMessage('กรุณากรอกเลขคำสั่งซื้อและเบอร์โทรที่ใช้สั่งซื้อให้ถูกต้อง','error');return}
    const submit=trackerForm.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='กำลังตรวจสอบ...';resultMessage('กำลังอ่านสถานะจากระบบคำสั่งซื้อ');
    try{
      const data=await getJson(`/api/order-status?orderNo=${encodeURIComponent(orderNo)}&phone=${encodeURIComponent(phone)}`);
      renderOrder(data,phone);
    }catch(error){
      if(error.status===404)resultMessage('ไม่พบคำสั่งซื้อนี้ หรือเบอร์โทรไม่ตรงกับข้อมูลคำสั่งซื้อ','error');
      else if(error.status===400)resultMessage('ข้อมูลสำหรับตรวจสอบคำสั่งซื้อไม่ถูกต้อง','error');
      else resultMessage('ยังตรวจสถานะไม่ได้ กรุณาลองอีกครั้งหรือเปิดเคสให้ทีมช่วยตรวจสอบ','error');
    }finally{submit.disabled=false;submit.textContent='ตรวจสถานะ'}
  }

  function enhanceSuccess(){
    const success=$('.success');if(!success||$('.kch-v138-success-care',success))return;
    const orderNo=detectOrderNo();if(!orderNo)return;
    const box=document.createElement('section');box.className='kch-v138-success-care';box.dataset.orderNo=orderNo;
    const copy=document.createElement('div');const h=document.createElement('b');const p=document.createElement('small');
    h.textContent='ขั้นตอนต่อไป';p.textContent='เก็บเลขคำสั่งซื้อนี้ไว้ คุณสามารถตรวจสถานะจริงและขอความช่วยเหลือได้จากหน้านี้';copy.append(h,p);
    const buttons=document.createElement('div');
    const track=document.createElement('button');track.type='button';track.textContent='ตรวจสถานะออเดอร์';track.addEventListener('click',()=>openTracker(orderNo));
    const help=document.createElement('a');help.textContent='ขอความช่วยเหลือ';help.dataset.kchCategory='order';help.dataset.kchSubject='ขอความช่วยเหลือเกี่ยวกับคำสั่งซื้อ';help.dataset.kchOrderNo=orderNo;help.href=supportUrl({category:'order',subject:'ขอความช่วยเหลือเกี่ยวกับคำสั่งซื้อ',orderNo});
    buttons.append(track,help);box.append(copy,buttons);
    const anchor=$('.receipt-note',success)||$('.successbox',success);if(anchor)anchor.insertAdjacentElement('afterend',box);else success.appendChild(box);
  }

  function refresh(){refreshContextLinks(panel);enhanceSuccess()}

  trackAction.addEventListener('click',()=>openTracker(detectOrderNo()));
  trackerForm.addEventListener('submit',lookupOrder);
  trigger.addEventListener('click',()=>panel.hidden?setOpen(true):setOpen(false));
  close.addEventListener('click',()=>{setOpen(false);trigger.focus({preventScroll:true})});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){setOpen(false);trigger.focus({preventScroll:true})}});
  document.addEventListener('click',event=>{if(!panel.hidden&&!root.contains(event.target)&&!event.target.closest?.('.kch-v138-success-care'))setOpen(false)});

  let raf=0;const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;refresh()})};
  const app=$('#app');if(app&&typeof MutationObserver!=='undefined')new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  window.addEventListener('popstate',schedule,{passive:true});window.addEventListener('pageshow',schedule,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  setTimeout(schedule,100);setTimeout(schedule,500);

  window.__KCH_AFTER_SALES_CARE__={openTracker,refresh:schedule,get verifiedOrder(){return verifiedOrder},version:BUILD};
})();
