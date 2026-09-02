/* KHONCHAIHERB v1.29.0 — accessibility, performance, integrity and premium storefront UX */
(()=>{
  if(typeof document==='undefined'||window.__KCH_FUTURE_STANDARD__==='1.29.0')return;
  window.__KCH_FUTURE_STANDARD__='1.29.0';

  const $=(s,r=document)=>r.querySelector?.(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll?.(s)||[]);
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function ensureSkipLink(){
    if($('.kch-skip-link'))return;
    const a=document.createElement('a');
    a.className='kch-skip-link';
    a.href='#kch-home';
    a.textContent='ข้ามไปยังเนื้อหาหลัก';
    document.body.prepend(a);
  }

  function ensureLandmarks(){
    const main=$('.kch-master-home');
    if(main){main.id=main.id||'kch-home';main.setAttribute('role','main');main.setAttribute('tabindex','-1')}
    const top=$('.kch-ref-menu');if(top&&!top.getAttribute('aria-label'))top.setAttribute('aria-label','เมนูหลัก');
    const footer=$('.kch-master-footer');if(footer&&!footer.getAttribute('aria-label'))footer.setAttribute('aria-label','ข้อมูลและบริการของร้าน');
  }

  function improveInteractiveLabels(){
    $$('.kch-ref-menu button,.kch-footer-premium-nav button').forEach(btn=>{const text=(btn.textContent||'').trim();if(text&&!btn.getAttribute('aria-label'))btn.setAttribute('aria-label',text)});
    $$('.badge').forEach(b=>{b.setAttribute('aria-live','polite');b.setAttribute('aria-atomic','true')});
  }

  function improveImages(){
    const hero=new Set($$('.kch-master-stage img'));
    $$('img').forEach((img,i)=>{
      img.decoding='async';
      if(hero.has(img)){img.loading='eager';if(i===0||img.closest('.kch-master-showcase:first-child'))img.fetchPriority='high'}
      else if(!img.hasAttribute('loading'))img.loading='lazy';
      if(!img.getAttribute('alt')){const card=img.closest('.kch-master-product,.tshop-card,.kch-master-showcase');const label=card?.querySelector('h3,b,[aria-label]')?.textContent?.trim()||card?.getAttribute('aria-label')||'';img.alt=label}
    });
  }

  function removeUnverifiedContact(){
    $$('a[href="tel:0885807909"],a[href="tel:088-5807909"]').forEach(a=>{const col=a.closest('.kch-master-footer-col');if(col&&!col.closest('.kch-footer-v2'))col.remove();else a.remove()});
    $$('.kch-master-footer span').forEach(el=>{const t=(el.textContent||'').replace(/\s+/g,'');if(t.includes('0885807909'))el.remove()});
  }

  function sanitizeLegacyClaims(){
    $$('button,span,b,strong,h1,h2,h3,h4,p,small,a,option').forEach(el=>{
      if(el.children.length)return;
      const text=el.textContent||'';
      if(text.includes('สินค้าขายดี'))el.textContent=text.replaceAll('สินค้าขายดี','สินค้าแนะนำ');
    });
    $$('.rating,.review-promo').forEach(el=>el.remove());
    $$('.stats span').forEach(el=>{const t=(el.textContent||'').trim();if(/^⭐/.test(t)||t.includes('ขายแล้ว'))el.remove()});
    $$('.review').forEach(section=>{if((section.textContent||'').includes('Verified Purchase'))section.remove()});
    $$('.flash-title').forEach(el=>el.closest('.section')?.remove());
    $$('.kch-master-newsletter').forEach(section=>{
      const realSocial=section.querySelector('a[href^="https://"],a[href^="http://"]');
      const realForm=section.querySelector('form[action]');
      if(!realSocial&&!realForm)section.hidden=true;
    });
  }

  function ensureStructuredData(){
    let el=$('#kch-store-jsonld');
    if(!el){el=document.createElement('script');el.type='application/ld+json';el.id='kch-store-jsonld';document.head.appendChild(el)}
    const origin=location.origin;
    el.textContent=JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':`${origin}/#organization`,name:'KHONCHAIHERB',alternateName:'คุณชายสมุนไพร',url:`${origin}/`},{'@type':'WebSite','@id':`${origin}/#website`,url:`${origin}/`,name:'KHONCHAIHERB',alternateName:'คุณชายสมุนไพร',inLanguage:'th-TH',publisher:{'@id':`${origin}/#organization`}}]});
  }

  function ensurePremiumHomeStyle(){
    let style=$('#kch-premium-home-v129');
    if(!style){style=document.createElement('style');style.id='kch-premium-home-v129';(document.head||document.documentElement).appendChild(style)}
    style.textContent=`
      .kch-master-home{--kch-forest:#073a2b;--kch-forest-2:#0d4d39;--kch-paper:#fbfaf5;--kch-ivory:#f6f2e7;--kch-gold:#b99443;--kch-ink:#173c30;--kch-muted:#687970;--kch-line:#dfe7e1;background:linear-gradient(180deg,#fff 0,#fbfcfa 38%,#f7f9f6 100%)}
      .kch-master-home .kch-master-section{width:min(1360px,calc(100% - 56px));margin:30px auto 0;padding:clamp(22px,3vw,38px);box-sizing:border-box;border:1px solid rgba(23,60,48,.08);border-radius:28px;background:rgba(255,255,255,.92);box-shadow:0 18px 54px rgba(26,62,48,.055)}
      .kch-master-home .kch-master-section-head{align-items:flex-end;gap:20px;margin-bottom:20px}.kch-master-home .kch-master-section-head h2{margin:0;color:var(--kch-ink);font-size:clamp(22px,2.3vw,34px);line-height:1.18;letter-spacing:-.025em}.kch-master-home .kch-master-section-head p{max-width:660px;margin:7px 0 0;color:var(--kch-muted);font-size:11px;line-height:1.65}.kch-master-home .kch-master-section-head>button{min-height:40px;padding:0 15px;border:1px solid #dbe5de;border-radius:999px;background:#fff;color:#285341;font:800 10px/1 inherit;white-space:nowrap}
      .kch-master-home .kch-master-trust{width:min(1360px,calc(100% - 56px));margin:26px auto 0;border:1px solid rgba(185,148,67,.18);border-radius:24px;background:linear-gradient(135deg,#0a3b2d,#0b4634);box-shadow:0 18px 44px rgba(10,51,38,.13);overflow:hidden}.kch-master-home .kch-master-trust-inner{padding:4px 10px}.kch-master-home .kch-master-trust-item{padding:18px 16px}.kch-master-home .kch-master-trust-item .material-symbols-rounded{color:#e0bd66}.kch-master-home .kch-master-trust-item b{color:#f4e8c5}.kch-master-home .kch-master-trust-item small{color:#b9cdc3}
      .kch-master-home .kch-master-categories{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.kch-master-home .kch-master-category{min-height:162px;padding:16px;border:1px solid #e0e7e2;border-radius:20px;background:linear-gradient(150deg,#fff,#f8faf7);box-shadow:0 8px 22px rgba(24,59,45,.04);transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}.kch-master-home .kch-master-category:hover{transform:translateY(-3px);border-color:#cfdcd4;box-shadow:0 16px 34px rgba(24,59,45,.09)}.kch-master-home .kch-master-category-media{height:86px;border-radius:15px;background:linear-gradient(145deg,#f5f0e4,#edf4ee);overflow:hidden}.kch-master-home .kch-master-category-media img{width:100%;height:100%;object-fit:contain;padding:8px;box-sizing:border-box}.kch-master-home .kch-master-category b{display:block;margin-top:10px;color:#1d4637;font-size:11px}.kch-master-home .kch-master-category small{display:block;margin-top:3px;color:#718079;font-size:8.5px}
      .kch-master-home .kch-master-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;background:transparent;border:0;box-shadow:none;padding:0}.kch-master-home .kch-master-split>div{padding:clamp(22px,2.8vw,34px);border:1px solid rgba(23,60,48,.08);border-radius:26px;background:#fff;box-shadow:0 16px 44px rgba(25,59,45,.05)}.kch-master-home .kch-master-promo-grid,.kch-master-home .kch-master-review-grid{display:grid;gap:10px}.kch-master-home .kch-master-promo,.kch-master-home .kch-master-review{border:1px solid #e0e7e2!important;border-radius:18px!important;background:linear-gradient(145deg,#fff,#fbfcfa)!important;box-shadow:none!important}.kch-master-home .kch-master-review{padding:17px!important}.kch-master-home .kch-master-review p{color:#5f7168;line-height:1.65}.kch-master-home .kch-master-review small{color:#87938d}
      .kch-master-home .kch-master-story{position:relative;width:min(1360px,calc(100% - 56px));margin:32px auto 0;border:1px solid rgba(217,186,102,.24);border-radius:30px;background:linear-gradient(135deg,#07392c 0%,#0d4a38 58%,#123f32 100%);box-shadow:0 26px 64px rgba(8,47,35,.17);overflow:hidden}.kch-master-home .kch-master-story:after{content:'';position:absolute;right:-120px;top:-160px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(219,184,92,.12),transparent 68%);pointer-events:none}.kch-master-home .kch-master-story-visual{min-height:390px;background:#f2eee2}.kch-master-home .kch-master-story-visual img{width:100%;height:100%;object-fit:contain;padding:clamp(20px,4vw,52px);box-sizing:border-box;filter:drop-shadow(0 20px 28px rgba(6,40,30,.16))}.kch-master-home .kch-master-story-copy{position:relative;z-index:1;padding:clamp(26px,4vw,52px)}.kch-master-home .kch-master-story-copy .eyebrow{color:#dfc270;font-weight:900;letter-spacing:.12em}.kch-master-home .kch-master-story-copy h2{color:#fff5d9;font-size:clamp(26px,3vw,42px);line-height:1.2}.kch-master-home .kch-master-story-copy p{max-width:640px;color:#c7d8cf;font-size:11px;line-height:1.8}.kch-master-home .kch-master-story-copy button{min-height:44px;padding:0 18px;border:1px solid rgba(237,213,149,.4);border-radius:999px;background:rgba(255,255,255,.08);color:#f4e3b0;font-weight:900}.kch-master-home .kch-master-story-points{margin-top:22px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.kch-master-home .kch-master-story-point{border:1px solid rgba(255,255,255,.11);border-radius:15px;background:rgba(255,255,255,.055);padding:12px}.kch-master-home .kch-master-story-point .material-symbols-rounded{color:#e0c06c}.kch-master-home .kch-master-story-point b{color:#f7efd8}.kch-master-home .kch-master-story-point small{color:#b8cac1}
      .kch-master-home .kch-master-product{border:1px solid #e0e7e2!important;border-radius:21px!important;background:linear-gradient(150deg,#fff,#fbfcfa)!important;box-shadow:0 8px 24px rgba(23,58,43,.045)!important;transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}.kch-master-home .kch-master-product:hover{transform:translateY(-3px);border-color:#cfddd4!important;box-shadow:0 18px 38px rgba(23,58,43,.09)!important}.kch-master-home .kch-master-product-media{background:linear-gradient(145deg,#f8f4ea,#eef5ef)!important}.kch-master-home .kch-master-price{color:#123f30!important;font-weight:900!important}.kch-master-home .kch-master-product-bottom button{min-height:42px!important;border-radius:12px!important}
      .kch-master-home :where(button,a):focus-visible{outline:3px solid rgba(185,148,67,.34);outline-offset:3px}
      @media(max-width:1023px){.kch-master-home .kch-master-section,.kch-master-home .kch-master-trust,.kch-master-home .kch-master-story{width:min(100% - 32px,920px)}.kch-master-home .kch-master-categories{grid-template-columns:repeat(2,minmax(0,1fr))}.kch-master-home .kch-master-split{grid-template-columns:1fr}.kch-master-home .kch-master-story-visual{min-height:320px}}
      @media(max-width:699px){.kch-master-home .kch-master-section,.kch-master-home .kch-master-trust,.kch-master-home .kch-master-story{width:calc(100% - 24px);margin-top:18px}.kch-master-home .kch-master-section{padding:17px;border-radius:20px}.kch-master-home .kch-master-section-head{align-items:flex-start;margin-bottom:14px}.kch-master-home .kch-master-section-head h2{font-size:22px}.kch-master-home .kch-master-section-head p{font-size:9.5px}.kch-master-home .kch-master-section-head>button{min-height:36px;padding:0 11px;font-size:9px}.kch-master-home .kch-master-trust{border-radius:19px}.kch-master-home .kch-master-trust-inner{display:grid!important;grid-template-columns:1fr 1fr!important}.kch-master-home .kch-master-trust-item{padding:13px 9px}.kch-master-home .kch-master-categories{grid-template-columns:1fr 1fr;gap:8px}.kch-master-home .kch-master-category{min-height:132px;padding:10px;border-radius:16px}.kch-master-home .kch-master-category-media{height:66px}.kch-master-home .kch-master-split{gap:12px;padding:0}.kch-master-home .kch-master-split>div{padding:17px;border-radius:20px}.kch-master-home .kch-master-story{grid-template-columns:1fr!important;border-radius:22px}.kch-master-home .kch-master-story-visual{min-height:270px}.kch-master-home .kch-master-story-copy{padding:21px}.kch-master-home .kch-master-story-copy h2{font-size:27px}.kch-master-home .kch-master-story-copy p{font-size:9.8px}.kch-master-home .kch-master-story-points{grid-template-columns:1fr 1fr;gap:7px}.kch-master-home .kch-master-story-point{padding:9px}.kch-master-home .kch-master-product-bottom button{min-height:44px!important}}
      @media(max-width:420px){.kch-master-home .kch-master-categories{grid-template-columns:1fr 1fr}.kch-master-home .kch-master-story-points{grid-template-columns:1fr}.kch-master-home .kch-master-trust-inner{grid-template-columns:1fr 1fr!important}}
      @media(prefers-reduced-motion:reduce){.kch-master-home *{transition:none!important;scroll-behavior:auto!important}}
    `;
  }

  function enhanceHomeSemantics(){
    const products=$('#kch-products');if(products)products.setAttribute('aria-label','สินค้าแนะนำ');
    const cats=$('#kch-categories');if(cats)cats.setAttribute('aria-label','เลือกสินค้าตามหมวดหมู่');
    const promos=$('#kch-promotions');if(promos)promos.setAttribute('aria-label','สิทธิพิเศษและมาตรฐานการบริการ');
    const story=$('#kch-story');if(story)story.setAttribute('aria-label','เรื่องราว KHONCHAIHERB');
    $$('.kch-master-category').forEach(btn=>{if(!btn.getAttribute('aria-label')){const text=btn.querySelector('b')?.textContent?.trim();if(text)btn.setAttribute('aria-label',`ดูหมวด ${text}`)}});
    $$('.kch-master-product').forEach(card=>{card.setAttribute('data-kch-premium-card','1')});
  }

  function revealSections(){
    const nodes=$$('.kch-master-section,.kch-master-trust,.kch-master-story,.kch-master-newsletter,.kch-master-footer').filter(n=>!n.hidden);
    if(reduced()||typeof IntersectionObserver==='undefined'){nodes.forEach(n=>n.classList.add('is-visible'));return}
    nodes.forEach(n=>n.setAttribute('data-kch-reveal',''));
    const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.06});
    nodes.forEach(n=>{if(!n.classList.contains('is-visible'))io.observe(n)});
  }

  function syncNavState(){
    if(typeof IntersectionObserver==='undefined')return;
    const targets=[['home',$('#kch-home')],['recommended',$('#kch-products')],['promotions',$('#kch-promotions')],['about',$('#kch-story')],['contact',$('#kch-footer')]].filter(([,el])=>el);
    if(!targets.length)return;
    window.__KCH_NAV_IO__?.disconnect?.();
    const setActive=key=>{
      $$('.kch-footer-premium-nav button').forEach(btn=>{const on=btn.dataset.kchFooterGo===key;if(on)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current')});
      $$('.kch-ref-menu button').forEach(btn=>{const text=(btn.textContent||'').trim();const on=(key==='home'&&text==='หน้าแรก')||(key==='recommended'&&['สินค้าทั้งหมด','สินค้าแนะนำ'].includes(text))||(key==='promotions'&&text==='โปรโมชั่น')||(key==='about'&&text==='เกี่ยวกับเรา')||(key==='contact'&&text==='ติดต่อเรา');if(on)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current')});
    };
    const io=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!visible)return;const found=targets.find(([,el])=>el===visible.target);if(found)setActive(found[0])},{rootMargin:'-18% 0px -62% 0px',threshold:[0,.1,.25,.5]});
    targets.forEach(([,el])=>io.observe(el));window.__KCH_NAV_IO__=io;
  }

  function improveMobileMenu(){
    const btn=$('.kch-ref-hamburger'),panel=$('.kch-ref-mobile-panel');if(!btn||!panel)return;
    btn.setAttribute('aria-controls','kch-mobile-menu');panel.id='kch-mobile-menu';panel.setAttribute('role','navigation');panel.setAttribute('aria-label','เมนูบนมือถือ');
    const sync=()=>{const open=panel.classList.contains('open');btn.setAttribute('aria-expanded',String(open));panel.setAttribute('aria-hidden',String(!open))};sync();btn.addEventListener('click',()=>queueMicrotask(sync),{once:true});
  }

  function ensureMeta(){
    const scheme=$('meta[name="color-scheme"]');if(scheme)scheme.setAttribute('content','light');
    const theme=$('meta[name="theme-color"]');if(theme)theme.setAttribute('content','#043126');
  }

  function boot(){ensureSkipLink();ensureLandmarks();improveInteractiveLabels();improveImages();removeUnverifiedContact();sanitizeLegacyClaims();ensureStructuredData();ensurePremiumHomeStyle();enhanceHomeSemantics();ensureMeta();improveMobileMenu();revealSections();syncNavState()}

  let queued=false;
  const queue=()=>{if(queued)return;queued=true;(window.requestAnimationFrame||setTimeout)(()=>{queued=false;boot()},0)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
  if(typeof MutationObserver!=='undefined'){const mo=new MutationObserver(records=>{if(records.some(r=>r.addedNodes?.length))queue()});mo.observe(document.documentElement,{childList:true,subtree:true})}
})();
