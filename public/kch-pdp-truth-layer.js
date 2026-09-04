/* KHONCHAIHERB — Product Detail truth layer
   Uses only sale-verified product detail, linked social content, and verified-purchase reviews. */
(()=>{
  'use strict';
  if(typeof document==='undefined'||window.__KCH_PDP_TRUTH_LAYER__)return;
  window.__KCH_PDP_TRUTH_LAYER__='2026.09.05';

  const state={key:'',loading:false};
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const clean=v=>String(v??'').trim();
  const safeUrl=v=>{try{const u=new URL(clean(v),location.origin);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return ''}};
  const money=n=>{try{return new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(Number(n)||0)}catch{return `฿${Number(n)||0}`}};
  const dateText=v=>{if(!v)return '';const d=new Date(v);if(Number.isNaN(d.getTime()))return '';try{return new Intl.DateTimeFormat('th-TH',{dateStyle:'medium'}).format(d)}catch{return d.toLocaleDateString('th-TH')}};

  function injectStyle(){
    if($('#kch-pdp-truth-style'))return;
    const style=document.createElement('style');style.id='kch-pdp-truth-style';style.textContent=`
      body.kch-master-2026 .kch-pdp-truth{width:min(1180px,calc(100% - 32px));margin:18px auto 118px;display:grid;gap:16px;color:#214738}
      body.kch-master-2026 .kch-pdp-truth section{border:1px solid #dfe9e2;border-radius:22px;background:#fff;padding:clamp(18px,2.5vw,28px);box-shadow:0 12px 34px rgba(20,64,45,.055)}
      body.kch-master-2026 .kch-pdp-truth-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:15px}.kch-pdp-truth-head h2{margin:0;font-size:clamp(19px,2vw,27px);line-height:1.2;color:#173f2e}.kch-pdp-truth-head p{margin:5px 0 0;color:#718077;font-size:9.5px;line-height:1.6}.kch-pdp-truth-badge{flex:none;padding:6px 9px;border:1px solid #cde2d4;border-radius:999px;background:#f3faf5;color:#27704b;font-size:8.5px;font-weight:900}
      body.kch-master-2026 .kch-pdp-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.kch-pdp-fact{padding:12px;border:1px solid #e3ebe5;border-radius:14px;background:#f9fbf9}.kch-pdp-fact small{display:block;color:#7b8880;font-size:8px}.kch-pdp-fact b{display:block;margin-top:3px;color:#254d3a;font-size:10.5px;line-height:1.45;overflow-wrap:anywhere}
      body.kch-master-2026 .kch-pdp-gallery{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(210px,.65fr);gap:12px}.kch-pdp-gallery-main{display:grid;place-items:center;min-height:370px;border-radius:18px;background:linear-gradient(145deg,#f8f4e9,#edf6ef);overflow:hidden}.kch-pdp-gallery-main img{width:100%;height:min(560px,56vw);object-fit:contain;padding:18px;box-sizing:border-box}.kch-pdp-gallery-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;gap:8px}.kch-pdp-thumb{min-height:118px;border:1px solid #dfe8e1;border-radius:14px;background:#f8faf8;overflow:hidden;padding:0;cursor:pointer}.kch-pdp-thumb img{width:100%;height:100%;min-height:118px;object-fit:contain;padding:7px;box-sizing:border-box}.kch-pdp-thumb.active{border-color:#1f8050;box-shadow:0 0 0 2px rgba(31,128,80,.12)}
      body.kch-master-2026 .kch-pdp-social-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kch-pdp-social{display:grid;gap:9px;border:1px solid #e1e9e3;border-radius:16px;padding:10px;background:#fbfdfb}.kch-pdp-social video,.kch-pdp-social img{width:100%;aspect-ratio:9/16;max-height:430px;border-radius:12px;background:#eef3ef;object-fit:cover}.kch-pdp-social b{font-size:9.5px;line-height:1.5}.kch-pdp-social a{display:inline-flex;justify-content:center;align-items:center;min-height:38px;border:1px solid #d5e4da;border-radius:10px;color:#285540;text-decoration:none;font-size:8.8px;font-weight:900}
      body.kch-master-2026 .kch-pdp-review-summary{display:flex;align-items:center;gap:12px;margin-bottom:12px;padding:13px;border:1px solid #dbe8df;border-radius:15px;background:#f5faf6}.kch-pdp-review-score{font-size:28px;font-weight:950;color:#0c633c}.kch-pdp-review-summary span{display:grid;gap:2px}.kch-pdp-review-summary b{font-size:10px}.kch-pdp-review-summary small{color:#748079;font-size:8.5px}.kch-pdp-review-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.kch-pdp-review-card{display:grid;gap:7px;padding:13px;border:1px solid #e1e8e3;border-radius:15px;background:#fff}.kch-pdp-review-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.kch-pdp-review-top b{font-size:9.5px}.kch-pdp-review-top small{color:#78847d;font-size:8px}.kch-pdp-stars{color:#9b7419;letter-spacing:.06em;font-size:11px}.kch-pdp-review-card p{margin:0;color:#50665a;font-size:9.2px;line-height:1.7;white-space:pre-wrap}.kch-pdp-review-media{display:flex;gap:6px;overflow:auto}.kch-pdp-review-media img,.kch-pdp-review-media video{width:76px;height:76px;flex:0 0 76px;border-radius:10px;background:#f1f4f2;object-fit:cover}.kch-pdp-empty{margin:0;padding:13px;border:1px dashed #d9e4dc;border-radius:13px;color:#718077;font-size:9.2px;line-height:1.6;background:#fafcfb}
      @media(max-width:820px){body.kch-master-2026 .kch-pdp-gallery{grid-template-columns:1fr}.kch-pdp-gallery-list{grid-template-columns:repeat(4,minmax(0,1fr))}.kch-pdp-facts{grid-template-columns:repeat(2,minmax(0,1fr))}.kch-pdp-social-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){body.kch-master-2026 .kch-pdp-truth{width:calc(100% - 20px);margin-top:12px}.kch-pdp-truth section{border-radius:18px;padding:15px}.kch-pdp-gallery-main{min-height:280px}.kch-pdp-gallery-main img{height:330px}.kch-pdp-gallery-list{grid-template-columns:repeat(3,minmax(0,1fr))}.kch-pdp-thumb,.kch-pdp-thumb img{min-height:88px}.kch-pdp-social-grid,.kch-pdp-review-grid{grid-template-columns:1fr}.kch-pdp-social{grid-template-columns:88px minmax(0,1fr);align-items:center}.kch-pdp-social video,.kch-pdp-social img{width:88px;height:120px;aspect-ratio:auto;grid-row:1/3}.kch-pdp-social a{grid-column:2}.kch-pdp-truth-head{align-items:flex-start}.kch-pdp-truth-badge{font-size:7.8px}}
    `;document.head.appendChild(style);
  }

  function identity(){
    let id=0,slug='';
    try{if(typeof selected!=='undefined'&&selected){id=Number(selected.id)||0;slug=clean(selected.slug)}}catch{}
    const m=String(location.hash||'').match(/product\/([^/?#]+)/i);if(m&&!slug)try{slug=decodeURIComponent(m[1])}catch{slug=m[1]}
    return {id,slug,key:id?`id:${id}`:slug?`slug:${slug}`:''};
  }
  function productHost(){return $('.kch-pdp-20')?.closest('.shell')||$('.v118-signature-pdp')?.closest('.shell')||$('.detail')?.closest('.shell')||null}
  async function json(url){const r=await fetch(url,{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'request_failed');return d}
  function section(title,desc,badge='ข้อมูลจากระบบจริง'){
    const s=document.createElement('section'),head=document.createElement('div');head.className='kch-pdp-truth-head';const copy=document.createElement('div'),h=document.createElement('h2'),p=document.createElement('p'),b=document.createElement('span');h.textContent=title;p.textContent=desc;b.className='kch-pdp-truth-badge';b.textContent=badge;copy.append(h,p);head.append(copy,b);s.appendChild(head);return s
  }

  function renderFacts(p,root){
    const s=section('ข้อมูลสินค้าที่ตรวจสอบจากระบบ','แสดงเฉพาะข้อมูลสินค้าใน Catalog ที่เปิดจำหน่ายและผ่าน sale verification');
    const grid=document.createElement('div');grid.className='kch-pdp-facts';
    const facts=[['ราคา',money(p.price)],['สต๊อกพร้อมขาย',`${Number(p.available_stock)||0} ชิ้น`],['หมวดสินค้า',clean(p.category)||'ไม่ระบุ'],['SKU',clean(p.sku)||'ไม่ระบุ']];if(Number(p.weight_grams)>0)facts.push(['น้ำหนักสินค้า',`${Number(p.weight_grams).toLocaleString('th-TH')} กรัม`]);
    facts.forEach(([label,value])=>{const card=document.createElement('div');card.className='kch-pdp-fact';const sm=document.createElement('small'),b=document.createElement('b');sm.textContent=label;b.textContent=value;card.append(sm,b);grid.appendChild(card)});s.appendChild(grid);root.appendChild(s)
  }

  function renderGallery(p,root){
    const media=(Array.isArray(p.media)?p.media:[]).map(x=>({...x,url:safeUrl(x.url)})).filter(x=>x.url);if(!media.length)return;
    const s=section('ภาพสินค้าจริง','ภาพที่ผูกกับสินค้านี้ในระบบ Media ของ KHONCHAIHERB',`${media.length} ภาพ`),grid=document.createElement('div');grid.className='kch-pdp-gallery';const main=document.createElement('div');main.className='kch-pdp-gallery-main';const hero=document.createElement('img');hero.src=media[0].url;hero.alt=clean(media[0].alt_text)||clean(p.name);hero.decoding='async';main.appendChild(hero);const list=document.createElement('div');list.className='kch-pdp-gallery-list';
    media.forEach((m,i)=>{const btn=document.createElement('button');btn.type='button';btn.className=`kch-pdp-thumb${i===0?' active':''}`;btn.setAttribute('aria-label',`ดูภาพ ${i+1} ของ ${clean(p.name)}`);const img=document.createElement('img');img.src=m.url;img.alt=clean(m.alt_text)||`${clean(p.name)} ภาพ ${i+1}`;img.loading=i<3?'eager':'lazy';img.decoding='async';btn.appendChild(img);btn.onclick=()=>{hero.src=m.url;hero.alt=img.alt;$$('.kch-pdp-thumb',list).forEach(x=>x.classList.toggle('active',x===btn))};list.appendChild(btn)});grid.append(main,list);s.appendChild(grid);root.appendChild(s)
  }

  function socialCard(item){
    const card=document.createElement('article');card.className='kch-pdp-social';const media=safeUrl(item.mediaUrl),poster=safeUrl(item.posterUrl),type=clean(item.type).toLowerCase(),isVideo=/video|live/.test(type)||/\.(mp4|webm|ogg)(?:$|\?)/i.test(media);
    if(media&&isVideo){const v=document.createElement('video');v.controls=true;v.preload='metadata';v.playsInline=true;v.src=media;if(poster)v.poster=poster;card.appendChild(v)}else if(poster){const img=document.createElement('img');img.src=poster;img.alt=clean(item.title)||'คอนเทนต์จากร้าน';img.loading='lazy';card.appendChild(img)}
    const b=document.createElement('b');b.textContent=clean(item.title)||'คอนเทนต์ที่เกี่ยวข้องกับสินค้านี้';card.appendChild(b);
    if(media&&!isVideo){const a=document.createElement('a');a.href=media;a.target='_blank';a.rel='noopener noreferrer';a.textContent='เปิดคอนเทนต์';card.appendChild(a)}return card
  }
  function renderSocial(data,root){
    const rows=Array.isArray(data?.contents)?data.contents.filter(x=>safeUrl(x.mediaUrl)||safeUrl(x.posterUrl)):[];if(!rows.length)return;
    const s=section('วิดีโอและคอนเทนต์ที่เกี่ยวข้อง','แสดงเฉพาะคอนเทนต์ที่ระบบผูกกับสินค้านี้โดยตรง','Social Commerce'),grid=document.createElement('div');grid.className='kch-pdp-social-grid';rows.slice(0,6).forEach(x=>grid.appendChild(socialCard(x)));s.appendChild(grid);root.appendChild(s)
  }

  function reviewMedia(media){
    const box=document.createElement('div');box.className='kch-pdp-review-media';(Array.isArray(media)?media:[]).slice(0,4).forEach(m=>{const url=safeUrl(m.url);if(!url)return;const type=clean(m.type).toLowerCase();if(type==='video'||/\.(mp4|webm)(?:$|\?)/i.test(url)){const v=document.createElement('video');v.src=url;v.controls=true;v.preload='metadata';v.playsInline=true;box.appendChild(v)}else{const img=document.createElement('img');img.src=url;img.alt='สื่อประกอบรีวิวจากผู้ซื้อที่ยืนยันแล้ว';img.loading='lazy';box.appendChild(img)}});return box
  }
  function renderReviews(data,root){
    const rows=(Array.isArray(data?.reviews)?data.reviews:[]).filter(x=>x.verifiedPurchase===true&&Number(x.rating)>=1&&Number(x.rating)<=5),s=section('รีวิวจากผู้ซื้อที่ยืนยันแล้ว','รีวิวส่วนนี้กรองเฉพาะรายการที่ API ยืนยันว่าเป็น Verified Purchase','Verified Purchase');
    if(!rows.length){const p=document.createElement('p');p.className='kch-pdp-empty';p.textContent='ยังไม่มีรีวิวจากผู้ซื้อที่ยืนยันแล้วสำหรับสินค้านี้';s.appendChild(p);root.appendChild(s);return}
    const average=Math.round(rows.reduce((sum,x)=>sum+Number(x.rating),0)/rows.length*10)/10,summary=document.createElement('div');summary.className='kch-pdp-review-summary';const score=document.createElement('strong');score.className='kch-pdp-review-score';score.textContent=average.toFixed(1);const copy=document.createElement('span'),b=document.createElement('b'),sm=document.createElement('small');b.textContent='คะแนนเฉลี่ยจาก Verified Purchase';sm.textContent=`${rows.length.toLocaleString('th-TH')} รีวิวที่แสดงในหน้านี้`;copy.append(b,sm);summary.append(score,copy);s.appendChild(summary);
    const grid=document.createElement('div');grid.className='kch-pdp-review-grid';rows.forEach(r=>{const card=document.createElement('article');card.className='kch-pdp-review-card';card.dataset.reviewId=String(r.id);const top=document.createElement('div');top.className='kch-pdp-review-top';const buyer=document.createElement('b'),date=document.createElement('small');buyer.textContent=clean(r.buyer)||'ผู้ซื้อที่ยืนยันแล้ว';date.textContent=dateText(r.createdAt);top.append(buyer,date);const stars=document.createElement('div');stars.className='kch-pdp-stars';stars.setAttribute('aria-label',`${Number(r.rating)} จาก 5 ดาว`);stars.textContent='★'.repeat(Number(r.rating))+'☆'.repeat(5-Number(r.rating));card.append(top,stars);if(clean(r.body)){const p=document.createElement('p');p.textContent=r.body;card.appendChild(p)}const media=reviewMedia(r.media);if(media.children.length)card.appendChild(media);grid.appendChild(card)});s.appendChild(grid);root.appendChild(s)
  }

  async function build(){
    injectStyle();const ident=identity(),host=productHost();if(!ident.key||!host)return;if(state.loading||state.key===ident.key&&$('.kch-pdp-truth'))return;state.loading=true;
    try{
      const u=new URL('/api/product-detail',location.origin);if(ident.id)u.searchParams.set('id',ident.id);else u.searchParams.set('slug',ident.slug);
      const detail=await json(`${u.pathname}${u.search}`),p=detail.product;if(!p?.id)return;
      const [reviews,social]=await Promise.all([json(`/api/reviews?productId=${encodeURIComponent(p.id)}&limit=12`).catch(()=>({reviews:[]})),json(`/api/social-feed?productId=${encodeURIComponent(p.id)}`).catch(()=>({contents:[]}))]);
      $('.kch-pdp-truth')?.remove();const root=document.createElement('div');root.className='kch-pdp-truth';root.dataset.productId=String(p.id);renderFacts(p,root);renderGallery(p,root);renderSocial(social,root);renderReviews(reviews,root);
      const buybar=$('.buybar',host)||$('.pdp-buybar',host)||$('[class*="buybar"]',host);if(buybar)buybar.insertAdjacentElement('beforebegin',root);else host.appendChild(root);state.key=ident.key;
    }catch{}finally{state.loading=false}
  }

  let raf=0;const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;build()})};new MutationObserver(records=>{if(records.some(r=>r.addedNodes?.length||r.removedNodes?.length))schedule()}).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('hashchange',()=>{state.key='';setTimeout(schedule,0)},{passive:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();setTimeout(schedule,220);setTimeout(schedule,800);
})();
