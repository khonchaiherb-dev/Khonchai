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

  function shell(){const root=$('.kch-master-shell')||$('#app>.shell')||$('.shell');if(!root)return null;root.classList.add('kch-master-shell','kch-v134-active');root.dataset.kchUi=BUILD;return root}
  function retire(el){if(!el||el.id==='kch-v134-header'||el.closest?.('#kch-v134-header'))return;if(el.matches?.('nav.bottom,nav.tshop-bottom,.tshop-bottom')||el.closest?.('nav.bottom,nav.tshop-bottom,.tshop-bottom'))return;el.hidden=true;el.setAttribute?.('aria-hidden','true');try{el.inert=true}catch{}el.classList?.add('kch-v134-retired-chrome')}
  function looksLikeNav(el){const t=clean(el?.textContent);return navLabels.filter(x=>t.includes(x)).length>=4}
  function looksLikeAccountStrip(el){const t=clean(el?.textContent);return t.length>0&&t.length<280&&t.includes('เข้าสู่ระบบ')&&t.includes('สมัครสมาชิก')}
  function pruneLegacy(root){
    $$('.tshop-topbar,.topbar,.kch-master-topbar,.kch-ref-menu,.tshop-menu,.tshop-nav',root).forEach(retire);
    Array.from(root.children||[]).forEach(el=>{if(el.id==='kch-v134-header'||el.classList?.contains('kch-master-home')||el.matches?.('nav.bottom,nav.tshop-bottom,.tshop-bottom'))return;const hasSearch=Boolean(el.querySelector?.('input[type="search"],#shop-search,.tshop-searchbox input'));const t=clean(el.textContent);if((hasSearch&&(t.includes('ตะกร้า')||t.includes('คำสั่งซื้อ')||t.includes('หน้าหลัก')))||looksLikeNav(el)||looksLikeAccountStrip(el))retire(el)});
    $$('a,button,div,section',root).filter(el=>!el.closest('#kch-v134-header')&&looksLikeAccountStrip(el)).forEach(el=>{const nested=$$('a,button,div,section',el).some(child=>child!==el&&looksLikeAccountStrip(child));if(!nested)retire(el)});
  }

  const svg=path=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"></path></svg>`;
  const paths={
    shopping_cart:'M3 4h2l2.1 9.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L20.4 7H7.1l-.5-2H3V4Zm6.5 12.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
    inventory_2:'M4 5.5 12 2l8 3.5v13L12 22l-8-3.5v-13Zm3 1L12 8.7l5-2.2L12 4.3 7 6.5Zm-1 2v8.7l5 2.2v-8.7L6 8.5Zm7 10.9 5-2.2V8.5l-5 2.2v8.7Z',
    local_shipping:'M3 5h11v9h2.2l-1.7-3H16V7h3l3 5v4h-2.1a3 3 0 0 1-5.8 0H9.9a3 3 0 0 1-5.8 0H2V7a2 2 0 0 1 1-2Zm4 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
    payments:'M3 6h18v12H3V6Zm2 2v8h14V8H5Zm7 1.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z',
    schedule:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5v4.6l3.2 1.9-1 1.7L11 12.7V7h2Z',
    verified_user:'M12 2 20 5v6c0 5.1-3.4 8.7-8 11-4.6-2.3-8-5.9-8-11V5l8-3Zm-1.2 13.4 5-5-1.4-1.4-3.6 3.6-1.8-1.8-1.4 1.4 3.2 3.2Z',
    local_cafe:'M4 5h13v2h3a3 3 0 0 1 0 6h-3v1a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V5Zm13 6h3a1 1 0 0 0 0-2h-3v2Z',
    medication:'M9 3h6v3h3v15H6V6h3V3Zm2 2h2V4h-2v1Zm0 5v3H8v2h3v3h2v-3h3v-2h-3v-3h-2Z',
    auto_awesome:'M12 2l1.4 4.1L17.5 7.5l-4.1 1.4L12 13l-1.4-4.1-4.1-1.4 4.1-1.4L12 2Zm6 10 .9 2.6 2.6.9-2.6.9L18 19l-.9-2.6-2.6-.9 2.6-.9L18 12Z',
    receipt_long:'M5 2h14v20l-2-1.3L15 22l-2-1.3L11 22l-2-1.3L7 22l-2-1.3V2Zm3 5v2h8V7H8Zm0 4v2h8v-2H8Zm0 4v2h5v-2H8Z',
    person_add:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-7 2-7 5v2h10v-2c0-1.4.5-2.7 1.4-3.8A10.6 10.6 0 0 0 9 13Zm9-1v3h3v2h-3v3h-2v-3h-3v-2h3v-3h2Z',
    assignment_turned_in:'M9 2h6l1 2h3v18H5V4h3l1-2Zm1.2 13.4 5-5-1.4-1.4-3.6 3.6-1.8-1.8L8 12.2l3.2 3.2Z'
  };
  function repairMaterialIcons(root){$$('.material-symbols-rounded',root).forEach(el=>{if(el.querySelector('svg'))return;const name=clean(el.textContent);const path=paths[name]||'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5h2v6h-2V7Zm0 8h2v2h-2v-2Z';el.innerHTML=svg(path);el.setAttribute('aria-hidden','true');el.dataset.kchSvgFallback=name||'unknown'})}

  function findLegacyAction(go,root){return $$(`[data-go="${go}"]`,root).find(el=>!el.closest('#kch-v134-header'))||null}
  function activate(go,root){const legacy=findLegacyAction(go,root);if(legacy){legacy.click();return true}const names={home:['home','renderHome'],account:['account','accountPage','memberPage'],orders:['orders','ordersPage','orderPage'],cart:['cartPage','cart']}[go]||[];for(const name of names){if(typeof window[name]==='function'){try{window[name]();return true}catch{}}}if(typeof window.go==='function'){try{window.go(go);return true}catch{}}if(go==='home'){location.href='/';return true}if(go==='account'){location.href='/account.html';return true}return false}
  function legacySearch(root){const sels=['#shop-search','.tshop-searchbox input','.kch-header-search input','.kch-ref-search input','.tshop-search input'];for(const sel of sels){const el=$$(sel,root).find(x=>!x.closest('#kch-v134-header'));if(el)return el}return null}
  function normalize(s){return String(s||'').normalize('NFKC').toLocaleLowerCase('th-TH').replace(/\s+/g,' ').trim()}
  function fallbackFilter(value,root){const q=normalize(value),tokens=q?q.split(' ').filter(Boolean):[];const cards=$$('.kch-master-product,[data-product]',root).filter(el=>!el.closest('#kch-v134-header'));cards.forEach(card=>{if(!card.dataset.kchUrgentSearchActive)card.dataset.kchUrgentPrevHidden=card.hidden?'1':'0';if(!tokens.length){if(card.dataset.kchUrgentSearchActive==='1')card.hidden=card.dataset.kchUrgentPrevHidden==='1';delete card.dataset.kchUrgentSearchActive;delete card.dataset.kchUrgentPrevHidden;delete card.dataset.kchUrgentSearch;return}card.dataset.kchUrgentSearchActive='1';const hay=normalize(`${card.textContent||''} ${card.dataset.product||''}`);const match=tokens.every(token=>hay.includes(token));card.dataset.kchUrgentSearch=match?'1':'0';card.hidden=!match})}
  function syncSearch(value,root,submit=false){fallbackFilter(value,root);if(submit&&value.trim())($('.kch-master-products',root)||$('#product-grid',root)||$('#recommend',root))?.scrollIntoView?.({behavior:'smooth',block:'start'})}
  function scrollTarget(kind,root){const map={products:['.kch-master-products','#product-grid','#recommend'],recommended:['.kch-master-products','#recommend'],promotions:['.kch-master-promo','.coupon','.promo'],about:['footer','.kch-footer'],contact:['footer','.kch-footer']};for(const sel of map[kind]||[]){const el=$(sel,root)||$(sel);if(el){el.scrollIntoView({behavior:'smooth',block:'start'});return true}}return false}

  const userIcon=svg(paths.person_add);const boxIcon=svg(paths.inventory_2);const cartIcon=svg(paths.shopping_cart);
  function markup(){return `<header id="kch-v134-header" class="kch-v134-header" data-kch-v134="${BUILD}" aria-label="ส่วนหัวร้าน KHONCHAIHERB"><div class="kch-v134-top"><button type="button" class="kch-v134-brand" data-v134-go="home"><strong>KHONCHAIHERB</strong><span>คุณชายสมุนไพร</span></button><form class="kch-v134-search" role="search" data-v134-search-form><input id="kch-v134-search" type="search" autocomplete="off" placeholder="ค้นหาสินค้า ชาสมุนไพร และผลิตภัณฑ์สุขภาพ" aria-label="ค้นหาสินค้า"><button class="kch-v134-search-submit" type="submit">ค้นหา</button></form><div class="kch-v134-actions"><button type="button" class="kch-v134-action" data-v134-go="account"><span class="kch-v134-action-icon">${userIcon}</span><span class="kch-v134-action-copy"><b>บัญชีสมาชิก</b><small>เข้าสู่ระบบ / สมัครสมาชิก</small></span></button><button type="button" class="kch-v134-action" data-v134-go="orders"><span class="kch-v134-action-icon">${boxIcon}</span><span class="kch-v134-action-copy"><b>คำสั่งซื้อ</b><small>ติดตามสถานะ</small></span></button><button type="button" class="kch-v134-action" data-v134-go="cart"><span class="kch-v134-action-icon">${cartIcon}</span><span class="kch-v134-action-copy"><b>ตะกร้า</b><small>ดูสินค้าที่เลือก</small></span></button></div></div><nav id="kch-v134-nav" aria-label="เมนูร้านค้า">${navLabels.map((x,i)=>`<button type="button" data-v134-nav="${['home','products','recommended','products','promotions','about','contact'][i]}">${x}</button>`).join('')}</nav></header>`}
  function bind(header,root){if(header.dataset.bound==='1')return;header.dataset.bound='1';header.addEventListener('click',e=>{const go=e.target.closest('[data-v134-go]')?.dataset.v134Go;if(go){e.preventDefault();activate(go,root);return}const nav=e.target.closest('[data-v134-nav]')?.dataset.v134Nav;if(!nav)return;e.preventDefault();if(nav==='home')activate('home',root);else scrollTarget(nav,root)});const form=$('[data-v134-search-form]',header),input=$('#kch-v134-search',header);input?.addEventListener('input',()=>syncSearch(input.value,root,false));form?.addEventListener('submit',e=>{e.preventDefault();syncSearch(input?.value||'',root,true)})}
  function install(){const root=shell();if(!root)return;let header=$('#kch-v134-header',root);if(!header){const host=document.createElement('div');host.innerHTML=markup().trim();header=host.firstElementChild;root.insertBefore(header,root.firstChild)}pruneLegacy(root);repairMaterialIcons(root);header.hidden=false;header.removeAttribute('aria-hidden');try{header.inert=false}catch{}bind(header,root);const old=legacySearch(root),input=$('#kch-v134-search',header);if(input&&old&&!input.value)input.value=old.value||'';if(input?.value)fallbackFilter(input.value,root)}

  let raf=0;const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;install()})};const app=$('#app')||document.body;if(app&&typeof MutationObserver!=='undefined')new MutationObserver(schedule).observe(app,{childList:true,subtree:true});window.addEventListener('pageshow',schedule,{passive:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();setTimeout(schedule,80);setTimeout(schedule,320);
})();
