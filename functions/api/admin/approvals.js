import {json,sameOrigin,securityEvent,tableExists} from '../../_lib/staff-auth.js';
const actor=request=>({id:Number(request.headers.get('X-KCH-Staff-Id'))||null,name:request.headers.get('X-KCH-Staff-Name')||'legacy'});
const money=n=>Math.round((Number(n)||0)*100)/100;
async function dailySummary(env,date){
  const r=await env.DB.prepare(`SELECT
    COALESCE(SUM(CASE WHEN entry_type='cod_collection' THEN amount ELSE 0 END),0) collected,
    COALESCE(-SUM(CASE WHEN entry_type='cod_fee' THEN amount ELSE 0 END),0) fees,
    COALESCE(-SUM(CASE WHEN entry_type='refund' THEN amount ELSE 0 END),0) refunds,
    COALESCE(-SUM(CASE WHEN entry_type='cogs' THEN amount ELSE 0 END),0) cogs,
    COUNT(DISTINCT CASE WHEN entry_type='cod_collection' THEN order_id END) orders_count
    FROM financial_ledger WHERE entry_date=?`).bind(date).first();
  const collected=money(r?.collected),fees=money(r?.fees),refunds=money(r?.refunds),cogs=money(r?.cogs);
  return {ordersCount:Number(r?.orders_count||0),grossCollected:collected,codFees:fees,refundsTotal:refunds,cogsTotal:cogs,netCash:money(collected-fees-refunds),grossProfit:money(collected-fees-refunds-cogs)};
}
async function executionStatements(env,ar,a){
  let payload={};try{payload=JSON.parse(ar.payload_json||'{}')}catch{}
  if(ar.action_key==='procurement.approve'){
    return {executed:true,detail:{poNo:ar.entity_id},statements:[env.DB.prepare("UPDATE purchase_orders SET approval_status='approved',status='ordered',approved_by=?,approved_at=datetime('now'),rejection_note=NULL,updated_at=datetime('now') WHERE po_no=? AND approval_status='pending'").bind(a.name,ar.entity_id)]};
  }
  if(ar.action_key==='finance.refund_confirm'){
    const refundId=Number(payload.refundId||ar.entity_id),providerRef=String(payload.providerRef||'').trim().slice(0,160),row=await env.DB.prepare(`SELECT r.id,r.order_id,r.amount,r.status,r.provider_ref,o.order_no,o.total,o.payment_status FROM refunds r JOIN orders o ON o.id=r.order_id WHERE r.id=?`).bind(refundId).first();
    if(!row)throw new Error('refund_not_found');if(row.status==='completed')return {executed:true,reused:true,detail:{refundId,providerRef:row.provider_ref||providerRef},statements:[]};if(!['cod_collected','paid'].includes(String(row.payment_status)))throw new Error('order_not_paid');
    const amount=money(row.amount);if(amount<=0||amount>Number(row.total)+0.01||providerRef.length<4)throw new Error('invalid_refund');
    return {executed:true,detail:{refundId,orderNo:row.order_no,amount,providerRef},statements:[
      env.DB.prepare("UPDATE refunds SET status='completed',provider_ref=?,completed_at=COALESCE(completed_at,datetime('now')),updated_at=datetime('now') WHERE id=? AND status<>'completed'").bind(providerRef,refundId),
      env.DB.prepare("INSERT OR IGNORE INTO financial_ledger(entry_type,amount,order_id,refund_id,reference_type,reference_id,description,dedupe_key) VALUES('refund',?,?,?,?,?,'ยืนยันการคืนเงินจริงผ่าน Dual Approval',?)").bind(-amount,row.order_id,refundId,'refund_provider',providerRef,`refund:${refundId}:${providerRef}`),
      env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES(?,'refund_completed',?)").bind(row.order_id,`ยืนยันคืนเงิน ${amount.toFixed(2)} บาท ผ่าน Dual Approval อ้างอิง ${providerRef}`)
    ]};
  }
  if(ar.action_key==='finance.daily_close'){
    const date=/^\d{4}-\d{2}-\d{2}$/.test(String(payload.date||ar.entity_id))?String(payload.date||ar.entity_id):String(ar.entity_id),existing=await env.DB.prepare("SELECT id FROM daily_closings WHERE closing_date=? AND status='closed'").bind(date).first();
    if(existing)return {executed:true,reused:true,detail:{date},statements:[]};const s=await dailySummary(env,date),snapshot=JSON.stringify(s);
    return {executed:true,detail:{date,...s},statements:[env.DB.prepare(`INSERT INTO daily_closings(closing_date,orders_count,gross_collected,cod_fees,refunds_total,cogs_total,net_cash,gross_profit,status,closed_by,snapshot_json)
      VALUES(?,?,?,?,?,?,?,?,'closed',?,?)
      ON CONFLICT(closing_date) DO UPDATE SET orders_count=excluded.orders_count,gross_collected=excluded.gross_collected,cod_fees=excluded.cod_fees,refunds_total=excluded.refunds_total,cogs_total=excluded.cogs_total,net_cash=excluded.net_cash,gross_profit=excluded.gross_profit,status='closed',closed_by=excluded.closed_by,closed_at=datetime('now'),snapshot_json=excluded.snapshot_json`)
      .bind(date,s.ordersCount,s.grossCollected,s.codFees,s.refundsTotal,s.cogsTotal,s.netCash,s.grossProfit,a.name,snapshot)]};
  }
  return {executed:false,detail:{actionKey:ar.action_key},statements:[]};
}
export async function onRequestGet({env}){if(!env.DB)return json({error:'database_not_bound'},503);const r=await env.DB.prepare(`SELECT ar.*,u.username requested_by_username,u.display_name requested_by_name,
  (SELECT COUNT(*) FROM approval_decisions d WHERE d.approval_request_id=ar.id AND d.decision='approved') approvals_count,
  (SELECT ae.execution_status FROM approval_executions ae WHERE ae.approval_request_id=ar.id) execution_status
  FROM approval_requests ar JOIN staff_users u ON u.id=ar.requested_by ORDER BY CASE ar.status WHEN 'pending' THEN 0 ELSE 1 END,ar.id DESC LIMIT 200`).all().catch(async()=>env.DB.prepare(`SELECT ar.*,u.username requested_by_username,u.display_name requested_by_name,
  (SELECT COUNT(*) FROM approval_decisions d WHERE d.approval_request_id=ar.id AND d.decision='approved') approvals_count,NULL execution_status
  FROM approval_requests ar JOIN staff_users u ON u.id=ar.requested_by ORDER BY CASE ar.status WHEN 'pending' THEN 0 ELSE 1 END,ar.id DESC LIMIT 200`).all());return json({requests:r.results||[]})}
export async function onRequestPost({request,env}){
  if(!sameOrigin(request))return json({error:'invalid_origin'},403);const a=actor(request);if(!a.id)return json({error:'staff_session_required_for_approval'},403);const b=await request.json().catch(()=>({})),id=Number(b.id),decision=String(b.decision||''),note=String(b.note||'').trim().slice(0,500);if(!id||!['approved','rejected'].includes(decision))return json({error:'invalid_decision'},400);
  const ar=await env.DB.prepare("SELECT * FROM approval_requests WHERE id=?").bind(id).first();if(!ar)return json({error:'approval_not_found'},404);if(ar.status!=='pending')return json({error:'approval_resolved'},409);if(Number(ar.requested_by)===a.id)return json({error:'requester_cannot_approve'},409);
  try{await env.DB.prepare("INSERT INTO approval_decisions(approval_request_id,staff_user_id,decision,note) VALUES(?,?,?,?)").bind(id,a.id,decision,note||null).run()}catch{return json({error:'already_decided'},409)}
  if(decision==='rejected'){await env.DB.prepare("UPDATE approval_requests SET status='rejected',resolved_at=datetime('now'),resolution_note=? WHERE id=?").bind(note||'rejected',id).run();await securityEvent(env,{staffUserId:a.id,eventType:'approval_rejected',severity:'warning',route:'/api/admin/approvals',method:'POST',statusCode:200,detail:{id,actionKey:ar.action_key,entityId:ar.entity_id}});return json({ok:true,status:'rejected'})}
  const c=await env.DB.prepare("SELECT COUNT(*) c FROM approval_decisions WHERE approval_request_id=? AND decision='approved'").bind(id).first();if(Number(c?.c||0)>=Number(ar.required_approvals||1)){
    let exec;try{exec=await executionStatements(env,ar,a)}catch(err){await env.DB.prepare("DELETE FROM approval_decisions WHERE approval_request_id=? AND staff_user_id=?").bind(id,a.id).run();await securityEvent(env,{staffUserId:a.id,eventType:'approval_execution_failed',severity:'critical',route:'/api/admin/approvals',method:'POST',statusCode:409,detail:{id,actionKey:ar.action_key,error:String(err?.message||'execution_failed')}});return json({error:'approval_execution_failed',reason:String(err?.message||'execution_failed')},409)}
    const batch=[...exec.statements,env.DB.prepare("UPDATE approval_requests SET status='approved',resolved_at=datetime('now'),resolution_note=? WHERE id=?").bind(note||'approved',id)];
    if(await tableExists(env,'approval_executions'))batch.push(env.DB.prepare(`INSERT INTO approval_executions(approval_request_id,execution_status,executed_by,detail_json) VALUES(?,?,?,?)
      ON CONFLICT(approval_request_id) DO UPDATE SET execution_status=excluded.execution_status,executed_by=excluded.executed_by,detail_json=excluded.detail_json,executed_at=datetime('now')`).bind(id,exec.reused?'reused':'completed',a.id,JSON.stringify(exec.detail||{}).slice(0,8000)));
    batch.push(env.DB.prepare("INSERT INTO audit_logs(actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES('staff',?,'approval.resolve',?,?,?)").bind(a.name,ar.entity_type,ar.entity_id,JSON.stringify({approvalRequestId:id,actionKey:ar.action_key,decision:'approved',executed:exec.executed,detail:exec.detail||{}}).slice(0,8000)));
    await env.DB.batch(batch);await securityEvent(env,{staffUserId:a.id,eventType:'approval_completed',route:'/api/admin/approvals',method:'POST',statusCode:200,detail:{id,actionKey:ar.action_key,entityId:ar.entity_id,executed:exec.executed}});
    return json({ok:true,status:'approved',executed:exec.executed,reused:Boolean(exec.reused),detail:exec.detail||{}});
  }
  return json({ok:true,status:'pending',approvals:Number(c?.c||0),required:Number(ar.required_approvals||1)});
}
