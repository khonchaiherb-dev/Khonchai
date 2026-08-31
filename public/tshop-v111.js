/* KHONCHAIHERB Commerce v1.11 — tracking journey, guest Order Center, variant-safe reorder */
function v111OrderRank(o){
  if(String(o?.status||'')==='cancelled'||String(o?.fulfillmentStatus||o?.fulfillment_status||'')==='cancelled')return -1;
  const f=String(o?.fulfillmentStatus||o?.fulfillment_status||o?.status||'').toLowerCase();
  if(f==='delivered'||String(o?.status||'')==='completed')return 3;
  if(f==='shipping'||f==='shipped')return 2;
  if(f==='packing'||f==='processing')return 1;
  return 0;
}
function v111EventTime(o,type){
  if(type==='created')return o?.createdAt||o?.created_at||'';
  const aliases={packing:['packing'],shipping:['shipped','shipping'],delivered:['delivered']},wanted=aliases[type]||[type];
  const hit=(o?.orderEvents||o?.events||[]).find(e=>wanted.includes(String(e.event_type||e.eventType||'').toLowerCase()));
  if(hit)return hit.created_at||hit.createdAt||'';
  if(type==='shipping')return o?.shippedAt||o?.shipped_at||'';
  if(type==='delivered')return o?.deliveredAt||o?.delivered_at||'';
  return '';
}
function v111ProgressHtml(o,compact=false){
  const rank=v111OrderRank(o);
  if(rank<0)return `<div class="v111-cancelled">${I('cancel')}<span><b>คำสั่งซื้อนี้ถูกยกเลิก</b><small>ไม่มีการจัดส่งต่อสำหรับออเดอร์นี้</small></span></div>`;
  const stages=[['created','รับคำสั่งซื้อ'],['packing','เตรียมสินค้า'],['shipping','กำลังจัดส่ง'],['delivered','จัดส่งสำเร็จ']];
  if(compact)return `<div class="v111-mini-progress" aria-label="ความคืบหน้าคำสั่งซื้อ">${stages.map((s,i)=>`<i class="${i<=rank?'done':''} ${i===rank?'current':''}"></i>`).join('')}</div>`;
  return `<section class="v111-progress"><div class="v111-progress-head"><div>${I('local_shipping')}<span><b>สถานะการจัดส่ง</b><small>${esc(statusText(o))}</small></span></div>${o?.trackingNo||o?.tracking_no?`<span class="v111-track-ready">มีเลขติดตามแล้ว</span>`:''}</div><div class="v111-steps">${stages.map((s,i)=>{const time=v111EventTime(o,s[0]);return `<div class="v111-step ${i<=rank?'done':''} ${i===rank?'current':''}"><i>${i<rank?I('check'):i===rank?I('radio_button_checked'):I('circle')}</i><span><b>${s[1]}</b>${time?`<small>${esc(time)}</small>`:''}</span></div>`}).join('')}</div>${String(o?.paymentMethod||o?.payment_method||'COD')==='COD'&&!['paid','cod_collected'].includes(String(o?.paymentStatus||o?.payment_status||''))?`<div class="v111-cod-note">${I('payments')} ชำระเงินปลายทางเมื่อได้รับสินค้า</div>`:''}</section>`;
}
function v111PersistGuestOrder(data,phone){
  const fresh=v19NormalizeOrder({...data,orderNo:data.orderNo,phone},'device');fresh.phone=phone;
  const record={...fresh,orderNo:fresh.orderNo,phone,source:'device',createdAt:fresh.createdAt||new Date().toISOString()};
  ordersLocal=ordersLocal.filter(o=>String(o.orderNo||o.order_no)!==fresh.orderNo);ordersLocal.unshift(record);saveOrders();
  const account=V19_ORDER_MODE==='account'?V19_ORDER_CACHE.filter(o=>o.source==='account'):[];
  V19_ORDER_CACHE=v19MergeOrders(account,ordersLocal);V19_ORDER_FETCHED_AT=Date.now();return fresh;
}

const v111OrderCardBase=v19OrderCard;
v19OrderCard=function(o){
  const html=v111OrderCardBase(o),marker='<div class="orderactions">';
  return html.includes(marker)?html.replace(marker,`${v111ProgressHtml(o,true)}${marker}`):html;
};
const v111DetailBase=v19DetailHtml;
v19DetailHtml=function(o){
  const html=v111DetailBase(o),marker='<section class="v19-timeline">';
  return html.includes(marker)?html.replace(marker,`${v111ProgressHtml(o,false)}${marker}`):`${html}${v111ProgressHtml(o,false)}`;
};

v19Reorder=async function(no){
  const o=await v19ResolveDetail(no);if(!o)return;
  const items=o.items||[];if(!items.length){toast('ออเดอร์นี้ไม่มีรายการสินค้าที่ซื้อซ้ำได้');return}
  let added=0,skipped=0;
  for(const i of items){
    const productId=Number(i.id||i.product_id||0),variantId=Number(i.variantId||i.variant_id||0)||null,qty=Math.max(1,Number(i.qty||1));
    if(!productId||!PRODUCTS.some(p=>Number(p.id)===productId)){skipped++;continue}
    try{const ok=await v17Purchase(productId,qty,false,variantId);if(ok)added++;else skipped++}catch{skipped++}
  }
  if(!added){toast('สินค้าจากออเดอร์นี้ยังไม่พร้อมซื้อซ้ำ');return}
  toast(skipped?`เพิ่ม ${added} รายการแล้ว • ${skipped} รายการต้องเลือกใหม่`:`เพิ่มสินค้าเดิม ${added} รายการลงตะกร้าแล้ว`);cartPage();
};

lookupOrder=async function(){
  const no=document.querySelector('#lookup-order')?.value.trim()||'',phone=document.querySelector('#lookup-phone')?.value.trim()||'',out=document.querySelector('#lookup-result'),btn=document.querySelector('[data-lookup-order]');
  if(!no||phone.replace(/\D/g,'').length<9){if(out)out.innerHTML='<p class="form-error">กรุณากรอกเลขคำสั่งซื้อและเบอร์โทร</p>';return}
  if(out)out.innerHTML='<div class="v111-lookup-loading">'+I('progress_activity')+'<span>กำลังตรวจสถานะล่าสุด...</span></div>';if(btn)btn.disabled=true;
  try{
    const data=await api(`/api/order-status?orderNo=${encodeURIComponent(no)}&phone=${encodeURIComponent(phone)}`),fresh=v111PersistGuestOrder(data,phone);
    if(out)out.innerHTML=`<div class="v111-lookup-success">${I('check_circle')}<span><b>พบคำสั่งซื้อและบันทึกไว้แล้ว</b><small>ครั้งถัดไปเปิด Order Center ได้โดยไม่ต้องค้นหาใหม่บนอุปกรณ์นี้</small></span></div>${v19OrderCard(fresh)}`;
    bind();bindV19();bindV111();
  }catch(e){if(out)out.innerHTML=`<p class="form-error">${e?.status===404?'ไม่พบคำสั่งซื้อที่ตรงกับเลขออเดอร์และเบอร์โทร':'ยังตรวจสอบคำสั่งซื้อไม่ได้ กรุณาลองใหม่'}</p>`}
  finally{if(btn)btn.disabled=false}
};

function bindV111(){
  document.querySelectorAll('.v111-step.current').forEach(x=>x.setAttribute('aria-current','step'));
}
const v111BindBase=typeof bind==='function'?bind:null;
bind=function(){if(v111BindBase)v111BindBase();bindV111()};
window.__KCH_V111_ORDER_HELPERS__={rank:v111OrderRank,eventTime:v111EventTime,progressHtml:v111ProgressHtml,persistGuest:v111PersistGuestOrder};
