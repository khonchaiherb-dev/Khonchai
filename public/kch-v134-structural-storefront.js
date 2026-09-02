/* KHONCHAIHERB v1.34.2 — structural cleanup on the canonical master storefront */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.34.2';
  if(window.__KCH_STRUCTURAL_STOREFRONT__===BUILD)return;
  window.__KCH_STRUCTURAL_STOREFRONT__=BUILD;

  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const text=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
  const normalize=v=>String(v??'').normalize('NFKC').toLocaleLowerCase('th-TH').replace(/\s+/g,' ').trim();
  const icon=n=>`<span class="material-symbols-rounded" aria-hidden="true">${n}</span>`;

  function isHome(){
    try{if(typeof current!=='undefined')return current==='home'}catch{}
    return Boolean($('.kch-master-home'));
  }

  function moveBaselineLast(){
    const node=$('link[href*="tshop-v134-structural-storefront.css"],style[data-kch-v134-baseline]');
    if(node&&node.parentNode===document.head&&document.head.lastElementChild!==node)document.head.appendChild(node);
  }

  function canonicalShell(){
    const shell=$('.shell.kch-master-shell')||$('.shell');
    if(!shell)return null;
    shell.classList.add('kch-master-shell','kch-v134-active');
    shell.dataset.kchUi=BUILD;
    return shell;
  }

  function removeInjectedHeader(){
    $$('#kch-v134-header,.kch-v134-header').forEach(el=>el.remove());
  }

  function removeDuplicateChrome(shell,canonicalTop,canonicalNav){
    Array.from(shell.children).forEach(el=>{
      if(el===canonicalTop||el===canonicalNav)return;
      if(el.matches?.('.tshop-topbar,.topbar,.kch-ref-menu,.tshop-menu,.tshop-nav'))el.remove();
    });
  }

  function ensureBrand(top){
    let brand=$('.kch-brand-lockup',top);
    if(!brand){
      brand=document.createElement('button');
      brand.type='button';
      brand.className='kch-brand-lockup';
      brand.dataset.go='home';
    }
    brand.setAttribute('aria-label','KHONCHAIHERB คุณชายสมุนไพร หน้าแรก');
    brand.innerHTML='<b>KHONCHAIHERB</b><small>คุณชายสมุนไพร</small>';
    return brand;
  }

  function ensureSearch(top){
    const search=$('.tshop-searchbox',top)||$('.search',top);
    if(!search)return null;
    search.classList.add('kch-master-searchbox');
    const input=$('input',search);
    if(input){
      input.id='kch-master-search';
      input.placeholder='ค้นหาสินค้า ชาสมุนไพร และผลิตภัณฑ์สุขภาพ';
      input.setAttribute('aria-label',input.placeholder);
      input.setAttribute('autocomplete','off');
    }
    const button=$('button',search);
    if(button){button.textContent='ค้นหา';button.setAttribute('aria-label','ค้นหาสินค้า')}
    return search;
  }

  function utilityButton(go,material,title,sub,badge=false){
    return `<button type="button" class="kch-master-utility kch-master-utility-${go}" data-go="${go}" aria-label="${title} ${sub}">${icon(material)}<span class="kch-master-utility-copy"><b>${title}</b><small>${sub}</small></span>${badge?'<i class="badge">0</i>':''}</button>`;
  }

  function ensureActions(top){
    let actions=$('.tshop-top-actions',top)||$('.actions',top);
    if(!actions){actions=document.createElement('div');top.appendChild(actions)}
    actions.className='tshop-top-actions kch-master-actions';
    if(actions.dataset.kchStructural!==BUILD){
      actions.innerHTML=utilityButton('account','person','บัญชีสมาชิก','เข้าสู่ระบบ / สมาชิก')+utilityButton('orders','inventory_2','คำสั่งซื้อ','ติดตามสถานะ')+utilityButton('cart','shopping_cart','ตะกร้า','ดูสินค้าที่เลือก',true);
      actions.dataset.kchStructural=BUILD;
    }
    const badge=$('.badge',actions);
    try{if(badge&&typeof count==='function')badge.textContent=String(count())}catch{}
    return actions;
  }

  function ensureBurger(top){
    let burger=$('.kch-ref-hamburger',top);
    if(!burger){burger=document.createElement('button');burger.type='button';burger.className='kch-ref-hamburger';burger.setAttribute('aria-label','เปิดเมนู');burger.innerHTML=icon('menu')}
    return burger;
  }

  const navItems=[
    ['หน้าหลัก','home'],['สินค้าทั้งหมด','products'],['สินค้าแนะนำ','recommended'],['สินค้าใหม่','new'],['โปรโมชั่น','promotions'],['เกี่ยวกับเรา','story'],['ติดต่อเรา','footer']
  ];
  function ensureNav(shell,top){
    const navs=$$('.kch-ref-menu',shell);
    let nav=navs.shift()||document.createElement('nav');
    navs.forEach(el=>el.remove());
    nav.className='kch-ref-menu kch-master-nav';
    nav.setAttribute('aria-label','เมนูหลัก');
    if(nav.dataset.kchStructural!==BUILD){
      nav.innerHTML=navItems.map(([label,id],i)=>`<button type="button" class="${i===0?'active':''}" data-kch-jump="${id}">${label}</button>`).join('');
      nav.dataset.kchStructural=BUILD;
    }
    if(nav.parentNode!==shell)top.insertAdjacentElement('afterend',nav);
    else if(top.nextElementSibling!==nav)top.insertAdjacentElement('afterend',nav);
    return nav;
  }

  function removeLegacyAccountStrip(shell,top,nav){
    const candidates=$$('section,div,aside',shell).filter(el=>{
      if(el===top||el===nav||top.contains(el)||nav.contains(el))return false;
      if(el.closest('.kch-master-home,.kch-member-wrap,.kch-master-footer'))return false;
      const t=text(el);
      return t.length>0&&t.length<420&&t.includes('เข้าสู่ระบบ')&&t.includes('สมัครสมาชิก');
    });
    candidates.filter(el=>!candidates.some(other=>other!==el&&el.contains(other))).forEach(el=>el.remove());
  }

  function route(go){
    try{
      if(typeof window.go==='function'){window.go(go);return}
      if(go==='account'&&typeof window.account==='function'){window.account();return}
      if(go==='orders'&&typeof window.orders==='function'){window.orders();return}
      if(go==='cart'&&typeof window.cartPage==='function'){window.cartPage();return}
      if(go==='home'&&typeof window.home==='function'){window.home();return}
    }catch{}
  }

  function bindHeader(top){
    if(top.dataset.kchStructuralBound===BUILD)return;
    top.dataset.kchStructuralBound=BUILD;
    top.addEventListener('click',e=>{
      const b=e.target.closest?.('.kch-master-utility[data-go],.kch-brand-lockup[data-go]');
      if(!b)return;
      e.preventDefault();
      route(b.dataset.go);
    });
  }

  function jump(id){
    if(id==='home'){route('home');return}
    const map={
      products:'#kch-products,.kch-master-products',
      recommended:'#kch-products,.kch-master-products',
      new:'#kch-products,.kch-master-products',
      promotions:'.kch-master-promo-grid,.kch-master-promotions',
      story:'.kch-master-story',
      footer:'.kch-master-footer,footer'
    };
    const target=$(map[id]||'');
    target?.scrollIntoView?.({behavior:'smooth',block:'start'});
  }

  function bindNav(nav){
    if(nav.dataset.kchBound===BUILD)return;
    nav.dataset.kchBound=BUILD;
    nav.addEventListener('click',e=>{
      const b=e.target.closest?.('[data-kch-jump]');if(!b)return;
      e.preventDefault();
      nav.querySelectorAll('[data-kch-jump]').forEach(x=>x.classList.toggle('active',x===b));
      jump(b.dataset.kchJump);
    });
  }

  function bindBurger(top,shell){
    const burger=$('.kch-ref-hamburger',top);if(!burger||burger.dataset.kchBound===BUILD)return;
    burger.dataset.kchBound=BUILD;
    burger.addEventListener('click',()=>shell.classList.toggle('kch-mobile-menu-open'));
  }

  function applySearch(){
    if(!isHome())return;
    const input=$('#kch-master-search');
    const cards=$$('.kch-master-products .kch-master-product');
    if(!input||!cards.length)return;
    const q=normalize(input.value),tokens=q.split(' ').filter(Boolean);
    cards.forEach(card=>{
      if(!q){card.removeAttribute('data-kch-structural-search');return}
      const hay=normalize([card.dataset.product,card.dataset.kchName,card.dataset.kchCat,text(card)].filter(Boolean).join(' '));
      card.dataset.kchStructuralSearch=tokens.every(token=>hay.includes(token))?'1':'0';
    });
  }

  function bindSearch(top){
    const input=$('#kch-master-search',top);if(!input||input.dataset.kchStructuralBound===BUILD)return;
    input.dataset.kchStructuralBound=BUILD;
    input.addEventListener('input',()=>{queueMicrotask(applySearch);requestAnimationFrame(applySearch)});
    input.addEventListener('search',applySearch);
  }

  function install(){
    removeInjectedHeader();
    const shell=canonicalShell();if(!shell)return;
    const tops=Array.from(shell.children).filter(el=>el.matches?.('.tshop-topbar,.topbar'));
    const top=tops.find(el=>el.classList.contains('tshop-topbar'))||tops[0];
    if(!top)return;
    top.classList.add('tshop-topbar','kch-master-topbar','kch-structural-canonical-header');
    const brand=ensureBrand(top),search=ensureSearch(top),actions=ensureActions(top),burger=ensureBurger(top);
    [burger,brand,search,actions].filter(Boolean).forEach(el=>top.appendChild(el));
    const nav=ensureNav(shell,top);
    removeDuplicateChrome(shell,top,nav);
    removeLegacyAccountStrip(shell,top,nav);
    bindHeader(top);bindNav(nav);bindBurger(top,shell);bindSearch(top);
    applySearch();
    moveBaselineLast();
  }

  let frame=0;
  const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;install()})};
  const root=$('#app')||document.body;
  if(root&&typeof MutationObserver!=='undefined')new MutationObserver(records=>{if(records.some(r=>r.addedNodes?.length||r.removedNodes?.length))schedule()}).observe(root,{childList:true,subtree:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  setTimeout(schedule,80);setTimeout(schedule,300);
})();
