/* KHONCHAIHERB v1.34.0 — structural storefront header and navigation */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.34.0';
  if(window.__KCH_V134_STRUCTURAL__===BUILD)return;
  window.__KCH_V134_STRUCTURAL__=BUILD;

  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();

  function shell(){
    const root=$('.kch-master-shell')||$('#app>.shell')||$('.shell');
    if(!root)return null;
    root.classList.add('kch-master-shell','kch-v134-active');
    root.dataset.kchUi=BUILD;
    return root;
  }

  function legacyGo(go,root){
    return $$(`[data-go="${go}"]`,root||document).find(el=>!el.closest('#kch-v134-header'))||null;
  }

  function activate(go,root){
    const legacy=legacyGo(go,root);
    if(legacy){legacy.click();return true}
    const candidates={
      home:['home','renderHome'],
      account:['account','accountPage','memberPage'],
      orders:['orders','ordersPage','orderPage'],
      cart:['cartPage','cart'],
    }[go]||[];
    for(const name of candidates){
      if(typeof window[name]==='function'){
        try{window[name]();return true}catch{}
      }
    }
    if(go==='account'){location.href='/account.html';return true}
    if(go==='home'){location.href='/';return true}
    return false;
  }

  function markLegacy(root){
    $$('.tshop-topbar,.topbar',root).forEach(el=>{
      if(!el.closest('#kch-v134-header'))el.classList.add('kch-v134-obsolete-header');
    });
    $$('.kch-ref-menu,.tshop-menu,.tshop-nav',root).forEach(el=>{
      if(!el.closest('#kch-v134-header')&&!el.matches('nav.bottom,nav.tshop-bottom'))el.classList.add('kch-v134-obsolete-menu');
    });
    const candidates=$$('a,button,div,section',root).filter(el=>{
      if(el.closest('#kch-v134-header')||el.matches('nav.bottom,nav.tshop-bottom')||el.closest('nav.bottom,nav.tshop-bottom'))return false;
      const t=clean(el.textContent);
      return t.length>0&&t.length<260&&t.includes('เข้าสู่ระบบ')&&t.includes('สมัครสมาชิก');
    });
    candidates.filter(el=>!candidates.some(other=>other!==el&&el.contains(other))).forEach(el=>el.classList.add('kch-v134-obsolete-account-strip'));
  }

  function currentCartCount(){
    try{
      const rows=JSON.parse(localStorage.getItem('kch-cart')||'[]');
      return Array.isArray(rows)?rows.reduce((sum,row)=>sum+(Number(row?.qty)||0),0):0;
    }catch{return 0}
  }

  function syncCartCount(root){
    const badge=$('#kch-v134-cart-count',root);
    if(!badge)return;
    let n=currentCartCount();
    const legacy=legacyGo('cart',root);
    const oldBadge=legacy?$('.badge,.tshop-badge,[data-cart-count]',legacy):null;
    const parsed=Number.parseInt(clean(oldBadge?.textContent),10);
    if(Number.isFinite(parsed))n=parsed;
    badge.textContent=String(Math.max(0,n));
    badge.hidden=n<=0;
  }

  function findLegacySearch(root){
    const selectors=['#shop-search','.tshop-searchbox input','.kch-header-search input','.kch-ref-search input','.tshop-search input'];
    for(const s of selectors){
      const el=$$(s,root).find(x=>x.id!=='kch-v134-search'&&!x.closest('#kch-v134-header'));
      if(el)return el;
    }
    return null;
  }

  function syncSearch(value,root,submit=false){
    const old=findLegacySearch(root);
    if(old){
      old.value=value;
      old.dispatchEvent(new Event('input',{bubbles:true}));
      old.dispatchEvent(new Event('change',{bubbles:true}));
      if(submit){
        const btn=$('#search-btn',root)||$('.tshop-searchbox button',root)||$('.kch-header-search button',root);
        if(btn&&!btn.closest('#kch-v134-header'))btn.click();
        else old.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));
      }
      return;
    }
    if(submit&&value.trim()){
      const products=$('#kch-products',root)||$('#product-grid',root)||$('#recommend',root);
      products?.scrollIntoView?.({behavior:'smooth',block:'start'});
    }
  }

  function scrollTarget(kind,root){
    const map={
      products:['#kch-products','#product-grid','#recommend','.kch-master-products'],
      recommended:['#kch-products','#recommend','.kch-master-products'],
      promotions:['.kch-master-promo','.coupon','.promo','.kch-v132-promo'],
      about:['footer','.kch-footer'],
      contact:['footer','.kch-footer']
    };
    for(const sel of map[kind]||[]){
      const el=$(sel,root)||$(sel);
      if(el){el.scrollIntoView({behavior:'smooth',block:'start'});return true}
    }
    return false;
  }

  function headerMarkup(){
    return `<header id="kch-v134-header" class="kch-v134-header" data-kch-v134="${BUILD}" aria-label="เมนูหลัก KHONCHAIHERB">
      <div class="kch-v134-top">
        <button type="button" class="kch-v134-brand" data-v134-go="home" aria-label="กลับหน้าหลัก KHONCHAIHERB">
          <strong>KHONCHAIHERB</strong><span>คุณชายสมุนไพร</span>
        </button>
        <form class="kch-v134-search" role="search" aria-label="ค้นหาสินค้า" data-v134-search-form>
          <input id="kch-v134-search" type="search" autocomplete="off" placeholder="ค้นหาสินค้า ชาสมุนไพร และผลิตภัณฑ์สุขภาพ" aria-label="ค้นหาสินค้า">
          <button class="kch-v134-search-submit" type="submit">ค้นหา</button>
        </form>
        <div class="kch-v134-actions" aria-label="เมนูบัญชีและคำสั่งซื้อ">
          <button type="button" class="kch-v134-action" data-v134-go="account" aria-label="บัญชีสมาชิก เข้าสู่ระบบหรือสมัครสมาชิก">
            <span class="kch-v134-action-icon" aria-hidden="true">👤</span><span class="kch-v134-action-copy"><b>บัญชีสมาชิก</b><small>เข้าสู่ระบบ / สมัครสมาชิก</small></span>
          </button>
          <button type="button" class="kch-v134-action" data-v134-go="orders" aria-label="คำสั่งซื้อและติดตามสถานะ">
            <span class="kch-v134-action-icon" aria-hidden="true">📦</span><span class="kch-v134-action-copy"><b>คำสั่งซื้อ</b><small>ติดตามสถานะ</small></span>
          </button>
          <button type="button" class="kch-v134-action" data-v134-go="cart" aria-label="เปิดตะกร้าสินค้า">
            <span class="kch-v134-action-icon" aria-hidden="true">🛒</span><span class="kch-v134-action-copy"><b>ตะกร้า <i id="kch-v134-cart-count">0</i></b><small>ดูสินค้าที่เลือก</small></span>
          </button>
        </div>
      </div>
      <nav id="kch-v134-nav" aria-label="เมนูร้านค้า">
        <button type="button" data-v134-nav="home">หน้าหลัก</button>
        <button type="button" data-v134-nav="products">สินค้าทั้งหมด</button>
        <button type="button" data-v134-nav="recommended">สินค้าแนะนำ</button>
        <button type="button" data-v134-nav="products">สินค้าใหม่</button>
        <button type="button" data-v134-nav="promotions">โปรโมชั่น</button>
        <button type="button" data-v134-nav="about">เกี่ยวกับเรา</button>
        <button type="button" data-v134-nav="contact">ติดต่อเรา</button>
      </nav>
    </header>`;
  }

  function bindHeader(header,root){
    if(header.dataset.bound==='1')return;
    header.dataset.bound='1';
    header.addEventListener('click',event=>{
      const go=event.target.closest('[data-v134-go]')?.dataset?.v134Go;
      if(go){event.preventDefault();activate(go,root);return}
      const nav=event.target.closest('[data-v134-nav]')?.dataset?.v134Nav;
      if(!nav)return;
      event.preventDefault();
      if(nav==='home')activate('home',root);else scrollTarget(nav,root);
    });
    const form=$('[data-v134-search-form]',header),input=$('#kch-v134-search',header);
    input?.addEventListener('input',()=>syncSearch(input.value,root,false));
    form?.addEventListener('submit',event=>{event.preventDefault();syncSearch(input?.value||'',root,true)});
  }

  function install(){
    const root=shell();
    if(!root)return;
    markLegacy(root);
    let header=$('#kch-v134-header',root);
    if(!header){
      const host=document.createElement('div');host.innerHTML=headerMarkup().trim();header=host.firstElementChild;
      root.insertBefore(header,root.firstChild);
    }
    bindHeader(header,root);
    const old=findLegacySearch(root),input=$('#kch-v134-search',header);
    if(input&&old&&document.activeElement!==input&&!input.value)input.value=old.value||'';
    syncCartCount(root);
  }

  let raf=0;
  const schedule=()=>{
    if(raf)return;
    raf=requestAnimationFrame(()=>{raf=0;install()});
  };
  const app=$('#app')||document.body;
  if(app&&typeof MutationObserver!=='undefined')new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('storage',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  setTimeout(schedule,60);setTimeout(schedule,280);setInterval(()=>{const root=shell();if(root)syncCartCount(root)},1600);
})();
