/* KHONCHAIHERB Commerce v1.2 — variants, warehouse, packing verification, purchasing and product profit */
let V12_PRODUCT_DETAIL=null,V12_SELECTED_VARIANT=null,V12_PO_DRAFT=[];

const v12ProductBase=product;
product=function(p){
  V12_PRODUCT_DETAIL=null;V12_SELECTED_VARIANT=null;v12ProductBase(p);
  const addBtn=document.querySelector('[data-add]'),buyBtn=document.querySelector('[data-buy]');
  if(addBtn)addBtn.disabled=true;if(buyBtn)buyBtn.disabled=true;
  v12LoadProductDetail(p);
};

async function v12LoadProductDetail(p){
  try{
    const d=await api(`/api/product-detail?slug=${encodeURIComponent(p.slug)}`),x=d.product;V12_PRODUCT_DETAIL=x;
    const variants=x.variants||[],detail=document.querySelector('.detail'),buybar=document.querySelector('.buybar');
    const available=Number(x.available_stock||0),hasVariants=variants.length>0;
    if(detail){
      const stats=detail.querySelector('.stats');if(stats)stats.lastElementChild.textContent=`พร้อมขาย ${hasVariants?variants.reduce((s,v)=>s+Number(v.available_stock||0),0):available}`;
      if(hasVariants&&!document.querySelector('.v12-variants'))detail.insertAdjacentHTML('beforeend',`<section class="v12-variants"><div class="v12-variant-head"><b>เลือกรูปแบบสินค้า</b><small>เลือกก่อนเพิ่มลงตะกร้า</small></div><div class="v12-variant-grid">${variants.map(v=>`<button data-v12-variant="${v.id}" class="${Number(v.available_stock)<=0?'soldout':''}" ${Number(v.available_stock)<=0?'disabled':''}><span>${esc(v.option_value)}</span><b>${M(v.price)}</b><small>${Number(v.available_stock)>0?`เหลือ ${v.available_stock}`:'หมด'}</small></button>`).join('')}</div></section>`);
    }
    if(buybar){
      const a=buybar.querySelector('[data-add]'),b=buybar.querySelector('[data-buy]');
      if(a){a.removeAttribute('data-add');a.setAttribute('data-v12-add',String(p.id));a.disabled=hasVariants||available<=0}
      if(b){b.removeAttribute('data-buy');b.setAttribute('data-v12-buy',String(p.id));b.disabled=hasVariants||available<=0;b.textContent=hasVariants?'เลือกรูปแบบก่อน':available>0?'ซื้อเลย':'สินค้าหมด'}
    }
    const gallery=x.media||[];
    if(gallery.length){
      const large=document.querySelector('.visual.large');if(large)large.innerHTML=`<img src="${esc(gallery[0].url)}" alt="${esc(gallery[0].alt_text||x.name)}" loading="eager">`;
    }
  }catch{
    const a=document.querySelector('[data-v12-add]')||document.querySelector('[data-add]'),b=document.querySelector('[data-v12-buy]')||document.querySelector('[data-buy]');
    if(a)a.disabled=Number(p.stock)<=0;if(b)b.disabled=Number(p.stock)<=0;
  }
}

function v12SelectVariant(id){
  const v=V12_PRODUCT_DETAIL?.variants?.find(x=>Number(x.id)===Number(id));if(!v)return;
  V12_SELECTED_VARIANT=v;
  document.querySelectorAll('[data-v12-variant]').forEach(b=>b.classList.toggle('active',Number(b.dataset.v12Variant)===Number(id)));
  const price=document.querySelector('.pprice b');if(price)price.textContent=M(v.price);
  const stats=document.querySelector('.detail .stats');if(stats?.lastElementChild)stats.lastElementChild.textContent=`พร้อมขาย ${v.available_stock}`;
  const a=document.querySelector('[data-v12-add]'),b=document.querySelector('[data-v12-buy]');
  if(a)a.disabled=Number(v.available_stock)<=0;if(b){b.disabled=Number(v.available_stock)<=0;b.textContent=Number(v.available_stock)>0?'ซื้อเลย':'สินค้าหมด'}
}

function v12CartKey(x){return `${Number(x.id)}:${Number(x.variantId)||0}`}
function v12AddProduct(p,q=1,variant=null){
  const available=Math.max(0,Number(variant?.available_stock??p.stock??0));if(!p||available<=0)return;
  const item=variant?{...p,variantId:Number(variant.id),variantLabel:`${variant.option_name}: ${variant.option_value}`,sku:variant.sku||p.sku,price:Number(variant.price),old:Number(variant.compare_at_price??variant.price),stock:available,name:`${p.name} (${variant.option_value})`}:{...p,variantId:null};
  const key=v12CartKey(item),hit=cart.find(x=>v12CartKey(x)===key),next=Math.min(available,(hit?.qty||0)+q);
  if(hit){Object.assign(hit,item,{qty:next})}else cart.push({...item,qty:Math.min(q,available)});
  save();document.querySelectorAll('.badge').forEach(x=>x.textContent=count());toast('เพิ่มลงตะกร้าแล้ว');
}
function v12AddSelected(productId,buyNow=false){
  const p=PRODUCTS.find(x=>x.id===Number(productId));if(!p)return;
  if(V12_PRODUCT_DETAIL?.variants?.length&&!V12_SELECTED_VARIANT){toast('กรุณาเลือกรูปแบบสินค้า');return}
  v12AddProduct(p,qty,V12_SELECTED_VARIANT);
  if(buyNow){current='cart';cartPage();setTimeout(()=>checkout(),0)}
}

const v12AddBase=add;
add=function(id,q=1){if(current==='product'&&V12_PRODUCT_DETAIL?.variants?.length){v12AddSelected(id,false);return}v12AddBase(id,q)};

cartPage=function(){
  current='cart';const sum=subtotal(),ship=shippingInfo(sum);
  app.innerHTML=chrome(`<main class="page"><h1 class="page-title">ตะกร้าสินค้า</h1>${cart.length?`<section class="shipping-progress"><div><b>${ship.remaining?`อีก ${M(ship.remaining)} รับสิทธิ์ส่งฟรี`:'คุณได้รับสิทธิ์ส่งฟรีแล้ว'}</b><small>ส่งฟรีเมื่อยอดสินค้าครบ ${M(ship.threshold)}</small></div><div class="progress"><i style="width:${ship.progress}%"></i></div></section>`:''}${cart.length?cart.map((x,i)=>`<div class="cartrow">${visual(x)}<div class="grow"><b>${esc(x.name)}</b><small>${esc(x.variantLabel||x.cat||'')}</small><strong>${M(x.price)}</strong><div class="cart-controls"><div class="qty"><button data-v12-cartqty="${i}" data-delta="-1">−</button><b>${x.qty}</b><button data-v12-cartqty="${i}" data-delta="1">+</button></div><button class="remove" data-v12-remove="${i}" aria-label="ลบสินค้า">${I('delete')}</button></div></div></div>`).join(''):`<div class="empty">${I('shopping_bag')}<h2>ยังไม่มีสินค้าในตะกร้า</h2><button class="primary" data-go="home">เลือกซื้อสินค้า</button></div>`}${cart.length?`<section class="voucher-box"><div class="voucher-title">${I('confirmation_number')}<b>คูปองร้านค้า</b></div>${claimed.length?claimed.map(code=>{const c=COUPONS.find(x=>x.code===code)||{code,label:code,min_spend:0};return `<label class="voucher-choice"><input type="radio" name="coupon" value="${esc(code)}" ${activeCoupon===code?'checked':''}><span><b>${esc(c.label||code)}</b><small>${esc(code)} • ขั้นต่ำ ${M(c.min_spend||0)}</small></span></label>`}).join(''):`<p class="sub">ยังไม่มีคูปองที่เก็บไว้</p>`}${activeCoupon?`<button class="clear-coupon" data-clear-coupon>ไม่ใช้คูปอง</button>`:''}</section><div class="summary"><div><span>ยอดสินค้า</span><b>${M(sum)}</b></div><div><span>ค่าจัดส่งโดยประมาณ</span><b>${ship.ship?M(ship.ship):'ฟรี'}</b></div></div><div class="sticky-pay"><span>รวมโดยประมาณ <b>${M(sum+ship.ship)}</b></span><button class="primary" data-go="checkout">ชำระเงิน (${count()})</button></div>`:''}</main>`);bind();
};

placeOrder=async function(){
  const el=id=>document.querySelector(id),name=el('#customer-name')?.value.trim()||'',phone=el('#customer-phone')?.value.trim()||'',addressLine=el('#customer-address')?.value.trim()||'',district=el('#customer-district')?.value.trim()||'',province=el('#customer-province')?.value.trim()||'',postalCode=el('#customer-postal')?.value.trim()||'',pay=document.querySelector('input[name=pay]:checked')?.value||'COD',marketingConsent=Boolean(el('#marketing-consent')?.checked),err=el('#checkout-error');
  if(name.length<2||phone.replace(/\D/g,'').length<9||addressLine.length<5||district.length<2||province.length<2||!/^[0-9]{5}$/.test(postalCode)){if(err)err.textContent='กรุณากรอกชื่อ โทรศัพท์ ที่อยู่ อำเภอ/เขต จังหวัด และรหัสไปรษณีย์ให้ครบ';return}
  if(err)err.textContent='';const btn=document.querySelector('[data-place]');if(btn){btn.disabled=true;btn.textContent='กำลังยืนยันราคาและกันสต๊อก...'}
  const attribution=typeof v06CurrentAttr==='function'?v06CurrentAttr():{source:'shop',creatorId:null,contentId:null};
  const payload={idempotencyKey:checkoutKey,customerName:name,phone,marketingConsent,address:{addressLine,district,province,postalCode},paymentMethod:pay,couponCode:activeCoupon,items:cart.map(x=>({id:x.id,variantId:x.variantId||null,qty:x.qty})),attribution:{source:attribution.source,creatorId:attribution.creatorId,contentId:attribution.contentId}};
  try{
    const data=await api('/api/orders',{method:'POST',body:JSON.stringify(payload)});
    const record={orderNo:data.orderNo,total:Number(data.total||0),subtotal:Number(data.subtotal||0),discount:Number(data.discount||0),shipping:Number(data.shipping||0),paymentMethod:pay,paymentStatus:data.paymentStatus||'unpaid',status:data.status||'pending',fulfillmentStatus:data.fulfillmentStatus||'pending',createdAt:new Date().toISOString(),phone,source:data.attribution?.source||attribution.source,items:cart.map(x=>({id:x.id,variantId:x.variantId||null,name:x.name,qty:x.qty,price:x.price}))};
    ordersLocal=ordersLocal.filter(o=>o.orderNo!==record.orderNo);ordersLocal.unshift(record);saveOrders();cart=[];save();checkoutKey='';if(typeof v06ClearAttr==='function')v06ClearAttr();success(record);
  }catch(e){if(err)err.textContent=e.data?.error==='variant_unavailable'?'รูปแบบสินค้านี้ไม่พร้อมจำหน่าย':orderErrorMessage(e);if(btn){btn.disabled=false;btn.textContent='สั่งซื้อสินค้า'}}
};

const v12SellerBase=sellerDashboard;
sellerDashboard=async function(token){
  await v12SellerBase(token);if(document.querySelector('.v12-warehouse'))return;
  const main=document.querySelector('.sellerMain');if(!main)return;
  main.insertAdjacentHTML('beforeend',`<section class="v12-warehouse"><div class="head"><div><h3>Warehouse & Customer Experience</h3><p>รับสินค้าเข้า ตรวจแพ็ก ฉลากจัดส่ง คืนเงิน และกำไรรายสินค้า</p></div><span>v1.2</span></div><div class="v12-tools"><button data-v12-warehouse>${I('conveyor_belt')}<b>Warehouse / PO</b><small>Low stock • Purchase Order • Receiving</small></button><button data-v12-pack-verify>${I('barcode_scanner')}<b>Packing Verification</b><small>สแกน SKU / Barcode ก่อนส่ง</small></button><button data-v12-label>${I('local_shipping')}<b>Shipping Label</b><small>พิมพ์จากเลขพัสดุจริง</small></button><button data-v12-profit>${I('query_stats')}<b>Product Profit</b><small>ยอดขาย • COGS • กำไรขั้นต้น</small></button><button data-v12-return-refund>${I('assignment_return')}<b>Return → Refund</b><small>สร้างคำขอคืนเงินจากเคสที่อนุมัติ</small></button></div></section>`);
};

async function v12WarehouseModal(){
  try{
    const [d,c]=await Promise.all([v10AdminFetch('/api/admin/warehouse'),v10AdminFetch('/api/admin/products-manage')]),products=c.products||[],variants=c.variants||[];
    const options=products.flatMap(p=>[{value:`${p.id}:0`,label:`${p.name} • ${p.sku||'-'}`},...variants.filter(v=>Number(v.product_id)===Number(p.id)).map(v=>({value:`${p.id}:${v.id}`,label:`${p.name} • ${v.option_value} • ${v.sku}`}))]);
    modal(`<div class="v12-modal"><div class="v12-title"><div><h2>Warehouse / Purchase Order</h2><p>รับสินค้าเข้าพร้อมปรับต้นทุนเฉลี่ยและ Inventory Movement</p></div><button data-close-modal>${I('close')}</button></div><section class="v12-low"><h3>Low stock</h3>${[...(d.lowStock?.products||[]).map(x=>({...x,label:x.name,sku:x.sku})),...(d.lowStock?.variants||[]).map(x=>({...x,label:`${x.product_name} • ${x.option_value}`,sku:x.sku}))].slice(0,10).map(x=>`<div><span><b>${esc(x.label)}</b><small>${esc(x.sku||'-')}</small></span><strong>${x.available}</strong><small>เตือน ≤ ${x.low_stock_threshold}</small></div>`).join('')||'<p class="sub">ไม่มีสินค้าต่ำกว่าเกณฑ์</p>'}</section><section><h3>Purchase Orders</h3><div class="v12-po-list">${(d.purchaseOrders||[]).map(po=>`<article><span><b>${esc(po.po_no)}</b><small>${esc(po.supplier_name)} • ${po.qty_received}/${po.qty_ordered} ชิ้น • ${M(po.order_cost)}</small></span><strong>${esc(po.status)}</strong>${!['received','cancelled'].includes(po.status)?`<button data-v12-receive-po="${esc(po.po_no)}">รับสินค้า</button>`:''}</article>`).join('')||'<p class="sub">ยังไม่มี PO</p>'}</div></section><section class="v12-po-create"><h3>สร้าง Purchase Order</h3><div class="formgrid"><label>Supplier<input id="v12-po-supplier"></label><label>คาดว่าจะได้รับ<input id="v12-po-expected" type="date"></label></div><div class="formgrid"><label>สินค้า<select id="v12-po-item">${options.map(o=>`<option value="${o.value}">${esc(o.label)}</option>`).join('')}</select></label><label>จำนวน<input id="v12-po-qty" type="number" min="1" value="1"></label></div><div class="formgrid"><label>ต้นทุน/หน่วย<input id="v12-po-cost" type="number" min="0" step="0.01"></label><label>หมายเหตุ<input id="v12-po-note"></label></div><button class="secondary" data-v12-po-add-line>เพิ่มรายการ</button><div id="v12-po-draft">${v12PoDraftHtml()}</div><button class="primary" data-v12-po-submit>สร้าง PO</button></section><button class="secondary" data-close-modal>ปิด</button></div>`);
  }catch{toast('โหลด Warehouse ไม่สำเร็จ')}
}
function v12PoDraftHtml(){return V12_PO_DRAFT.length?V12_PO_DRAFT.map((x,i)=>`<div class="v12-po-draft-row"><span>${esc(x.label)} • ${x.qty} ชิ้น • ${M(x.unitCost)}</span><button data-v12-po-remove="${i}">${I('delete')}</button></div>`).join(''):'<p class="sub">ยังไม่มีรายการใน PO</p>'}
function v12PoAddLine(){
  const sel=document.querySelector('#v12-po-item'),[productId,variantId]=String(sel?.value||'').split(':').map(Number),qty=Math.max(1,Number(document.querySelector('#v12-po-qty')?.value)||1),unitCost=Math.max(0,Number(document.querySelector('#v12-po-cost')?.value)||0),label=sel?.selectedOptions?.[0]?.textContent||'สินค้า';
  V12_PO_DRAFT.push({productId,variantId:variantId||null,qty,unitCost,label});const out=document.querySelector('#v12-po-draft');if(out)out.innerHTML=v12PoDraftHtml();
}
async function v12PoSubmit(){
  const supplierName=document.querySelector('#v12-po-supplier')?.value.trim()||'',expectedAt=document.querySelector('#v12-po-expected')?.value||null,note=document.querySelector('#v12-po-note')?.value||'';
  if(supplierName.length<2||!V12_PO_DRAFT.length){toast('กรุณาระบุ Supplier และรายการสินค้า');return}
  try{const d=await v10AdminFetch('/api/admin/warehouse',{method:'POST',body:JSON.stringify({action:'create_po',supplierName,expectedAt,note,items:V12_PO_DRAFT})});V12_PO_DRAFT=[];toast(`สร้าง ${d.poNo} แล้ว`);v12WarehouseModal()}catch(e){toast(e.data?.error==='invalid_purchase_order_item'?'ตรวจจำนวนและต้นทุนสินค้า':'สร้าง PO ไม่สำเร็จ')}
}
async function v12ReceivePo(poNo){
  try{const d=await v10AdminFetch(`/api/admin/warehouse?poNo=${encodeURIComponent(poNo)}`),po=d.detail;if(!po)return;
    modal(`<div class="v12-modal"><h2>รับสินค้า ${esc(poNo)}</h2><p>${esc(po.supplier_name)} • สถานะ ${esc(po.status)}</p><label>เลขอ้างอิงใบส่งของ/ใบรับ<input id="v12-receipt-ref"></label><div class="v12-receive-list">${(po.items||[]).map(i=>{const remain=Number(i.qty_ordered)-Number(i.qty_received);return `<article><span><b>${esc(i.product_name)}${i.option_value?` • ${esc(i.option_value)}`:''}</b><small>${esc(i.sku||'-')} • รับแล้ว ${i.qty_received}/${i.qty_ordered} • ต้นทุน ${M(i.unit_cost)}</small></span><input data-v12-receive-item="${i.id}" type="number" min="0" max="${remain}" value="${remain}"></article>`}).join('')}</div><button class="primary" data-v12-receive-submit="${esc(poNo)}">บันทึกรับสินค้า</button><button class="secondary" data-v12-warehouse>กลับ</button></div>`);
  }catch{toast('โหลด PO ไม่สำเร็จ')}
}
async function v12ReceiveSubmit(poNo){
  const receiptRef=document.querySelector('#v12-receipt-ref')?.value.trim()||'',items=[...document.querySelectorAll('[data-v12-receive-item]')].map(x=>({itemId:Number(x.dataset.v12ReceiveItem),qty:Number(x.value)||0})).filter(x=>x.qty>0);
  if(receiptRef.length<3||!items.length){toast('กรุณาระบุเลขอ้างอิงและจำนวนที่รับ');return}
  try{await v10AdminFetch('/api/admin/warehouse',{method:'POST',body:JSON.stringify({action:'receive_po',poNo,receiptRef,items})});toast('รับสินค้าเข้าสต๊อกแล้ว');v12WarehouseModal()}catch(e){toast(e.data?.error==='receive_exceeds_remaining'?'จำนวนรับเกินยอดคงเหลือ':'รับสินค้าไม่สำเร็จ')}
}

async function v12PackingModal(orderNo=''){
  modal(`<div class="v12-modal"><h2>Packing Verification</h2><p>สแกน SKU หรือ Barcode ให้ครบก่อนส่ง</p><div class="formgrid"><label>เลขออเดอร์<input id="v12-pack-order" value="${esc(orderNo)}"></label><label>SKU / Barcode<input id="v12-pack-code" autocomplete="off"></label></div><button class="primary" data-v12-pack-load>โหลดออเดอร์</button><div id="v12-pack-result"></div><button class="secondary" data-close-modal>ปิด</button></div>`);
  if(orderNo)v12PackingLoad();
}
async function v12PackingLoad(){
  const orderNo=document.querySelector('#v12-pack-order')?.value.trim()||'';if(!orderNo)return;
  try{const d=await v10AdminFetch(`/api/admin/packing-verify?orderNo=${encodeURIComponent(orderNo)}`);v12RenderPacking(d)}catch{toast('ไม่พบออเดอร์หรือโหลดรายการไม่ได้')}
}
function v12RenderPacking(d){
  const out=document.querySelector('#v12-pack-result');if(!out)return;
  out.innerHTML=`<div class="v12-pack-status ${d.complete?'complete':''}"><b>${d.complete?'ตรวจครบแล้ว':'กำลังตรวจสินค้า'}</b><small>${esc(d.order.order_no)} • ${esc(d.order.customer_name||'')}</small></div>${(d.items||[]).map(i=>`<article class="v12-pack-item ${Number(i.verified_qty)>=Number(i.qty)?'ok':''}"><span><b>${esc(i.product_name)}</b><small>${esc(i.sku||'-')} ${i.barcode?`• ${esc(i.barcode)}`:''}</small></span><strong>${i.verified_qty}/${i.qty}</strong></article>`).join('')}<button class="primary" data-v12-pack-scan="${esc(d.order.order_no)}">สแกน 1 ชิ้น</button>`;
  document.querySelector('#v12-pack-code')?.focus();
}
async function v12PackingScan(orderNo){
  const code=document.querySelector('#v12-pack-code')?.value.trim()||'';if(!code){toast('สแกนหรือกรอก SKU / Barcode');return}
  try{const d=await v10AdminFetch('/api/admin/packing-verify',{method:'POST',body:JSON.stringify({action:'scan',orderNo,code})});document.querySelector('#v12-pack-code').value='';v12RenderPacking(d)}catch(e){toast(e.data?.error==='code_not_in_order'?'รหัสนี้ไม่อยู่ในออเดอร์':e.data?.error==='item_already_complete'?'รายการนี้ครบแล้ว':'ตรวจสินค้าไม่สำเร็จ')}
}

async function v12LabelModal(){
  const orderNo=prompt('เลขคำสั่งซื้อที่มีเลขพัสดุจริง','')||'';if(!orderNo)return;
  try{const d=await v10AdminFetch(`/api/admin/shipping-label?orderNo=${encodeURIComponent(orderNo)}`),x=d.label,a=x.address||{},w=window.open('','_blank');if(!w){toast('เบราว์เซอร์บล็อกหน้าพิมพ์');return}
    w.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(x.orderNo)}</title><style>body{font-family:Arial,sans-serif;margin:0;padding:18px}.label{border:2px solid #111;padding:18px;max-width:720px}.track{font-size:28px;font-weight:800;letter-spacing:1px}.cod{font-size:24px;font-weight:800;border:2px solid #111;padding:8px;display:inline-block}h1{font-size:18px}</style></head><body><div class="label"><h1>KHONCHAIHERB • ${esc(x.carrier||'ขนส่ง')}</h1><div class="track">${esc(x.trackingNo)}</div><hr><b>ผู้รับ: ${esc(x.customerName)}</b><p>${esc(x.phone)}<br>${esc(a.addressLine||'')} ${esc(a.district||'')} ${esc(a.province||'')} ${esc(a.postalCode||'')}</p><p>Order: ${esc(x.orderNo)} • น้ำหนัก ${Number(x.totalWeightGrams||0)} กรัม</p>${Number(x.codAmount)>0?`<div class="cod">COD ${M(x.codAmount)}</div>`:''}</div><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()
  }catch(e){toast(e.data?.error==='tracking_required'?'ต้องมีเลขพัสดุจริงก่อนพิมพ์ฉลาก':'สร้างฉลากไม่สำเร็จ')}
}

async function v12ProfitModal(){
  const to=new Date().toISOString().slice(0,10),from=new Date(Date.now()-29*86400000).toISOString().slice(0,10);
  try{const d=await v10AdminFetch(`/api/admin/product-profit?from=${from}&to=${to}`);v12RenderProfit(d)}catch{toast('โหลดกำไรรายสินค้าไม่สำเร็จ')}
}
function v12RenderProfit(d){
  modal(`<div class="v12-modal"><div class="v12-title"><div><h2>Product Profit</h2><p>${esc(d.note||'')}</p></div><button data-close-modal>${I('close')}</button></div><div class="formgrid"><label>จาก<input id="v12-profit-from" type="date" value="${esc(d.from)}"></label><label>ถึง<input id="v12-profit-to" type="date" value="${esc(d.to)}"></label></div><button class="secondary" data-v12-profit-reload>คำนวณใหม่</button><div class="v12-profit-kpi"><span>ยอดขายสุทธิ <b>${M(d.totals.netSales)}</b></span><span>COGS <b>${M(d.totals.cogs)}</b></span><span>กำไรขั้นต้น <b>${M(d.totals.grossProfit)}</b></span><span>Margin <b>${d.totals.marginPct}%</b></span></div><div class="v12-profit-list">${(d.rows||[]).map(x=>`<article><span><b>${esc(x.name)}</b><small>${esc(x.sku||'-')} • ${x.units} ชิ้น</small></span><div><small>Net ${M(x.net_sales)}</small><small>COGS ${M(x.cogs)}</small><strong>${M(x.gross_profit)} • ${x.margin_pct}%</strong></div></article>`).join('')||'<p class="sub">ช่วงนี้ยังไม่มียอดที่ชำระสำเร็จ</p>'}</div><button class="secondary" data-close-modal>ปิด</button></div>`);
}
async function v12ProfitReload(){const from=document.querySelector('#v12-profit-from')?.value,to=document.querySelector('#v12-profit-to')?.value;try{v12RenderProfit(await v10AdminFetch(`/api/admin/product-profit?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`))}catch{toast('คำนวณไม่สำเร็จ')}}

async function v12ReturnRefundModal(){
  try{const d=await v10AdminFetch('/api/admin/returns?status=approved');modal(`<div class="v12-modal"><h2>Return → Refund</h2><p>สร้างคำขอคืนเงินเท่านั้น การจ่ายเงินจริงยังต้องยืนยันด้วยเลขอ้างอิงใน Refund Ledger</p><div class="v12-return-refund">${(d.requests||[]).map(r=>`<article><span><b>${esc(r.order_no)} • ${esc(r.product_name)}</b><small>${r.qty} ชิ้น • ${esc(r.customer_name)}</small></span><button data-v12-create-refund="${r.id}">สร้างคำขอคืนเงิน</button></article>`).join('')||'<p class="sub">ไม่มีเคสที่อนุมัติรอสร้าง Refund</p>'}</div><button class="secondary" data-close-modal>ปิด</button></div>`)}catch{toast('โหลดเคสคืนสินค้าไม่สำเร็จ')}
}
async function v12CreateRefund(id){
  const amount=Number(prompt('จำนวนเงินที่อนุมัติให้คืน (บาท)','')||0);if(amount<=0)return;
  try{const d=await v10AdminFetch('/api/admin/return-refund',{method:'POST',body:JSON.stringify({returnRequestId:Number(id),amount})});toast(d.reused?'มีคำขอ Refund นี้แล้ว':'สร้าง Refund Request แล้ว');v12ReturnRefundModal()}catch(e){toast(e.data?.error==='refund_exceeds_order_total'?'ยอดคืนเกินยอดออเดอร์':'สร้าง Refund Request ไม่สำเร็จ')}
}

function v12Bind(){
  if(window.__v12Bound)return;window.__v12Bound=true;
  document.addEventListener('click',e=>{
    const variant=e.target.closest('[data-v12-variant]');if(variant){e.preventDefault();e.stopPropagation();v12SelectVariant(variant.dataset.v12Variant);return}
    const add=e.target.closest('[data-v12-add]');if(add){e.preventDefault();e.stopImmediatePropagation();v12AddSelected(add.dataset.v12Add,false);return}
    const buy=e.target.closest('[data-v12-buy]');if(buy){e.preventDefault();e.stopImmediatePropagation();v12AddSelected(buy.dataset.v12Buy,true);return}
    const q=e.target.closest('[data-v12-cartqty]');if(q){e.preventDefault();e.stopImmediatePropagation();const i=Number(q.dataset.v12Cartqty),x=cart[i];if(x){x.qty=Math.max(1,Math.min(Number(x.stock||99),Number(x.qty)+Number(q.dataset.delta||0)));save();cartPage()}return}
    const rm=e.target.closest('[data-v12-remove]');if(rm){e.preventDefault();e.stopImmediatePropagation();cart.splice(Number(rm.dataset.v12Remove),1);save();cartPage();return}
    if(e.target.closest('[data-v12-warehouse]')){V12_PO_DRAFT=[];v12WarehouseModal();return}
    if(e.target.closest('[data-v12-po-add-line]')){v12PoAddLine();return}
    const pr=e.target.closest('[data-v12-po-remove]');if(pr){V12_PO_DRAFT.splice(Number(pr.dataset.v12PoRemove),1);const out=document.querySelector('#v12-po-draft');if(out)out.innerHTML=v12PoDraftHtml();return}
    if(e.target.closest('[data-v12-po-submit]')){v12PoSubmit();return}
    const rec=e.target.closest('[data-v12-receive-po]');if(rec){v12ReceivePo(rec.dataset.v12ReceivePo);return}
    const rs=e.target.closest('[data-v12-receive-submit]');if(rs){v12ReceiveSubmit(rs.dataset.v12ReceiveSubmit);return}
    if(e.target.closest('[data-v12-pack-verify]')){v12PackingModal();return}
    if(e.target.closest('[data-v12-pack-load]')){v12PackingLoad();return}
    const scan=e.target.closest('[data-v12-pack-scan]');if(scan){v12PackingScan(scan.dataset.v12PackScan);return}
    if(e.target.closest('[data-v12-label]')){v12LabelModal();return}
    if(e.target.closest('[data-v12-profit]')){v12ProfitModal();return}
    if(e.target.closest('[data-v12-profit-reload]')){v12ProfitReload();return}
    if(e.target.closest('[data-v12-return-refund]')){v12ReturnRefundModal();return}
    const refund=e.target.closest('[data-v12-create-refund]');if(refund){v12CreateRefund(refund.dataset.v12CreateRefund);return}
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target?.id==='v12-pack-code'){e.preventDefault();const btn=document.querySelector('[data-v12-pack-scan]');if(btn)v12PackingScan(btn.dataset.v12PackScan)}});
}

if(typeof v08Reorder==='function'){
  v08Reorder=async function(orderNo){
    try{
      const d=await v08CustomerFetch('/api/customer/reorder',{method:'POST',body:JSON.stringify({orderNo})}),available=(d.items||[]).filter(x=>x.available&&x.availableQty>0);
      if(!available.length){toast('สินค้าจากออเดอร์นี้ยังไม่มีรายการที่พร้อมขาย');return}
      for(const x of available){
        const p=normalizeProduct({id:x.product_id,slug:x.slug,sku:x.sku,name:x.name,description:x.description,category:x.category,price:x.price,compare_at_price:x.compare_at_price,rating:x.rating,sold_count:x.sold_count,stock:x.stock,featured:x.featured});
        const variant=x.variantId?{id:x.variantId,sku:x.sku,option_name:x.optionName||'รูปแบบ',option_value:x.optionValue||'',price:x.price,compare_at_price:x.compare_at_price,available_stock:x.stock}:null;
        v12AddProduct(p,Math.min(Number(x.requestedQty||1),Number(x.availableQty||1)),variant);
      }
      toast('เพิ่มสินค้าที่พร้อมขายลงตะกร้าแล้ว');cartPage();
    }catch{toast('ซื้อซ้ำไม่สำเร็จ')}
  };
}

v12Bind();
