/* KHONCHAIHERB v1.34.6 — urgent single-header structural fix */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.34.6';
  if(window.__KCH_V134_STRUCTURAL__===BUILD)return;
  window.__KCH_V134_STRUCTURAL__=BUILD;

  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const navLabels=['หน้าหลัก','สินค้าทั้งหมด','สินค้าแนะนำ','สินค้าใหม่','โปรโมชั่น','เกี่ยวกับเรา','ติดต่อเรา'];

  function shell(){
    const root=$('.kch-master-shell')||$('#app>.shell')||$('.shell');
    if(!root)return null;
    root.classList.add('kch-master-shell','kch-v134-active');
    root.dataset.kchUi=BUILD;
    return root;
  }

  function retire(el){
    if(!el||el.id==='kch-v134-header'||el.closest?.('#kch-v134-header'))return;
    if(el.matches?.('nav.bottom,nav.tshop-bottom,.tshop-bottom')||el.closest?.('nav.bottom,nav.tshop-bottom,.tshop-bottom'))return;
    el.hidden=true;
    el.setAttribute?.('aria-hidden','true');
    try{el.inert=true}catch{}
    el.classList?.add('kch-v134-retired-chrome');
  }

  function looksLikeNav(el){
    const t=clean(el?.textContent);
    return navLabels.filter(x=>t.includes(x)).length>=4;
  }

  function looksLikeAccountStrip(el){
    const t=clean(el?.textContent);
    return t.length>0&&t.length<280&&t.includes('เข้าสู่ระบบ')&&t.includes('สมัครสมาชิก');
  }

  function pruneLegacy(root){
    $$('.tshop-topbar,.topbar,.kch-master-topbar,.kch-ref-menu,.tshop-menu,.tshop-nav',root).forEach(retire);
    Array.from(root.children||[]).forEach(el=>{
      if(el.id==='kch-v134-header'||el.classList?.contains('kch-master-home')||el.matches?.('nav.bottom,nav.tshop-bottom,.tshop-bottom'))return;
      const hasSearch=Boolean(el.querySelector?.('input[type="search"],#shop-search,.tshop-searchbox input'));
      const t=clean(el.textContent);
      if((hasSearch&&(t.includes('ตะกร้า')||t.includes('คำสั่งซื้อ')||t.includes('หน้าหลัก')))||looksLikeNav(el)||looksLikeAccountStrip(el))retire(el);
    });
    $$('a,button,div,section',root).filter(el=>!el.closest('#kch-v134-header')&&looksLikeAccountStrip(el)).forEach(el=>{
      const nested=$$('a,button,div,section',el).some(child=>child!==el&&looksLikeAccountStrip(child));
      if(!nested)retire(el);
    });
  }

  function findLegacyAction(go,root){
    return $$(`[data-go="${go}"]`,root).find(el=>!el.closest('#kch-v134-header'))||null;
  }

  function activate(go,root){
    const legacy=findLegacyAction(go,root);
    if(legacy){legacy.click();return true}
    const names={home:['home','renderHome'],account:['account','accountPage','memberPage'],orders:['orders','ordersPage','orderPage'],cart:['cartPage','cart']}[go]||[];
    for(const name of names){if(typeof window[name]==='function'){try{window[name]();return true}catch{}}}
    if(typeof window.go==='function'){try{window.go(go);return true}catch{}}
    if(go==='home'){location.href='/';return true}
    if(go==='account'){location.href='/account.html';return true}
    return false;
  }

  function legacySearch(root){
    const sels=['#shop-search','.tshop-searchbox input','.kch-header-search input','.kch-ref-search input','.tshop-search input'];
    for(const sel of sels){const el=$$(sel,root).find(x=>!x.closest('#kch-v134-header'));if(el)return el}
    return null;
  }

  function normalize(s){return String(s||'').normalize('NFKC').toLocaleLowerCase('th-TH').replace(/\s+/g,' ').trim()}
  function fallbackFilter(value,root){
    const q=normalize(value),tokens=q?q.split(' ').filter(Boolean):[];
    const cards=$$('.kch-master-product,[data-product]',root).filter(el=>!el.closest('#kch-v134-header'));
    cards.forEach(card=>{
      if(!card.dataset.kchUrgentSearchActive)card.dataset.kchUrgentPrevHidden=card.hidden?'1':'0';
      if(!tokens.length){
        if(card.dataset.kchUrgentSearchActive==='1')card.hidden=card.dataset.kchUrgentPrevHidden==='1';
        delete card.dataset.kchUrgentSearchActive;delete card.dataset.kchUrgentPrevHidden;delete card.dataset.kchUrgentSearch;
        return;
      }
      card.dataset.kchUrgentSearchActive='1';
      const hay=normalize(`${card.textContent||''} ${card.dataset.product||''}`);
      const match=tokens.every(token=>hay.includes(token));
      card.dataset.kchUrgentSearch=match?'1':'0';
      card.hidden=!match;
    });
  }

  function syncSearch(value,root,submit=false){
    const old=legacySearch(root);
    if(old){
      old.value=value;
      old.dispatchEvent(new Event('input',{bubbles:true}));
      old.dispatchEvent(new Event('change',{bubbles:true}));
      if(submit)old.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));
    }
    fallbackFilter(value,root);
    if(submit&&value.trim())($('.kch-master-products',root)||$('#product-grid',root)||$('#recommend',root))?.scrollIntoView?.({behavior:'smooth',block:'start'});
  }

  function scrollTarget(kind,root){
    const map={products:['.kch-master-products','#product-grid','#recommend'],recommended:['.kch-master-products','#recommend'],promotions:['.kch-master-promo','.coupon','.promo'],about:['footer','.kch-footer'],contact:['footer','.kch-footer']};
    for(const sel of map[kind]||[]){const el=$(sel,root)||$(sel);if(el){el.scrollIntoView({behavior:'smooth',block:'start'});return true}}
    return false;
  }

  const icon=(path)=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"></path></svg>`;
  const userIcon=icon('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z');
  const boxIcon=icon('M4 5.5 12 2l8 3.5v13L12 22l-8-3.5v-13Zm8-1.3L7 6.4l5 2.2 5-2.2-5-2.2Zm-6 4v9l5 2.2v-9L6 8.2Zm7 11.2 5-2.2v-9l-5 2.2v9Z');
  const cartIcon=icon('M3 4h2l2.1 9.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L20.4 7H7.1l-.5-2H3V4Zm6.5 12.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z');

  function markup(){return `<header id="kch-v134-header" class="kch-v134-header" data-kch-v134="${BUILD}" aria-label="ส่วนหัวร้าน KHONCHAIHERB">
    <div class="kch-v134-top">
      <button type="button" class="kch-v134-brand" data-v134-go="home"><strong>KHONCHAIHERB</strong><span>คุณชายสมุนไพร</span></button>
      <form class="kch-v134-search" role="search" data-v134-search-form><input id="kch-v134-search" type="search" autocomplete="off" placeholder="ค้นหาสินค้า ชาสมุนไพร และผลิตภัณฑ์สุขภาพ" aria-label="ค้นหาสินค้า"><button class="kch-v134-search-submit" type="submit">ค้นหา</button></form>
      <div class="kch-v134-actions">
        <button type="button" class="kch-v134-action" data-v134-go="account"><span class="kch-v134-action-icon">${userIcon}</span><span class="kch-v134-action-copy"><b>บัญชีสมาชิก</b><small>เข้าสู่ระบบ / สมัครสมาชิก</small></span></button>
        <button type="button" class="kch-v134-action" data-v134-go="orders"><span class="kch-v134-action-icon">${boxIcon}</span><span class="kch-v134-action-copy"><b>คำสั่งซื้อ</b><small>ติดตามสถานะ</small></span></button>
        <button type="button" class="kch-v134-action" data-v134-go="cart"><span class="kch-v134-action-icon">${cartIcon}</span><span class="kch-v134-action-copy"><b>ตะกร้า</b><small>ดูสินค้าที่เลือก</small></span></button>
      </div>
    </div>
    <nav id="kch-v134-nav" aria-label="เมนูร้านค้า">${navLabels.map((x,i)=>`<button type="button" data-v134-nav="${['home','products','recommended','products','promotions','about','contact'][i]}">${x}</button>`).join('')}</nav>
  </header>`}

  function bind(header,root){
    if(header.dataset.bound==='1')return;header.dataset.bound='1';
    header.addEventListener('click',e=>{
      const go=e.target.closest('[data-v134-go]')?.dataset.v134Go;if(go){e.preventDefault();activate(go,root);return}
      const nav=e.target.closest('[data-v134-nav]')?.dataset.v134Nav;if(!nav)return;e.preventDefault();if(nav==='home')activate('home',root);else scrollTarget(nav,root);
    });
    const form=$('[data-v134-search-form]',header),input=$('#kch-v134-search',header);
    input?.addEventListener('input',()=>syncSearch(input.value,root,false));
    form?.addEventListener('submit',e=>{e.preventDefault();syncSearch(input?.value||'',root,true)});
  }

  function install(){
    const root=shell();if(!root)return;
    let header=$('#kch-v134-header',root);
    if(!header){const host=document.createElement('div');host.innerHTML=markup().trim();header=host.firstElementChild;root.insertBefore(header,root.firstChild)}
    pruneLegacy(root);
    header.hidden=false;header.removeAttribute('aria-hidden');try{header.inert=false}catch{}
    bind(header,root);
    const old=legacySearch(root),input=$('#kch-v134-search',header);if(input&&old&&!input.value)input.value=old.value||'';
  }

  let raf=0;const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;install()})};
  const app=$('#app')||document.body;
  if(app&&typeof MutationObserver!=='undefined')new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  setTimeout(schedule,80);setTimeout(schedule,320);
})();
