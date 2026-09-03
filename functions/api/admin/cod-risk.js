import {adminAuthorized,json,clean} from '../../_lib/admin.js';
import {assessCodRisk} from '../../_lib/cod-risk.js';

async function tableExists(db,name){
  const r=await db.prepare("SELECT 1 ok FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").bind(name).first();
  return Boolean(r?.ok);
}
const safeAddress=value=>{try{return JSON.parse(value||'{}')||{}}catch{return {}}};

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  if(!await tableExists(env.DB,'cod_risk_assessments'))return json({ready:false,migration:'0022',error:'cod_risk_schema_not_ready'},503);
  const rows=await env.DB.prepare(`SELECT a.id,a.score,a.risk_level,a.decision,a.policy_version,a.assessed_at,a.reviewed_by,a.reviewed_at,a.review_note,
    o.order_no,o.customer_name,o.phone,o.total,o.status,o.fulfillment_status,o.created_at
    FROM cod_risk_assessments a JOIN orders o ON o.id=a.order_id
    ORDER BY CASE a.decision WHEN 'review' THEN 0 ELSE 1 END,a.score DESC,a.id DESC LIMIT 200`).all();
  const summary=await env.DB.prepare(`SELECT risk_level,decision,COUNT(*) count FROM cod_risk_assessments GROUP BY risk_level,decision`).all();
  return json({ready:true,mode:'advisory',enforcement:false,summary:summary.results||[],assessments:rows.results||[]});
}

export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  if(!await tableExists(env.DB,'cod_risk_assessments'))return json({error:'cod_risk_schema_not_ready',migration:'0022'},503);
  const body=await request.json().catch(()=>({})),action=clean(body.action,24)||'scan';

  if(action==='review'){
    const id=Number(body.id);if(!Number.isInteger(id)||id<=0)return json({error:'invalid_assessment_id'},400);
    const decision=['allow','review'].includes(body.decision)?body.decision:'allow';
    const note=clean(body.note,500),reviewer=clean(body.reviewer,120)||'admin';
    const result=await env.DB.prepare(`UPDATE cod_risk_assessments SET decision=?,reviewed_by=?,reviewed_at=datetime('now'),review_note=? WHERE id=? RETURNING id,order_id,score,risk_level,decision,reviewed_at`).bind(decision,reviewer,note,id).first();
    if(!result)return json({error:'assessment_not_found'},404);
    return json({ok:true,mode:'advisory',assessment:result});
  }
  if(action!=='scan')return json({error:'unsupported_action'},400);

  const limit=Math.max(1,Math.min(100,Number(body.limit)||40));
  const hasReturns=await tableExists(env.DB,'return_requests');
  const hasCod=await tableExists(env.DB,'cod_reconciliations');
  const orders=await env.DB.prepare(`SELECT o.id,o.order_no,o.customer_id,o.phone,o.address_json,o.total,o.created_at
    FROM orders o LEFT JOIN cod_risk_assessments a ON a.order_id=o.id
    WHERE a.id IS NULL AND o.payment_method='COD' AND o.status NOT IN ('cancelled','refunded')
    ORDER BY o.id DESC LIMIT ?`).bind(limit).all();

  let assessed=0,review=0;
  for(const order of orders.results||[]){
    const addr=safeAddress(order.address_json),customerId=Number(order.customer_id)||0;
    const history=customerId?await env.DB.prepare(`SELECT
      COUNT(*) prior_orders,
      SUM(CASE WHEN fulfillment_status='delivered' OR status='delivered' THEN 1 ELSE 0 END) delivered_orders,
      SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) cancelled_orders,
      SUM(CASE WHEN created_at>=datetime('now','-24 hours') THEN 1 ELSE 0 END) recent_orders_24h
      FROM orders WHERE customer_id=? AND id!=?`).bind(customerId,order.id).first():{};
    const sameAddress=await env.DB.prepare(`SELECT COUNT(*) c FROM orders WHERE id!=? AND address_json=? AND created_at>=datetime('now','-30 days')`).bind(order.id,order.address_json||'').first();
    let codSettled=0,returnRequests=0;
    if(hasCod&&customerId){const r=await env.DB.prepare(`SELECT COUNT(*) c FROM cod_reconciliations cr JOIN orders o ON o.id=cr.order_id WHERE o.customer_id=? AND cr.status='settled'`).bind(customerId).first();codSettled=Number(r?.c||0)}
    if(hasReturns&&customerId){const r=await env.DB.prepare(`SELECT COUNT(*) c FROM return_requests WHERE customer_id=?`).bind(customerId).first();returnRequests=Number(r?.c||0)}

    const risk=assessCodRisk({
      total:Number(order.total||0),phone:order.phone||'',postalCode:addr.postalCode||'',addressLine:addr.addressLine||'',
      priorOrders:Number(history?.prior_orders||0),deliveredOrders:Number(history?.delivered_orders||0),cancelledOrders:Number(history?.cancelled_orders||0),
      recentOrders24h:Number(history?.recent_orders_24h||0),sameAddressRecent:Number(sameAddress?.c||0),codSettled,returnRequests
    });
    await env.DB.prepare(`INSERT OR IGNORE INTO cod_risk_assessments(order_id,score,risk_level,decision,reasons_json,policy_version) VALUES(?,?,?,?,?,?)`)
      .bind(order.id,risk.score,risk.riskLevel,risk.decision,JSON.stringify(risk.reasons),risk.policyVersion).run();
    assessed++;if(risk.decision==='review')review++;
  }
  return json({ok:true,mode:'advisory',enforcement:false,assessed,review,allow:assessed-review,policyVersion:'v1-advisory'});
}
