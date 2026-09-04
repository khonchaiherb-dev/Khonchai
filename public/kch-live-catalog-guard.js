(()=>{
  if(window.__KCH_LIVE_CATALOG_GUARD__)return;
  window.__KCH_LIVE_CATALOG_GUARD__=true;
  const state={ready:false,ids:new Set(),slugs:new Set(),count:0};
  document.documentElement.classList.add('kch-live-catalog-pending');
  const style=document.createElement('style');
  style.textContent=`
    html.kch-live-catalog-pending [data-product],html.kch-live-catalog-pending [data-add],html.kch-live-catalog-pending [data-buy]{pointer-events:none!important;opacity:.48!important}
    [data-kch-catalog-hidden="1"]{display:none!important}
    #kch-live-catalog-state{margin:12px auto 18px;max-width:1180px;padding:12px 16px;border:1px solid #dfe7e1;border-radius:14px;background:#fbfdfb;color:#355548;font:700 12px/1.55 system-ui,sans-serif}
  `;
  document.head.appendChild(style);
  const idOf=el=>Number(el?.getAttribute?.('data-add')||el?.getAttribute?.('data-buy')||0);
  const allowedEl=el=>{
    const slug=String(el?.getAttribute?.('data-product')||'').trim();
    const id=idOf(el);
    if(slug)return state.slugs.has(slug);
    if(id)return state.ids.has(id);
    return true;
  };
  const apply=()=>{
    document.querySelectorAll('[data-product],[data-add],[data-buy]').forEach(el=>{
      const ok=state.ready&&allowedEl(el);
      if(ok)el.removeAttribute('data-kch-catalog-hidden');
      else el.setAttribute('data-kch-catalog-hidden','1');
    });
    const host=document.querySelector('#recommend,.section,#app');
    let note=document.getElementById('kch-live-catalog-state');
    if(state.ready&&state.count>0){if(note)note.remove();return}
    if(!note&&host){note=document.createElement('div');note.id='kch-live-catalog-state';host.prepend(note)}
    if(note)note.textContent=state.ready?'สินค้าที่พร้อมจำหน่ายกำลังอยู่ระหว่างการตรวจสอบข้อมูล กรุณากลับมาใหม่ภายหลัง':'กำลังตรวจสอบรายการสินค้าที่พร้อมจำหน่าย…';
  };
  const cleanCart=()=>{
    try{
      const raw=JSON.parse(localStorage.getItem('kch-cart')||'[]');
      if(!Array.isArray(raw))return false;
      const next=raw.filter(x=>state.ids.has(Number(x?.id)));
      if(next.length===raw.length)return false;
      localStorage.setItem('kch-cart',JSON.stringify(next));
      return true;
    }catch{return false}
  };
  document.addEventListener('click',e=>{
    const commerce=e.target.closest?.('[data-product],[data-add],[data-buy]');
    if(commerce&&(!state.ready||!allowedEl(commerce))){e.preventDefault();e.stopImmediatePropagation();return}
    const checkout=e.target.closest?.('[data-go="checkout"]');
    if(checkout){
      let cart=[];try{cart=JSON.parse(localStorage.getItem('kch-cart')||'[]')}catch{}
      if(!state.ready||!Array.isArray(cart)||cart.length===0||cart.some(x=>!state.ids.has(Number(x?.id)))){e.preventDefault();e.stopImmediatePropagation()}
    }
  },true);
  const observer=new MutationObserver(()=>apply());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  fetch('/api/products',{headers:{Accept:'application/json'},cache:'no-store'})
    .then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok||d.ready!==true||!Array.isArray(d.products))throw new Error('catalog_not_ready');return d.products})
    .then(products=>{
      for(const p of products){const id=Number(p?.id);if(id>0)state.ids.add(id);const slug=String(p?.slug||'').trim();if(slug)state.slugs.add(slug)}
      state.count=products.length;state.ready=true;document.documentElement.classList.remove('kch-live-catalog-pending');
      const changed=cleanCart();apply();
      if(changed&&sessionStorage.getItem('kch-live-catalog-cart-cleaned')!=='1'){sessionStorage.setItem('kch-live-catalog-cart-cleaned','1');location.reload()}
    })
    .catch(()=>{state.ready=true;state.count=0;document.documentElement.classList.remove('kch-live-catalog-pending');try{localStorage.setItem('kch-cart','[]')}catch{}apply()});
})();
// Sale-launch retry marker for khonchaiherb-commerce.pages.dev — 2026-09-05.
