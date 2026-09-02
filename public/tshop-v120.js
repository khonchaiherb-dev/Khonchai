/* KHONCHAIHERB Commerce v1.20 — premium conversion layer grounded in sale-ready catalog data */
(()=>{
  if(typeof document==='undefined'||window.__KCH_V120__==='1.20.0')return;
  window.__KCH_V120__='1.20.0';
  const state={frame:0};
  const demo=p=>[[1,189,86,1248],[2,149,120,938],[3,459,42,524],[4,99,210,2201],[5,129,64,781],[6,699,25,194]].some(x=>Number(p?.id)===x[0]&&Number(p?.price)===x[1]&&Number(p?.stock)===x[2]&&Number(p?.sold)===x[3]);
  const catalog=()=>{try{return Array.isArray(PRODUCTS)?PRODUCTS:[]}catch{return []}};
  const productBySlug=s=>catalog().find(p=>String(p?.slug||'')===String(s||''));
  const ready=p=>Boolean(p)&&!demo(p)&&Number(p.price||0)>0&&Number(p.stock||0)>0&&!p.comingSoon&&Boolean(String(p.image||p.image_url||'').trim());
  const escHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function sanitizeClaims(){
    document.querySelectorAll('span,small,b,strong,h2,h3,button,option,a').forEach(el=>{
      if(el.children.length)return;
      const t=String(el.textContent||'').trim();
      if(/^ขายแล้ว\s*0(?:\D|$)/i.test(t)||/^⭐\s*0(?:\.0+)?(?:\D|$)/.test(t)){el.remove();return}
      if(t==='สินค้าขายดี'||t==='สินค้ายอดนิยม')el.textContent='สินค้าแนะนำ';
      else if(t==='ขายดี'||t==='ฮิต'||t==='คนซื้อเยอะ')el.textContent='แนะนำ';
    });
    document.querySelectorAll('.rating').forEach(el=>{if(/0(?:\.0)?/.test(el.textContent||''))el.remove()});
    document.querySelectorAll('.kch-master-newsletter').forEach(section=>{
      const functional=Boolean(section.querySelector('form[action],a[href^="https://"],a[href^="http://"]'));
      if(!functional)section.hidden=true;
    });
  }

  function cardStatus(){
    document.querySelectorAll('.kch-master-product[data-product],.tshop-card[data-product]').forEach(card=>{
      const p=productBySlug(card.dataset.product);if(!ready(p)){card.classList.remove('v120-ready-card');card.querySelector('.v120-card-status')?.remove();return}
      card.classList.add('v120-ready-card');
      if(card.querySelector('.v120-card-status'))return;
      const anchor=card.querySelector('h3,.name,.tshop-name');if(!anchor)return;
      const row=document.createElement('div');row.className='v120-card-status';
      row.innerHTML='<span><span class="material-symbols-rounded">inventory_2</span>พร้อมสั่งซื้อ</span><small>ข้อมูลจากร้าน</small>';
      anchor.insertAdjacentElement('afterend',row);
    });
  }

  function promise(){
    if(typeof current!=='undefined'&&current!=='home')return;
    const root=document.querySelector('.kch-master-home,.v118-signature-home');if(!root||document.querySelector('.v120-promise'))return;
    const footer=document.querySelector('.kch-master-footer,.v118-brand-story,.tshop-bottom');
    const el=document.createElement('section');el.className='v120-promise';el.setAttribute('aria-label','บริการสำหรับคำสั่งซื้อ');
    el.innerHTML='<div class="v120-promise-head"><div><span>KHONCHAIHERB SERVICE</span><h2>ซื้อสมุนไพรออนไลน์ให้ชัดเจนตั้งแต่ก่อนสั่งถึงหลังรับสินค้า</h2></div><p>แสดงเฉพาะบริการที่ระบบรองรับจริง โดยเงื่อนไขสุดท้ายตรวจสอบอีกครั้งในขั้นตอนสั่งซื้อ</p></div><div class="v120-promise-grid"><div><span class="material-symbols-rounded">payments</span><span><b>รองรับเก็บเงินปลายทาง</b><small>เลือก COD ได้เมื่อคำสั่งซื้อเข้าเงื่อนไข</small></span></div><div><span class="material-symbols-rounded">local_shipping</span><span><b>ติดตามคำสั่งซื้อ</b><small>ตรวจสถานะคำสั่งซื้อและการจัดส่งได้ในระบบ</small></span></div><div><span class="material-symbols-rounded">receipt_long</span><span><b>ใบเสร็จหลังยืนยันรับชำระ</b><small>ออกใบเสร็จเมื่อชำระสำเร็จหรือรับเงิน COD สำเร็จ</small></span></div></div>';
    if(footer)footer.insertAdjacentElement('beforebegin',el);else root.appendChild(el);
  }

  function checkoutTrust(){
    if(typeof current!=='undefined'&&current!=='checkout')return;
    const page=document.querySelector('main.page,.checkout-page,.checkout-shell');if(!page)return;
    if(!page.querySelector('.v120-checkout-trust')){
      const payment=page.querySelector('.payment,.checkout-payment');
      const el=document.createElement('section');el.className='v120-checkout-trust';el.setAttribute('aria-label','ความมั่นใจก่อนยืนยันคำสั่งซื้อ');
      el.innerHTML='<div><span class="material-symbols-rounded">price_check</span><span><b>ตรวจยอดอีกครั้ง</b><small>เซิร์ฟเวอร์ยืนยันราคา สต็อก ค่าจัดส่ง และส่วนลดก่อนสร้างออเดอร์</small></span></div><div><span class="material-symbols-rounded">payments</span><span><b>COD เมื่อเข้าเงื่อนไข</b><small>ชำระเมื่อได้รับสินค้าโดยไม่ต้องโอนก่อน</small></span></div><div><span class="material-symbols-rounded">receipt_long</span><span><b>มีหลักฐานหลังชำระ</b><small>ใบเสร็จเชื่อมกับสถานะการรับชำระของคำสั่งซื้อ</small></span></div>';
      if(payment)payment.insertAdjacentElement('afterend',el);else page.prepend(el);
    }
    const place=page.querySelector('[data-place]');if(place&&!page.querySelector('.v120-checkout-final')){
      const n=document.createElement('div');n.className='v120-checkout-final';n.textContent='ก่อนยืนยัน โปรดตรวจชื่อผู้รับ ที่อยู่ เบอร์โทรศัพท์ รายการสินค้า และยอดชำระให้ครบถ้วน';place.insertAdjacentElement('beforebegin',n);
    }
  }

  function run(){state.frame=0;sanitizeClaims();cardStatus();promise();checkoutTrust()}
  function schedule(){if(state.frame)return;state.frame=requestAnimationFrame(run)}
  const root=document.getElementById('app');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
  document.addEventListener('input',schedule,true);document.addEventListener('click',()=>setTimeout(schedule,0),true);
  schedule();
})();
