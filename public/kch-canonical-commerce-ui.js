/* KHONCHAIHERB — canonical customer commerce UI
   Keeps legacy renderer from surfacing unverified commerce metadata. */
(()=>{
  'use strict';
  if(typeof document==='undefined'||window.__KCH_CANONICAL_COMMERCE_UI__)return;
  window.__KCH_CANONICAL_COMMERCE_UI__='2026.09.05';

  const state={products:[],loading:false,promise:null,category:''};
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const text=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
  const clean=v=>String(v??'').trim();
  const money=n=>{try{return new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(Number(n)||0)}catch{return `฿${Number(n)||0}`}};
  const saleReadyRows=rows=>(Array.isArray(rows)?rows:[]).filter(p=>clean(p.slug)&&clean(p.image_url||p.image)&&Number(p.price)>0&&Number(p.available_stock??p.stock)>0);

  async function products(){
    if(state.products.length)return state.products;
    if(state.promise)return state.promise;
    state.loading=true;
    state.promise=(async()=>{
      try{
        const fromIntegrity=await window.KCHCommerceIntegrity?.loadCatalog?.().catch?.(()=>[])||[];
        if(Array.isArray(fromIntegrity)&&fromIntegrity.length){state.products=fromIntegrity;return state.products}
        const r=await fetch('/api/products',{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});
        const d=await r.json().catch(()=>({}));
        if(r.ok&&d.ready===true&&Array.isArray(d.products))state.products=d.products;
        return state.products;
      }catch{return state.products}
    })();
    try{return await state.promise}finally{state.loading=false;state.promise=null}
  }

  function currentIdentity(){
    let id=null,slug='';
    try{if(typeof selected!=='undefined'&&selected){id=Number(selected.id)||null;slug=clean(selected.slug)}}catch{}
    if(!slug){const m=String(location.hash||'').match(/product\/([^/?#]+)/i);if(m)try{slug=decodeURIComponent(m[1])}catch{slug=m[1]}}
    return {id,slug};
  }
  function findLive(rows,id,slug=''){return rows.find(p=>id&&Number(p.id)===Number(id))||rows.find(p=>slug&&clean(p.slug)===clean(slug))||null}

  function removeLegacyClaims(scope=document){
    $$('.rating,.review-promo,.tshop-meta',scope).forEach(el=>el.remove());
    $$('.stats span,.pdp-sold span',scope).forEach(el=>{const t=text(el);if(/^⭐/.test(t)||/ขายแล้ว/.test(t))el.remove()});
    $$('.flash-title',scope).forEach(el=>el.closest('.section,.tshop-section')?.remove());
    $$('.coupon,.voucher',scope).forEach(el=>{if(/WELCOME50|คูปองลูกค้าใหม่/.test(text(el))&&!el.dataset.kchLiveCoupon)el.remove()});
    $$('.review',scope).forEach(el=>{
      const t=text(el),verified=el.matches('[data-review-id],[data-kch-live-review]')||Boolean(el.querySelector('[data-review-id],[data-kch-live-review],.kch-live-review'));
      if(!verified&&(/พ\*\*\*า/.test(t)||/แพ็กดี จัดส่งเรียบร้อย/.test(t)))el.remove();
    });
    $$('[data-go="seller"]',scope).forEach(el=>{el.hidden=true;el.setAttribute('aria-hidden','true')});
  }

  function removeLegacyHomeMerchandising(){
    const deals=$('#deals');if(deals&&(deals.querySelector('.flash-sold')||deals.querySelector('.flash-logo')))deals.remove();
    const live=$('#live');if(live&&live.querySelector('.live-card')&&!live.querySelector('[data-kch-source-verified],[data-kch-source-name]'))live.remove();
    $$('.video-feed').forEach(feed=>{const section=feed.closest('.tshop-section');if(section&&!section.querySelector('[data-kch-source-verified],[data-kch-source-name]'))section.remove()});
    const vouchers=$('.voucher-rail');if(vouchers&&!vouchers.querySelector('[data-kch-live-coupon]'))vouchers.remove();
  }

  function setImage(host,p){
    const source=clean(p?.image_url||p?.image);if(!host||!source)return;
    host.querySelectorAll(':scope > .emoji,:scope > .decor,:scope > .tag').forEach(x=>x.remove());
    let img=host.querySelector(':scope > img');if(!img){img=document.createElement('img');host.appendChild(img)}
    img.src=source;img.alt=clean(p.name);img.loading='eager';img.decoding='async';
  }

  function ensureCanonicalStyles(){
    if($('#kch-canonical-commerce-style'))return;
    const style=document.createElement('style');style.id='kch-canonical-commerce-style';style.textContent=`
      body.kch-master-2026 .v118-hero-showcase[data-kch-live-hero-count]{align-items:center!important;min-height:330px!important}
      body.kch-master-2026 .v118-hero-showcase .kch-live-hero-product{cursor:pointer!important;transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease!important}
      body.kch-master-2026 .v118-hero-showcase .kch-live-hero-product:hover{border-color:rgba(11,100,64,.28)!important;box-shadow:0 24px 52px rgba(16,73,43,.16)!important}
      body.kch-master-2026 .v118-hero-showcase[data-kch-live-hero-count="1"]{justify-content:center!important}
      body.kch-master-2026 .v118-hero-showcase[data-kch-live-hero-count="1"] .kch-live-hero-product{width:min(360px,82%)!important;height:330px!important;transform:none!important;padding:13px!important;border-radius:26px!important;background:linear-gradient(145deg,rgba(255,255,255,.99),rgba(246,251,247,.96))!important}
      body.kch-master-2026 .v118-hero-showcase[data-kch-live-hero-count="1"] .kch-live-hero-product .visual{height:250px!important;border-radius:19px!important;background:radial-gradient(circle at 50% 42%,#fff 0,#f6faf6 48%,#eaf4eb 100%)!important}
      body.kch-master-2026 .v118-hero-showcase[data-kch-live-hero-count="1"] .kch-live-hero-product>span{grid-template-columns:1fr auto!important;align-items:center!important;gap:12px!important;padding:12px 4px 2px!important}
      body.kch-master-2026 .v118-hero-showcase[data-kch-live-hero-count="1"] .kch-live-hero-product>span b{font-size:12px!important;line-height:1.35!important}
      body.kch-master-2026 .v118-hero-showcase[data-kch-live-hero-count="1"] .kch-live-hero-product>span small{font-size:18px!important}
      body.kch-master-2026 #product-grid[data-kch-canonical-product-feed="1"] .kch-live-product-card{cursor:pointer!important}
      body.kch-master-2026 #product-grid[data-kch-canonical-product-feed="1"] .kch-live-product-card .visual{background:linear-gradient(145deg,#fbfdfb,#eef6f0)!important}
      body.kch-master-2026 #product-grid[data-kch-canonical-product-feed="1"] .kch-live-product-card .visual img{width:100%!important;height:100%!important;object-fit:contain!important;padding:12px!important}
      body.kch-master-2026 .kch-live-product-status{display:inline-flex!important;align-items:center!important;width:max-content!important;margin-top:7px!important;padding:4px 8px!important;border-radius:999px!important;background:#edf7ef!important;color:#126640!important;font-size:8.5px!important;font-weight:850!important}
      body.kch-master-2026 .kch-catalog-empty{grid-column:1/-1!important;padding:38px 22px!important;border:1px solid #e1ebe4!important;border-radius:18px!important;background:#f8fbf8!important;color:#547064!important;text-align:center!important;font-size:11px!important}
      body.kch-master-2026 .kch-catalog-categories{width:min(1280px,calc(100% - 44px))!important;margin:20px auto 0!important;padding:18px 18px 16px!important;border:1px solid #e3ebe5!important;border-radius:20px!important;background:linear-gradient(145deg,#fff,#f8fbf8)!important;box-shadow:0 9px 28px rgba(9,70,40,.055)!important}
      body.kch-master-2026 .kch-catalog-category-head{display:flex!important;align-items:end!important;justify-content:space-between!important;gap:18px!important;margin-bottom:13px!important}
      body.kch-master-2026 .kch-catalog-category-head>span{display:grid!important;gap:2px!important}body.kch-master-2026 .kch-catalog-category-head b{color:#173f2d!important;font-size:17px!important}body.kch-master-2026 .kch-catalog-category-head small{color:#748078!important;font-size:10px!important;line-height:1.5!important}
      body.kch-master-2026 .kch-catalog-category-list{display:flex!important;align-items:flex-start!important;gap:13px!important;overflow-x:auto!important;overscroll-behavior-inline:contain!important;scrollbar-width:none!important;padding:2px 1px 4px!important}.kch-catalog-category-list::-webkit-scrollbar{display:none!important}
      body.kch-master-2026 .kch-catalog-category{flex:0 0 auto!important;display:grid!important;justify-items:center!important;gap:7px!important;width:92px!important;min-height:100px!important;padding:5px!important;border:0!important;border-radius:15px!important;background:transparent!important;color:#315440!important;text-align:center!important;font:850 10px/1.35 'Noto Sans Thai',sans-serif!important}
      body.kch-master-2026 .kch-catalog-category-icon{display:grid!important;place-items:center!important;width:62px!important;height:62px!important;border:1px solid #e0e9e2!important;border-radius:50%!important;background:linear-gradient(145deg,#f8fbf8,#eaf4ec)!important;color:#137b4d!important;box-shadow:0 5px 15px rgba(17,77,46,.06)!important;transition:transform .18s ease,border-color .18s ease,background .18s ease!important}.kch-catalog-category-icon .material-symbols-rounded{font-size:28px!important}
      body.kch-master-2026 .kch-catalog-category:hover .kch-catalog-category-icon,body.kch-master-2026 .kch-catalog-category.active .kch-catalog-category-icon{transform:translateY(-2px)!important;border-color:#9bc8aa!important;background:#e9f5eb!important}body.kch-master-2026 .kch-catalog-category.active{color:#075031!important}
      @media(max-width:699px){body.kch-master-2026 .v118-hero-showcase[data-kch-live-hero-count="1"]{display:flex!important;overflow:visible!important}body.kch-master-2026 .v118-hero-showcase[data-kch-live-hero-count="1"] .kch-live-hero-product{width:min(100%,330px)!important;height:300px!important}body.kch-master-2026 .v118-hero-showcase[data-kch-live-hero-count="1"] .kch-live-hero-product .visual{height:220px!important}body.kch-master-2026 .kch-catalog-categories{width:calc(100% - 24px)!important;margin-top:14px!important;padding:14px 12px 12px!important;border-radius:18px!important}body.kch-master-2026 .kch-catalog-category-head{align-items:start!important;margin-bottom:10px!important}body.kch-master-2026 .kch-catalog-category-head b{font-size:16px!important}body.kch-master-2026 .kch-catalog-category-head small{font-size:9px!important}body.kch-master-2026 .kch-catalog-category-list{gap:9px!important}body.kch-master-2026 .kch-catalog-category{width:82px!important;min-height:92px!important;font-size:9.5px!important}body.kch-master-2026 .kch-catalog-category-icon{width:56px!important;height:56px!important}}
    `;(document.head||document.documentElement).appendChild(style);
  }

  function makeHeroCard(p,index){
    const button=document.createElement('button');button.type='button';button.className=`v118-featured-product f${index+1} kch-live-hero-product`;button.dataset.kchLiveHeroProduct=String(Number(p.id)||'');button.dataset.kchLiveHeroSlug=clean(p.slug);button.setAttribute('aria-label',`ดู ${clean(p.name)}`);
    const visual=document.createElement('div');visual.className='visual';const img=document.createElement('img');img.src=clean(p.image_url||p.image);img.alt=clean(p.name);img.loading=index===0?'eager':'lazy';img.decoding='async';if(index===0)img.fetchPriority='high';visual.appendChild(img);
    const copy=document.createElement('span'),name=document.createElement('b'),price=document.createElement('small');name.textContent=clean(p.name);price.textContent=money(p.price);copy.append(name,price);button.append(visual,copy);
    button.addEventListener('click',()=>{const slug=clean(p.slug);if(slug)location.href=`/product/${encodeURIComponent(slug)}`});return button;
  }

  function makeHomeProductCard(p,index){
    const article=document.createElement('article');article.className='tshop-card kch-live-product-card';article.dataset.product=clean(p.slug);article.dataset.kchLiveProduct=String(Number(p.id)||'');article.tabIndex=0;article.setAttribute('role','link');article.setAttribute('aria-label',`ดู ${clean(p.name)}`);
    const visual=document.createElement('div');visual.className='visual';const img=document.createElement('img');img.src=clean(p.image_url||p.image);img.alt=clean(p.name);img.loading=index<4?'eager':'lazy';img.decoding='async';visual.appendChild(img);
    const info=document.createElement('div');info.className='tshop-card-info';
    const title=document.createElement('div');title.className='tshop-card-title';const badge=document.createElement('span');badge.className='shop-badge';badge.textContent='Official';title.append(badge,document.createTextNode(clean(p.name)));
    const tags=document.createElement('div');tags.className='tshop-card-tags';if(clean(p.category)){const category=document.createElement('span');category.className='shipping-chip';category.textContent=clean(p.category);tags.appendChild(category)}
    const priceLine=document.createElement('div');priceLine.className='tshop-price-line';const price=document.createElement('span');price.className='tshop-price';price.textContent=money(p.price);priceLine.appendChild(price);
    const status=document.createElement('span');status.className='kch-live-product-status';status.textContent='พร้อมสั่งซื้อ';
    const add=document.createElement('button');add.type='button';add.className='tshop-add';add.dataset.add=String(Number(p.id)||'');add.setAttribute('aria-label',`เพิ่ม ${clean(p.name)} ลงตะกร้า`);const icon=document.createElement('span');icon.className='material-symbols-rounded';icon.textContent='add_shopping_cart';add.appendChild(icon);
    info.append(title,tags,priceLine,status,add);article.append(visual,info);
    const open=()=>{const slug=clean(p.slug);if(slug)location.href=`/product/${encodeURIComponent(slug)}`};article.addEventListener('click',e=>{if(!e.target.closest('button'))open()});article.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});return article;
  }

  async function canonicalizeHero(){
    const hero=$('.tshop-hero');const showcase=$('.v118-hero-showcase',hero);if(!hero||!showcase)return;
    ensureCanonicalStyles();
    const rows=saleReadyRows(await products()).slice(0,3);
    const signature=rows.map(p=>`${Number(p.id)||0}:${Number(p.price)||0}:${Number(p.available_stock??p.stock)||0}:${clean(p.image_url||p.image)}`).join('|')||'empty';
    if(showcase.dataset.kchCanonicalHeroSignature===signature&&$$('.kch-live-hero-product',showcase).length===rows.length)return;
    showcase.replaceChildren();showcase.dataset.kchCanonicalHeroSignature=signature;showcase.dataset.kchLiveHeroCount=String(rows.length);hero.dataset.kchCanonicalHero='catalog';
    if(!rows.length){showcase.hidden=true;return}
    showcase.hidden=false;rows.forEach((p,i)=>showcase.appendChild(makeHeroCard(p,i)));
  }

  function makeCategoryButton(value,label,iconName){
    const button=document.createElement('button');button.type='button';button.className='kch-catalog-category';button.dataset.kchCatalogCategory=value;button.setAttribute('aria-pressed',state.category===value?'true':'false');if(state.category===value)button.classList.add('active');
    const icon=document.createElement('span');icon.className='kch-catalog-category-icon';const symbol=document.createElement('span');symbol.className='material-symbols-rounded';symbol.textContent=iconName;icon.appendChild(symbol);
    const copy=document.createElement('span');copy.textContent=label;button.append(icon,copy);return button;
  }

  async function canonicalizeCatalogCategories(){
    const shop=$('.v118-shop-first')||$('#product-grid')?.closest('.tshop-section')||$('#product-grid');if(!shop)return;
    ensureCanonicalStyles();
    const rows=saleReadyRows(await products());
    const categories=[...new Set(rows.map(p=>clean(p.category)).filter(Boolean))];
    let shelf=$('.kch-catalog-categories');
    if(!rows.length||!categories.length){shelf?.remove();state.category='';return}
    if(state.category&&!categories.includes(state.category))state.category='';
    if(!shelf){shelf=document.createElement('section');shelf.className='kch-catalog-categories';shelf.setAttribute('aria-label','หมวดสินค้าที่พร้อมจำหน่าย')}
    if(shop.previousElementSibling!==shelf)shop.insertAdjacentElement('beforebegin',shelf);
    const signature=`${state.category||'all'}::${categories.join('|')}`;
    if(shelf.dataset.kchCatalogCategorySignature===signature)return;
    shelf.dataset.kchCatalogCategorySignature=signature;
    const head=document.createElement('div');head.className='kch-catalog-category-head';const copy=document.createElement('span');const title=document.createElement('b');title.textContent='เลือกตามหมวดสินค้า';const note=document.createElement('small');note.textContent='แสดงจากสินค้าที่ผ่านการตรวจสอบและพร้อมจำหน่ายจริง';copy.append(title,note);head.appendChild(copy);
    const list=document.createElement('div');list.className='kch-catalog-category-list';list.appendChild(makeCategoryButton('','สินค้าทั้งหมด','storefront'));
    categories.forEach(category=>list.appendChild(makeCategoryButton(category,category,'spa'));
    shelf.replaceChildren(head,list);
    list.addEventListener('click',event=>{
      const button=event.target.closest?.('[data-kch-catalog-category]');if(!button)return;
      state.category=clean(button.dataset.kchCatalogCategory);
      canonicalizeCatalogCategories().catch(()=>{});canonicalizeHomeFeed().catch(()=>{});
      $('#product-grid')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }

  async function canonicalizeHomeFeed(){
    const grid=$('#product-grid');if(!grid)return;
    ensureCanonicalStyles();removeLegacyHomeMerchandising();
    const liveRows=saleReadyRows(await products());
    const rows=state.category?liveRows.filter(p=>clean(p.category)===state.category):liveRows;
    const signature=`${state.category||'all'}::${rows.map(p=>`${Number(p.id)||0}:${Number(p.price)||0}:${Number(p.available_stock??p.stock)||0}:${clean(p.image_url||p.image)}`).join('|')||'empty'}`;
    if(grid.dataset.kchCanonicalFeedSignature===signature&&$$('.kch-live-product-card',grid).length===rows.length)return;
    grid.replaceChildren();grid.dataset.kchCanonicalProductFeed='1';grid.dataset.kchCanonicalFeedSignature=signature;grid.dataset.kchCatalogCategory=state.category;
    if(!rows.length){const empty=document.createElement('div');empty.className='kch-catalog-empty';empty.textContent=state.category?'ยังไม่มีสินค้าที่พร้อมจำหน่ายในหมวดนี้':'ขณะนี้ยังไม่มีสินค้าที่ผ่านการตรวจสอบและพร้อมจำหน่าย';grid.appendChild(empty);return}
    rows.forEach((p,i)=>grid.appendChild(makeHomeProductCard(p,i)));
  }

  async function canonicalizeProduct(){
    const identity=currentIdentity();if(!identity.id&&!identity.slug)return;
    const rows=await products(),p=findLive(rows,identity.id,identity.slug);if(!p)return;
    const root=$('.kch-pdp-20,.v118-signature-pdp,.detail')?.closest('.shell')||$('#app')||document;
    const title=$('.pdp-title',root)||$('.detail h1',root);if(title)title.textContent=clean(p.name);
    const desc=$('.pdp-description',root)||$('.detail>p',root);if(desc)desc.textContent=clean(p.description)||'ดูรายละเอียดผลิตภัณฑ์และข้อมูลที่ร้านยืนยันก่อนสั่งซื้อ';
    const price=$('.pdp-price',root)||$('.pprice b',root);if(price)price.textContent=money(p.price);
    const old=$('.pprice del',root);const discount=$('.pprice span',root);const compare=Number(p.compare_at_price)||0,livePrice=Number(p.price)||0;
    if(old){if(compare>livePrice){old.hidden=false;old.textContent=money(compare)}else old.remove()}
    if(discount){if(compare>livePrice){discount.hidden=false;discount.textContent=`ลด ${Math.round((1-livePrice/compare)*100)}%`}else discount.remove()}
    $$('.stats span,.pdp-sold span',root).forEach(el=>{const t=text(el);if(/คงเหลือ|สต๊อก/.test(t))el.textContent=`คงเหลือ ${Number(p.available_stock??p.stock)||0}`});
    const productCount=$('.shop-stats>div:first-child b',root);if(productCount)productCount.textContent=String(rows.length);
    setImage($('.pdp-media .visual',root)||$('.visual.large',root),p);
    root.dataset.kchCanonicalProduct=String(p.id);
    removeLegacyClaims(root);
  }

  function cartRows(){try{const x=JSON.parse(localStorage.getItem('kch-cart')||'[]');return Array.isArray(x)?x:[]}catch{return []}}
  async function canonicalizeCart(){
    const domRows=$$('.cartrow');if(!domRows.length)return;
    await products();const rows=cartRows();
    domRows.forEach((row,i)=>{
      const item=rows[i];if(!item)return;
      const live=findLive(state.products,item.id,item.slug)||item;
      const name=$('.grow>b',row);if(name)name.textContent=clean(live.name||item.name);
      const category=$('.grow>small',row);if(category)category.textContent=clean(live.category||live.cat||item.category||item.cat||'สินค้า');
      const price=$('.grow>strong',row);if(price)price.textContent=money(live.price||item.price);
      setImage($('.visual',row),{...live,image_url:live.image_url||live.image||item.image_url||item.image});
    });
    removeLegacyClaims($('#app')||document);
  }

  async function interceptPurchase(target,e){
    const rawId=Number(target.dataset.add||target.dataset.buy||target.dataset.productId||0);const identity=currentIdentity();const rows=await products();
    const p=findLive(rows,rawId||identity.id,identity.slug);if(!p)return false;
    e.preventDefault();e.stopImmediatePropagation();
    const qty=Math.max(1,Math.min(20,Number($('#qty')?.textContent)||1));
    const out=window.KCHCommerceIntegrity?.addCanonicalProduct?.(p,qty);
    if(!out?.ok)return true;
    if(target.hasAttribute('data-buy')){window.KCHCommerceIntegrity?.openCheckout?.();return true}
    const original=target.textContent;target.textContent='เพิ่มแล้ว';target.disabled=true;setTimeout(()=>{if(target.isConnected){target.disabled=false;target.textContent=original}},650);return true;
  }

  function routeAuthority(e){
    const account=e.target.closest?.('[data-go="account"]');if(account){e.preventDefault();e.stopImmediatePropagation();location.href='/member.html';return true}
    const seller=e.target.closest?.('[data-go="seller"]');if(seller){e.preventDefault();e.stopImmediatePropagation();return true}
    return false;
  }

  async function run(){
    removeLegacyClaims();removeLegacyHomeMerchandising();
    await Promise.allSettled([canonicalizeHero(),canonicalizeCatalogCategories(),canonicalizeHomeFeed(),canonicalizeProduct(),canonicalizeCart()]);
  }

  document.addEventListener('click',e=>{
    if(routeAuthority(e))return;
    const buy=e.target.closest?.('[data-add],[data-buy]');if(!buy||buy.closest('.kch-guided-results'))return;
    interceptPurchase(buy,e).catch(()=>{});
  },true);
  window.addEventListener('hashchange',()=>setTimeout(run,0),{passive:true});
  const observer=new MutationObserver(records=>{if(records.some(r=>r.addedNodes?.length||r.removedNodes?.length))schedule()});observer.observe(document.documentElement,{childList:true,subtree:true});
  let raf=0;function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;run()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  setTimeout(schedule,160);setTimeout(schedule,650);
})();