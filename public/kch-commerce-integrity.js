/* KHONCHAIHERB — commerce integrity layer
   Server-priced checkout, canonical cart data, real-order-only completion. */
(()=>{
  'use strict';
  if(typeof document==='undefined'||window.__KCH_COMMERCE_INTEGRITY__)return;
  window.__KCH_COMMERCE_INTEGRITY__='2026.09.05';

  const state={catalog:[],catalogReady:false,quote:null,quoteKey:'',quoteBusy:false,submitBusy:false,member:null,lastOrder:null};
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const clean=v=>String(v??'').trim();
  const money=n=>{try{return new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(Number(n)||0)}catch{return `฿${Number(n)||0}`}};
  const digits=v=>clean(v).replace(/\D/g,'');
  const posInt=v=>{const n=Number(v);return Number.isInteger(n)&&n>0?n:null};

  function injectStyle(){
    if($('#kch-commerce-integrity-style'))return;
    const style=document.createElement('style');style.id='kch-commerce-integrity-style';style.textContent=`
      body.kch-master-2026 .kch-address-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}
      body.kch-master-2026 .kch-address-grid label{display:grid;gap:5px;color:#315544;font-size:10px;font-weight:800}
      body.kch-master-2026 .kch-address-grid input{width:100%;min-height:47px;border:1px solid #dce6df;border-radius:11px;background:#fff;padding:0 12px;color:#203f32;outline:0}
      body.kch-master-2026 .kch-server-quote{display:grid;gap:7px;margin:12px 0;padding:13px;border:1px solid #d9e6dd;border-radius:14px;background:#f6faf7;color:#315440}
      body.kch-master-2026 .kch-server-quote-row{display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:9.5px}
      body.kch-master-2026 .kch-server-quote-row.total{padding-top:8px;border-top:1px solid #dfe8e2;font-size:11px}.kch-server-quote-row.total b{color:#0d5736;font-size:15px}
      body.kch-master-2026 .kch-server-quote-note{margin:0;color:#6f7d75;font-size:8.5px;line-height:1.55}
      body.kch-master-2026 .kch-integrity-error{margin:9px 0;padding:10px 11px;border:1px solid #eedbd7;border-radius:12px;background:#fff7f5;color:#93443d;font-size:9.5px;line-height:1.55}
      body.kch-master-2026 .kch-real-order-note{margin:12px 0;padding:11px 12px;border:1px solid #d8e7dc;border-radius:13px;background:#f2faf4;color:#286044;font-size:9.5px;line-height:1.55}
      @media(max-width:620px){body.kch-master-2026 .kch-address-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(style);
  }

  function readCart(){
    try{const rows=JSON.parse(localStorage.getItem('kch-cart')||'[]');return Array.isArray(rows)?rows:[]}catch{return []}
  }
  function writeCart(rows){
    const safe=Array.isArray(rows)?rows:[];
    try{localStorage.setItem('kch-cart',JSON.stringify(safe))}catch{}
    try{if(typeof cart!=='undefined')cart=safe}catch{}
    const count=safe.reduce((s,x)=>s+Math.max(1,Number(x?.qty)||1),0);
    $$('.badge').forEach(x=>x.textContent=String(count));
    return safe;
  }
  function canonicalProduct(p){
    return {id:Number(p.id),slug:clean(p.slug),name:clean(p.name),desc:clean(p.description),description:clean(p.description),price:Number(p.price)||0,old:Number(p.compare_at_price)||Number(p.price)||0,compare_at_price:Number(p.compare_at_price)||null,stock:Number(p.stock)||0,cat:clean(p.category)||'สินค้า',category:clean(p.category)||'สินค้า',image:clean(p.image_url),image_url:clean(p.image_url),sale_verified:1,tag:'',emoji:'🌿'};
  }
  function cartItems(){return readCart().map(x=>({id:Number(x?.id),variantId:posInt(x?.variantId),qty:Math.max(1,Math.min(20,Number(x?.qty)||1))})).filter(x=>Number.isInteger(x.id)&&x.id>0)}
  function cartSignature(){return JSON.stringify(cartItems().map(x=>[x.id,x.variantId||0,x.qty]))}

  async function api(url,options={}){
    const res=await fetch(url,{credentials:'same-origin',headers:{Accept:'application/json','Content-Type':'application/json',...(options.headers||{})},...options});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){const e=new Error(data.error||'request_failed');e.status=res.status;e.data=data;throw e}return data;
  }

  async function loadCatalog(){
    if(state.catalogReady)return state.catalog;
    const data=await api('/api/products',{cache:'no-store'});
    state.catalog=Array.isArray(data.products)?data.products:[];state.catalogReady=data.ready===true;
    const map=new Map(state.catalog.map(p=>[Number(p.id),p]));
    const next=[];
    for(const raw of readCart()){
      const p=map.get(Number(raw?.id));if(!p)continue;
      const qty=Math.max(1,Math.min(20,Math.min(Number(p.stock)||0,Number(raw?.qty)||1)));if(qty<1)continue;
      next.push({...canonicalProduct(p),variantId:posInt(raw?.variantId),qty});
    }
    writeCart(next);return state.catalog;
  }

  function addCanonicalProduct(product,qty=1){
    const live=state.catalog.find(p=>Number(p.id)===Number(product?.id));
    if(!live||Number(live.stock)<=0||Number(live.price)<=0)return {ok:false,error:'product_unavailable'};
    const rows=readCart(),id=Number(live.id),hit=rows.find(x=>Number(x.id)===id),max=Math.max(1,Math.min(20,Number(live.stock)||1));
    const nextQty=Math.min(max,(hit?Number(hit.qty)||0:0)+Math.max(1,Number(qty)||1));
    const normalized={...canonicalProduct(live),qty:nextQty};
    const next=hit?rows.map(x=>Number(x.id)===id?normalized:x):[...rows,normalized];writeCart(next);
    state.quoteKey='';state.quote=null;schedule();return {ok:true,qty:nextQty,product:normalized,count:next.reduce((s,x)=>s+(Number(x.qty)||0),0)};
  }

  function ensureAddressFields(){
    const form=$('.checkout-form');if(!form)return null;
    let grid=$('.kch-address-grid',form);
    if(!grid){
      grid=document.createElement('div');grid.className='kch-address-grid';
      grid.innerHTML='<label>ตำบล / แขวง<input id="customer-subdistrict" autocomplete="address-level3" placeholder="ตำบล / แขวง"></label><label>อำเภอ / เขต<input id="customer-district" autocomplete="address-level2" placeholder="อำเภอ / เขต" required></label><label>จังหวัด<input id="customer-province" autocomplete="address-level1" placeholder="จังหวัด" required></label><label>รหัสไปรษณีย์<input id="customer-postal" inputmode="numeric" autocomplete="postal-code" maxlength="5" placeholder="xxxxx" required></label>';
      const address=$('#customer-address',form);(address?.closest('label')||form).insertAdjacentElement('afterend',grid);
    }
    const qr=$('input[name="pay"][value="QR"]');if(qr){qr.disabled=true;qr.checked=false;const label=qr.closest('label');label?.classList.add('disabled');const small=label?.querySelector('small');if(small)small.textContent='ยังไม่เปิดใช้งานจนกว่าจะเชื่อม Payment Gateway จริง'}
    const cod=$('input[name="pay"][value="COD"]');if(cod){cod.disabled=false;cod.checked=true;cod.closest('label')?.classList.add('selected')}
    const btn=$('[data-place]');if(btn)btn.textContent=state.submitBusy?'กำลังยืนยันคำสั่งซื้อ...':'ยืนยันคำสั่งซื้อแบบเก็บเงินปลายทาง';
    $$('.box.rows>div,.summary.rows>div').forEach(row=>{const text=clean(row.textContent);if(/WELCOME50|คูปอง/.test(text)){const a=row.querySelector('span');const b=row.querySelector('b');if(a)a.textContent='โปรโมชัน / คูปอง';if(b)b.textContent='ตรวจสอบจากระบบ'}});
    return form;
  }

  function quoteBox(){
    let box=$('.kch-server-quote');if(box)return box;
    const summary=$('.summary.rows');if(!summary)return null;
    box=document.createElement('section');box.className='kch-server-quote';box.setAttribute('aria-live','polite');summary.insertAdjacentElement('afterend',box);return box;
  }
  function setQuoteUI(data,error=''){
    const box=quoteBox();if(!box)return;
    if(error){box.innerHTML='';const p=document.createElement('p');p.className='kch-integrity-error';p.textContent=error;box.appendChild(p);return}
    const rows=$$('.summary.rows>div');
    rows.forEach(row=>{const label=clean(row.querySelector('span')?.textContent||row.textContent),value=row.querySelector('b');if(!value)return;if(label.includes('ยอดสินค้า'))value.textContent=money(data.subtotal);else if(label.includes('ค่าจัดส่ง'))value.textContent=Number(data.shipping)===0?'ส่งฟรี':money(data.shipping);else if(label.includes('ส่วนลด'))value.textContent=Number(data.discount)>0?`-${money(data.discount)}`:money(0);else if(label.includes('ยอดชำระ'))value.textContent=money(data.total)});
    const shippingRow=$$('.box.rows>div').find(row=>clean(row.textContent).includes('ตัวเลือกการจัดส่ง'));if(shippingRow){const b=shippingRow.querySelector('b');if(b)b.textContent=Number(data.shipping)===0?'ส่งฟรี':money(data.shipping)}
    const promoRow=$$('.box.rows>div').find(row=>/โปรโมชัน|คูปอง|WELCOME50/.test(clean(row.textContent)));if(promoRow){const a=promoRow.querySelector('span'),b=promoRow.querySelector('b');if(a)a.textContent=data.promotionName?`โปรโมชัน: ${data.promotionName}`:'โปรโมชันอัตโนมัติ';if(b)b.textContent=Number(data.discount)>0?`-${money(data.discount)}`:'ยังไม่มีส่วนลด'}
    box.innerHTML='';
    for(const [label,value,cls] of [['ยอดสินค้า',money(data.subtotal),''],['ส่วนลด',Number(data.discount)>0?`-${money(data.discount)}`:money(0),''],['ค่าจัดส่ง',Number(data.shipping)===0?'ส่งฟรี':money(data.shipping),''],['ยอดที่ระบบจะสร้างออเดอร์',money(data.total),'total']]){const row=document.createElement('div');row.className=`kch-server-quote-row ${cls}`;const s=document.createElement('span');s.textContent=label;const b=document.createElement('b');b.textContent=value;row.append(s,b);box.appendChild(row)}
    const note=document.createElement('p');note.className='kch-server-quote-note';note.textContent='ราคา สต๊อก โปรโมชัน และค่าจัดส่งคำนวณจากเซิร์ฟเวอร์ก่อนสร้างคำสั่งซื้อจริง';box.appendChild(note);
  }

  async function refreshQuote(force=false){
    const items=cartItems(),key=cartSignature();if(!items.length){state.quote=null;state.quoteKey='';setQuoteUI(null,'ไม่มีสินค้าในตะกร้าที่พร้อมสร้างคำสั่งซื้อ');return null}
    if(!force&&state.quote&&state.quoteKey===key)return state.quote;if(state.quoteBusy)return state.quote;
    state.quoteBusy=true;try{const data=await api('/api/checkout-quote',{method:'POST',body:JSON.stringify({items})});state.quote=data;state.quoteKey=key;setQuoteUI(data);return data}catch(e){state.quote=null;state.quoteKey='';setQuoteUI(null,errorText(e));return null}finally{state.quoteBusy=false}
  }

  function errorText(e){
    const code=e?.data?.error||e?.message||'request_failed';
    if(code==='customer_details_required')return 'กรุณากรอกชื่อ เบอร์โทร ที่อยู่ อำเภอ/เขต จังหวัด และรหัสไปรษณีย์ให้ครบ';
    if(code==='insufficient_stock')return 'จำนวนสินค้าที่เลือกมากกว่าสต๊อกที่พร้อมขาย กรุณาปรับจำนวนแล้วลองใหม่';
    if(code==='product_unavailable'||code==='variant_unavailable')return 'มีสินค้าบางรายการไม่พร้อมจำหน่ายแล้ว กรุณากลับไปตรวจตะกร้า';
    if(code==='order_intake_closed')return 'ระบบรับคำสั่งซื้อถูกปิดชั่วคราว กรุณาลองใหม่ภายหลัง';
    if(code==='database_not_bound'||code==='catalog_schema_not_ready')return 'ระบบร้านค้ายังเชื่อมฐานข้อมูลไม่พร้อม จึงยังไม่สร้างคำสั่งซื้อ';
    return 'ไม่สามารถสร้างคำสั่งซื้อจริงได้ในขณะนี้ ระบบจะไม่สร้างเลขออเดอร์จำลอง กรุณาลองใหม่อีกครั้ง';
  }

  function checkoutData(){
    return {name:clean($('#customer-name')?.value),phone:digits($('#customer-phone')?.value),addressLine:clean($('#customer-address')?.value),subdistrict:clean($('#customer-subdistrict')?.value),district:clean($('#customer-district')?.value),province:clean($('#customer-province')?.value),postalCode:digits($('#customer-postal')?.value)};
  }
  function validateDetails(d){return d.name.length>=2&&d.phone.length>=9&&d.addressLine.length>=5&&d.district.length>=2&&d.province.length>=2&&/^\d{5}$/.test(d.postalCode)}
  function idempotencyKey(signature){const storageKey=`kch-order-idempotency:${signature}`;let key='';try{key=sessionStorage.getItem(storageKey)||''}catch{}if(!key){key=`web-${Date.now()}-${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`;try{sessionStorage.setItem(storageKey,key)}catch{}}return {storageKey,key}}

  async function resolveMember(){
    if(state.member!==null)return state.member;
    try{const r=await fetch('/api/customer/me',{credentials:'same-origin',headers:{Accept:'application/json'}});state.member=r.ok}catch{state.member=false}return state.member;
  }

  function decorateRealSuccess(data,phone){
    const root=$('.success')||$('#app');if(!root)return;
    let note=$('.kch-real-order-note',root);if(!note){note=document.createElement('div');note.className='kch-real-order-note';root.appendChild(note)}
    note.textContent=`คำสั่งซื้อ ${clean(data.orderNo)} ถูกสร้างในระบบจริงแล้ว ยอดคำสั่งซื้อ ${money(data.total)} • ชำระแบบเก็บเงินปลายทาง`;
    const track=$('[data-go="orders"]',root);if(track){track.dataset.kchServerOrder=clean(data.orderNo);track.textContent='ติดตามคำสั่งซื้อ'}
  }

  function renderRealSuccess(data,phone){
    state.lastOrder={orderNo:clean(data.orderNo),phone};
    try{localStorage.removeItem('kch-orders')}catch{}
    writeCart([]);state.quote=null;state.quoteKey='';
    try{if(typeof success==='function'){success({orderNo:data.orderNo,total:Number(data.total)||0,paymentMethod:'COD',paymentStatus:data.paymentStatus||'unpaid',status:data.status||'pending',createdAt:new Date().toISOString(),items:[]});decorateRealSuccess(data,phone);return}}catch{}
    try{if(typeof current!=='undefined')current='success'}catch{}
    const host=$('#app')||document.body;host.innerHTML='';const main=document.createElement('main');main.className='success';const h=document.createElement('h1');h.textContent='สั่งซื้อสำเร็จ';const p=document.createElement('p');p.textContent=`เลขที่คำสั่งซื้อ ${clean(data.orderNo)}`;const total=document.createElement('b');total.textContent=money(data.total);const button=document.createElement('button');button.type='button';button.dataset.go='orders';button.dataset.kchServerOrder=clean(data.orderNo);button.textContent='ติดตามคำสั่งซื้อ';main.append(h,p,total,button);host.appendChild(main);decorateRealSuccess(data,phone);
  }

  async function submitRealOrder(button){
    if(state.submitBusy)return;state.submitBusy=true;button.disabled=true;button.textContent='กำลังตรวจราคาและสต๊อก...';
    const err=$('#checkout-error');if(err)err.textContent='';
    try{
      const d=checkoutData();if(!validateDetails(d)){if(err)err.textContent=errorText({data:{error:'customer_details_required'}});return}
      await loadCatalog();const quote=await refreshQuote(true);if(!quote)throw new Error('quote_failed');
      const signature=cartSignature(),idem=idempotencyKey(signature),items=cartItems();
      const payload={customerName:d.name,phone:d.phone,address:{addressLine:d.addressLine,subdistrict:d.subdistrict,district:d.district,province:d.province,postalCode:d.postalCode},paymentMethod:'COD',idempotencyKey:idem.key,items};
      const couponInput=$('[name="couponCode"],#coupon-code');if(couponInput&&clean(couponInput.value))payload.couponCode=clean(couponInput.value).toUpperCase();
      button.textContent='กำลังสร้างคำสั่งซื้อจริง...';
      const data=await api('/api/orders',{method:'POST',body:JSON.stringify(payload)});if(!data?.ok||!data?.orderNo)throw new Error('order_failed');
      try{sessionStorage.removeItem(idem.storageKey)}catch{}renderRealSuccess(data,d.phone);
    }catch(e){if(err)err.textContent=errorText(e);else setQuoteUI(null,errorText(e))}finally{state.submitBusy=false;if(button.isConnected){button.disabled=false;button.textContent='ยืนยันคำสั่งซื้อแบบเก็บเงินปลายทาง'}}
  }

  function openGuestTracker(orderNo='',phone=''){
    const trigger=$('.kch-v137-care-trigger');if(trigger){trigger.click();setTimeout(()=>{const track=$('.kch-v138-track-action');track?.click();setTimeout(()=>{const form=$('.kch-v138-tracker-form');if(form){if(orderNo)form.elements.orderNo.value=orderNo;if(phone)form.elements.phone.value=phone}},20)},20);return}
    const u=new URL('/support.html',location.origin);u.searchParams.set('category','order');u.searchParams.set('subject','ติดตามคำสั่งซื้อ');if(orderNo)u.searchParams.set('orderNo',orderNo);location.href=`${u.pathname}${u.search}`;
  }
  async function openOrders(orderNo='',phone=''){
    const member=await resolveMember();if(member){location.href='/my-orders.html';return}openGuestTracker(orderNo,phone);
  }
  function openCheckout(){const rows=readCart();if(!rows.length)return false;try{if(typeof checkout==='function'){checkout();setTimeout(schedule,30);return true}}catch{}return false}
  function openCart(){try{if(typeof cartPage==='function'){cartPage();return true}}catch{}return false}

  function schedule(){cancelAnimationFrame(schedule.raf||0);schedule.raf=requestAnimationFrame(()=>{injectStyle();const form=ensureAddressFields();if(form)refreshQuote();});}
  schedule.raf=0;

  document.addEventListener('click',e=>{
    const place=e.target.closest?.('[data-place]');if(place&&$('.checkout-form')){e.preventDefault();e.stopImmediatePropagation();submitRealOrder(place);return}
    const orders=e.target.closest?.('[data-go="orders"]');if(orders){e.preventDefault();e.stopImmediatePropagation();openOrders(orders.dataset.kchServerOrder||state.lastOrder?.orderNo||'',state.lastOrder?.phone||'')}
  },true);
  document.addEventListener('input',e=>{if(e.target?.closest?.('.checkout-form')&&['customer-district','customer-province','customer-postal'].includes(e.target.id))schedule()},{passive:true});
  const observer=new MutationObserver(records=>{if(records.some(r=>r.addedNodes?.length||r.removedNodes?.length))schedule()});observer.observe(document.documentElement,{childList:true,subtree:true});

  window.KCHCommerceIntegrity={loadCatalog,addCanonicalProduct,refreshQuote,openOrders,openCheckout,openCart,getCatalog:()=>state.catalog.slice(),getCart:()=>readCart().slice()};
  loadCatalog().catch(()=>{});resolveMember().catch(()=>{});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
