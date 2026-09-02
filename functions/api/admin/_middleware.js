import {legacyAuthorized,getStaffSession,hasPermission,securityEvent,json,sameOrigin,verifyStaffCsrf,tableExists} from '../../_lib/staff-auth.js';
function permissionFor(path,method){
  const name=path.split('/').filter(Boolean).pop()||'',write=!['GET','HEAD','OPTIONS'].includes(method);
  if(name==='staff')return write?'staff.manage':'staff.read';if(name==='approvals')return 'approvals.manage';if(name==='backup')return 'backup.manage';if(name==='launch-readiness')return 'launch.read';if(['audit-log','security-events'].includes(name))return 'audit.read';
  if(name==='operational-alerts')return 'orders.read';
  if(['finance','cod-reconciliation','daily-closing','costs'].includes(name))return write?'finance.manage':'finance.read';if(['refund-ledger','return-refund'].includes(name))return write?'refunds.manage':'finance.read';
  if(['inventory','warehouse','receiving','picking-waves','packing-verify','shipping-label','inventory-lots'].includes(name))return write?'inventory.manage':'inventory.read';if(name==='procurement')return write?'procurement.manage':'procurement.read';
  if(['order-action','fulfillment'].includes(name))return write?'fulfillment.manage':'orders.read';if(name==='returns')return write?'returns.manage':'orders.read';if(name==='notification-queue')return write?'notifications.manage':'orders.read';
  if(['products-manage','product-media','promotions-manage','creator-commissions','social-content'].includes(name))return write?'catalog.manage':'catalog.read';
  if(name==='orders')return write?'orders.manage':'orders.read';
  return write?'orders.manage':'analytics.read';
}
const requiredApprovals=env=>Math.min(3,Math.max(1,Number(env.HIGH_RISK_REQUIRED_APPROVALS||1)));
async function requestApproval(env,staff,{actionKey,entityType,entityId,payload,route}){
  const pending=await env.DB.prepare("SELECT id,requested_by FROM approval_requests WHERE action_key=? AND entity_id=? AND status='pending' ORDER BY id DESC LIMIT 1").bind(actionKey,String(entityId)).first();let id=Number(pending?.id||0);
  if(!id){const r=await env.DB.prepare("INSERT INTO approval_requests(action_key,entity_type,entity_id,requested_by,required_approvals,payload_json) VALUES(?,?,?,?,?,?) RETURNING id").bind(actionKey,entityType,String(entityId),staff.id,requiredApprovals(env),JSON.stringify(payload||{}).slice(0,8000)).first();id=Number(r?.id||0)}
  await securityEvent(env,{staffUserId:staff.id,eventType:'dual_approval_requested',severity:'info',route,method:'POST',statusCode:202,detail:{actionKey,entityId:String(entityId),approvalRequestId:id}});
  return json({ok:true,approvalRequired:true,approvalRequestId:id,actionKey,entityId:String(entityId)},202);
}
async function maybeRequireRiskApproval(context,staff){
  const {request,env}=context;if(request.method!=='POST')return null;const url=new URL(request.url),path=url.pathname,body=await request.clone().json().catch(()=>null);if(!body)return null;
  if(path.endsWith('/procurement')&&body.action==='approve_po'){
    const threshold=Number(env.PO_DUAL_APPROVAL_THRESHOLD||0);if(!(threshold>0))return null;const poNo=String(body.poNo||'').trim();if(!poNo)return null;
    const po=await env.DB.prepare(`SELECT po.id,po.approval_status,po.status,COALESCE(SUM(poi.qty_ordered*poi.unit_cost),0) total_cost FROM purchase_orders po LEFT JOIN purchase_order_items poi ON poi.purchase_order_id=po.id WHERE po.po_no=? GROUP BY po.id`).bind(poNo).first();
    if(!po||po.approval_status==='approved'||Number(po.total_cost)<threshold)return null;
    return requestApproval(env,staff,{actionKey:'procurement.approve',entityType:'purchase_order',entityId:poNo,payload:{poNo,totalCost:Number(po.total_cost)},route:path});
  }
  if(path.endsWith('/refund-ledger')&&body.action==='confirm_refund'){
    const threshold=Number(env.REFUND_DUAL_APPROVAL_THRESHOLD||0);if(!(threshold>0))return null;const refundId=Number(body.refundId),providerRef=String(body.providerRef||'').trim().slice(0,160);if(!refundId||providerRef.length<4)return null;
    const r=await env.DB.prepare(`SELECT r.id,r.amount,r.status,r.order_id,o.order_no,o.total,o.payment_status FROM refunds r JOIN orders o ON o.id=r.order_id WHERE r.id=?`).bind(refundId).first();
    if(!r||r.status==='completed'||Number(r.amount)<threshold)return null;
    return requestApproval(env,staff,{actionKey:'finance.refund_confirm',entityType:'refund',entityId:String(refundId),payload:{refundId,providerRef,amount:Number(r.amount),orderNo:r.order_no},route:path});
  }
  if(path.endsWith('/daily-closing')&&body.action==='close'&&String(env.DAILY_CLOSE_DUAL_APPROVAL||'false').toLowerCase()==='true'){
    const date=/^\d{4}-\d{2}-\d{2}$/.test(String(body.date||''))?String(body.date):new Date().toISOString().slice(0,10),closed=await env.DB.prepare("SELECT id FROM daily_closings WHERE closing_date=? AND status='closed'").bind(date).first();if(closed)return null;
    return requestApproval(env,staff,{actionKey:'finance.daily_close',entityType:'daily_closing',entityId:date,payload:{date},route:path});
  }
  return null;
}
export async function onRequest(context){
  const {request,env}=context,url=new URL(request.url);if(legacyAuthorized(request,env))return context.next();
  const staff=await getStaffSession(request,env);if(!staff)return json({error:'staff_auth_required'},401);const permission=permissionFor(url.pathname,request.method);if(!hasPermission(staff,permission)){context.waitUntil(securityEvent(env,{staffUserId:staff.id,eventType:'permission_denied',severity:'warning',route:url.pathname,method:request.method,statusCode:403,detail:{permission,role:staff.role}}));return json({error:'permission_denied',permission},403)}
  const unsafe=!['GET','HEAD','OPTIONS'].includes(request.method);
  if(unsafe){
    if(!sameOrigin(request))return json({error:'invalid_origin'},403);
    const csrf=await verifyStaffCsrf(request,env,staff),csrfEnforced=String(env.STAFF_CSRF_ENFORCE||'false').toLowerCase()==='true';
    if(csrfEnforced&&csrf===false){context.waitUntil(securityEvent(env,{staffUserId:staff.id,eventType:'csrf_block',severity:'warning',route:url.pathname,method:request.method,statusCode:403}));return json({error:'csrf_invalid'},403)}
    if(csrfEnforced&&csrf===null)return json({error:'csrf_security_not_ready'},503);
  }
  const approval=await maybeRequireRiskApproval(context,staff);if(approval)return approval;
  const headers=new Headers(request.headers);headers.delete('Authorization');headers.set('X-KCH-Internal-Admin','staff-session');headers.set('X-KCH-Staff-Id',String(staff.id));headers.set('X-KCH-Staff-Role',staff.role);headers.set('X-KCH-Staff-Name',staff.username);const forwarded=new Request(request,{headers});
  const response=await context.next(forwarded);if(unsafe)context.waitUntil(securityEvent(env,{staffUserId:staff.id,eventType:'admin_mutation',severity:response.status>=400?'warning':'info',route:url.pathname,method:request.method,statusCode:response.status,detail:{permission,csrfSchema:await tableExists(env,'staff_session_meta')}}));return response;
}
