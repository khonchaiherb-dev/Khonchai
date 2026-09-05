(()=>{
  'use strict';

  const ORDER_KEY='kch-last-order';
  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const num=v=>Number(v)||0;
  const money=v=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',minimumFractionDigits:0,maximumFractionDigits:2}).format(num(v));
  const icon=name=>`<svg aria-hidden="true" focusable="false"><use href="#i-${esc(name)}"></use></svg>`;

  function lastOrder(){
    try{
      const value=JSON.parse(localStorage.getItem(ORDER_KEY)||'null');
      return value&&/^KCH[A-Z0-9-]{6,30}$/i.test(String(value.orderNo||''))?value:null;
    }catch{return null}
  }

  function createEntryPoints(){
    const nav=$('.kch-nav');
    if(nav&&!nav.querySelector('[data-open-order-status]')){
      const button=document.createElement('button');
      button.type='button';button.className='kch-nav-order';button.dataset.openOrderStatus='';button.textContent='ติดตามคำสั่งซื้อ';
      nav.append(button);
    }

    const footer=$('.kch-footer-links');
    if(footer&&!footer.querySelector('[data-open-order-status]')){
      const button=document.createElement('button');
      button.type='button';button.className='kch-footer-order';button.dataset.openOrderStatus='';button.textContent='ติดตามคำสั่งซื้อ';
      footer.append(button);
    }

    const mobile=$('.kch-mobile-nav');
    if(mobile&&!mobile.querySelector('[data-open-order-status]')){
      const button=document.createElement('button');
      button.type='button';button.dataset.openOrderStatus='';button.innerHTML=`${icon('truck')}<span>ติดตาม</span>`;
      mobile.append(button);mobile.classList.add('kch-mobile-nav-5');
    }
  }

  function createModal(){
    if($('[data-layer="order-status"]'))return;
    const modal=document.createElement('section');
    modal.className='kch-modal';
    modal.dataset.layer='order-status';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label','ติดตามคำสั่งซื้อ');
    modal.innerHTML=`<div class="kch-modal-card kch-order-status">
      <div class="kch-modal-top"><button class="kch-close" type="button" data-close-order-status aria-label="ปิดหน้าติดตามคำสั่งซื้อ">${icon('close')}</button></div>
      <div class="kch-order-status-head">
        <span>ORDER TRACKING</span>
        <h2>ติดตามคำสั่งซื้อ</h2>
        <p>กรอกเลขคำสั่งซื้อและเบอร์โทรเดียวกับที่ใช้สั่งซื้อ ระบบจะแสดงเฉพาะข้อมูลของคำสั่งซื้อที่ตรงกัน</p>
      </div>
      <div class="kch-order-status-body">
        <form class="kch-order-lookup" data-order-lookup-form>
          <div class="kch-order-lookup-grid">
            <label class="kch-field"><span>เลขคำสั่งซื้อ</span><input data-order-no autocomplete="off" inputmode="text" placeholder="เช่น KCH-..."></label>
            <label class="kch-field"><span>เบอร์โทรที่ใช้สั่งซื้อ</span><input data-order-phone autocomplete="tel" inputmode="tel" placeholder="08X-XXX-XXXX"></label>
          </div>
          <button class="kch-btn kch-btn-primary" type="submit" data-order-lookup>ตรวจสอบสถานะ</button>
        </form>
        <div class="kch-order-lookup-note">เพื่อความเป็นส่วนตัว เว็บไซต์ไม่บันทึกเบอร์โทรไว้เพื่อเปิดดูสถานะอัตโนมัติ</div>
        <div class="kch-order-status-error" data-order-status-error role="alert"></div>
        <div data-order-status-result aria-live="polite"></div>
      </div>
    </div>`;
    document.body.append(modal);
  }

  function closeOtherLayers(){
    $$('[data-layer].is-open').forEach(el=>el.classList.remove('is-open'));
  }

  function openStatus(){
    createModal();
    closeOtherLayers();
    const modal=$('[data-layer="order-status"]'),backdrop=$('[data-backdrop]');
    if(!modal)return;
    const recent=lastOrder(),orderInput=$('[data-order-no]',modal),phoneInput=$('[data-order-phone]',modal);
    if(recent?.orderNo&&!orderInput.value)orderInput.value=recent.orderNo;
    $('[data-order-status-error]',modal).textContent='';
    modal.classList.add('is-open');
    backdrop?.classList.add('is-open');
    backdrop?.setAttribute('data-active-layer','order-status');
    document.body.classList.add('is-locked');
    setTimeout(()=>{(recent?.orderNo?phoneInput:orderInput)?.focus()},40);
  }

  function closeStatus(){
    const modal=$('[data-layer="order-status"]'),backdrop=$('[data-backdrop]');
    modal?.classList.remove('is-open');
    if(backdrop?.getAttribute('data-active-layer')==='order-status'){
      backdrop.classList.remove('is-open');backdrop.removeAttribute('data-active-layer');document.body.classList.remove('is-locked');
    }
  }

  function statusMeta(data){
    const raw=String(data.fulfillmentStatus||data.shipmentStatus||data.status||'').toLowerCase();
    if(['cancelled','canceled','void'].includes(raw))return {label:'ยกเลิกคำสั่งซื้อ',stage:0,tone:'danger'};
    if(['returned','return','return_to_sender'].includes(raw))return {label:'ตีกลับ / คืนสินค้า',stage:0,tone:'danger'};
    if(['delivered','completed','complete'].includes(raw))return {label:'ส่งถึงผู้รับแล้ว',stage:3,tone:'success'};
    if(['shipped','in_transit','transit','out_for_delivery'].includes(raw))return {label:'อยู่ระหว่างจัดส่ง',stage:2,tone:'active'};
    if(['packed','ready_to_ship','picking','processing','confirmed'].includes(raw))return {label:'กำลังเตรียมสินค้า',stage:1,tone:'active'};
    return {label:'รับคำสั่งซื้อแล้ว',stage:1,tone:'active'};
  }

  function statusDate(value){
    if(!value)return '';
    const d=new Date(value);if(Number.isNaN(d.getTime()))return '';
    return new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short'}).format(d);
  }

  function renderStatus(data){
    const root=$('[data-order-status-result]');if(!root)return;
    const meta=statusMeta(data),items=Array.isArray(data.items)?data.items:[];
    const tracking=data.trackingNo?`<div class="kch-track-info"><span>เลขพัสดุ</span><strong>${esc(data.trackingNo)}</strong>${data.carrier?`<small>${esc(data.carrier)}</small>`:''}</div>`:'';
    const progress=meta.stage>0?`<div class="kch-track-progress" aria-label="ความคืบหน้าคำสั่งซื้อ">
      <div class="${meta.stage>=1?'is-done':''}"><b>${icon('check')}</b><span>รับคำสั่งซื้อ</span></div>
      <div class="${meta.stage>=2?'is-done':''}"><b>${icon('truck')}</b><span>จัดส่งสินค้า</span></div>
      <div class="${meta.stage>=3?'is-done':''}"><b>${icon('check')}</b><span>ส่งถึงผู้รับ</span></div>
    </div>`:'';
    root.innerHTML=`<section class="kch-track-card">
      <div class="kch-track-summary">
        <div><span>เลขคำสั่งซื้อ</span><strong>${esc(data.orderNo||'')}</strong><small>${esc(statusDate(data.createdAt))}</small></div>
        <div class="kch-track-status is-${esc(meta.tone)}">${esc(meta.label)}</div>
      </div>
      ${progress}
      <div class="kch-track-financial">
        <div><span>ยอดคำสั่งซื้อ</span><strong>${money(data.total)}</strong></div>
        <div><span>การชำระเงิน</span><strong>${String(data.paymentMethod||'').toUpperCase()==='COD'?'เก็บเงินปลายทาง (COD)':esc(data.paymentMethod||'ตามข้อมูลคำสั่งซื้อ')}</strong></div>
      </div>
      ${tracking}
      ${items.length?`<div class="kch-track-items"><h3>รายการสินค้า</h3>${items.map(item=>`<div class="kch-track-item"><div><strong>${esc(item.product_name||item.name||'สินค้า')}</strong>${item.option_value?`<small>${esc(item.option_name||'ตัวเลือก')}: ${esc(item.option_value)}</small>`:''}</div><span>${Math.max(1,num(item.qty))} ชิ้น</span><b>${money(item.line_total||num(item.unit_price)*num(item.qty))}</b></div>`).join('')}</div>`:''}
      ${data.shippedAt?`<div class="kch-track-time">เริ่มจัดส่ง ${esc(statusDate(data.shippedAt))}</div>`:''}
      ${data.deliveredAt?`<div class="kch-track-time">ส่งถึงผู้รับ ${esc(statusDate(data.deliveredAt))}</div>`:''}
    </section>`;
  }

  function lookupError(error){
    const code=error?.code||error?.message||'';
    if(code==='invalid_lookup')return 'กรุณาตรวจเลขคำสั่งซื้อและเบอร์โทรให้ถูกต้อง';
    if(code==='order_not_found')return 'ไม่พบคำสั่งซื้อที่ตรงกับเลขคำสั่งซื้อและเบอร์โทรนี้';
    return 'ยังตรวจสอบสถานะไม่ได้ กรุณาลองใหม่อีกครั้ง';
  }

  async function lookupStatus(){
    const modal=$('[data-layer="order-status"]');if(!modal)return;
    const orderNo=String($('[data-order-no]',modal)?.value||'').trim().toUpperCase();
    const phone=String($('[data-order-phone]',modal)?.value||'').replace(/\D/g,'');
    const error=$('[data-order-status-error]',modal),result=$('[data-order-status-result]',modal),button=$('[data-order-lookup]',modal);
    if(error)error.textContent='';
    if(!/^KCH[A-Z0-9-]{6,30}$/i.test(orderNo)||phone.length<9){if(error)error.textContent='กรุณากรอกเลขคำสั่งซื้อและเบอร์โทรที่ใช้สั่งซื้อให้ครบถ้วน';return}
    if(result)result.innerHTML='<div class="kch-track-loading">กำลังตรวจสอบสถานะคำสั่งซื้อ…</div>';
    if(button){button.disabled=true;button.textContent='กำลังตรวจสอบ…'}
    try{
      const res=await fetch(`/api/order-status?orderNo=${encodeURIComponent(orderNo)}&phone=${encodeURIComponent(phone)}`,{headers:{accept:'application/json'},cache:'no-store'});
      const data=await res.json().catch(()=>({}));
      if(!res.ok){const err=new Error(data.error||`http_${res.status}`);err.code=data.error;throw err}
      renderStatus(data);
    }catch(err){
      if(result)result.innerHTML='';
      if(error)error.textContent=lookupError(err);
    }finally{
      if(button){button.disabled=false;button.textContent='ตรวจสอบสถานะ'}
    }
  }

  function enhanceSuccess(){
    const actions=$('.kch-success-actions');
    if(!actions||actions.querySelector('[data-success-track]')||!lastOrder()?.orderNo)return;
    const button=document.createElement('button');
    button.type='button';button.className='kch-btn kch-btn-ghost';button.dataset.openOrderStatus='';button.dataset.successTrack='';button.textContent='ติดตามคำสั่งซื้อ';
    actions.prepend(button);
    const copy=$('.kch-success p');
    if(copy)copy.textContent='ระบบรับคำสั่งซื้อเรียบร้อยแล้ว โปรดเก็บเลขคำสั่งซื้อไว้สำหรับตรวจสอบสถานะ';
  }

  function bind(){
    document.addEventListener('click',e=>{
      const target=e.target.closest('button,a');if(!target)return;
      if(target.matches('[data-open-order-status]')){e.preventDefault();openStatus();return}
      if(target.matches('[data-close-order-status]')){closeStatus();return}
    });
    document.addEventListener('submit',e=>{
      if(e.target.matches('[data-order-lookup-form]')){e.preventDefault();lookupStatus()}
    });
  }

  function init(){
    createEntryPoints();createModal();bind();enhanceSuccess();
    const checkout=$('[data-checkout-content]');
    if(checkout)new MutationObserver(enhanceSuccess).observe(checkout,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
