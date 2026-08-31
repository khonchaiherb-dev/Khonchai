import {adminAuthorized,json,clean,audit,money} from '../../_lib/admin.js';

async function activeReservations(env,orderId){
  const r=await env.DB.prepare(`SELECT sr.id,sr.product_id,sr.variant_id,sr.qty,
    COALESCE(v.cost_price,p.cost_price,0) cost_price
    FROM stock_reservations sr JOIN products p ON p.id=sr.product_id
    LEFT JOIN product_variants v ON v.id=sr.variant_id
    WHERE sr.order_id=? AND sr.status='active' ORDER BY sr.id`).bind(orderId).all();
  return r.results||[];
}

async function commitReservations(env,order){
  const rows=await activeReservations(env,order.id);if(!rows.length)return {committed:0,cogs:0};
  const batch=[];let cogs=0;
  for(const x of rows){
    if(x.variant_id)batch.push(env.DB.prepare("UPDATE product_variants SET stock=stock-?,reserved_stock=reserved_stock-?,updated_at=datetime('now') WHERE id=?").bind(x.qty,x.qty,x.variant_id));
    else batch.push(env.DB.prepare("UPDATE products SET stock=stock-?,reserved_stock=reserved_stock-?,updated_at=datetime('now') WHERE id=?").bind(x.qty,x.qty,x.product_id));
    batch.push(env.DB.prepare("UPDATE products SET sold_count=sold_count+?,updated_at=datetime('now') WHERE id=?").bind(x.qty,x.product_id));
    batch.push(env.DB.prepare("UPDATE stock_reservations SET status='committed',committed_at=datetime('now') WHERE id=? AND status='active'").bind(x.id));
    batch.push(env.DB.prepare("INSERT INTO inventory_movements(product_id,variant_id,movement_type,qty,reference_type,reference_id,note) VALUES(?,?,'sale',?,'order',?,'ตัดสต๊อกเมื่อจัดส่งจริง')").bind(x.product_id,x.variant_id,-Number(x.qty),order.order_no));
    const lineCogs=money(Number(x.cost_price||0)*Number(x.qty));cogs=money(cogs+lineCogs);
    if(lineCogs>0)batch.push(env.DB.prepare("INSERT OR IGNORE INTO financial_ledger(entry_type,amount,order_id,reference_type,reference_id,description,dedupe_key) VALUES('cogs',?,?, 'order',?,'ต้นทุนสินค้าที่จัดส่ง',?)").bind(-lineCogs,order.id,order.order_no,`cogs:${order.order_no}:${x.id}`));
  }
  await env.DB.batch(batch);return {committed:rows.length,cogs};
}

async function releaseReservations(env,order){
  const rows=await activeReservations(env,order.id);if(!rows.length)return 0;
  const batch=[];
  for(const x of rows){
    if(x.variant_id)batch.push(env.DB.prepare("UPDATE product_variants SET reserved_stock=MAX(0,reserved_stock-?),updated_at=datetime('now') WHERE id=?").bind(x.qty,x.variant_id));
    else batch.push(env.DB.prepare("UPDATE products SET reserved_stock=MAX(0,reserved_stock-?),updated_at=datetime('now') WHERE id=?").bind(x.qty,x.product_id));
    batch.push(env.DB.prepare("UPDATE stock_reservations SET status='released',released_at=datetime('now') WHERE id=? AND status='active'").bind(x.id));
  }
  await env.DB.batch(batch);return rows.length;
}

export async function onRequestPost({env,request}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const body=await request.json().catch(()=>null),orderNo=clean(body?.orderNo,80),action=clean(body?.action,30);
  if(!orderNo||!action)return json({error:'invalid_request'},400);
  const order=await env.DB.prepare("SELECT id,order_no,status,fulfillment_status,payment_method,payment_status,total FROM orders WHERE order_no=?").bind(orderNo).first();
  if(!order)return json({error:'order_not_found'},404);

  if(action==='packing'){
    if(order.status==='cancelled'||order.fulfillment_status==='delivered')return json({error:'invalid_state'},409);
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET fulfillment_status='packing',status='processing',updated_at=datetime('now') WHERE id=?").bind(order.id),
      env.DB.prepare("UPDATE shipments SET status='packing' WHERE order_id=?").bind(order.id),
      env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES(?,'packing','ร้านค้ากำลังหยิบและแพ็กสินค้าที่กันสต๊อกไว้')").bind(order.id)
    ]);
  }else if(action==='shipped'){
    const carrier=clean(body.carrier,80),trackingNo=clean(body.trackingNo,120);
    if(trackingNo.length<5)return json({error:'tracking_required'},400);
    if(order.status==='cancelled'||order.fulfillment_status==='delivered')return json({error:'invalid_state'},409);
    const committed=await commitReservations(env,order);
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET fulfillment_status='shipping',status='processing',updated_at=datetime('now') WHERE id=?").bind(order.id),
      env.DB.prepare("UPDATE shipments SET carrier=?,tracking_no=?,status='shipping',shipped_at=COALESCE(shipped_at,datetime('now')) WHERE order_id=?").bind(carrier||null,trackingNo,order.id),
      env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES(?,'shipped',?)").bind(order.id,`จัดส่งแล้ว${carrier?` โดย ${carrier}`:''} เลขพัสดุ ${trackingNo}`)
    ]);
    await audit(env,{action:'fulfillment.shipped',entityType:'order',entityId:orderNo,metadata:{carrier,trackingNo,reservationsCommitted:committed.committed,cogs:committed.cogs}});
  }else if(action==='delivered'){
    if(order.status==='cancelled')return json({error:'invalid_state'},409);
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET fulfillment_status='delivered',status='completed',updated_at=datetime('now') WHERE id=?").bind(order.id),
      env.DB.prepare("UPDATE shipments SET status='delivered',delivered_at=COALESCE(delivered_at,datetime('now')) WHERE order_id=?").bind(order.id),
      env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES(?,'delivered','ขนส่งยืนยันการจัดส่งสำเร็จ')").bind(order.id)
    ]);
  }else if(action==='cancelled'){
    if(order.status==='cancelled')return json({ok:true,orderNo,action,reused:true});
    if(['shipping','delivered'].includes(order.fulfillment_status)||order.status==='completed')return json({error:'cannot_cancel_after_shipping'},409);
    const reservationCount=await env.DB.prepare("SELECT COUNT(*) c FROM stock_reservations WHERE order_id=?").bind(order.id).first();
    const released=await releaseReservations(env,order),batch=[];
    if(Number(reservationCount?.c||0)===0){
      const items=await env.DB.prepare("SELECT product_id,variant_id,qty FROM order_items WHERE order_id=?").bind(order.id).all();
      for(const item of items.results||[]){
        if(item.variant_id)batch.push(env.DB.prepare("UPDATE product_variants SET stock=stock+?,updated_at=datetime('now') WHERE id=?").bind(item.qty,item.variant_id));
        else batch.push(env.DB.prepare("UPDATE products SET stock=stock+?,updated_at=datetime('now') WHERE id=?").bind(item.qty,item.product_id));
        batch.push(env.DB.prepare("UPDATE products SET sold_count=MAX(0,sold_count-?),updated_at=datetime('now') WHERE id=?").bind(item.qty,item.product_id));
        batch.push(env.DB.prepare("INSERT INTO inventory_movements(product_id,variant_id,movement_type,qty,reference_type,reference_id,note) VALUES(?,?,'cancel_return',?,'order',?,'คืนสต๊อกออเดอร์ระบบเดิม')").bind(item.product_id,item.variant_id,item.qty,orderNo));
      }
    }
    batch.push(env.DB.prepare("UPDATE orders SET status='cancelled',fulfillment_status='cancelled',updated_at=datetime('now') WHERE id=?").bind(order.id));
    batch.push(env.DB.prepare("UPDATE shipments SET status='cancelled' WHERE order_id=?").bind(order.id));
    batch.push(env.DB.prepare("UPDATE payments SET status='cancelled' WHERE order_id=? AND status='pending'").bind(order.id));
    batch.push(env.DB.prepare("UPDATE creator_commissions SET status='void' WHERE order_id=? AND status IN ('pending','eligible')").bind(order.id));
    batch.push(env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES(?,'cancelled',?)").bind(order.id,released?`ยกเลิกคำสั่งซื้อและปล่อย Reservation ${released} รายการ`:'ยกเลิกคำสั่งซื้อแล้ว'));
    await env.DB.batch(batch);
    await audit(env,{action:'fulfillment.cancelled',entityType:'order',entityId:orderNo,metadata:{reservationsReleased:released}});
  }else return json({error:'unsupported_action'},400);
  const updated=await env.DB.prepare("SELECT order_no,status,fulfillment_status,payment_status,updated_at FROM orders WHERE id=?").bind(order.id).first();
  return json({ok:true,action,...updated});
}
