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

/* Live commerce surfaces — data only, never a competing visual authority. */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='2026.09.2';
  if(window.__KCH_LIVE_COMMERCE_HOME__===BUILD)return;
  window.__KCH_LIVE_COMMERCE_HOME__=BUILD;
  const state={loading:false,loadedAt:0,promotions:[],social:[],reviews:[]};
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const catalog=()=>{try{return Array.isArray(PRODUCTS)?PRODUCTS:[]}catch{return []}};
  const home=()=>{try{return typeof current!=='undefined'?current==='home':Boolean($('.tshop-hero'))}catch{return Boolean($('.tshop-hero'))}};
  const ready=p=>Boolean(p)&&Number(p.sale_verified)===1&&Number(p.price||0)>0&&Number(p.stock||0)>0&&!p.comingSoon;
  const money=n=>{try{return new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(Number(n)||0)}catch{return `฿${Number(n)||0}`}};
  const safeUrl=v=>{try{const u=new URL(String(v||''),location.origin);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return ''}};
  async function json(url){try{const r=await fetch(url,{credentials:'same-origin',headers:{Accept:'application/json'}});if(!r.ok)return null;return await r.json()}catch{return null}}
  function openProductById(id,slug=''){
    const p=catalog().find(x=>Number(x.id)===Number(id))||catalog().find(x=>String(x.slug||'')===String(slug||''));
    if(p){try{if(typeof product==='function'){product(p);return}}catch{}if(p.slug)location.hash=`product/${encodeURIComponent(p.slug)}`}
  }
  function styles(){
    if($('#kch-live-commerce-style'))return;
    const s=document.createElement('style');s.id='kch-live-commerce-style';s.textContent=`
      body.kch-master-2026 .kch-live-promo{grid-column:1/-1;display:grid;grid-template-columns:1fr auto;align-items:center;gap:18px;min-height:112px;padding:20px 24px;border:1px solid #d7e8dc;border-radius:18px;background:linear-gradient(115deg,#edf8ef,#fff 70%);box-shadow:0 10px 30px rgba(9,70,40,.07);overflow:hidden}
      body.kch-master-2026 .kch-live-promo-copy{display:grid;gap:5px}body.kch-master-2026 .kch-live-promo-kicker{color:#137b4d;font-size:9px;font-weight:900;letter-spacing:.08em}body.kch-master-2026 .kch-live-promo h3{margin:0;color:#123f2b;font-size:clamp(20px,2.1vw,30px);line-height:1.18}body.kch-master-2026 .kch-live-promo p{margin:0;color:#65776c;font-size:10px;line-height:1.55}.kch-live-promo-code{display:inline-flex;width:max-content;margin-top:4px;padding:5px 9px;border:1px dashed #9ac7aa;border-radius:999px;background:#fff;color:#0d6840;font-size:9px;font-weight:900}
      body.kch-master-2026 .kch-live-promo button{min-height:44px;padding:0 18px;border:0;border-radius:999px;background:#075031;color:#fff;font:900 10px/1 'Noto Sans Thai',sans-serif;white-space:nowrap}
      body.kch-master-2026 .kch-live-section{width:min(1280px,calc(100% - 44px));margin:28px auto 0}.kch-live-head{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:13px}.kch-live-head>div{display:grid;gap:3px}.kch-live-head span{color:#137b4d;font-size:8.8px;font-weight:900;letter-spacing:.08em}.kch-live-head h2{margin:0;color:#173f2d;font-size:clamp(21px,2vw,29px)}.kch-live-head p{margin:0;color:#728078;font-size:9.5px}
      body.kch-master-2026 .kch-live-social-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.kch-live-social-card{min-width:0;overflow:hidden;border:1px solid #e0e8e2;border-radius:17px;background:#fff;box-shadow:0 7px 22px rgba(13,67,39,.055)}.kch-live-media{position:relative;aspect-ratio:9/12;background:linear-gradient(145deg,#edf5ef,#f9fbf9);overflow:hidden}.kch-live-media video,.kch-live-media img{width:100%;height:100%;object-fit:cover}.kch-live-social-copy{display:grid;gap:6px;padding:12px}.kch-live-social-copy b{color:#214635;font-size:11px;line-height:1.45}.kch-live-social-copy small{color:#748078;font-size:8.8px;line-height:1.45}.kch-live-social-copy button{min-height:38px;border:0;border-radius:10px;background:#0b6440;color:#fff;font:900 9.5px/1 'Noto Sans Thai',sans-serif}
      body.kch-master-2026 .kch-live-review-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.kch-live-review-card{display:grid;gap:9px;min-height:150px;padding:15px;border:1px solid #e0e8e2;border-radius:16px;background:#fff;box-shadow:0 7px 22px rgba(13,67,39,.045)}.kch-live-review-stars{color:#f5a000;font-size:14px;letter-spacing:1px}.kch-live-review-card blockquote{margin:0;color:#314f40;font-size:10.5px;line-height:1.65}.kch-live-review-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;color:#748078;font-size:8.5px}.kch-live-review-meta b{color:#315440;font-size:9px}.kch-live-verified{display:inline-flex;align-items:center;gap:3px;color:#137b4d;font-weight:900}
      @media(max-width:900px){body.kch-master-2026 .kch-live-social-grid{grid-template-columns:repeat(2,minmax(0,1fr))}body.kch-master-2026 .kch-live-review-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:699px){body.kch-master-2026 .kch-live-promo{grid-template-columns:1fr;gap:12px;padding:17px}body.kch-master-2026 .kch-live-promo button{width:100%}body.kch-master-2026 .kch-live-section{width:calc(100% - 24px);margin-top:20px}.kch-live-head{display:grid;grid-template-columns:1fr}.kch-live-social-grid{display:grid!important;grid-auto-flow:column!important;grid-auto-columns:minmax(210px,78%)!important;grid-template-columns:none!important;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.kch-live-social-grid::-webkit-scrollbar{display:none}.kch-live-social-card{scroll-snap-align:start}.kch-live-review-grid{display:grid!important;grid-auto-flow:column!important;grid-auto-columns:minmax(235px,86%)!important;grid-template-columns:none!important;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.kch-live-review-grid::-webkit-scrollbar{display:none}.kch-live-review-card{scroll-snap-align:start}}
    `;document.head.appendChild(s);
  }
  function productAnchor(){return $('.v118-shop-first')||$('#kch-products')||$('.kch-master-products')?.closest('section')||$('.tshop-section')}
  function remove(selector){$(selector)?.remove()}
  function renderPromotion(){
    const grid=$('.kch-master-promo-grid');if(!grid)return;
    const p=state.promotions[0];if(!p){remove('.kch-live-promo');return}
    let el=$('.kch-live-promo');if(!el){el=document.createElement('section');el.className='kch-live-promo';grid.appendChild(el)}
    const type=String(p.type||'').toLowerCase(),value=Number(p.value||0);let valueText='';
    if(/percent|percentage/.test(type)&&value>0)valueText=` ลด ${value}%`;
    else if(/fixed|amount/.test(type)&&value>0)valueText=` ลด ${money(value)}`;
    const min=Number(p.minSpend||0)>0?` เมื่อยอดถึง ${money(p.minSpend)}`:'';
    el.replaceChildren();
    const copy=document.createElement('div');copy.className='kch-live-promo-copy';
    const kicker=document.createElement('span');kicker.className='kch-live-promo-kicker';kicker.textContent='โปรโมชั่นที่ใช้งานอยู่';
    const h=document.createElement('h3');h.textContent=`${String(p.name||'ข้อเสนอพิเศษ')}${valueText}`;
    const note=document.createElement('p');note.textContent=`ตรวจเงื่อนไขและยอดรวมก่อนยืนยันคำสั่งซื้อ${min}`;
    copy.append(kicker,h,note);
    if(p.code){const code=document.createElement('span');code.className='kch-live-promo-code';code.textContent=`โค้ด ${String(p.code)}`;copy.appendChild(code)}
    const btn=document.createElement('button');btn.type='button';btn.textContent='เลือกสินค้าที่ร่วมรายการ';btn.addEventListener('click',()=>productAnchor()?.scrollIntoView({behavior:'smooth',block:'start'}));
    el.append(copy,btn);
  }
  function mediaElement(c){
    const url=safeUrl(c.mediaUrl),poster=safeUrl(c.posterUrl);if(!url&&!poster)return null;
    const wrap=document.createElement('div');wrap.className='kch-live-media';const type=String(c.type||'').toLowerCase();
    const videoLike=/video|live/.test(type)||/\.(mp4|webm)(\?|$)/i.test(url);
    if(videoLike&&url){const v=document.createElement('video');v.src=url;v.controls=true;v.muted=true;v.playsInline=true;v.preload='metadata';if(poster)v.poster=poster;wrap.appendChild(v)}
    else{const img=document.createElement('img');img.src=poster||url;img.alt=String(c.title||'คอนเทนต์สินค้า KHONCHAIHERB');img.loading='lazy';img.decoding='async';wrap.appendChild(img)}
    return wrap;
  }
  function renderSocial(){
    const rows=state.social.filter(c=>c&&c.mediaUrl&&Array.isArray(c.products)&&c.products.length).slice(0,4);
    const existingVisible=$('.video-feed,.v05-creator-section');
    if(!rows.length||existingVisible){remove('.kch-live-social');return}
    const anchor=productAnchor();if(!anchor)return;
    let section=$('.kch-live-social');if(!section){section=document.createElement('section');section.className='kch-live-section kch-live-social';anchor.insertAdjacentElement('afterend',section)}
    section.replaceChildren();
    const head=document.createElement('div');head.className='kch-live-head';const hd=document.createElement('div');const k=document.createElement('span');k.textContent='SHOP THE CONTENT';const h=document.createElement('h2');h.textContent='ดูสินค้าในวิดีโอ';const p=document.createElement('p');p.textContent='คอนเทนต์ที่ผูกกับสินค้าจริงในระบบ';hd.append(k,h,p);head.appendChild(hd);section.appendChild(head);
    const grid=document.createElement('div');grid.className='kch-live-social-grid';
    rows.forEach(c=>{const media=mediaElement(c);if(!media)return;const card=document.createElement('article');card.className='kch-live-social-card';const copy=document.createElement('div');copy.className='kch-live-social-copy';const title=document.createElement('b');title.textContent=String(c.title||c.caption||'ดูสินค้าในคอนเทนต์');const sub=document.createElement('small');sub.textContent=String(c.caption||'').slice(0,120);const linked=c.products[0];const btn=document.createElement('button');btn.type='button';btn.textContent=`ดู ${String(linked?.name||'สินค้า')}`;btn.addEventListener('click',()=>openProductById(linked?.id,linked?.slug));copy.append(title);if(sub.textContent)copy.appendChild(sub);copy.appendChild(btn);card.append(media,copy);grid.appendChild(card)});
    if(grid.children.length)section.appendChild(grid);else section.remove();
  }
  function renderReviews(){
    const rows=state.reviews.filter(x=>x?.verifiedPurchase&&String(x.body||'').trim()).slice(0,6);
    const existingVisible=$('.review-grid,.reviews-grid,[class*="review-grid"]');
    if(!rows.length||existingVisible){remove('.kch-live-reviews');return}
    const social=$('.kch-live-social'),anchor=social||productAnchor();if(!anchor)return;
    let section=$('.kch-live-reviews');if(!section){section=document.createElement('section');section.className='kch-live-section kch-live-reviews';anchor.insertAdjacentElement('afterend',section)}
    section.replaceChildren();const head=document.createElement('div');head.className='kch-live-head';const hd=document.createElement('div');const k=document.createElement('span');k.textContent='VERIFIED PURCHASE';const h=document.createElement('h2');h.textContent='รีวิวจากผู้ซื้อที่ยืนยันแล้ว';const p=document.createElement('p');p.textContent='แสดงเฉพาะรีวิวที่เชื่อมกับคำสั่งซื้อในระบบ';hd.append(k,h,p);head.appendChild(hd);section.appendChild(head);
    const grid=document.createElement('div');grid.className='kch-live-review-grid';rows.forEach(r=>{const card=document.createElement('article');card.className='kch-live-review-card';const stars=document.createElement('div');stars.className='kch-live-review-stars';stars.setAttribute('aria-label',`${Number(r.rating||0)} ดาว`);stars.textContent='★'.repeat(Math.max(0,Math.min(5,Number(r.rating||0))));const q=document.createElement('blockquote');q.textContent=String(r.body||'').trim();const meta=document.createElement('div');meta.className='kch-live-review-meta';const buyer=document.createElement('b');buyer.textContent=String(r.buyer||'ผู้ซื้อที่ยืนยันแล้ว');const verified=document.createElement('span');verified.className='kch-live-verified';verified.textContent=`✓ ${String(r.productName||'ซื้อจริง')}`;meta.append(buyer,verified);card.append(stars,q,meta);grid.appendChild(card)});section.appendChild(grid);
  }
  async function load(){
    if(!home()||state.loading||Date.now()-state.loadedAt<60000)return;
    state.loading=true;styles();
    try{
      const [promo,social]=await Promise.all([json('/api/promotions'),json('/api/social-feed')]);
      state.promotions=Array.isArray(promo?.promotions)?promo.promotions:[];state.social=Array.isArray(social?.contents)?social.contents:[];
      const products=catalog().filter(ready).slice(0,3);const reviewSets=await Promise.all(products.map(p=>json(`/api/reviews?productId=${encodeURIComponent(p.id)}&limit=4`)));
      state.reviews=[];reviewSets.forEach((d,i)=>{const p=products[i];(Array.isArray(d?.reviews)?d.reviews:[]).forEach(r=>state.reviews.push({...r,productName:p?.name||''}))});
      state.loadedAt=Date.now();renderPromotion();renderSocial();renderReviews();
    }finally{state.loading=false}
  }
  function render(){if(!home()){remove('.kch-live-promo');remove('.kch-live-social');remove('.kch-live-reviews');return}styles();renderPromotion();renderSocial();renderReviews();load()}
  let raf=0;const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;render()})};
  const root=$('#app')||document.body;if(root&&typeof MutationObserver!=='undefined')new MutationObserver(()=>schedule()).observe(root,{childList:true,subtree:true});
  window.addEventListener('pageshow',schedule,{passive:true});document.addEventListener('click',()=>setTimeout(schedule,0),{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();setTimeout(schedule,350);setTimeout(schedule,1000);
})();
