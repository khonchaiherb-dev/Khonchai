/* KHONCHAIHERB v1.32.1 — conversion storefront behavior */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.32.1';
  if(window.__KCH_CONVERSION_STOREFRONT__===BUILD)return;
  window.__KCH_CONVERSION_STOREFRONT__=BUILD;

  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const txt=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
  const catalog=()=>{try{return Array.isArray(PRODUCTS)?PRODUCTS:[]}catch{return []}};
  const money=n=>{try{return new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(Number(n)||0)}catch{return `฿${Number(n)||0}`}};
  const basename=v=>{try{return decodeURIComponent(new URL(String(v||''),location.origin).pathname.split('/').pop()||'').toLowerCase()}catch{return String(v||'').split('/').pop()?.toLowerCase()||''}};
  const ready=p=>Boolean(p)&&Number(p?.sale_verified)===1&&Number(p?.price||0)>0&&Number(p?.stock||0)>0&&!p?.comingSoon&&Boolean(String(p?.image||p?.image_url||'').trim());

  function isHome(){
    try{if(typeof current!=='undefined')return current==='home'}catch{}
    return Boolean($('.kch-master-home'));
  }

  function openProduct(p){
    if(!p)return;
    try{if(typeof product==='function'){product(p);return}}catch{}
    const slug=String(p?.slug||'').trim();
    if(slug)location.hash=`product/${encodeURIComponent(slug)}`;
  }

  function productFromIdentity(el){
    const rows=catalog();
    const slug=String(el?.dataset?.product||el?.dataset?.slug||el?.dataset?.kchProduct||el?.dataset?.v118Featured||'').trim();
    if(!slug)return null;
    return rows.find(x=>String(x?.slug||'').trim()===slug)||null;
  }

  // Showcase tiles predate canonical data attributes, so visual fallback is
  // retained only there. Product cards must never infer identity from UI text,
  // image filenames or alt text because those are presentation, not commerce data.
  function productFromShowcase(el){
    const identified=productFromIdentity(el);
    if(identified)return identified;
    const rows=catalog();
    const img=$('img',el),src=basename(img?.currentSrc||img?.src||img?.getAttribute?.('src'));
    if(src){const p=rows.find(x=>basename(x?.image||x?.image_url)===src);if(p)return p}
    const alt=String(img?.alt||'').trim();
    if(alt){const p=rows.find(x=>String(x?.name||'').trim()===alt);if(p)return p}
    return null;
  }

  function enhanceFrame(){
    const shell=$('.shell.kch-master-shell')||$('.shell');
    if(shell)shell.classList.add('kch-v132');
    const home=$('.kch-master-home');
    if(home)home.classList.add('kch-v132-home');
  }

  function enhanceHeader(){
    const shell=$('.shell.kch-master-shell')||$('.shell');
    if(!shell)return;
    const search=$('.tshop-searchbox input',shell);
    if(search){
      search.placeholder='ค้นหาสินค้า ชาสมุนไพร และผลิตภัณฑ์สุขภาพ';
      search.setAttribute('aria-label',search.placeholder);
    }
    const actions=$$('.tshop-icon,button,a',shell).filter(el=>/ตะกร้า/.test(txt(el)));
    const cart=actions.sort((a,b)=>txt(a).length-txt(b).length)[0];
    if(cart)cart.classList.add('kch-v132-cart-action');
  }

  function enhanceHero(){
    if(!isHome())return;
    $$('.kch-master-showcase').forEach(card=>{
      const p=productFromShowcase(card);
      if(!p)return;
      $('.kch-v131-showcase-meta',card)?.remove();
      let meta=$('.kch-v132-hero-meta',card);
      const key=`${p.id}:${p.price}:${p.stock}:${p.sale_verified}:${p.name}`;
      if(!meta||meta.dataset.key!==key){
        meta?.remove();
        meta=document.createElement('span');
        meta.className='kch-v132-hero-meta';
        meta.dataset.key=key;
        const name=document.createElement('b');name.textContent=String(p.name||'ผลิตภัณฑ์ KHONCHAIHERB');
        meta.appendChild(name);
        if(ready(p)){
          const price=document.createElement('strong');price.textContent=money(p.price);
          const hint=document.createElement('small');hint.textContent='แตะเพื่อดูรายละเอียดและสั่งซื้อ';
          meta.append(price,hint);
        }else{
          const hint=document.createElement('small');hint.textContent='ดูรายละเอียดผลิตภัณฑ์';
          meta.appendChild(hint);
        }
        card.appendChild(meta);
      }
      card.setAttribute('aria-label',ready(p)?`ดู ${String(p.name||'สินค้า')} ราคา ${money(p.price)}`:`ดูรายละเอียด ${String(p.name||'ผลิตภัณฑ์')}`);
      if(card.dataset.kchV132Open!=='1'){
        card.dataset.kchV132Open='1';
        card.addEventListener('click',()=>openProduct(productFromShowcase(card)));
        if(card.tagName!=='BUTTON'&&card.tagName!=='A'){
          card.tabIndex=0;
          card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openProduct(productFromShowcase(card))}});
        }
      }
    });
  }

  function enhanceFilters(){
    if(!isHome())return;
    const finder=$('.kch-master-finder');if(!finder)return;
    const iconFor=t=>{
      if(/แนะนำ|ยอดนิยม/.test(t))return 'auto_awesome';
      if(/ชา/.test(t))return 'local_cafe';
      if(/ผลิตภัณฑ์|แคปซูล/.test(t))return 'medication';
      if(/พร้อมส่ง/.test(t))return 'inventory_2';
      if(/โปรโม/.test(t))return 'sell';
      return 'category';
    };
    $$('.kch-master-filter',finder).forEach(btn=>{
      if($('.kch-v132-filter-icon',btn))return;
      const icon=document.createElement('span');
      icon.className='material-symbols-rounded kch-v132-filter-icon';
      icon.setAttribute('aria-hidden','true');
      icon.textContent=iconFor(txt(btn));
      btn.prepend(icon);
    });
    const input=$('.tshop-searchbox input');
    const active=$$('.kch-master-filter.active',finder).some(btn=>!/แนะนำ/.test(txt(btn)));
    const searched=Boolean(String(input?.value||'').trim());
    finder.classList.toggle('kch-v132-has-filter',active||searched);
  }

  function clearCardEnhancement(card){
    $('.kch-v132-card-cta',card)?.remove();
    $('.kch-v132-unready-note',card)?.remove();
    card.removeAttribute('data-kch-v132-ready');
    card.removeAttribute('data-kch-v132-product');
  }

  function enhanceProductCards(){
    if(!isHome())return;
    const cards=$$('.kch-master-products .kch-master-product');
    cards.forEach(card=>{
      const p=productFromIdentity(card);
      if(!p){clearCardEnhancement(card);return}
      const canBuy=ready(p);
      const slug=String(p.slug||'').trim();
      card.dataset.kchV132Ready=canBuy?'1':'0';
      card.dataset.kchV132Product=slug;
      const copy=$('.kch-master-product-copy',card)||card;
      let cta=$('.kch-v132-card-cta',card);
      const key=`${p.id}:${slug}:${p.price}:${p.stock}:${p.sale_verified}:${p.comingSoon?1:0}`;
      if(cta?.dataset?.key!==key){cta?.remove();cta=null}
      if(!cta){
        cta=document.createElement('div');
        cta.className='kch-v132-card-cta';
        cta.dataset.key=key;
        cta.dataset.product=slug;
        const button=document.createElement('button');
        button.type='button';
        button.className=canBuy?'kch-v132-buy':'kch-v132-detail';
        button.dataset.product=slug;
        button.textContent=canBuy?'สั่งซื้อ':'ดูรายละเอียด';
        button.setAttribute('aria-label',canBuy?`สั่งซื้อ ${String(p.name||'สินค้า')}`:`ดูรายละเอียด ${String(p.name||'ผลิตภัณฑ์')}`);
        button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openProduct(p)});
        cta.appendChild(button);
        copy.appendChild(cta);
      }
      let note=$('.kch-v132-unready-note',card);
      if(canBuy){note?.remove()}
      else if(!note){
        note=document.createElement('small');
        note.className='kch-v132-unready-note';
        note.textContent='กำลังเตรียมข้อมูลสำหรับการจำหน่าย จึงยังไม่เปิดรับคำสั่งซื้อ';
        copy.insertBefore(note,cta);
      }
      if(canBuy&&!$('.kch-master-price',card)){
        const bottom=$('.kch-master-product-bottom',card);
        if(bottom){const price=document.createElement('strong');price.className='kch-master-price';price.textContent=money(p.price);bottom.prepend(price)}
      }
    });

    const section=$('#kch-products')||$('.kch-master-section:has(.kch-master-products)');
    if(!section)return;
    const readyCount=cards.filter(card=>card.dataset.kchV132Ready==='1').length;
    const h=$('.kch-master-section-head h2',section),sub=$('.kch-master-section-head p',section);
    if(readyCount>0){
      if(h)h.textContent='สินค้าแนะนำ';
      if(sub)sub.textContent='เลือกสินค้าที่มีข้อมูลราคาและสถานะพร้อมให้ตรวจสอบก่อนสั่งซื้อ';
    }else{
      if(h)h.textContent='ผลิตภัณฑ์ของเรา';
      if(sub)sub.textContent='ดูรายละเอียดผลิตภัณฑ์ที่กำลังเตรียมข้อมูลสำหรับการจำหน่าย';
    }
  }

  function enhanceTrust(){
    if(!isHome())return;
    const items=$$('.kch-master-trust-item');
    items.forEach(item=>{
      const t=txt(item);
      if(/เก็บเงินปลายทาง|COD/i.test(t))item.classList.add('kch-v132-cod-trust');
    });
  }

  function run(){
    enhanceFrame();enhanceHeader();
    if(!isHome())return;
    enhanceHero();enhanceFilters();enhanceProductCards();enhanceTrust();
  }

  let raf=0;
  const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;run()})};
  const root=$('#app')||document.body;
  if(root&&typeof MutationObserver!=='undefined')new MutationObserver(records=>{if(records.some(r=>r.addedNodes?.length||r.removedNodes?.length))schedule()}).observe(root,{childList:true,subtree:true});
  document.addEventListener('input',e=>{if(e.target?.matches?.('.tshop-searchbox input'))schedule()},{passive:true});
  document.addEventListener('click',e=>{if(e.target?.closest?.('.kch-master-filter,.kch-master-reset'))setTimeout(schedule,0)},{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  setTimeout(schedule,100);setTimeout(schedule,360);
})();
