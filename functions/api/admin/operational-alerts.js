import {json,sameOrigin,securityEvent,tableExists} from '../../_lib/staff-auth.js';

const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const actor=request=>({
  id:Number(request.headers.get('X-KCH-Staff-Id'))||null,
  role:clean(request.headers.get('X-KCH-Staff-Role'),40),
  name:clean(request.headers.get('X-KCH-Staff-Name'),80)||'staff'
});

function alertKey(type,id,reason){
  return `${type}:${String(id).replace(/[^a-zA-Z0-9._-]/g,'-')}:${reason}`.slice(0,180);
}

async function detectAlerts(env){
  const [staleOrders,codReconciliations,deliveredCod,expiringLots]=await Promise.all([
    env.DB.prepare(`SELECT id,order_no,customer_name,total,payment_method,payment_status,fulfillment_status,created_at,
      CAST((julianday('now')-julianday(created_at))*24 AS INTEGER) age_hours
      FROM orders
      WHERE status!='cancelled' AND fulfillment_status IN ('pending','packing') AND created_at<=datetime('now','-24 hours')
      ORDER BY created_at ASC LIMIT 40`).all(),
    env.DB.prepare(`SELECT cr.id,o.id order_id,o.order_no,cr.provider,cr.provider_ref,cr.gross_amount,cr.fee_amount,cr.net_amount,cr.status,cr.note,cr.received_at,
      CAST((julianday('now')-julianday(cr.received_at))*24 AS INTEGER) age_hours
      FROM cod_reconciliations cr JOIN orders o ON o.id=cr.order_id
      WHERE cr.status='exception' OR (cr.status IN ('pending','matched') AND cr.received_at<=datetime('now','-48 hours'))
      ORDER BY CASE cr.status WHEN 'exception' THEN 0 ELSE 1 END,cr.received_at ASC LIMIT 40`).all(),
    env.DB.prepare(`SELECT id,order_no,customer_name,total,payment_status,fulfillment_status,updated_at
      FROM orders
      WHERE status!='cancelled' AND payment_method='cod' AND fulfillment_status='delivered' AND payment_status NOT IN ('cod_collected','paid')
      ORDER BY updated_at ASC LIMIT 40`).all(),
    env.DB.prepare(`SELECT l.id,l.product_id,l.variant_id,p.name product_name,COALESCE(v.sku,p.sku) sku,l.qty_remaining,l.received_at,l.expires_at,
      CAST(julianday(date(l.expires_at))-julianday(date('now')) AS INTEGER) days_to_expiry
      FROM inventory_lots l JOIN products p ON p.id=l.product_id LEFT JOIN product_variants v ON v.id=l.variant_id
      WHERE l.qty_remaining>0 AND l.expires_at IS NOT NULL AND date(l.expires_at)<=date('now','+30 days')
      ORDER BY date(l.expires_at) ASC,l.received_at ASC LIMIT 40`).all()
  ]);

  const alerts=[];
  for(const r of staleOrders.results||[]){
    const age=Number(r.age_hours||0);
    alerts.push({
      alertKey:alertKey('order',r.id,'fulfillment-stale'),
      type:'order',severity:age>=48?'critical':'warning',entityType:'order',entityId:String(r.id),
      title:`ออเดอร์ ${r.order_no} ค้างจัดเตรียม/แพ็ก ${age} ชั่วโมง`,
      detail:{orderNo:r.order_no,customerName:r.customer_name,total:Number(r.total||0),fulfillmentStatus:r.fulfillment_status,ageHours:age,createdAt:r.created_at}
    });
  }
  for(const r of codReconciliations.results||[]){
    const overdue=r.status!=='exception';
    alerts.push({
      alertKey:alertKey('cod',r.id,overdue?'settlement-overdue':'exception'),
      type:'cod',severity:r.status==='exception'?'critical':'warning',entityType:'cod_reconciliation',entityId:String(r.id),
      title:r.status==='exception'?`COD ${r.order_no} มีรายการผิดปกติ`:`COD ${r.order_no} รอตรวจสอบเกิน 48 ชั่วโมง`,
      detail:{orderNo:r.order_no,provider:r.provider,providerRef:r.provider_ref,status:r.status,grossAmount:Number(r.gross_amount||0),netAmount:Number(r.net_amount||0),ageHours:Number(r.age_hours||0),note:r.note,receivedAt:r.received_at}
    });
  }
  for(const r of deliveredCod.results||[]){
    alerts.push({
      alertKey:alertKey('cod-order',r.id,'delivered-uncollected'),
      type:'cod',severity:'critical',entityType:'order',entityId:String(r.id),
      title:`COD ${r.order_no} ส่งสำเร็จแต่ยังไม่บันทึกรับเงิน`,
      detail:{orderNo:r.order_no,customerName:r.customer_name,total:Number(r.total||0),paymentStatus:r.payment_status,updatedAt:r.updated_at}
    });
  }
  for(const r of expiringLots.results||[]){
    const days=Number(r.days_to_expiry||0),expired=days<0;
    alerts.push({
      alertKey:alertKey('lot',r.id,'expiry'),
      type:'inventory',severity:expired||days<=7?'critical':'warning',entityType:'inventory_lot',entityId:String(r.id),
      title:expired?`ล็อต ${r.sku||r.product_name} หมดอายุแล้ว`:`ล็อต ${r.sku||r.product_name} จะหมดอายุใน ${days} วัน`,
      detail:{productName:r.product_name,sku:r.sku,qtyRemaining:Number(r.qty_remaining||0),expiresAt:r.expires_at,daysToExpiry:days,receivedAt:r.received_at}
    });
  }
  const order={critical:0,warning:1,info:2};
  return alerts.sort((a,b)=>(order[a.severity]??9)-(order[b.severity]??9)||a.title.localeCompare(b.title,'th'));
}

async function readStates(env,keys){
  if(!keys.length)return new Map();
  const placeholders=keys.map(()=>'?').join(',');
  const r=await env.DB.prepare(`SELECT s.*,u.display_name assigned_name,u.username assigned_username
    FROM operational_alert_state s LEFT JOIN staff_users u ON u.id=s.assigned_to
    WHERE s.alert_key IN (${placeholders})`).bind(...keys).all();
  return new Map((r.results||[]).map(x=>[x.alert_key,x]));
}

function mergedAlert(a,state){
  return {...a,status:state?.status||'open',assignedTo:state?.assigned_to||null,assignedName:state?.assigned_name||state?.assigned_username||null,
    acknowledgedAt:state?.acknowledged_at||null,resolvedAt:state?.resolved_at||null,note:state?.note||null};
}

export async function onRequestGet({env}){
  if(!env.DB)return json({error:'database_not_bound'},503);
  const alerts=await detectAlerts(env),stateReady=await tableExists(env,'operational_alert_state');
  const states=stateReady?await readStates(env,alerts.map(a=>a.alertKey)):new Map();
  const rows=alerts.map(a=>mergedAlert(a,states.get(a.alertKey)));
  const active=rows.filter(a=>a.status!=='resolved');
  return json({
    stateReady,
    counts:{total:rows.length,active:active.length,critical:active.filter(a=>a.severity==='critical').length,acknowledged:active.filter(a=>a.status==='acknowledged').length,unassigned:active.filter(a=>!a.assignedTo).length},
    alerts:rows,
    checkedAt:new Date().toISOString()
  });
}

export async function onRequestPost({request,env}){
  if(!sameOrigin(request))return json({error:'invalid_origin'},403);
  if(!env.DB)return json({error:'database_not_bound'},503);
  if(!(await tableExists(env,'operational_alert_state')))return json({error:'operational_alert_state_not_ready'},503);
  const a=actor(request);if(!a.id)return json({error:'staff_session_required'},403);
  const body=await request.json().catch(()=>({})),key=clean(body.alertKey,180),action=clean(body.action,40),note=clean(body.note,500);
  if(!key||!['acknowledge','assign','resolve','reopen'].includes(action))return json({error:'invalid_alert_action'},400);

  const detected=await detectAlerts(env),current=detected.find(x=>x.alertKey===key);
  if(!current)return json({error:'alert_not_current'},404);

  await env.DB.prepare(`INSERT INTO operational_alert_state(alert_key,alert_type,severity,entity_type,entity_id,title,snapshot_json,status,last_seen_at,updated_at)
    VALUES(?,?,?,?,?,?,?,'open',datetime('now'),datetime('now'))
    ON CONFLICT(alert_key) DO UPDATE SET alert_type=excluded.alert_type,severity=excluded.severity,entity_type=excluded.entity_type,entity_id=excluded.entity_id,title=excluded.title,snapshot_json=excluded.snapshot_json,last_seen_at=datetime('now'),updated_at=datetime('now')`)
    .bind(current.alertKey,current.type,current.severity,current.entityType,current.entityId,current.title,JSON.stringify(current.detail||{}).slice(0,8000)).run();

  if(action==='acknowledge'){
    await env.DB.prepare(`UPDATE operational_alert_state SET status=CASE WHEN status='resolved' THEN status ELSE 'acknowledged' END,
      acknowledged_by=?,acknowledged_at=COALESCE(acknowledged_at,datetime('now')),note=COALESCE(?,note),updated_at=datetime('now') WHERE alert_key=?`).bind(a.id,note||null,key).run();
  }else if(action==='assign'){
    let assignedTo=Number(body.assignedTo)||a.id;
    if(assignedTo!==a.id&&!['owner','admin'].includes(a.role))return json({error:'cannot_assign_other_staff'},403);
    const target=await env.DB.prepare("SELECT id,active FROM staff_users WHERE id=?").bind(assignedTo).first();
    if(!target||!Number(target.active))return json({error:'assigned_staff_not_active'},409);
    await env.DB.prepare(`UPDATE operational_alert_state SET assigned_to=?,status=CASE WHEN status='open' THEN 'acknowledged' ELSE status END,
      acknowledged_by=COALESCE(acknowledged_by,?),acknowledged_at=COALESCE(acknowledged_at,datetime('now')),note=COALESCE(?,note),updated_at=datetime('now') WHERE alert_key=?`)
      .bind(assignedTo,a.id,note||null,key).run();
  }else if(action==='resolve'){
    await env.DB.prepare(`UPDATE operational_alert_state SET status='resolved',resolved_by=?,resolved_at=datetime('now'),note=COALESCE(?,note),updated_at=datetime('now') WHERE alert_key=?`).bind(a.id,note||null,key).run();
  }else if(action==='reopen'){
    await env.DB.prepare(`UPDATE operational_alert_state SET status='open',resolved_by=NULL,resolved_at=NULL,note=COALESCE(?,note),updated_at=datetime('now') WHERE alert_key=?`).bind(note||null,key).run();
  }

  await env.DB.prepare("INSERT INTO audit_logs(actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES('staff',?,'operational_alert.'||?, ?, ?, ?)")
    .bind(a.name,action,current.entityType,current.entityId,JSON.stringify({alertKey:key,note:note||null,assignedTo:Number(body.assignedTo)||null}).slice(0,4000)).run().catch(()=>{});
  await securityEvent(env,{staffUserId:a.id,eventType:`operational_alert_${action}`,route:'/api/admin/operational-alerts',method:'POST',statusCode:200,detail:{alertKey:key,entityType:current.entityType,entityId:current.entityId}});
  return json({ok:true,action,alertKey:key});
}
