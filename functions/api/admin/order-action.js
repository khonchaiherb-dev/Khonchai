import {adminAuthorized,json,clean,audit,money} from '../../_lib/admin.js';

async function activeReservations(env,orderId){
  const r=await env.DB.prepare(`SELECT sr.id,sr.product_id,sr.variant_id,sr.qty,
    COALESCE(v.cost_price,p.cost_price,0) cost_price
    FROM stock_reservations sr JOIN products p ON p.id=sr.product_id
    LEFT JOIN product_variants v ON v.id=sr.variant_id
    WHERE sr.order_id=? AND sr.status='active' ORDER BY sr.id`).bind(orderId).all();
  return r.results||[];
}

async function packingVerificationStatus(env,orderId){
  const r=await env.DB.prepare(`SELECT COUNT(oi.id) line_count,
      COALESCE(SUM(oi.qty),0) expected_qty,
      COALESCE(SUM(MIN(oi.qty,COALESCE(pv.verified_qty,0))),0) verified_qty,
      COALESCE(SUM(CASE WHEN COALESCE(pv.verified_qty,0)>=oi.qty THEN 1 ELSE 0 END),0) verified_lines
    FROM order_items oi LEFT JOIN packing_verifications pv ON pv.order_item_id=oi.id
    WHERE oi.order_id=?`).bind(orderId).first();
  const lineCount=Number(r?.line_count||0),expectedQty=Number(r?.expected_qty||0),verifiedQty=Number(r?.verified_qty||0),verifiedLines=Number(r?.verified_lines||0);
  return {lineCount,expectedQty,verifiedQty,verifiedLines,complete:lineCount>0&&verifiedLines===lineCount&&verifiedQty===expectedQty};
}

async function fefoReady(env){
  try{
    const [c,t]=await Promise.all([env.DB.prepare("PRAGMA table_info('inventory_lots')").all(),env.DB.prepare("SELECT 1 ok FROM sqlite_master WHERE type='table' AND name='inventory_lot_allocations'").first()]);
    const cols=new Set((c.results||[]).map(x=>String(x.name)));return Boolean(t?.ok)&&cols.has('quarantined')&&cols.has('lot_code');
  }catch{return false}
}

async function fefoPlan(env,reservation){
  const rows=await env.DB.prepare(`SELECT id,qty_remaining,unit_cost,lot_code,expires_at,received_at
    FROM inventory_lots
    WHERE product_id=? AND IFNULL(variant_id,0)=? AND qty_remaining>0 AND quarantined=0
      AND (expires_at IS NULL OR date(expires_at)>=date('now'))
    ORDER BY CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END,date(expires_at) ASC,received_at ASC,id ASC`).bind(reservation.product_id,Number(reservation.variant_id||0)).all();
  let remaining=Number(reservation.qty),cogs=0;const allocations=[];
  for(const lot of rows.results||[]){
    if(remaining<=0)break;const take=Math.min(remaining,Number(lot.qty_remaining||0));if(take<=0)continue;
    allocations.push({lotId:Number(lot.id),qty:take,unitCost:Number(lot.unit_cost||0),lotCode:lot.lot_code||null,expiresAt:lot.expires_at||null});cogs=money(cogs+take*Number(lot.unit_cost||0));remaining-=take;
  }
  if(remaining>0){const e=new Error('fefo_insufficient_lot_stock');e.detail={productId:reservation.product_id,variantId:reservation.variant_id||null,required:Number(reservation.qty),shortBy:remaining};throw e}
  return {allocations,cogs};
}

async function commitReservations(env,order){
  const rows=await activeReservations(env,order.id);if(!rows.length)return {committed:0,cogs:0,fefo:false,lotsAllocated:0};
  const useFefo=await fefoReady(env),batch=[];let cogs=0,lotsAllocated=0;
  for(const x of rows){
    let lineCogs=money(Number(x.cost_price||0)*Number(x.qty));
    if(useFefo){
      const plan=await fefoPlan(env,x);lineCogs=plan.cogs;
      for(const a of plan.allocations){
        batch.push(env.DB.prepare("UPDATE inventory_lots SET qty_remaining=qty_remaining-?,updated_at=datetime('now') WHERE id=?").bind(a.qty,a.lotId));
        batch.push(env.DB.prepare(`INSERT INTO inventory_lot_allocations(order_id,reservation_id,inventory_lot_id,product_id,variant_id,qty,unit_cost)
          VALUES(?,?,?,?,?,?,?)`).bind(order.id,x.id,a.lotId,x.product_id,x.variant_id,a.qty,a.unitCost));lotsAllocated++;
      }
    }
    if(x.variant_id)batch.push(env.DB.prepare("UPDATE product_variants SET stock=stock-?,reserved_stock=reserved_stock-?,updated_at=datetime('now') WHERE id=?").bind(x.qty,x.qty,x.variant_id));
    else batch.push(env.DB.prepare("UPDATE products SET stock=stock-?,reserved_stock=reserved_stock-?,updated_at=datetime('now') WHERE id=?").bind(x.qty,x.qty,x.product_id));
    batch.push(env.DB.prepare("UPDATE products SET sold_count=sold_count+?,updated_at=datetime('now') WHERE id=?").bind(x.qty,x.product_id));
    batch.push(env.DB.prepare("UPDATE stock_reservations SET status='committed',committed_at=datetime('now') WHERE id=? AND status='active'").bind(x.id));
    batch.push(env.DB.prepare("INSERT INTO inventory_movements(product_id,variant_id,movement_type,qty,reference_type,reference_id,note) VALUES(?,?,'sale',?,'order',?,?)").bind(x.product_id,x.variant_id,-Number(x.qty),order.order_no,useFefo?'ตัดสต็อกเมื่อจัดส่งจริงด้วย FEFO':'ตัดสต็อกเมื่อจัดส่งจริง'));
    cogs=money(cogs+lineCogs);
    if(lineCogs>0)batch.push(env.DB.prepare("INSERT OR IGNORE INTO financial_ledger(entry_type,amount,order_id,reference_type,reference_id,description,dedupe_key) VALUES('cogs',?,?, 'order',?,'ต้นทุนสินค้าที่จัดส่ง',?)").bind(-lineCogs,order.id,order.order_no,`cogs:${order.order_no}:${x.id}`));
  }
  try{await env.DB.batch(batch)}catch(e){if(useFefo&&/CHECK constraint|inventory_lots|UNIQUE constraint/i.test(String(e?.message||e))){const err=new Error('fefo_stock_changed');err.cause=e;throw err}throw e}
  return {committed:rows.length,cogs,fefo:useFefo,lotsAllocated};
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
    let verification=null;
    if(env.PACKING_REQUIRE_VERIFICATION==='true'){
      verification=await packingVerificationStatus(env,order.id);
      if(!verification.complete)return json({error:'packing_verification_required',...verification},409);
    }
    let committed;try{committed=await commitReservations(env,order)}catch(e){if(['fefo_insufficient_lot_stock','fefo_stock_changed'].includes(String(e?.message||'')))return json({error:String(e.message),detail:e.detail||null},409);throw e}
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET fulfillment_status='shipping',status='processing',updated_at=datetime('now') WHERE id=?").bind(order.id),
      env.DB.prepare("UPDATE shipments SET carrier=?,tracking_no=?,status='shipping',shipped_at=COALESCE(shipped_at,datetime('now')) WHERE order_id=?").bind(carrier||null,trackingNo,order.id),
      env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES(?,'shipped',?)").bind(order.id,`จัดส่งแล้ว${carrier?` โดย ${carrier}`:''} เลขพัสดุ ${trackingNo}`)
    ]);
    await audit(env,{action:'fulfillment.shipped',entityType:'order',entityId:orderNo,actorId:clean(request.headers.get('X-KCH-Staff-Name'),80)||'staff',metadata:{carrier,trackingNo,reservationsCommitted:committed.committed,cogs:committed.cogs,fefo:committed.fefo,lotsAllocated:committed.lotsAllocated,packingVerified:verification?.complete??null}});
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
    await audit(env,{action:'fulfillment.cancelled',entityType:'order',entityId:orderNo,actorId:clean(request.headers.get('X-KCH-Staff-Name'),80)||'staff',metadata:{reservationsReleased:released}});
  }else return json({error:'unsupported_action'},400);
  const updated=await env.DB.prepare("SELECT order_no,status,fulfillment_status,payment_status,updated_at FROM orders WHERE id=?").bind(order.id).first();
  return json({ok:true,action,...updated});
}
