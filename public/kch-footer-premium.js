/* KHONCHAIHERB v1.27 — approved premium footer navigation */
(()=>{
  if(typeof document==='undefined'||typeof document.createElement!=='function')return;
  if(window.__KCH_PREMIUM_FOOTER__==='1.27.0')return;
  window.__KCH_PREMIUM_FOOTER__='1.27.0';

  const items=[
    ['home','home','หน้าแรก'],
    ['all','shopping_bag','สินค้าทั้งหมด'],
    ['recommended','star','สินค้าแนะนำ'],
    ['new','eco','สินค้าใหม่'],
    ['promotions','sell','โปรโมชั่น'],
    ['about','info','เกี่ยวกับเรา'],
    ['contact','call','ติดต่อเรา']
  ];

  const icon=name=>`<span class="material-symbols-rounded" aria-hidden="true">${name}</span>`;
  const scrollTo=(selector)=>{
    const el=document.querySelector(selector);
    if(!el)return false;
    el.scrollIntoView({behavior:'smooth',block:'start'});
    return true;
  };

  const resetProducts=()=>{
    const reset=document.querySelector('.kch-master-home [data-kch-reset]');
    if(reset&&typeof reset.click==='function')reset.click();
  };

  const act=key=>{
    if(key==='home'){
      window.scrollTo?.({top:0,behavior:'smooth'});
      return;
    }
    if(key==='all'){
      resetProducts();
      scrollTo('#kch-products');
      return;
    }
    if(key==='recommended'){
      scrollTo('#kch-products');
      return;
    }
    if(key==='new'){
      scrollTo('#kch-products');
      return;
    }
    if(key==='promotions'){
      scrollTo('#kch-promotions');
      return;
    }
    if(key==='about'){
      scrollTo('#kch-story');
      return;
    }
    if(key==='contact'){
      scrollTo('#kch-footer');
    }
  };

  const build=footer=>{
    if(!footer||footer.querySelector('.kch-footer-premium-wrap'))return;
    const wrap=document.createElement('div');
    wrap.className='kch-footer-premium-wrap';
    wrap.setAttribute('aria-label','เมนูด้านล่าง');
    const nav=document.createElement('nav');
    nav.className='kch-footer-premium-nav';
    nav.setAttribute('aria-label','เมนูหลักด้านล่าง');
    nav.innerHTML=items.map(([key,ic,label])=>`<button type="button" data-kch-footer-go="${key}">${icon(ic)}<span>${label}</span></button>`).join('');
    wrap.appendChild(nav);
    footer.appendChild(wrap);
    nav.addEventListener('click',e=>{
      const btn=e.target?.closest?.('[data-kch-footer-go]');
      if(!btn)return;
      e.preventDefault();
      act(btn.dataset.kchFooterGo);
    });
  };

  const sync=()=>{
    document.querySelectorAll('.kch-master-footer').forEach(build);
  };

  let queued=false;
  const queue=()=>{
    if(queued)return;
    queued=true;
    (window.requestAnimationFrame||setTimeout)(()=>{queued=false;sync()},0);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});
  else queue();

  if(typeof MutationObserver!=='undefined'){
    const observer=new MutationObserver(queue);
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
