/* KHONCHAIHERB Commerce v1.9 — unified server-first Order Center */
let V19_ORDER_CACHE=[];
let V19_ORDER_FETCHED_AT=0;
let V19_ORDER_MODE='device';
let V19_ORDER_NOTICE='';
let V19_ORDER_REQUEST=0;

const v19OrderNo=o=>String(o?.orderNo||o?.order_no||'');
const v19Created=o=>String(o?.createdAt||o?.created_at||'');
const v19Number=v=>Number(v||0);
function v19NormalizeItem(i){return {id:Number(i.id||i.product_id||0),product_id:Number(i.product_id||i.id||0),variantId:i.variantId??i.variant_id??null,variant_id:i.variant_id??i.variantId??null,sku:i.sku||'',name:i.name||i.product_name||'สินค้า KHONCHAIHERB',product_name:i.product_name||i.name||'สินค้า KHONCHAIHERB',qty:Number(i.qty||0),price:Number(i.price??i.unit_price??0),unit_price:Number(i.unit_price??i.price??0),line_total:Number(i.line_total??(Number(i.price??i.unit_price??0)*Number(i.qty||0))),optionName:i.optionName||i.option_name||null,optionValue:i.optionValue||i.option_value||null,slug:i.slug||''}}
function v19NormalizeOrder(o,source='device'){
  return {...o,source,orderNo:v19OrderNo(o),total:v19Number(o.total),subtotal:v19Number(o.subtotal),discountTotal:v19Number(o.discountTotal??o.discount_total),shippingTotal:v19Number(o.shippingTotal??o.shipping_total),paymentMethod:o.paymentMethod||o.payment_method||'COD',paymentStatus:o.paymentStatus||o.payment_status||'unpaid',fulfillmentStatus:o.fulfillmentStatus||o.fulfillment_status||'pending',createdAt:v19Created(o),trackingNo:o.trackingNo||o.tracking_no||'',carrier:o.carrier||'',items:(o.items||[]).map(v19NormalizeItem),shipmentEvents:o.shipmentEvents||[],orderEvents:o.orderEvents||o.events||[]};
}
function v19MergeOrders(serverOrders,deviceOrders){
  const out=[],seen=new Set();
  for(const raw of serverOrders||[]){const o=v19NormalizeOrder(raw,'account');if(!o.orderNo||seen.has(o.orderNo))continue;seen.add(o.orderNo);out.push(o)}
  for(const raw of deviceOrders||[]){const o=v19NormalizeOrder(raw,'device');if(!o.orderNo||seen.has(o.orderNo))continue;seen.add(o.orderNo);out.push(o)}
  return out.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))||String(b.orderNo).localeCompare(String(a.orderNo)));
}
async function v19LoadOrders(force=false){
  const me=await v08LoadMe(force).catch(()=>null),now=Date.now();
  if(me?.authenticated){
    if(!force&&V19_ORDER_MODE==='account'&&V19_ORDER_CACHE.length&&now-V19_ORDER_FETCHED_AT<20000)return {orders:V19_ORDER_CACHE,mode:V19_ORDER_MODE,notice:V19_ORDER_NOTICE};
    try{
      const d=await v08CustomerFetch('/api/customer/orders?limit=30');
      V19_ORDER_CACHE=v19MergeOrders(d.orders||[],ordersLocal);V19_ORDER_MODE='account';V19_ORDER_NOTICE='';V19_ORDER_FETCHED_AT=now;
      return {orders:V19_ORDER_CACHE,mode:V19_ORDER_MODE,notice:''};
    }catch{
      V19_ORDER_CACHE=v19MergeOrders([],ordersLocal);V19_ORDER_MODE='device';V19_ORDER_NOTICE='เชื่อมบัญชีไม่ได้ชั่วคราว กำลังแสดงออเดอร์ที่บันทึกในอุปกรณ์นี้';V19_ORDER_FETCHED_AT=now;
      return {orders:V19_ORDER_CACHE,mode:V19_ORDER_MODE,notice:V19_ORDER_NOTICE};
    }
  }
  V19_ORDER_CACHE=v19MergeOrders([],ordersLocal);V19_ORDER_MODE='device';V19_ORDER_NOTICE='';V19_ORDER_FETCHED_AT=now;return {orders:V19_ORDER_CACHE,mode:'device',notice:''};
}
function v19OrderMatches(o){const q=String(V18_ORDER_QUERY||'').trim().toLowerCase();if(!q)return true;return `${o.orderNo} ${(o.items||[]).map(i=>`${i.name} ${i.optionValue||''} ${i.sku||''}`).join(' ')}`.toLowerCase().includes(q)}
function v19OrderTabs(all){const defs=[['all','ทั้งหมด'],['unpaid','รอชำระ'],['packing','เตรียมส่ง'],['shipping','กำลังส่ง'],['completed','สำเร็จ'],['cancelled','ยกเลิก']];return defs.map(([k,label])=>{const n=k==='all'?all.length:all.filter(o=>v18OrderBucket(o)===k).length;return `<button data-order-filter="${k}" class="${v05OrderFilter===k?'active':''}">${label}<span>${n}</span></button>`}).join('')}
function v19VariantText(i){return i.optionValue?`${i.optionName?`${i.optionName}: `:''}${i.optionValue}`:''}
function v19OrderPhone(o){return String(o.phone||V08_ME?.customer?.phone||'')}
function v19OrderCard(o){
  const paid=['paid','cod_collected'].includes(String(o.paymentStatus)),items=o.items||[],first=items[0],p=PRODUCTS.find(x=>x.id===Number(first?.id||first?.product_id))||PRODUCTS[0],phone=v19OrderPhone(o),source=o.source==='account'?'บัญชีสมาชิก':'อุปกรณ์นี้';
  return `<section class="order v19-order" data-v19-order-card="${esc(o.orderNo)}"><div class="orderhead"><div><b>${esc(o.orderNo)}</b><small>${source}${o.createdAt?` • ${esc(String(o.createdAt).slice(0,16).replace('T',' '))}`:''}</small></div><span>${statusText(o)}</span></div>
    ${first?`<div class="mini">${visual(p)}<div><b>${esc(first.name)}</b>${v19VariantText(first)?`<small>${esc(v19VariantText(first))}</small>`:''}<small>${items.length} รายการ • ${esc(o.paymentMethod)}</small></div><strong>${M(o.total)}</strong></div>`:`<div class="mini"><div><b>คำสั่งซื้อ KHONCHAIHERB</b><small>${esc(o.paymentMethod)}</small></div><strong>${M(o.total)}</strong></div>`}
    <div class="track">${I(['shipping','shipped'].includes(String(o.fulfillmentStatus))?'local_shipping':'inventory_2')}<div><b>${statusText(o)}</b><small>สถานะการชำระ: ${paymentText(o.paymentStatus)}</small>${o.trackingNo?`<small>${esc(o.carrier||'ขนส่ง')} • ${esc(o.trackingNo)}</small>`:''}</div></div>
    <div class="orderactions"><button data-v19-order-detail="${esc(o.orderNo)}">รายละเอียด</button>${o.source==='device'&&phone?`<button data-v19-sync="${esc(o.orderNo)}">อัปเดต</button>`:''}${items.length?`<button data-v19-reorder="${esc(o.orderNo)}">ซื้ออีกครั้ง</button>`:''}${paid&&phone?`<button class="primary" data-receipt="${esc(o.orderNo)}" data-receipt-phone="${esc(phone)}">ใบเสร็จ</button>`:''}</div></section>`;
}
function v19Timeline(o){
  const rows=[];
  for(const e of o.shipmentEvents||[])rows.push({at:e.occurred_at||e.occurredAt||'',title:e.note||e.status||e.event_code||'อัปเดตการจัดส่ง',meta:[e.provider,e.status].filter(Boolean).join(' • ')});
  for(const e of o.orderEvents||[])rows.push({at:e.created_at||e.createdAt||'',title:e.note||e.event_type||e.eventType||'อัปเดตคำสั่งซื้อ',meta:e.event_type||e.eventType||''});
  rows.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  if(!rows.length&&o.createdAt)rows.push({at:o.createdAt,title:'สร้างคำสั่งซื้อแล้ว',meta:''});
  return rows;
}
function v19DetailHtml(o){
  const paid=['paid','cod_collected'].includes(String(o.paymentStatus)),phone=v19OrderPhone(o),timeline=v19Timeline(o);
  return `<div class="v19-detail"><div class="v19-detail-head"><div><small>คำสั่งซื้อ</small><h2>${esc(o.orderNo)}</h2></div><span>${statusText(o)}</span></div>
    <div class="v19-detail-items">${(o.items||[]).map(i=>`<div><span><b>${esc(i.name)}</b>${v19VariantText(i)?`<small>${esc(v19VariantText(i))}</small>`:''}${i.sku?`<small>SKU ${esc(i.sku)}</small>`:''}</span><span>x${i.qty}</span><strong>${M(i.line_total||i.price*i.qty)}</strong></div>`).join('')||'<p class="sub">ยังไม่มีรายละเอียดสินค้า</p>'}</div>
    <div class="v19-totals">${o.subtotal?`<div><span>ยอดสินค้า</span><b>${M(o.subtotal)}</b></div>`:''}${o.discountTotal?`<div><span>ส่วนลด</span><b>-${M(o.discountTotal)}</b></div>`:''}${o.shippingTotal?`<div><span>ค่าจัดส่ง</span><b>${M(o.shippingTotal)}</b></div>`:''}<div class="total"><span>ยอดรวม</span><b>${M(o.total)}</b></div></div>
    ${o.trackingNo?`<div class="v19-tracking">${I('local_shipping')}<div><b>${esc(o.carrier||'ขนส่ง')}</b><span>${esc(o.trackingNo)}</span></div><button data-v19-copy-tracking="${esc(o.trackingNo)}">คัดลอก</button></div>`:''}
    <section class="v19-timeline"><h3>การติดตามคำสั่งซื้อ</h3>${timeline.map((e,i)=>`<div class="v19-timeline-row ${i?'':'latest'}"><i></i><span><b>${esc(e.title)}</b>${e.meta?`<small>${esc(e.meta)}</small>`:''}<small>${esc(e.at||'')}</small></span></div>`).join('')}</section>
    <div class="v19-detail-actions">${(o.items||[]).length?`<button data-v19-reorder="${esc(o.orderNo)}">ซื้ออีกครั้ง</button>`:''}${paid&&phone?`<button class="primary" data-receipt="${esc(o.orderNo)}" data-receipt-phone="${esc(phone)}">ใบเสร็จ</button>`:''}<button data-close-modal>ปิด</button></div></div>`;
}
function v19FindOrder(no){return V19_ORDER_CACHE.find(o=>o.orderNo===String(no))||null}
async function v19ResolveDetail(no){
  const local=v19FindOrder(no);if(!local)return null;if(local.source==='account')return local;
  const phone=v19OrderPhone(local);if(!phone)return local;
  try{const d=await api(`/api/order-status?orderNo=${encodeURIComponent(no)}&phone=${encodeURIComponent(phone)}`),fresh=v19NormalizeOrder({...local,...d,orderNo:d.orderNo,phone},'device');const idx=V19_ORDER_CACHE.findIndex(x=>x.orderNo===fresh.orderNo);if(idx>=0)V19_ORDER_CACHE[idx]=fresh;const raw=ordersLocal.find(x=>(x.orderNo||x.order_no)===fresh.orderNo);if(raw){Object.assign(raw,{status:fresh.status,fulfillmentStatus:fresh.fulfillmentStatus,paymentStatus:fresh.paymentStatus,trackingNo:fresh.trackingNo,carrier:fresh.carrier,total:fresh.total,items:fresh.items,events:fresh.orderEvents,shipmentEvents:fresh.shipmentEvents});saveOrders()}return fresh}catch{return local}
}
async function v19OpenDetail(no){const o=await v19ResolveDetail(no);if(!o){toast('ไม่พบรายละเอียดคำสั่งซื้อ');return}modal(v19DetailHtml(o));bindV19()}
async function v19Reorder(no){
  const o=await v19ResolveDetail(no);if(!o)return;
  if(o.source==='account'&&typeof v08Reorder==='function'){await v08Reorder(o.orderNo);return}
  let added=0;for(const i of o.items||[]){if(!i.id&&!i.product_id)continue;const ok=await v17Purchase(Number(i.id||i.product_id),Math.max(1,Number(i.qty||1)),false,Number(i.variantId||i.variant_id||0)||null);if(ok)added++}
  if(added){toast(`เพิ่มสินค้า ${added} รายการลงตะกร้าแล้ว`);cartPage()}else toast('ยังไม่มีสินค้าที่พร้อมซื้อซ้ำ');
}
function v19RenderOrders(state){
  const all=state.orders||[],base=v05OrderFilter==='all'?all:all.filter(o=>v18OrderBucket(o)===v05OrderFilter),filtered=base.filter(v19OrderMatches),counts={packing:all.filter(o=>v18OrderBucket(o)==='packing').length,shipping:all.filter(o=>v18OrderBucket(o)==='shipping').length,completed:all.filter(o=>v18OrderBucket(o)==='completed').length};
  app.innerHTML=chrome(`<main class="v05-order-center v18-order-center v19-order-center"><div class="v05-order-head"><div><h1>คำสั่งซื้อของฉัน</h1><p>${state.mode==='account'?'ซิงก์จากบัญชีสมาชิกและอุปกรณ์นี้':'ติดตามออเดอร์ที่บันทึกในอุปกรณ์นี้'}</p></div><button data-v19-refresh-orders aria-label="อัปเดตคำสั่งซื้อ">${I('refresh')}</button></div>${state.notice?`<div class="v19-order-notice">${I('cloud_off')}<span>${esc(state.notice)}</span></div>`:''}<section class="v18-order-summary"><div><b>${counts.packing}</b><span>เตรียมส่ง</span></div><div><b>${counts.shipping}</b><span>กำลังส่ง</span></div><div><b>${counts.completed}</b><span>สำเร็จ</span></div></section><div class="v05-order-tabs v18-order-tabs">${v19OrderTabs(all)}</div><div class="v18-order-search">${I('search')}<input data-v19-order-search value="${esc(V18_ORDER_QUERY||'')}" placeholder="ค้นหาเลขคำสั่งซื้อ ชื่อสินค้า หรือ SKU"><button data-v19-order-clear ${(V18_ORDER_QUERY||'')?'':'disabled'}>${I('close')}</button></div><div id="orders-list" class="v05-order-list">${filtered.length?filtered.map(v19OrderCard).join(''):`<div class="empty">${I('inventory_2')}<h2>ไม่พบคำสั่งซื้อ</h2><p>${V18_ORDER_QUERY?'ลองเปลี่ยนคำค้นหรือสถานะ':'ยังไม่มีคำสั่งซื้อในสถานะนี้'}</p><button class="primary" data-go="home">เลือกซื้อสินค้า</button></div>`}</div><section class="lookup-box v05-lookup"><h3>ค้นหาคำสั่งซื้ออื่น</h3><p>ใช้เลขคำสั่งซื้อและเบอร์โทรที่ใช้สั่งซื้อ</p><div class="lookup-grid"><input id="lookup-order" placeholder="เลขคำสั่งซื้อ KCH..."><input id="lookup-phone" inputmode="tel" placeholder="เบอร์โทร"><button class="primary" data-lookup-order>ค้นหา</button></div><div id="lookup-result"></div></section></main>`,'orders');bind();bindV05();bindV19();
}
orders=async function(force=false){
  current='orders';const req=++V19_ORDER_REQUEST;app.innerHTML=chrome(`<main class="v19-order-loading"><div>${I('progress_activity')}<b>กำลังซิงก์คำสั่งซื้อ...</b><small>ตรวจสถานะล่าสุดจากบัญชีและอุปกรณ์นี้</small></div></main>`,'orders');bind();
  const state=await v19LoadOrders(Boolean(force));if(req!==V19_ORDER_REQUEST||current!=='orders')return;v19RenderOrders(state);
};
function bindV19(){
  const q=document.querySelector('[data-v19-order-search]');if(q)q.oninput=e=>{V18_ORDER_QUERY=e.target.value;clearTimeout(window.__kchV19Search);window.__kchV19Search=setTimeout(()=>v19RenderOrders({orders:V19_ORDER_CACHE,mode:V19_ORDER_MODE,notice:V19_ORDER_NOTICE}),160)};
  document.querySelector('[data-v19-order-clear]')?.addEventListener('click',()=>{V18_ORDER_QUERY='';v19RenderOrders({orders:V19_ORDER_CACHE,mode:V19_ORDER_MODE,notice:V19_ORDER_NOTICE})},{once:true});
  document.querySelector('[data-v19-refresh-orders]')?.addEventListener('click',()=>orders(true),{once:true});
}
document.addEventListener('click',async e=>{
  const detail=e.target.closest?.('[data-v19-order-detail]');if(detail){e.preventDefault();await v19OpenDetail(detail.dataset.v19OrderDetail);return}
  const reorder=e.target.closest?.('[data-v19-reorder]');if(reorder){e.preventDefault();e.stopPropagation();await v19Reorder(reorder.dataset.v19Reorder);return}
  const sync=e.target.closest?.('[data-v19-sync]');if(sync){e.preventDefault();const o=await v19ResolveDetail(sync.dataset.v19Sync);if(o){toast('อัปเดตสถานะล่าสุดแล้ว');v19RenderOrders({orders:V19_ORDER_CACHE,mode:V19_ORDER_MODE,notice:V19_ORDER_NOTICE})}return}
  const copy=e.target.closest?.('[data-v19-copy-tracking]');if(copy){e.preventDefault();try{await navigator.clipboard.writeText(copy.dataset.v19CopyTracking);toast('คัดลอกเลขติดตามแล้ว')}catch{toast(copy.dataset.v19CopyTracking)}return}
});
window.__KCH_V19_ORDER_HELPERS__={normalizeOrder:v19NormalizeOrder,mergeOrders:v19MergeOrders,orderMatches:v19OrderMatches,timeline:v19Timeline};
