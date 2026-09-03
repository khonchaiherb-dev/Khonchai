/* KHONCHAIHERB v1.37.0 — contextual customer care launcher */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.37.0';
  if(window.__KCH_CONTEXTUAL_CARE__===BUILD)return;
  window.__KCH_CONTEXTUAL_CARE__=BUILD;

  const path=String(location.pathname||'/').toLowerCase();
  if(/\/(?:support|seller(?:-[^/]+)?|seller-center(?:-v2)?|login|register|account|member)\.html$/.test(path))return;

  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const orderPattern=/\bKCH-[A-Z0-9-]{5,}\b/i;

  function detectOrderNo(){
    const candidates=[
      $('[data-order-no]')?.getAttribute?.('data-order-no'),
      $('.order-no')?.textContent,
      $('.order-number')?.textContent,
      $('[class*="order"]')?.textContent,
      document.body?.textContent
    ];
    for(const value of candidates){
      const match=clean(value).match(orderPattern);
      if(match)return match[0].toUpperCase();
    }
    return '';
  }

  function supportUrl({category='',subject='',focus='',knowledge=false}={}){
    const url=new URL('/support.html',location.origin);
    const orderNo=detectOrderNo();
    if(category)url.searchParams.set('category',category);
    if(subject)url.searchParams.set('subject',subject);
    if(focus)url.searchParams.set('focus',focus);
    if(orderNo)url.searchParams.set('orderNo',orderNo);
    if(knowledge)url.hash='knowledge';
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function action(label,description,href,kind='secondary'){
    const a=document.createElement('a');
    a.className=`kch-v137-care-action ${kind}`;
    a.href=href;
    const b=document.createElement('b');b.textContent=label;
    const s=document.createElement('small');s.textContent=description;
    a.append(b,s);
    return a;
  }

  const root=document.createElement('aside');
  root.className='kch-v137-care';
  root.setAttribute('aria-label','ศูนย์ช่วยเหลือ KHONCHAIHERB');

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
  title.innerHTML='<span>KHONCHAIHERB CARE</span><h2>ต้องการให้ช่วยเรื่องไหน?</h2><p>ค้นหาคำตอบ เปิดเคส และติดตามการช่วยเหลือได้ในที่เดียว</p>';
  const close=document.createElement('button');
  close.type='button';close.className='kch-v137-care-close';close.setAttribute('aria-label','ปิดศูนย์ช่วยเหลือ');close.textContent='×';
  head.append(title,close);

  const actions=document.createElement('div');
  actions.className='kch-v137-care-actions';
  actions.append(
    action('ติดตาม / แจ้งปัญหาคำสั่งซื้อ','ส่งเลขออเดอร์ให้ทีมตรวจสอบได้เร็วขึ้น',supportUrl({category:'order',subject:'ขอความช่วยเหลือเกี่ยวกับคำสั่งซื้อ'}),'primary'),
    action('การจัดส่งและพัสดุ','เลขติดตาม พัสดุล่าช้า หรือส่งไม่สำเร็จ',supportUrl({category:'shipping',subject:'ขอความช่วยเหลือเกี่ยวกับการจัดส่ง'})),
    action('คืนสินค้า / คืนเงิน','แจ้งสินค้าเสียหาย ผิดรายการ หรือขอคืนเงิน',supportUrl({category:'return',subject:'ขอความช่วยเหลือเรื่องคืนสินค้า / คืนเงิน'})),
    action('ค้นหาคำตอบทันที','COD ใบเสร็จ การชำระเงิน และคำถามที่พบบ่อย',supportUrl({knowledge:true})),
    action('ติดตามเคสเดิม','ใช้เลขเคสและรหัสเข้าถึงจากครั้งก่อน',supportUrl({focus:'track'}))
  );

  const trust=document.createElement('p');
  trust.className='kch-v137-care-trust';
  trust.textContent='ทุกเคสมีเลขอ้างอิง • ติดตามสถานะได้ • แสดงกรอบเวลาการตอบกลับ';

  panel.append(head,actions,trust);
  root.append(trigger,panel);
  document.body.appendChild(root);

  function setOpen(open){
    panel.hidden=!open;
    trigger.setAttribute('aria-expanded',String(open));
    root.classList.toggle('is-open',open);
    if(open)close.focus({preventScroll:true});
  }
  trigger.addEventListener('click',()=>setOpen(panel.hidden));
  close.addEventListener('click',()=>{setOpen(false);trigger.focus({preventScroll:true})});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){setOpen(false);trigger.focus({preventScroll:true})}});
  document.addEventListener('click',event=>{if(!panel.hidden&&!root.contains(event.target))setOpen(false)});
})();
