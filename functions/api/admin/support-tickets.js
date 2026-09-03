import {adminAuthorized,json,clean,audit} from '../../_lib/admin.js';

const STATUSES=new Set(['open','pending_customer','pending_team','resolved','closed']);
const PRIORITIES=new Set(['low','normal','high','urgent']);
const CHANNELS=new Set(['web','line','email','phone','social','other']);
const staffId=request=>{const v=Number(request.headers.get('X-KCH-Staff-Id'));return Number.isInteger(v)&&v>0?v:null};
async function ticketByNo(env,ticketNo){return env.DB.prepare(`SELECT t.*,o.order_no,o.total order_total,o.payment_method,o.payment_status,o.fulfillment_status,c.full_name customer_name,c.phone customer_phone,c.email customer_email,s.display_name assigned_agent FROM support_tickets t LEFT JOIN orders o ON o.id=t.order_id LEFT JOIN customers c ON c.id=t.customer_id LEFT JOIN staff_users s ON s.id=t.assigned_staff_id WHERE t.ticket_no=? LIMIT 1`).bind(ticketNo).first()}
async function addEvent(env,ticketId,type,fromStatus,toStatus,staff,detail=null){await env.DB.prepare(`INSERT INTO support_ticket_events(ticket_id,event_type,from_status,to_status,staff_user_id,detail_json) VALUES(?,?,?,?,?,?)`).bind(ticketId,type,fromStatus||null,toStatus||null,staff||null,detail==null?null:JSON.stringify(detail).slice(0,4000)).run()}

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);if(!env.DB)return json({error:'database_not_bound'},503);
  const url=new URL(request.url),ticketNo=clean(url.searchParams.get('ticketNo'),80);
  if(ticketNo){const ticket=await ticketByNo(env,ticketNo);if(!ticket)return json({error:'ticket_not_found'},404);const messages=await env.DB.prepare(`SELECT m.id,m.author_type,m.body,m.visibility,m.channel,m.created_at,COALESCE(s.display_name,c.full_name,m.author_type) author_name FROM support_messages m LEFT JOIN staff_users s ON s.id=m.staff_user_id LEFT JOIN customers c ON c.id=m.customer_id WHERE m.ticket_id=? ORDER BY m.id`).bind(ticket.id).all();const events=await env.DB.prepare(`SELECT e.event_type,e.from_status,e.to_status,e.detail_json,e.created_at,s.display_name staff_name FROM support_ticket_events e LEFT JOIN staff_users s ON s.id=e.staff_user_id WHERE e.ticket_id=? ORDER BY e.id`).bind(ticket.id).all();return json({ticket,messages:messages.results||[],events:events.results||[]});}
  const status=clean(url.searchParams.get('status'),30),priority=clean(url.searchParams.get('priority'),30),q=clean(url.searchParams.get('q'),120),limit=Math.max(1,Math.min(200,Number(url.searchParams.get('limit'))||80)),where=[],binds=[];
  if(STATUSES.has(status)){where.push('t.status=?');binds.push(status)}if(PRIORITIES.has(priority)){where.push('t.priority=?');binds.push(priority)}if(q){where.push('(t.ticket_no LIKE ? OR t.subject LIKE ? OR t.contact_name LIKE ? OR o.order_no LIKE ?)');const like=`%${q}%`;binds.push(like,like,like,like)}
  let sql=`SELECT t.ticket_no,t.contact_name,t.category,t.priority,t.status,t.channel,t.subject,t.assigned_staff_id,t.sla_first_response_due_at,t.sla_resolution_due_at,t.first_response_at,t.created_at,t.updated_at,o.order_no,s.display_name assigned_agent,(SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id=t.id) message_count FROM support_tickets t LEFT JOIN orders o ON o.id=t.order_id LEFT JOIN staff_users s ON s.id=t.assigned_staff_id`;if(where.length)sql+=` WHERE ${where.join(' AND ')}`;sql+=' ORDER BY CASE t.priority WHEN \'urgent\' THEN 0 WHEN \'high\' THEN 1 WHEN \'normal\' THEN 2 ELSE 3 END,t.updated_at DESC LIMIT ?';binds.push(limit);const rows=await env.DB.prepare(sql).bind(...binds).all();return json({tickets:rows.results||[]});
}

export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>({})),action=clean(b.action,40),ticketNo=clean(b.ticketNo,80),ticket=await ticketByNo(env,ticketNo);if(!ticket)return json({error:'ticket_not_found'},404);const sid=staffId(request);
  if(action==='reply'||action==='note'){
    const body=clean(b.message,5000),visibility=action==='note'?'internal':'public',channel=CHANNELS.has(clean(b.channel,20))?clean(b.channel,20):'web';if(body.length<2)return json({error:'invalid_message'},400);
    await env.DB.prepare(`INSERT INTO support_messages(ticket_id,author_type,staff_user_id,body,visibility,channel) VALUES(?,?,?,?,?,?)`).bind(ticket.id,'staff',sid,body,visibility,channel).run();let next=ticket.status;
    if(action==='reply'){next='pending_customer';await env.DB.prepare("UPDATE support_tickets SET status=?,first_response_at=COALESCE(first_response_at,datetime('now')),updated_at=datetime('now') WHERE id=?").bind(next,ticket.id).run();}
    else await env.DB.prepare("UPDATE support_tickets SET updated_at=datetime('now') WHERE id=?").bind(ticket.id).run();await addEvent(env,ticket.id,action==='reply'?'staff_replied':'internal_note_added',ticket.status,next,sid,{channel});await audit(env,{action:`support.${action}`,entityType:'support_ticket',entityId:ticketNo,actorId:sid||'legacy-admin'});return json({ok:true,status:next});
  }
  if(action==='assign_self'){
    if(!sid)return json({error:'staff_session_required'},409);await env.DB.prepare("UPDATE support_tickets SET assigned_staff_id=?,updated_at=datetime('now') WHERE id=?").bind(sid,ticket.id).run();await addEvent(env,ticket.id,'assigned',ticket.status,ticket.status,sid,{assignedStaffId:sid});return json({ok:true,assignedStaffId:sid});
  }
  if(action==='update'){
    const nextStatus=STATUSES.has(clean(b.status,30))?clean(b.status,30):ticket.status,nextPriority=PRIORITIES.has(clean(b.priority,30))?clean(b.priority,30):ticket.priority;let assigned=ticket.assigned_staff_id;if(b.assignedStaffId!==undefined){const x=Number(b.assignedStaffId);assigned=Number.isInteger(x)&&x>0?x:null}
    if(assigned){const exists=await env.DB.prepare('SELECT id FROM staff_users WHERE id=? AND active=1 LIMIT 1').bind(assigned).first();if(!exists)return json({error:'staff_not_found'},404)}
    const resolved=['resolved','closed'].includes(nextStatus)?'COALESCE(resolved_at,datetime(\'now\'))':'NULL';await env.DB.prepare(`UPDATE support_tickets SET status=?,priority=?,assigned_staff_id=?,resolved_at=${resolved},updated_at=datetime('now') WHERE id=?`).bind(nextStatus,nextPriority,assigned,ticket.id).run();await addEvent(env,ticket.id,'ticket_updated',ticket.status,nextStatus,sid,{priorityFrom:ticket.priority,priorityTo:nextPriority,assignedStaffId:assigned});await audit(env,{action:'support.update',entityType:'support_ticket',entityId:ticketNo,metadata:{status:nextStatus,priority:nextPriority,assignedStaffId:assigned},actorId:sid||'legacy-admin'});return json({ok:true,status:nextStatus,priority:nextPriority,assignedStaffId:assigned});
  }
  return json({error:'invalid_action'},400);
}
