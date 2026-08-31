import {legacyAuthorized,getStaffSession,hasPermission,securityEvent,json} from '../../_lib/staff-auth.js';
function permissionFor(path,method){
  const name=path.split('/').filter(Boolean).pop()||'';const write=!['GET','HEAD','OPTIONS'].includes(method);
  if(name==='staff')return write?'staff.manage':'staff.read';if(name==='approvals')return 'approvals.manage';if(name==='backup')return 'backup.manage';if(['audit-log','security-events'].includes(name))return 'audit.read';
  if(['finance','cod-reconciliation','daily-closing','costs'].includes(name))return write?'finance.manage':'finance.read';if(['refund-ledger','return-refund'].includes(name))return write?'refunds.manage':'finance.read';
  if(['inventory','warehouse','receiving','picking-waves','packing-verify','shipping-label'].includes(name))return write?'inventory.manage':'inventory.read';if(name==='procurement')return write?'procurement.manage':'procurement.read';
  if(['order-action','fulfillment'].includes(name))return write?'fulfillment.manage':'orders.read';if(name==='returns')return write?'returns.manage':'orders.read';if(name==='notification-queue')return write?'notifications.manage':'orders.read';
  if(['products-manage','product-media','promotions-manage','creator-commissions'].includes(name))return write?'catalog.manage':'catalog.read';
  if(name==='orders')return write?'orders.manage':'orders.read';
  return write?'orders.manage':'analytics.read';
}
async function maybeRequirePoDualApproval(context,staff){
  const {request,env}=context;if(request.method!=='POST'||!new URL(request.url).pathname.endsWith('/procurement'))return null;const threshold=Number(env.PO_DUAL_APPROVAL_THRESHOLD||0);if(!(threshold>0))return null;
  const body=await request.clone().json().catch(()=>null);if(body?.action!=='approve_po')return null;const poNo=String(body.poNo||'').trim();if(!poNo)return null;
  const po=await env.DB.prepare(`SELECT po.id,COALESCE(SUM(poi.qty_ordered*poi.unit_cost),0) total_cost FROM purchase_orders po LEFT JOIN purchase_order_items poi ON poi.purchase_order_id=po.id WHERE po.po_no=? GROUP BY po.id`).bind(poNo).first();if(!po||Number(po.total_cost)<threshold)return null;
  const pending=await env.DB.prepare("SELECT id FROM approval_requests WHERE action_key='procurement.approve' AND entity_id=? AND status='pending' ORDER BY id DESC LIMIT 1").bind(poNo).first();let id=Number(pending?.id||0);
  if(!id){const r=await env.DB.prepare("INSERT INTO approval_requests(action_key,entity_type,entity_id,requested_by,required_approvals,payload_json) VALUES('procurement.approve','purchase_order',?,?,1,?) RETURNING id").bind(poNo,staff.id,JSON.stringify({poNo,totalCost:Number(po.total_cost)})).first();id=Number(r?.id||0)}
  await securityEvent(env,{staffUserId:staff.id,eventType:'dual_approval_requested',severity:'info',route:'/api/admin/procurement',method:'POST',statusCode:202,detail:{poNo,totalCost:Number(po.total_cost),approvalRequestId:id}});
  return json({ok:true,approvalRequired:true,approvalRequestId:id,poNo,totalCost:Number(po.total_cost)},202);
}
export async function onRequest(context){
  const {request,env}=context,url=new URL(request.url);if(legacyAuthorized(request,env))return context.next();
  const staff=await getStaffSession(request,env);if(!staff)return json({error:'staff_auth_required'},401);const permission=permissionFor(url.pathname,request.method);if(!hasPermission(staff,permission)){context.waitUntil(securityEvent(env,{staffUserId:staff.id,eventType:'permission_denied',severity:'warning',route:url.pathname,method:request.method,statusCode:403,detail:{permission,role:staff.role}}));return json({error:'permission_denied',permission},403)}
  const approval=await maybeRequirePoDualApproval(context,staff);if(approval)return approval;if(!env.ADMIN_TOKEN)return json({error:'admin_bridge_not_configured'},503);
  const headers=new Headers(request.headers);headers.set('Authorization',`Bearer ${env.ADMIN_TOKEN}`);headers.set('X-KCH-Staff-Id',String(staff.id));headers.set('X-KCH-Staff-Role',staff.role);headers.set('X-KCH-Staff-Name',staff.username);const forwarded=new Request(request,{headers});
  const response=await context.next(forwarded);if(!['GET','HEAD','OPTIONS'].includes(request.method))context.waitUntil(securityEvent(env,{staffUserId:staff.id,eventType:'admin_mutation',severity:response.status>=400?'warning':'info',route:url.pathname,method:request.method,statusCode:response.status,detail:{permission}}));return response;
}
