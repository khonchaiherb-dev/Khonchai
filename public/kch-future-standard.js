/* KHONCHAIHERB v1.28 — accessibility, performance and future-ready UX */
(()=>{
  if(typeof document==='undefined'||window.__KCH_FUTURE_STANDARD__==='1.28.0')return;
  window.__KCH_FUTURE_STANDARD__='1.28.0';

  const $=(s,r=document)=>r.querySelector?.(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll?.(s)||[]);
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const smooth=()=>reduced()?'auto':'smooth';

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
    if(main){
      main.id=main.id||'kch-home';
      main.setAttribute('role','main');
      main.setAttribute('tabindex','-1');
    }
    const top=$('.kch-ref-menu');
    if(top&&!top.getAttribute('aria-label'))top.setAttribute('aria-label','เมนูหลัก');
    const footer=$('.kch-master-footer');
    if(footer&&!footer.getAttribute('aria-label'))footer.setAttribute('aria-label','ข้อมูลและบริการของร้าน');
  }

  function improveInteractiveLabels(){
    $$('.kch-ref-menu button').forEach(btn=>{
      const text=(btn.textContent||'').trim();
      if(text&&!btn.getAttribute('aria-label'))btn.setAttribute('aria-label',text);
    });
    $$('.kch-footer-premium-nav button').forEach(btn=>{
      const text=(btn.textContent||'').trim();
      if(text&&!btn.getAttribute('aria-label'))btn.setAttribute('aria-label',text);
    });
    $$('.badge').forEach(b=>{
      b.setAttribute('aria-live','polite');
      b.setAttribute('aria-atomic','true');
    });
  }

  function improveImages(){
    const hero=new Set($$('.kch-master-stage img'));
    $$('img').forEach((img,i)=>{
      img.decoding='async';
      if(hero.has(img)){
        img.loading='eager';
        if(i===0||img.closest('.kch-master-showcase:first-child'))img.fetchPriority='high';
      }else if(!img.hasAttribute('loading')){
        img.loading='lazy';
      }
      if(!img.getAttribute('alt')){
        const card=img.closest('.kch-master-product,.tshop-card,.kch-master-showcase');
        const label=card?.querySelector('h3,b,[aria-label]')?.textContent?.trim()||card?.getAttribute('aria-label')||'';
        img.alt=label;
      }
    });
  }

  function removeUnverifiedContact(){
    // This number belongs to another project and must never appear as KHONCHAIHERB contact data.
    $$('a[href="tel:0885807909"],a[href="tel:088-5807909"]').forEach(a=>{
      const col=a.closest('.kch-master-footer-col');
      if(col)col.remove();else a.remove();
    });
    $$('.kch-master-footer span').forEach(el=>{
      const t=(el.textContent||'').replace(/\s+/g,'');
      if(t.includes('0885807909'))el.remove();
    });
  }

  function ensureStructuredData(){
    let el=$('#kch-store-jsonld');
    if(!el){
      el=document.createElement('script');
      el.type='application/ld+json';
      el.id='kch-store-jsonld';
      document.head.appendChild(el);
    }
    const origin=location.origin;
    el.textContent=JSON.stringify({
      '@context':'https://schema.org',
      '@graph':[
        {'@type':'Organization','@id':`${origin}/#organization`,name:'KHONCHAIHERB',alternateName:'คุณชายสมุนไพร',url:`${origin}/`},
        {'@type':'WebSite','@id':`${origin}/#website`,url:`${origin}/`,name:'KHONCHAIHERB',alternateName:'คุณชายสมุนไพร',inLanguage:'th-TH',publisher:{'@id':`${origin}/#organization`}}
      ]
    });
  }

  function revealSections(){
    const nodes=$$('.kch-master-section,.kch-master-trust,.kch-master-story,.kch-master-newsletter,.kch-master-footer');
    if(reduced()||typeof IntersectionObserver==='undefined'){
      nodes.forEach(n=>n.classList.add('is-visible'));
      return;
    }
    nodes.forEach(n=>n.setAttribute('data-kch-reveal',''));
    const io=new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}
      });
    },{rootMargin:'0px 0px -8% 0px',threshold:.06});
    nodes.forEach(n=>{if(!n.classList.contains('is-visible'))io.observe(n)});
  }

  const sectionMap={
    home:'#kch-home',
    all:'#kch-products',
    recommended:'#kch-products',
    new:'#kch-products',
    promotions:'#kch-promotions',
    about:'#kch-story',
    contact:'#kch-footer'
  };

  function syncNavState(){
    if(typeof IntersectionObserver==='undefined')return;
    const targets=[
      ['home',$('#kch-home')],
      ['recommended',$('#kch-products')],
      ['promotions',$('#kch-promotions')],
      ['about',$('#kch-story')],
      ['contact',$('#kch-footer')]
    ].filter(([,el])=>el);
    if(!targets.length)return;
    window.__KCH_NAV_IO__?.disconnect?.();
    const setActive=key=>{
      $$('.kch-footer-premium-nav button').forEach(btn=>{
        const on=btn.dataset.kchFooterGo===key;
        if(on)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
      });
      $$('.kch-ref-menu button').forEach(btn=>{
        const text=(btn.textContent||'').trim();
        const on=(key==='home'&&text==='หน้าแรก')||(key==='recommended'&&['สินค้าทั้งหมด','สินค้าแนะนำ'].includes(text))||(key==='promotions'&&text==='โปรโมชั่น')||(key==='about'&&text==='เกี่ยวกับเรา')||(key==='contact'&&text==='ติดต่อเรา');
        if(on)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
      });
    };
    const io=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      const found=targets.find(([,el])=>el===visible.target);
      if(found)setActive(found[0]);
    },{rootMargin:'-18% 0px -62% 0px',threshold:[0,.1,.25,.5]});
    targets.forEach(([,el])=>io.observe(el));
    window.__KCH_NAV_IO__=io;
  }

  function improveMobileMenu(){
    const btn=$('.kch-ref-hamburger');
    const panel=$('.kch-ref-mobile-panel');
    if(!btn||!panel)return;
    btn.setAttribute('aria-controls','kch-mobile-menu');
    panel.id='kch-mobile-menu';
    panel.setAttribute('role','navigation');
    panel.setAttribute('aria-label','เมนูบนมือถือ');
    const sync=()=>{
      const open=panel.classList.contains('open');
      btn.setAttribute('aria-expanded',String(open));
      panel.setAttribute('aria-hidden',String(!open));
    };
    sync();
    btn.addEventListener('click',()=>queueMicrotask(sync));
  }

  function ensureMeta(){
    let meta=$('meta[name="color-scheme"]');
    if(meta)meta.setAttribute('content','light');
    let theme=$('meta[name="theme-color"]');
    if(theme)theme.setAttribute('content','#043126');
  }

  function boot(){
    ensureSkipLink();
    ensureLandmarks();
    improveInteractiveLabels();
    improveImages();
    removeUnverifiedContact();
    ensureStructuredData();
    ensureMeta();
    improveMobileMenu();
    revealSections();
    syncNavState();
  }

  let queued=false;
  const queue=()=>{
    if(queued)return;
    queued=true;
    (window.requestAnimationFrame||setTimeout)(()=>{queued=false;boot()},0);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});
  else queue();

  if(typeof MutationObserver!=='undefined'){
    const mo=new MutationObserver(records=>{
      if(records.some(r=>r.addedNodes?.length))queue();
    });
    mo.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
