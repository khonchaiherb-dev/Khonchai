/* KHONCHAIHERB Commerce v1.19 — launch conversion patch */
const V119_BUILD='1.19.0';
const V119_STATE={frame:0,health:null,healthChecked:false,lastShelfKey:'',lastCartKey:'',lastCheckoutKey:'',draftBound:false};
const V119_DRAFT_KEY='kch-checkout-draft-session-v1';

function v119IsReadyProduct(p){
  return Boolean(p)&&Number(p?.price||0)>0&&Number(p?.stock||0)>0&&!p?.comingSoon&&Boolean(String(p?.image||'').trim());
}
function v119ReadyProducts(){
  return (Array.isArray(PRODUCTS)?PRODUCTS:[]).filter(v119IsReadyProduct);
}
function v119ReadDraft(){try{return JSON.parse(sessionStorage.getItem(V119_DRAFT_KEY)||'{}')||{}}catch{return {}}}
function v119WriteDraft(v){try{sessionStorage.setItem(V119_DRAFT_KEY,JSON.stringify(v||{}))}catch{}}
async function v119CheckHealth(){
  try{
    const r=await fetch('/api/health',{cache:'no-store',headers:{Accept:'application/json'}});
    const d=await r.json().catch(()=>null);
    V119_STATE.health=r.ok&&d?d:null;
  }catch{V119_STATE.health=null}
  V119_STATE.healthChecked=true;
  v119Schedule();
}
function v119GoProduct(slug){
  const p=(Array.isArray(PRODUCTS)?PRODUCTS:[]).find(x=>String(x.slug)===String(slug));
  if(p&&typeof product==='function')product(p);
}
function v119ProductForNode(el){
  const slug=el?.dataset?.product||el?.dataset?.v118Featured||'';
  return (Array.isArray(PRODUCTS)?PRODUCTS:[]).find(p=>String(p.slug)===String(slug));
}
function v119SetHidden(el,hidden){if(el&&el.hidden!==Boolean(hidden))el.hidden=Boolean(hidden)}
function v119LaunchSafety(){
  if(typeof current==='undefined'||!['home','product'].includes(String(current)))return;
  document.querySelectorAll('.tshop-card[data-product],.flash-product[data-product]').forEach(el=>v119SetHidden(el,!v119IsReadyProduct(v119ProductForNode(el))));
  document.querySelectorAll('.tshop-meta').forEach(el=>v119SetHidden(el,true));
  document.querySelectorAll('.pdp-sold span').forEach(el=>{if(/ขายแล้ว|⭐/.test(el.textContent||''))v119SetHidden(el,true)});
  const countdown=document.querySelector('.flash-countdown');v119SetHidden(countdown,true);
  const live=document.getElementById('live');if(live?.querySelector('.live-card'))v119SetHidden(live,true);
  const video=document.querySelector('.video-feed')?.closest('.tshop-section');if(video)v119SetHidden(video,true);
  const ready=v119ReadyProducts();
  document.querySelectorAll('.category-strip [data-cat]').forEach(btn=>{const cat=String(btn.dataset.cat||'');v119SetHidden(btn,cat!=='ทั้งหมด'&&!ready.some(p=>String(p.cat)===cat))});
}
function v119QuickShelf(){
  if(typeof current==='undefined'||current!=='home')return;
  const hero=document.querySelector('.tshop-hero');
  if(!hero)return;
  const ready=v119ReadyProducts().slice(0,4);
  const key=ready.map(p=>`${p.id}:${p.price}:${p.stock}:${p.image}`).join('|');
  let shelf=document.querySelector('.v119-ready-shelf');
  if(!ready.length){shelf?.remove();V119_STATE.lastShelfKey='';return}
  if(shelf&&V119_STATE.lastShelfKey===key)return;
  shelf?.remove();
  shelf=document.createElement('section');
  shelf.className='v119-ready-shelf';
  shelf.setAttribute('aria-label','สินค้าพร้อมสั่งซื้อ');
  shelf.innerHTML=`<div class="v119-ready-head"><div><span>พร้อมสั่งซื้อ</span><h2>เลือกสินค้าที่พร้อมส่งได้ทันที</h2><p>แสดงเฉพาะรายการที่มีรูปสินค้า ราคา และสต็อกพร้อมสั่งซื้อ</p></div><button type="button" data-v119-all>ดูสินค้าทั้งหมด</button></div><div class="v119-ready-grid">${ready.map(p=>`<button type="button" class="v119-ready-card" data-v119-product="${esc(p.slug)}"><span class="v119-ready-media"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" decoding="async"></span><span class="v119-ready-copy"><b>${esc(p.name)}</b><small>${typeof M==='function'?M(p.price):`฿${Number(p.price).toLocaleString('th-TH')}`}</small><em><span class="material-symbols-rounded">inventory_2</span>พร้อมสั่งซื้อ</em></span></button>`).join('')}</div>`;
  hero.insertAdjacentElement('afterend',shelf);
  shelf.querySelectorAll('[data-v119-product]').forEach(b=>b.addEventListener('click',()=>v119GoProduct(b.dataset.v119Product)));
  shelf.querySelector('[data-v119-all]')?.addEventListener('click',()=>document.getElementById('recommend')?.scrollIntoView({behavior:'smooth',block:'start'}));
  V119_STATE.lastShelfKey=key;
}
function v119CartLauncher(){
  const amount=typeof subtotal==='function'?Number(subtotal()||0):0;
  const qty=typeof count==='function'?Number(count()||0):0;
  const page=typeof current==='undefined'?'':String(current);
  const visible=qty>0&&!['cart','checkout','orders','account'].includes(page);
  let bar=document.querySelector('.v119-cart-launcher');
  const key=`${page}:${qty}:${amount}`;
  if(!visible){bar?.remove();V119_STATE.lastCartKey=key;return}
  if(bar&&V119_STATE.lastCartKey===key)return;
  bar?.remove();
  bar=document.createElement('aside');
  bar.className='v119-cart-launcher';
  bar.setAttribute('aria-label','ตะกร้าสินค้า');
  bar.innerHTML=`<button type="button" class="v119-cart-summary" data-v119-cart><span class="material-symbols-rounded">shopping_bag</span><span><b>${qty} รายการ</b><small>ยอดสินค้า ${typeof M==='function'?M(amount):`฿${amount.toLocaleString('th-TH')}`}</small></span></button><button type="button" class="v119-cart-checkout" data-v119-checkout>ไปชำระเงิน</button>`;
  document.body.appendChild(bar);
  bar.querySelector('[data-v119-cart]')?.addEventListener('click',()=>typeof cartPage==='function'&&cartPage());
  bar.querySelector('[data-v119-checkout]')?.addEventListener('click',()=>typeof checkout==='function'&&checkout());
  V119_STATE.lastCartKey=key;
}
function v119CheckoutDraft(){
  if(typeof current==='undefined'||current!=='checkout')return;
  const page=document.querySelector('main.page');
  if(!page)return;
  const fields={
    name:'#customer-name',phone:'#customer-phone',address:'#customer-address',district:'#customer-district',province:'#customer-province',postal:'#customer-postal',marketing:'#marketing-consent'
  };
  const nodes=Object.fromEntries(Object.entries(fields).map(([k,s])=>[k,document.querySelector(s)]));
  const draft=v119ReadDraft();
  Object.entries(nodes).forEach(([k,el])=>{if(!el)return;if(el.type==='checkbox'){if(typeof draft[k]==='boolean')el.checked=draft[k]}else if(!el.value&&draft[k])el.value=String(draft[k])});
  const saveDraft=()=>{const next={};Object.entries(nodes).forEach(([k,el])=>{if(!el)return;next[k]=el.type==='checkbox'?Boolean(el.checked):String(el.value||'').trim()});v119WriteDraft(next)};
  Object.values(nodes).filter(Boolean).forEach(el=>{if(el.dataset.v119Draft==='1')return;el.dataset.v119Draft='1';el.addEventListener('input',saveDraft);el.addEventListener('change',saveDraft);el.addEventListener('blur',()=>v119ValidateField(el))});
}
function v119ValidateField(el){
  if(!el)return;
  let ok=true;
  if(el.id==='customer-name')ok=el.value.trim().length>=2;
  if(el.id==='customer-phone')ok=el.value.replace(/\D/g,'').length>=9;
  if(el.id==='customer-address')ok=el.value.trim().length>=5;
  if(el.id==='customer-district'||el.id==='customer-province')ok=el.value.trim().length>=2;
  if(el.id==='customer-postal')ok=/^[0-9]{5}$/.test(el.value.trim());
  el.setAttribute('aria-invalid',ok?'false':'true');
}
function v119EnhanceCheckout(){
  if(typeof current==='undefined'||current!=='checkout')return;
  const page=document.querySelector('main.page');
  if(!page)return;
  if(!page.querySelector('.v119-checkout-progress')){
    const title=page.querySelector('.page-title');
    const progress=document.createElement('section');
    progress.className='v119-checkout-progress';
    progress.innerHTML='<div class="active"><i>1</i><span><b>ข้อมูลจัดส่ง</b><small>กรอกที่อยู่ผู้รับ</small></span></div><div class="active"><i>2</i><span><b>ชำระเงิน</b><small>เลือกวิธีชำระ</small></span></div><div><i>3</i><span><b>ยืนยันคำสั่งซื้อ</b><small>ตรวจยอดก่อนสั่ง</small></span></div>';
    title?.insertAdjacentElement('afterend',progress);
  }
  const payment=document.querySelector('.payment');
  if(payment&&!payment.querySelector('.v119-cod-note')){
    const note=document.createElement('div');note.className='v119-cod-note';note.innerHTML='<span class="material-symbols-rounded">verified_user</span><span><b>สั่งซื้อได้โดยไม่ต้องสมัครสมาชิก</b><small>ตรวจยอดจากเซิร์ฟเวอร์อีกครั้งก่อนสร้างออเดอร์ และติดตามคำสั่งซื้อได้หลังสั่งสำเร็จ</small></span>';payment.appendChild(note);
  }
  const place=document.querySelector('[data-place]');
  if(place&&V119_STATE.healthChecked){
    const ready=Boolean(V119_STATE.health?.d1);
    let note=page.querySelector('.v119-system-note');
    if(!note){note=document.createElement('div');note.className='v119-system-note';place.insertAdjacentElement('beforebegin',note)}
    if(ready){note.className='v119-system-note ready';note.innerHTML='<span class="material-symbols-rounded">check_circle</span>ระบบรับคำสั่งซื้อพร้อมใช้งาน';if(place.dataset.v119HealthDisabled==='1'){place.disabled=false;place.dataset.v119HealthDisabled='0'}}
    else{note.className='v119-system-note pending';note.innerHTML='<span class="material-symbols-rounded">sync</span>ระบบรับคำสั่งซื้อออนไลน์กำลังเชื่อมต่อ';place.disabled=true;place.dataset.v119HealthDisabled='1'}
  }
  v119CheckoutDraft();
  V119_STATE.lastCheckoutKey='checkout';
}
function v119ProductHint(){
  if(typeof current==='undefined'||current!=='product')return;
  const buybar=document.querySelector('.pdp-bottom,.buybar');
  if(!buybar||document.querySelector('.v119-buy-hint'))return;
  const p=typeof selected!=='undefined'?selected:null;
  if(!p||Number(p.price||0)<=0||Number(p.stock||0)<=0||p.comingSoon)return;
  const hint=document.createElement('div');hint.className='v119-buy-hint';hint.innerHTML='<span class="material-symbols-rounded">bolt</span><span><b>ซื้อได้ในไม่กี่ขั้นตอน</b><small>กด “ซื้อเลย” เพื่อไปชำระเงิน หรือเพิ่มลงตะกร้าเพื่อซื้อหลายรายการ</small></span>';buybar.insertAdjacentElement('beforebegin',hint);
}
function v119EnhanceHomeTrust(){
  if(typeof current==='undefined'||current!=='home'||!V119_STATE.healthChecked||!V119_STATE.health?.d1)return;
  const hero=document.querySelector('.tshop-hero');if(!hero||document.querySelector('.v119-live-status'))return;
  const status=document.createElement('div');status.className='v119-live-status';status.innerHTML='<span class="material-symbols-rounded">check_circle</span><b>ระบบสั่งซื้อออนไลน์พร้อมใช้งาน</b><small>เลือกสินค้า → ชำระเงิน → ติดตามคำสั่งซื้อ</small>';hero.insertAdjacentElement('beforebegin',status);
}
function v119Schedule(){
  if(V119_STATE.frame)return;
  V119_STATE.frame=requestAnimationFrame(()=>{V119_STATE.frame=0;v119LaunchSafety();v119QuickShelf();v119CartLauncher();v119EnhanceCheckout();v119ProductHint();v119EnhanceHomeTrust()});
}
new MutationObserver(v119Schedule).observe(document.getElementById('app'),{childList:true,subtree:true,characterData:true});
window.addEventListener('load',()=>{v119Schedule();v119CheckHealth()},{once:true});
window.addEventListener('popstate',v119Schedule);
document.addEventListener('click',e=>{if(e.target.closest('[data-add],[data-buy],[data-go]'))setTimeout(v119Schedule,0)},true);
v119Schedule();
