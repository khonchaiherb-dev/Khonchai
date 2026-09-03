/* KHONCHAIHERB v1.33.1 — readable header/account placement runtime */
(()=>{
  'use strict';
  if(window.__KCH_READABLE_STOREFRONT_V1331__)return;
  window.__KCH_READABLE_STOREFRONT_V1331__=true;
  const BUILD='1.33.1';
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();

  function ensureBaselineFixStyle(){
    if(document.getElementById('kch-v133-baseline-fixes'))return;
    const style=document.createElement('style');
    style.id='kch-v133-baseline-fixes';
    style.textContent=`
      @media(max-width:860px) and (min-width:561px){
        html body #kch-v134-header .kch-v134-actions{grid-template-columns:repeat(3,48px)!important}
        html body #kch-v134-header .kch-v134-action{min-width:48px!important;min-height:48px!important}
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function masterSearchOwner(){return window.__KCH_MASTER_SEARCH__||null}
  function mirrorCanonicalSearch(){
    const owner=masterSearchOwner();
    if(!owner)return;
    owner.apply?.();
    const q=clean(owner.get?.()??owner.query??'');
    qsa('.kch-master-product').forEach(card=>{
      const state=card.dataset.kchSearchMatch;
      if(q&&(state==='0'||state==='1'))card.dataset.kchV131SearchMatch=state;
      else card.removeAttribute('data-kch-v131-search-match');
    });
  }
  function acceptCanonicalSearchInput(event){
    const input=event.target;
    if(!input?.matches?.('.tshop-searchbox input,#kch-v134-search'))return;
    const owner=masterSearchOwner();
    if(!owner)return;
    const next=String(input.value||'');
    if(next!==String(owner.query||'')){
      owner.query=next;
      owner.revision=Number(owner.revision||0)+1;
      owner.source='v133-window-input';
    }
    owner.apply?.();
    mirrorCanonicalSearch();
  }

  /* Window capture runs before document-level compatibility listeners. This makes
     window.__KCH_MASTER_SEARCH__ the single source of truth even when legacy
     storefront layers still observe the old search input. */
  window.addEventListener('input',acceptCanonicalSearchInput,true);
  window.addEventListener('search',acceptCanonicalSearchInput,true);

  function memberState(){
    try{if(typeof V118_STATE!=='undefined'&&V118_STATE?.authenticated)return true}catch{}
    return false;
  }
  function openAccount(){
    if(typeof window.account==='function'){window.account();return}
    try{if(typeof account==='function'){account();return}}catch{}
    const fallback=qs('nav.tshop-bottom [data-go="account"],nav.bottom [data-go="account"],[data-go="account"]');
    if(fallback){fallback.click();return}
    location.hash='account';
  }
  function actionCopy(title,sub){
    const wrap=document.createElement('span');
    wrap.className='kch-v133-action-copy';
    const b=document.createElement('b');b.textContent=title;
    const small=document.createElement('small');small.textContent=sub;
    wrap.append(b,small);return wrap;
  }
  function normalizeUtilityAction(button,title,sub){
    if(!button)return;
    button.classList.add('kch-v133-utility-action');
    qsa('.kch-v133-action-copy',button).forEach(el=>el.remove());
    Array.from(button.childNodes).forEach(node=>{
      if(node.nodeType===Node.TEXT_NODE&&clean(node.textContent))node.textContent='';
    });
    Array.from(button.children).forEach(child=>{
      if(child.classList.contains('material-symbols-rounded')||child.classList.contains('badge')||child.classList.contains('kch-v133-action-copy'))return;
      child.classList.add('kch-v133-old-copy');
    });
    button.append(actionCopy(title,sub));
    button.dataset.kchV133Labeled='1';
  }
  function ensureAccountAction(header,actions){
    let button=qs('[data-kch-v133-account]',actions);
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='kch-v133-account-action';
      button.dataset.kchV133Account='1';
      button.setAttribute('aria-label','บัญชีสมาชิก KHONCHAIHERB');
      button.innerHTML='<span class="material-symbols-rounded" aria-hidden="true">person</span>';
      button.addEventListener('click',openAccount);
      const firstCommerce=qs('[data-go="orders"],[data-go="cart"]',actions);
      actions.insertBefore(button,firstCommerce||actions.firstChild);
    }
    qsa('.kch-v133-action-copy',button).forEach(el=>el.remove());
    const logged=memberState();
    button.append(actionCopy(logged?'บัญชีของฉัน':'บัญชีสมาชิก',logged?'สมาชิก KHONCHAIHERB':'เข้าสู่ระบบ / สมัครสมาชิก'));
    header.classList.add('kch-v133-header');
    return button;
  }
  function hideLegacyAccountStrip(shell,accountButton){
    qsa('button,a',shell).forEach(el=>{
      if(el===accountButton||accountButton.contains(el)||el.closest('nav.tshop-bottom,nav.bottom'))return;
      const text=clean(el.textContent);
      if(text.length>90||!text.includes('เข้าสู่ระบบ')||!text.includes('สมัครสมาชิก'))return;
      el.classList.add('kch-v133-legacy-account-strip');
      const parent=el.parentElement;
      if(parent&&parent!==shell&&!parent.contains(accountButton)){
        const ptext=clean(parent.textContent),interactive=parent.querySelectorAll('button,a,input').length;
        if(ptext.length<=120&&interactive<=2)parent.classList.add('kch-v133-legacy-account-strip');
      }
    });
  }
  function enhanceHeader(shell){
    const header=qs('.tshop-topbar',shell)||qs('header',shell);if(!header)return;
    const cart=qs('[data-go="cart"]',header),orders=qs('[data-go="orders"]',header);
    const actions=cart?.parentElement||orders?.parentElement||qs('.actions,.tshop-top-actions,.kch-top-actions',header);if(!actions)return;
    actions.classList.add('kch-v133-actions');
    const accountButton=ensureAccountAction(header,actions);
    normalizeUtilityAction(orders,'คำสั่งซื้อ','ติดตามสถานะ');
    normalizeUtilityAction(cart,'ตะกร้า','ดูสินค้า');
    hideLegacyAccountStrip(shell,accountButton);
  }
  function annotate(shell){
    const home=qs('.kch-master-home',shell);if(home)home.classList.add('kch-v133-home');
    qsa('.kch-ref-menu,.tshop-menu,.tshop-nav',shell).forEach(el=>el.setAttribute('aria-label',el.getAttribute('aria-label')||'เมนูหลัก'));
    const search=qs('#shop-search,.kch-header-search input,.kch-ref-search input,.tshop-search input,.tshop-searchbox input',shell);
    if(search&&!search.getAttribute('aria-label'))search.setAttribute('aria-label','ค้นหาสินค้าและสมุนไพร');
  }
  function apply(){
    ensureBaselineFixStyle();
    const shell=qs('.shell.kch-master-shell')||qs('.kch-master-shell')||qs('.shell');if(!shell)return;
    shell.classList.add('kch-v133-readable-storefront');shell.dataset.kchV133=BUILD;
    enhanceHeader(shell);annotate(shell);mirrorCanonicalSearch();
  }
  let raf=0;
  function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{apply();setTimeout(apply,80);setTimeout(apply,260)})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  const root=qs('#app')||document.body;new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  window.addEventListener('pageshow',schedule);
  window.__KCH_READABLE_STOREFRONT__={build:BUILD,apply:schedule};
})();
