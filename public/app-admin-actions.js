const baseBind=bind;
bind=function(){
  baseBind();
  document.querySelectorAll('[data-admin-action]').forEach(el=>el.onclick=()=>runAdminAction(el.dataset.order,el.dataset.adminAction));
};

async function runAdminAction(orderNo,action){
  const token=sessionStorage.getItem('kch-admin-token')||'';
  if(!token){sellerLogin();return}
  const payload={orderNo,action};
  if(action==='shipped'){
    const carrier=prompt('ชื่อบริษัทขนส่ง','')||'';
    const trackingNo=prompt('กรอกเลขพัสดุ','')||'';
    if(!trackingNo.trim())return;
    payload.carrier=carrier.trim();payload.trackingNo=trackingNo.trim();
  }
  if(action==='cancelled'&&!confirm(`ยืนยันยกเลิกคำสั่งซื้อ ${orderNo} และคืนสต๊อก?`))return;
  try{
    await api('/api/admin/order-action',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});
    toast('อัปเดตคำสั่งซื้อสำเร็จ');sellerDashboard(token);
  }catch(e){
    const map={tracking_required:'กรุณากรอกเลขพัสดุ',cannot_cancel_after_shipping:'ออเดอร์ที่ส่งแล้วไม่สามารถยกเลิกด้วยขั้นตอนนี้',invalid_state:'สถานะปัจจุบันไม่รองรับคำสั่งนี้'};
    toast(map[e.data?.error]||'อัปเดตสถานะไม่สำเร็จ');
  }
}

const originalRenderSeller=renderSeller;
renderSeller=function(d,ordersData){
  originalRenderSeller(d,ordersData);
  const table=document.querySelector('.tablecard');
  if(table&&!document.querySelector('.commerce-os-entry')){
    table.insertAdjacentHTML('beforebegin',`<div class="commerce-os-entry" style="display:flex;gap:12px;align-items:center;justify-content:space-between;margin:12px 0;padding:14px 16px;border:1px solid #d8dfd8;border-radius:16px;background:#f7f4ec"><div><b>KHONCHAIHERB Commerce OS</b><small style="display:block;color:#6d786f;margin-top:2px">กำไร · Customer 360 · COD · สต็อก · ยืนยันเปิดขาย</small></div><button class="primary" type="button" onclick="location.href='/seller-center.html'">เปิด Command Center</button></div>`);
  }
  document.querySelectorAll('.tablecard tbody tr').forEach((row,i)=>{
    const r=ordersData[i];if(!r)return;
    const cell=document.createElement('td');const f=r.fulfillment_status||'pending';cell.className='admin-actions';
    if(f==='pending')cell.innerHTML+=`<button data-admin-action="packing" data-order="${esc(r.order_no)}">เริ่มแพ็ก</button>`;
    if(f==='packing')cell.innerHTML+=`<button data-admin-action="shipped" data-order="${esc(r.order_no)}">ส่งสินค้า</button>`;
    if(f==='shipping')cell.innerHTML+=`<button data-admin-action="delivered" data-order="${esc(r.order_no)}">ส่งสำเร็จ</button>`;
    if(['pending','packing'].includes(f)&&r.status!=='cancelled')cell.innerHTML+=`<button class="danger-btn" data-admin-action="cancelled" data-order="${esc(r.order_no)}">ยกเลิก</button>`;
    row.appendChild(cell);
  });
  const head=document.querySelector('.tablecard thead tr');
  if(head&&!head.querySelector('.action-head')){const th=document.createElement('th');th.className='action-head';th.textContent='ดำเนินการ';head.appendChild(th)}
  bind();
};
