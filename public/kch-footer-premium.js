/* KHONCHAIHERB Premium Footer v2.0 — one canonical storefront footer */
(()=>{
  if(typeof document==='undefined'||typeof document.createElement!=='function')return;
  const VERSION='2.0.0';
  if(window.__KCH_PREMIUM_FOOTER__===VERSION)return;
  window.__KCH_PREMIUM_FOOTER__=VERSION;

  const icon=name=>`<span class="material-symbols-rounded" aria-hidden="true">${name}</span>`;
  const scrollToSelector=selector=>{
    const el=document.querySelector(selector);
    if(!el)return false;
    el.scrollIntoView({behavior:'smooth',block:'start'});
    return true;
  };
  const go=page=>{
    try{
      if(typeof window.go==='function'){window.go(page);return true}
      const target=document.querySelector(`[data-go="${page}"]`);
      if(target&&typeof target.click==='function'){target.click();return true}
    }catch{}
    return false;
  };
  const resetProducts=()=>{
    try{window.__KCH_MASTER_SEARCH__?.clear?.()}catch{}
    const reset=document.querySelector('.kch-master-home [data-kch-reset]');
    if(reset&&typeof reset.click==='function')reset.click();
  };
  const selectFilter=value=>{
    resetProducts();
    if(value&&value!=='ทั้งหมด'){
      const buttons=[...document.querySelectorAll('.kch-master-home [data-kch-filter]')];
      const target=buttons.find(btn=>String(btn.dataset.kchFilter||'')===value);
      target?.click?.();
    }
    scrollToSelector('#kch-products');
  };

  function ensureStyle(){
    let style=document.getElementById('kch-footer-v2-style');
    if(!style){style=document.createElement('style');style.id='kch-footer-v2-style';(document.head||document.documentElement).appendChild(style)}
    style.textContent=`
      .kch-master-newsletter{display:none!important}
      .kch-footer-premium-wrap,.kch-footer-premium-nav{display:none!important}
      .kch-master-footer.kch-footer-v2{position:relative;overflow:hidden;background:linear-gradient(145deg,#052f25 0%,#06382b 52%,#04271f 100%);border-top:1px solid rgba(224,192,109,.28)}
      .kch-master-footer.kch-footer-v2:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 12% 0%,rgba(215,180,91,.10),transparent 29%),radial-gradient(circle at 88% 100%,rgba(78,133,101,.16),transparent 32%);pointer-events:none}
      .kch-footer-confidence{position:relative;width:min(1360px,calc(100% - 72px));margin:auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid rgba(231,207,151,.15)}
      .kch-footer-confidence>div{display:flex;align-items:center;gap:10px;min-width:0;padding:18px 16px;color:#d9e5df}
      .kch-footer-confidence>div+div{border-left:1px solid rgba(231,207,151,.12)}
      .kch-footer-confidence .material-symbols-rounded{flex:0 0 auto;font-size:24px;color:#e0bf68}
      .kch-footer-confidence b{display:block;color:#f3e2ae;font-size:10px}.kch-footer-confidence small{display:block;margin-top:2px;color:#aebfb6;font-size:8px;line-height:1.45}
      .kch-footer-v2 .kch-master-footer-inner{position:relative;grid-template-columns:minmax(230px,1.2fr) repeat(4,minmax(130px,.8fr));gap:28px;padding-top:34px}
      .kch-footer-v2 .kch-master-footer-brand p{max-width:290px}.kch-footer-company{display:flex;align-items:center;gap:7px;margin-top:15px;color:#91a69c;font-size:8px}.kch-footer-company .material-symbols-rounded{font-size:16px;color:#d5b766}
      .kch-footer-v2 .kch-master-footer-col h4{font-size:10.5px;margin-bottom:8px}.kch-footer-v2 .kch-master-footer-col button,.kch-footer-v2 .kch-master-footer-col a{width:max-content;max-width:100%;cursor:pointer;font-size:9px;line-height:1.45;padding:5px 0;transition:color .18s ease,transform .18s ease}.kch-footer-v2 .kch-master-footer-col button:hover,.kch-footer-v2 .kch-master-footer-col a:hover{color:#f3dda0;transform:translateX(2px)}
      .kch-footer-assurance{display:grid;gap:7px}.kch-footer-assurance span{display:flex;align-items:flex-start;gap:7px;color:#bdcec5;font-size:8.6px;line-height:1.5}.kch-footer-assurance .material-symbols-rounded{font-size:16px;color:#d9ba66}
      .kch-footer-v2 .kch-master-footer-bottom{position:relative}.kch-footer-v2 .kch-master-footer-bottom>div{min-height:54px}.kch-footer-legal{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.kch-footer-legal a{color:#9fb1a8;text-decoration:none}.kch-footer-legal a:hover{color:#e6cf8d}.kch-footer-v2 .kch-master-payments{align-items:center;flex-wrap:wrap}.kch-footer-v2 .kch-master-payments span{background:rgba(255,255,255,.92);padding:5px 8px}
      @media(max-width:1100px){.kch-footer-v2 .kch-master-footer-inner{grid-template-columns:1.2fr repeat(2,1fr)}.kch-footer-v2 .kch-master-footer-brand{grid-column:1/-1}.kch-footer-confidence{grid-template-columns:repeat(2,minmax(0,1fr))}.kch-footer-confidence>div:nth-child(3){border-left:0}}
      @media(max-width:699px){.kch-footer-confidence{width:calc(100% - 24px);grid-template-columns:1fr 1fr}.kch-footer-confidence>div{padding:13px 8px;align-items:flex-start}.kch-footer-confidence>div:nth-child(3){border-left:0}.kch-footer-confidence b{font-size:9px}.kch-footer-confidence small{font-size:7.5px}.kch-footer-v2 .kch-master-footer-inner{width:calc(100% - 24px);grid-template-columns:1fr 1fr;gap:22px 16px;padding:26px 0 94px}.kch-footer-v2 .kch-master-footer-brand{grid-column:1/-1}.kch-footer-v2 .kch-master-footer-col h4{font-size:10px}.kch-footer-v2 .kch-master-footer-col button,.kch-footer-v2 .kch-master-footer-col a{font-size:8.6px}.kch-footer-v2 .kch-master-footer-bottom>div{width:calc(100% - 24px);display:grid;gap:9px;text-align:center;padding:14px 0 18px}.kch-footer-legal,.kch-footer-v2 .kch-master-payments{justify-content:center}}
      @media(prefers-reduced-motion:reduce){.kch-footer-v2 *{transition:none!important;scroll-behavior:auto!important}}
    `;
  }

  function footerMarkup(){
    const year=new Date().getFullYear();
    return `
      <div class="kch-footer-confidence" aria-label="ความมั่นใจในการสั่งซื้อ">
        <div>${icon('payments')}<span><b>เก็บเงินปลายทาง</b><small>เลือก COD เมื่อคำสั่งซื้อรองรับ</small></span></div>
        <div>${icon('local_shipping')}<span><b>ติดตามคำสั่งซื้อ</b><small>ตรวจสถานะการจัดส่งจากบัญชีของคุณ</small></span></div>
        <div>${icon('receipt_long')}<span><b>ใบเสร็จหลังรับชำระ</b><small>ออกเมื่อชำระสำเร็จหรือรับเงิน COD แล้ว</small></span></div>
        <div>${icon('shield_lock')}<span><b>ข้อมูลและความเป็นส่วนตัว</b><small>มีนโยบายและข้อกำหนดให้ตรวจสอบก่อนซื้อ</small></span></div>
      </div>
      <div class="kch-master-footer-inner">
        <div class="kch-master-footer-brand">
          <h3>KHONCHAIHERB</h3><b>คุณชายสมุนไพร</b>
          <p>สมุนไพรไทยในประสบการณ์ช้อปที่ทันสมัย เลือกสินค้า ตรวจสอบข้อมูลสำคัญ และติดตามคำสั่งซื้อได้ในระบบเดียว</p>
          <div class="kch-footer-company">${icon('domain')}<span>บริษัท คุณชายสมุนไพร จำกัด</span></div>
        </div>
        <div class="kch-master-footer-col">
          <h4>ช็อปสินค้า</h4>
          <button type="button" data-kch-footer-action="all">สินค้าทั้งหมด</button>
          <button type="button" data-kch-footer-filter="ชาและสมุนไพร">ชาและสมุนไพร</button>
          <button type="button" data-kch-footer-filter="ผลิตภัณฑ์สมุนไพร">ผลิตภัณฑ์สมุนไพร</button>
          <button type="button" data-kch-footer-action="recommended">สินค้าแนะนำ</button>
        </div>
        <div class="kch-master-footer-col">
          <h4>บัญชีและคำสั่งซื้อ</h4>
          <button type="button" data-kch-footer-action="account">บัญชีของฉัน</button>
          <button type="button" data-kch-footer-action="orders">ติดตามคำสั่งซื้อ</button>
          <button type="button" data-kch-footer-action="cart">ตะกร้าสินค้า</button>
          <a href="/shipping-returns.html">การจัดส่งและคืนสินค้า</a>
        </div>
        <div class="kch-master-footer-col">
          <h4>ข้อมูล KHONCHAIHERB</h4>
          <button type="button" data-kch-footer-action="about">เกี่ยวกับเรา</button>
          <a href="/privacy.html">นโยบายความเป็นส่วนตัว</a>
          <a href="/terms.html">ข้อกำหนดการใช้บริการ</a>
          <a href="/shipping-returns.html">เงื่อนไขการจัดส่งและคืนสินค้า</a>
        </div>
        <div class="kch-master-footer-col">
          <h4>มาตรฐานการบริการ</h4>
          <div class="kch-footer-assurance">
            <span>${icon('fact_check')}<span>แสดงราคาและสถานะสินค้าจากข้อมูลที่ร้านยืนยัน</span></span>
            <span>${icon('inventory_2')}<span>คำสั่งซื้อเชื่อมกับสต็อกและสถานะการจัดส่ง</span></span>
            <span>${icon('verified_user')}<span>ไม่แสดงคะแนนหรือยอดขายที่ไม่ได้ตรวจสอบ</span></span>
          </div>
        </div>
      </div>
      <div class="kch-master-footer-bottom"><div>
        <div class="kch-footer-legal"><span>© ${year} บริษัท คุณชายสมุนไพร จำกัด</span><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/shipping-returns.html">Shipping & Returns</a></div>
        <div class="kch-master-payments"><span>COD</span><span>ใบเสร็จหลังรับชำระ</span></div>
      </div></div>`;
  }

  function act(key){
    if(key==='all'||key==='recommended'){selectFilter('ทั้งหมด');return}
    if(key==='about'){scrollToSelector('#kch-story');return}
    if(key==='cart'||key==='orders'||key==='account'){go(key);return}
  }

  function build(footer){
    if(!footer)return;
    footer.querySelectorAll('.kch-footer-premium-wrap,.kch-footer-premium-nav').forEach(el=>el.remove());
    if(footer.dataset.kchFooterVersion===VERSION)return;
    footer.dataset.kchFooterVersion=VERSION;
    footer.classList.add('kch-footer-v2');
    footer.setAttribute('aria-label','ข้อมูลร้าน บริการลูกค้า และนโยบาย');
    footer.innerHTML=footerMarkup();
    footer.addEventListener('click',event=>{
      const filter=event.target?.closest?.('[data-kch-footer-filter]');
      if(filter){event.preventDefault();selectFilter(filter.dataset.kchFooterFilter);return}
      const action=event.target?.closest?.('[data-kch-footer-action]');
      if(action){event.preventDefault();act(action.dataset.kchFooterAction)}
    });
  }

  function sync(){ensureStyle();document.querySelectorAll('.kch-master-footer').forEach(build)}
  window.__KCH_FOOTER__={version:VERSION,sync};

  let queued=false;
  const queue=()=>{if(queued)return;queued=true;(window.requestAnimationFrame||setTimeout)(()=>{queued=false;sync()},0)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
  if(typeof MutationObserver!=='undefined'){
    const observer=new MutationObserver(records=>{if(records.some(r=>r.addedNodes?.length))queue()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
