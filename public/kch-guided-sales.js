/* KHONCHAIHERB — guided sales journey
   Extends the Master assistant with live-catalog search, comparison and canonical quick add. */
(()=>{
  'use strict';
  if(typeof document==='undefined'||window.__KCH_GUIDED_SALES__)return;
  window.__KCH_GUIDED_SALES__='2026.09.05';
  const state={products:[],loading:false,query:'',mode:''};
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const clean=v=>String(v??'').trim();
  const money=n=>{try{return new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(Number(n)||0)}catch{return `฿${Number(n)||0}`}};

  function injectStyle(){
    if($('#kch-guided-sales-style'))return;
    const style=document.createElement('style');style.id='kch-guided-sales-style';style.textContent=`
      body.kch-master-2026 .kch-guided-results{display:grid;gap:8px;margin-top:10px;max-height:min(410px,52vh);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin}
      body.kch-master-2026 .kch-guided-head{display:flex;align-items:end;justify-content:space-between;gap:10px;padding:9px 2px 2px}.kch-guided-head span{display:grid;gap:2px}.kch-guided-head b{color:#214b37;font-size:10.5px}.kch-guided-head small{color:#748078;font-size:8.4px}
      body.kch-master-2026 .kch-guided-card{display:grid;grid-template-columns:62px minmax(0,1fr);gap:10px;padding:8px;border:1px solid #e1e9e3;border-radius:14px;background:#fff}
      body.kch-master-2026 .kch-guided-media{display:grid;place-items:center;width:62px;height:62px;border-radius:11px;background:linear-gradient(145deg,#f8f4ea,#eef5ef);overflow:hidden}.kch-guided-media img{width:100%;height:100%;object-fit:contain;padding:5px;box-sizing:border-box}
      body.kch-master-2026 .kch-guided-copy{display:grid;gap:4px;min-width:0}.kch-guided-copy b{color:#244b38;font-size:9.8px;line-height:1.4}.kch-guided-copy small{color:#78847d;font-size:8px}.kch-guided-price{display:flex;align-items:center;justify-content:space-between;gap:8px}.kch-guided-price strong{color:#0f633d;font-size:12px}.kch-guided-price span{color:#46715a;font-size:7.9px}
      body.kch-master-2026 .kch-guided-buttons{display:flex;gap:6px}.kch-guided-buttons button{flex:1;min-height:34px;border:1px solid #d9e5dd;border-radius:10px;background:#fff;color:#27503d;font:850 8.5px/1 'Noto Sans Thai',sans-serif}.kch-guided-buttons button.primary{border-color:#075031;background:#075031;color:#fff}.kch-guided-buttons button:disabled{opacity:.55}
      body.kch-master-2026 .kch-guided-message{padding:11px;border:1px solid #e1e9e3;border-radius:12px;background:#f8fbf8;color:#5e7066;font-size:9px;line-height:1.55}.kch-guided-message.success{border-color:#d4e6da;background:#f1faf4;color:#246143}
      body.kch-master-2026 .kch-compare-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.kch-compare-col{display:grid;gap:6px;padding:10px;border:1px solid #e1e9e3;border-radius:13px;background:#fbfdfb}.kch-compare-col h3{margin:0;color:#244b38;font-size:9.5px;line-height:1.4}.kch-compare-col dl{display:grid;gap:4px;margin:0}.kch-compare-col dl div{display:flex;justify-content:space-between;gap:7px;font-size:7.9px}.kch-compare-col dt{color:#77837c}.kch-compare-col dd{margin:0;color:#315440;font-weight:800;text-align:right}
      @media(max-width:430px){body.kch-master-2026 .kch-compare-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(style);
  }

  async function catalog(query=''){
    if(!query&&state.products.length)return state.products;
    if(!query&&window.KCHCommerceIntegrity?.loadCatalog){const rows=await window.KCHCommerceIntegrity.loadCatalog().catch(()=>[]);if(Array.isArray(rows)&&rows.length){state.products=rows;return rows}}
    const url=new URL('/api/products',location.origin);if(query)url.searchParams.set('q',query);
    const r=await fetch(`${url.pathname}${url.search}`,{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok||d.ready!==true)return [];
    const rows=Array.isArray(d.products)?d.products:[];if(!query)state.products=rows;return rows;
  }

  function resultHost(panel){
    let host=$('.kch-guided-results',panel);if(host)return host;
    host=document.createElement('div');host.className='kch-guided-results';host.setAttribute('aria-live','polite');$('.kch-assistant-body',panel)?.appendChild(host);return host;
  }
  function clearHost(panel){const host=resultHost(panel);while(host.firstChild)host.firstChild.remove();return host}
  function message(panel,text,kind=''){const host=clearHost(panel),p=document.createElement('div');p.className=`kch-guided-message ${kind}`;p.textContent=text;host.appendChild(p)}

  function legacyProduct(p){return {id:Number(p.id),slug:clean(p.slug),name:clean(p.name),desc:clean(p.description),price:Number(p.price)||0,old:Number(p.compare_at_price)||Number(p.price)||0,rating:null,sold:0,stock:Number(p.stock)||0,cat:clean(p.category)||'สินค้า',emoji:'🌿',tag:'',image:clean(p.image_url),image_url:clean(p.image_url),sale_verified:1}}
  function openProduct(p){try{if(typeof product==='function'){product(legacyProduct(p));return}}catch{}const slug=clean(p.slug);if(slug)location.hash=`product/${encodeURIComponent(slug)}`}

  function card(p,panel){
    const article=document.createElement('article');article.className='kch-guided-card';
    const media=document.createElement('div');media.className='kch-guided-media';if(clean(p.image_url)){const img=document.createElement('img');img.src=p.image_url;img.alt=clean(p.name);img.loading='lazy';img.decoding='async';media.appendChild(img)}
    const copy=document.createElement('div');copy.className='kch-guided-copy';const name=document.createElement('b');name.textContent=clean(p.name)||'ผลิตภัณฑ์ KHONCHAIHERB';const category=document.createElement('small');category.textContent=clean(p.category)||'สินค้า';
    const price=document.createElement('div');price.className='kch-guided-price';const strong=document.createElement('strong');strong.textContent=money(p.price);const stock=document.createElement('span');stock.textContent=`พร้อมจำหน่าย ${Number(p.stock)||0} ชิ้น`;price.append(strong,stock);
    const buttons=document.createElement('div');buttons.className='kch-guided-buttons';const view=document.createElement('button');view.type='button';view.textContent='ดูรายละเอียด';view.onclick=()=>{panel.hidden=true;document.body.classList.remove('kch-assistant-open');openProduct(p)};const add=document.createElement('button');add.type='button';add.className='primary';add.textContent='เพิ่มตะกร้า';add.onclick=()=>{const out=window.KCHCommerceIntegrity?.addCanonicalProduct?.(p,1);if(out?.ok){add.textContent=`เพิ่มแล้ว (${out.qty})`;message(panel,`${clean(p.name)} ถูกเพิ่มลงตะกร้าจากข้อมูล Catalog จริงแล้ว`,'success');setTimeout(()=>renderProducts(panel,[p],'สินค้าที่เพิ่มล่าสุด'),650)}else message(panel,'สินค้านี้ไม่พร้อมเพิ่มลงตะกร้า กรุณารีเฟรชข้อมูลแล้วลองใหม่')};buttons.append(view,add);copy.append(name,category,price,buttons);article.append(media,copy);return article;
  }

  function renderProducts(panel,rows,title='สินค้าที่พร้อมจำหน่าย'){
    const host=clearHost(panel),head=document.createElement('div');head.className='kch-guided-head';const hcopy=document.createElement('span');const b=document.createElement('b');b.textContent=title;const s=document.createElement('small');s.textContent=`ข้อมูลจาก Catalog จริง ${rows.length} รายการ`;hcopy.append(b,s);head.appendChild(hcopy);host.appendChild(head);
    if(!rows.length){const p=document.createElement('div');p.className='kch-guided-message';p.textContent='ยังไม่พบสินค้าที่ตรงเงื่อนไขจาก Catalog ที่พร้อมขาย';host.appendChild(p);return}
    rows.slice(0,8).forEach(p=>host.appendChild(card(p,panel)));
  }

  function renderCompare(panel,rows){
    const host=clearHost(panel),head=document.createElement('div');head.className='kch-guided-head';const span=document.createElement('span'),b=document.createElement('b'),s=document.createElement('small');b.textContent='เปรียบเทียบสินค้าที่พร้อมจำหน่าย';s.textContent='เทียบจากราคา หมวด และสต๊อกจริง ไม่ใช้คะแนนหรือยอดขายสมมติ';span.append(b,s);head.appendChild(span);host.appendChild(head);
    if(rows.length<2){const p=document.createElement('div');p.className='kch-guided-message';p.textContent=rows.length===1?'ขณะนี้มีสินค้าเพียง 1 รายการที่พร้อมจำหน่าย จึงยังไม่มีคู่สินค้าให้เปรียบเทียบ':'ยังไม่มีสินค้าที่พร้อมจำหน่ายสำหรับการเปรียบเทียบ';host.appendChild(p);if(rows[0])host.appendChild(card(rows[0],panel));return}
    const grid=document.createElement('div');grid.className='kch-compare-grid';rows.slice(0,3).forEach(p=>{const col=document.createElement('article');col.className='kch-compare-col';const h=document.createElement('h3');h.textContent=clean(p.name);const dl=document.createElement('dl');for(const [label,value] of [['ราคา',money(p.price)],['หมวด',clean(p.category)||'-'],['สต๊อกพร้อมขาย',`${Number(p.stock)||0} ชิ้น`]]){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);dl.appendChild(row)}const buttons=document.createElement('div');buttons.className='kch-guided-buttons';const view=document.createElement('button');view.type='button';view.textContent='รายละเอียด';view.onclick=()=>openProduct(p);const add=document.createElement('button');add.type='button';add.className='primary';add.textContent='เพิ่มตะกร้า';add.onclick=()=>{const out=window.KCHCommerceIntegrity?.addCanonicalProduct?.(p,1);if(out?.ok)add.textContent=`เพิ่มแล้ว (${out.qty})`};buttons.append(view,add);col.append(h,dl,buttons);grid.appendChild(col)});host.appendChild(grid);
  }

  async function runMode(panel,mode,query=''){
    state.mode=mode;state.query=query;message(panel,'กำลังตรวจข้อมูลสินค้าที่พร้อมจำหน่าย...');
    try{
      let rows=await catalog(query);
      if(mode==='ready')rows=rows.filter(p=>Number(p.stock)>0);
      if(mode==='budget')rows=rows.filter(p=>Number(p.price)>0&&Number(p.price)<=300);
      if(mode==='compare'){renderCompare(panel,rows);return}
      const title=query?`ผลค้นหา “${query}”`:mode==='budget'?'สินค้างบไม่เกิน 300 บาท':mode==='ready'?'สินค้าพร้อมจำหน่าย':'สินค้าทั้งหมดที่พร้อมขาย';renderProducts(panel,rows,title);
    }catch{message(panel,'ยังเปิดข้อมูล Catalog ไม่ได้ กรุณาลองใหม่อีกครั้ง')}
  }

  function extendAssistant(){
    injectStyle();const panel=$('.kch-master-sales-assistant');if(!panel)return;
    const actions=$('.kch-assistant-actions',panel);if(!actions||actions.dataset.kchGuided==='1')return;actions.dataset.kchGuided='1';
    const quick=document.createElement('button');quick.type='button';quick.dataset.kchAssistant='quick';quick.innerHTML='<span class="material-symbols-rounded">bolt</span><span>เลือกซื้อเร็ว</span>';
    const compare=document.createElement('button');compare.type='button';compare.dataset.kchAssistant='compare';compare.innerHTML='<span class="material-symbols-rounded">compare_arrows</span><span>เปรียบเทียบสินค้า</span>';
    actions.append(quick,compare);resultHost(panel);
    const caption=$('.kch-assistant-caption',panel);if(caption)caption.textContent='ค้นหาและเปรียบเทียบจาก Catalog ที่พร้อมขายจริง • ไม่ใช้รีวิวหรือยอดขายสมมติ • ไม่ให้คำวินิจฉัยทางการแพทย์';
  }

  document.addEventListener('submit',e=>{
    const form=e.target.closest?.('.kch-assistant-search');if(!form)return;e.preventDefault();e.stopImmediatePropagation();const panel=form.closest('.kch-master-sales-assistant');const q=clean(form.querySelector('input')?.value);if(q)runMode(panel,'search',q);
  },true);
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-kch-assistant]');if(!btn)return;const action=btn.dataset.kchAssistant,panel=btn.closest('.kch-master-sales-assistant');
    if(!['orders','shop','ready','budget','quick','compare','cart','checkout'].includes(action))return;
    e.preventDefault();e.stopImmediatePropagation();
    if(action==='orders'){window.KCHCommerceIntegrity?.openOrders?.();return}
    if(action==='cart'){window.KCHCommerceIntegrity?.openCart?.();return}
    if(action==='checkout'){window.KCHCommerceIntegrity?.openCheckout?.();return}
    if(!panel)return;if(action==='compare')runMode(panel,'compare');else if(action==='budget')runMode(panel,'budget');else if(action==='ready')runMode(panel,'ready');else runMode(panel,'shop');
  },true);

  const observer=new MutationObserver(()=>extendAssistant());observer.observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',extendAssistant,{once:true});else extendAssistant();setTimeout(extendAssistant,120);setTimeout(extendAssistant,500);
})();
