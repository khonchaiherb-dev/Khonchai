/* KHONCHAIHERB v1.31.2 — conversion-first top storefront behavior */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.31.2';
  if(window.__KCH_TOP_CONVERSION__===BUILD)return;
  window.__KCH_TOP_CONVERSION__=BUILD;

  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const text=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
  const normalize=v=>String(v??'').normalize('NFKC').toLocaleLowerCase('th-TH').replace(/\s+/g,' ').trim();
  const money=n=>{try{return new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(Number(n)||0)}catch{return `฿${Number(n)||0}`}};
  const catalog=()=>{try{return Array.isArray(PRODUCTS)?PRODUCTS:[]}catch{return []}};
  const isDemo=p=>[[1,189,86,1248],[2,149,120,938],[3,459,42,524],[4,99,210,2201],[5,129,64,781],[6,699,25,194]].some(x=>Number(p?.id)===x[0]&&Number(p?.price)===x[1]&&Number(p?.stock)===x[2]&&Number(p?.sold??p?.sold_count)===x[3]);
  const isReady=p=>Boolean(p)&&!isDemo(p)&&Number(p?.sale_verified)===1&&Number(p?.price||0)>0&&Number(p?.stock||0)>0&&!p?.comingSoon&&Boolean(String(p?.image||p?.image_url||'').trim());
  const basename=v=>{try{return decodeURIComponent(new URL(String(v||''),location.origin).pathname.split('/').pop()||'').toLowerCase()}catch{return String(v||'').split('/').pop()?.toLowerCase()||''}};

  function isHome(){
    try{if(typeof current!=='undefined')return current==='home'}catch{}
    return Boolean($('.kch-master-home'));
  }

  function productForShowcase(card){
    const rows=catalog();
    const slug=String(card?.dataset?.product||card?.dataset?.slug||card?.dataset?.v118Featured||'').trim();
    if(slug){const p=rows.find(x=>String(x?.slug||'')===slug);if(p)return p}
    const img=$('img',card),src=basename(img?.currentSrc||img?.src||img?.getAttribute?.('src'));
    if(src){const p=rows.find(x=>basename(x?.image||x?.image_url)===src);if(p)return p}
    const alt=String(img?.alt||'').trim();
    if(alt){const p=rows.find(x=>String(x?.name||'').trim()===alt);if(p)return p}
    return null;
  }

  function enhanceHeader(){
    const shell=$('.shell.kch-master-shell')||$('.shell');
    if(!shell)return;
    shell.classList.add('kch-v131');
    const brand=$('.kch-brand-lockup',shell);
    if(brand){brand.setAttribute('aria-label','KHONCHAIHERB คุณชายสมุนไพร');brand.setAttribute('title','KHONCHAIHERB คุณชายสมุนไพร')}
    const input=$('.tshop-topbar .tshop-searchbox input',shell);
    if(input){input.placeholder='ค้นหาสินค้า ชาสมุนไพร และผลิตภัณฑ์สุขภาพ';input.setAttribute('aria-label',input.placeholder)}
    const menu=$('.kch-ref-menu',shell);
    if(menu)menu.setAttribute('aria-label','หมวดหมู่และเมนูหลัก');
  }

  function enhanceHero(){
    if(!isHome())return;
    const home=$('.kch-master-home');
    if(!home)return;
    home.classList.add('kch-v131-home');
    const hero=$('.kch-master-hero',home);
    if(!hero)return;
    hero.classList.add('kch-v131-hero');
    hero.setAttribute('aria-label','KHONCHAIHERB เลือกซื้อผลิตภัณฑ์สมุนไพร');

    const kicker=$('.kch-master-kicker',hero);
    if(kicker&&text(kicker)!=='สมุนไพรไทยที่คัดสรร')kicker.textContent='สมุนไพรไทยที่คัดสรร';

    const h1=$('h1',hero);
    if(h1&&!h1.querySelector('.kch-v131-brandline')){
      h1.innerHTML='<span class="kch-v131-brandline">KHONCHAIHERB</span>สมุนไพรไทยที่คัดสรร<small>เพื่อการดูแลสุขภาพในทุกวัน</small>';
    }
    const tagline=$('.kch-master-tagline',hero);
    if(tagline)tagline.textContent='เลือกซื้อผลิตภัณฑ์สมุนไพร พร้อมจัดส่งทั่วประเทศ';
    const desc=$('.kch-master-desc',hero);
    if(desc)desc.textContent='ดูข้อมูลสินค้าให้ครบก่อนสั่งซื้อ รองรับเก็บเงินปลายทางเมื่อรายการเข้าเงื่อนไข และติดตามสถานะคำสั่งซื้อได้ในระบบ';

    const shop=$('.kch-master-shop',hero),explore=$('.kch-master-explore',hero);
    if(shop){shop.textContent='เลือกซื้อสินค้า';shop.setAttribute('aria-label','เลือกซื้อสินค้า KHONCHAIHERB')}
    if(explore){explore.textContent='ดูสินค้าแนะนำ';explore.setAttribute('aria-label','ดูสินค้าแนะนำ')}
  }

  function enhanceShowcase(){
    if(!isHome())return;
    $$('.kch-master-home .kch-master-showcase').forEach(card=>{
      card.classList.add('kch-v131-showcase');
      const p=productForShowcase(card);
      let meta=$('.kch-v131-showcase-meta',card);
      if(!isReady(p)){meta?.remove();return}
      const key=`${p.id}:${p.price}:${p.stock}:${p.name}`;
      if(meta?.dataset?.key===key)return;
      meta?.remove();meta=document.createElement('span');meta.className='kch-v131-showcase-meta';meta.dataset.key=key;
      const name=document.createElement('b');name.textContent=String(p.name||'สินค้า KHONCHAIHERB');
      const price=document.createElement('strong');price.textContent=money(p.price);
      const hint=document.createElement('small');hint.textContent='แตะเพื่อดูรายละเอียดสินค้า';
      meta.append(name,price,hint);card.appendChild(meta);
      card.setAttribute('aria-label',`ดู ${String(p.name||'สินค้า')} ราคา ${money(p.price)}`);
    });
  }

  function enhanceTrust(){
    if(!isHome())return;
    const rows=$$('.kch-master-home .kch-master-hero-benefits > div');
    const copy=[
      ['สมุนไพรคัดสรร','แสดงข้อมูลสำคัญก่อนสั่งซื้อ'],
      ['เก็บเงินปลายทาง','เลือก COD เมื่อคำสั่งซื้อรองรับ'],
      ['จัดส่งและติดตาม','ตรวจสถานะคำสั่งซื้อในระบบ'],
      ['ใบเสร็จรับเงิน','ออกหลังยืนยันการรับชำระ']
    ];
    rows.slice(0,4).forEach((row,i)=>{
      const [title,sub]=copy[i]||[];if(!title)return;
      const b=$('b',row),small=$('small',row);if(b)b.textContent=title;if(small)small.textContent=sub;
    });
  }

  function hideMemberInterrupt(){
    if(!isHome())return;
    const home=$('.kch-master-home');if(!home)return;
    const candidates=$$('section,div',home).filter(el=>{
      if(el.classList.contains('kch-master-hero')||el.closest('.kch-master-hero'))return false;
      const t=text(el);return t.length>0&&t.length<520&&t.includes('สมาชิก KHONCHAIHERB')&&(t.includes('สมัครสมาชิก')||t.includes('เข้าสู่ระบบ'));
    });
    const deepest=candidates.filter(el=>!candidates.some(other=>other!==el&&el.contains(other)));
    deepest.forEach(el=>{el.classList.add('kch-v131-member-interrupt');el.setAttribute('aria-hidden','true')});
  }

  function enhanceFinder(){
    if(!isHome())return;
    const finder=$('.kch-master-home .kch-master-finder');if(!finder)return;
    finder.classList.add('kch-v131-quick-discovery');finder.setAttribute('aria-label','เลือกซื้อแบบรวดเร็ว');
    const h=$('h2',finder);if(h)h.textContent='เลือกซื้อแบบรวดเร็ว';
    const range=$('.kch-master-range',finder);if(range){range.setAttribute('aria-hidden','true');range.querySelectorAll('input,button').forEach(el=>el.tabIndex=-1)}
    const reset=$('.kch-master-reset',finder);if(reset&&/ล้าง|รีเซ็ต|reset/i.test(text(reset)))reset.textContent='ล้างตัวกรอง';
  }

  function enhanceProductHeading(){
    if(!isHome())return;
    const section=$('#kch-products')||$('.kch-master-section:has(.kch-master-products)');
    if(!section)return;
    const h=$('.kch-master-section-head h2',section);if(h&&/สินค้าแนะนำ|สินค้าที่ได้รับความนิยม|สินค้าขายดี/.test(text(h)))h.textContent='สินค้าแนะนำ';
    const p=$('.kch-master-section-head p',section);if(p)p.textContent='เลือกจากสินค้าที่มีข้อมูลราคาและสถานะพร้อมให้ตรวจสอบก่อนสั่งซื้อ';
  }

  function ensureSearchRule(){
    if(document.getElementById('kch-v131-search-rule'))return;
    const style=document.createElement('style');
    style.id='kch-v131-search-rule';
    style.textContent='.kch-master-home .kch-master-product[data-kch-v131-search-match="0"]{display:none!important}';
    (document.head||document.documentElement).appendChild(style);
  }

  function applyMasterSearch(){
    if(!isHome())return;
    const input=$('.tshop-topbar .tshop-searchbox input');
    const grid=$('.kch-master-products');
    if(!input||!grid)return;
    ensureSearchRule();
    const q=normalize(input.value);
    const cards=$$('.kch-master-product',grid);
    if(!q){cards.forEach(card=>card.removeAttribute('data-kch-v131-search-match'));return}
    const tokens=q.split(' ').filter(Boolean);
    cards.forEach(card=>{
      const hay=normalize([card.dataset?.kchName,card.dataset?.product,card.dataset?.kchCat,text(card)].filter(Boolean).join(' '));
      const match=tokens.every(token=>hay.includes(token));
      card.dataset.kchV131SearchMatch=match?'1':'0';
    });
  }

  function bindMasterSearch(){
    if(!isHome())return;
    const input=$('.tshop-topbar .tshop-searchbox input');
    if(!input||input.dataset.kchV131Search==='1')return;
    input.dataset.kchV131Search='1';
    const repair=()=>{
      queueMicrotask(applyMasterSearch);
      requestAnimationFrame(applyMasterSearch);
      setTimeout(applyMasterSearch,180);
    };
    input.addEventListener('input',repair);
    input.addEventListener('search',repair);
  }

  function run(){
    enhanceHeader();
    if(!isHome())return;
    enhanceHero();enhanceShowcase();enhanceTrust();hideMemberInterrupt();enhanceFinder();enhanceProductHeading();bindMasterSearch();
    applyMasterSearch();
  }

  let frame=0;
  const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;run()})};
  const root=$('#app')||document.body;
  if(root&&typeof MutationObserver!=='undefined')new MutationObserver(records=>{if(records.some(r=>r.addedNodes?.length||r.type==='characterData'))schedule()}).observe(root,{childList:true,subtree:true,characterData:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  setTimeout(schedule,80);setTimeout(schedule,320);
})();