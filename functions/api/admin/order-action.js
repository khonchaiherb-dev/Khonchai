function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
function authorized(request,env){return Boolean(env.ADMIN_TOKEN)&&(request.headers.get('Authorization')||'')===`Bearer ${env.ADMIN_TOKEN}`}
const clean=s=>String(s||'').trim();
export async function onRequestPost({env,request}){
  if(!env.ADMIN_TOKEN) return json({error:'admin_not_configured'},503);
  if(!authorized(request,env)) return json({error:'unauthorized'},401);
  if(!env.DB) return json({error:'database_not_bound'},503);
  const body=await request.json().catch(()=>null),orderNo=clean(body?.orderNo),action=clean(body?.action);
  if(!orderNo||!action) return json({error:'invalid_request'},400);
  const order=await env.DB.prepare("SELECT id,order_no,status,fulfillment_status,payment_method,payment_status,total FROM orders WHERE order_no=?").bind(orderNo).first();
  if(!order) return json({error:'order_not_found'},404);
  if(action==='packing'){
    if(order.status==='cancelled'||order.fulfillment_status==='delivered') return json({error:'invalid_state'},409);
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET fulfillment_status='packing',status='processing',updated_at=datetime('now') WHERE id=?").bind(order.id),
      env.DB.prepare("UPDATE shipments SET status='packing' WHERE order_id=?").bind(order.id),
      env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES(?,'packing','ร้านค้ากำลังเตรียมและแพ็กสินค้า')").bind(order.id)
    ]);
  }else if(action==='shipped'){
    const carrier=clean(body.carrier),trackingNo=clean(body.trackingNo);
    if(trackingNo.length<5) return json({error:'tracking_required'},400);
    if(order.status==='cancelled'||order.fulfillment_status==='delivered') return json({error:'invalid_state'},409);
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET fulfillment_status='shipping',status='processing',updated_at=datetime('now') WHERE id=?").bind(order.id),
      env.DB.prepare("UPDATE shipments SET carrier=?,tracking_no=?,status='shipping',shipped_at=COALESCE(shipped_at,datetime('now')) WHERE order_id=?").bind(carrier||null,trackingNo,order.id),
      env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES(?,'shipped',?)").bind(order.id,`จัดส่งแล้ว${carrier?` โดย ${carrier}`:''} เลขพัสดุ ${trackingNo}`)
    ]);
  }else if(action==='delivered'){
    if(order.status==='cancelled') return json({error:'invalid_state'},409);
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET fulfillment_status='delivered',status='completed',updated_at=datetime('now') WHERE id=?").bind(order.id),
      env.DB.prepare("UPDATE shipments SET status='delivered',delivered_at=COALESCE(delivered_at,datetime('now')) WHERE order_id=?").bind(order.id),
      env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES(?,'delivered','ขนส่งยืนยันการจัดส่งสำเร็จ')").bind(order.id)
    ]);
  }else if(action==='cancelled'){
    if(order.status==='cancelled') return json({ok:true,orderNo,action,reused:true});
    if(['shipping','delivered'].includes(order.fulfillment_status)||order.status==='completed') return json({error:'cannot_cancel_after_shipping'},409);
    const items=await env.DB.prepare("SELECT product_id,qty FROM order_items WHERE order_id=?").bind(order.id).all(),batch=[];
    for(const item of items.results||[]){
      batch.push(env.DB.prepare("UPDATE products SET stock=stock+?,sold_count=MAX(0,sold_count-?),updated_at=datetime('now') WHERE id=?").bind(item.qty,item.qty,item.product_id));
      batch.push(env.DB.prepare("INSERT INTO inventory_movements(product_id,movement_type,qty,reference_type,reference_id,note) VALUES(?,'cancel_return',?,'order',?,'คืนสต๊อกจากการยกเลิกคำสั่งซื้อ')").bind(item.product_id,item.qty,orderNo));
    }
    batch.push(env.DB.prepare("UPDATE orders SET status='cancelled',fulfillment_status='cancelled',updated_at=datetime('now') WHERE id=?").bind(order.id));
    batch.push(env.DB.prepare("UPDATE shipments SET status='cancelled' WHERE order_id=?").bind(order.id));
    batch.push(env.DB.prepare("UPDATE payments SET status='cancelled' WHERE order_id=? AND status='pending'").bind(order.id));
    batch.push(env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES(?,'cancelled','ร้านค้ายกเลิกคำสั่งซื้อและคืนสต๊อกแล้ว')").bind(order.id));
    await env.DB.batch(batch);
  }else return json({error:'unsupported_action'},400);
  const updated=await env.DB.prepare("SELECT order_no,status,fulfillment_status,payment_status,updated_at FROM orders WHERE id=?").bind(order.id).first();
  return json({ok:true,action,...updated});
}
