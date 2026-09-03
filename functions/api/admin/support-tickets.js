import {adminAuthorized,json,clean,audit} from '../../_lib/admin.js';
import {tableExists} from '../../_lib/staff-auth.js';

const STATUSES=new Set(['open','pending_customer','pending_team','resolved','closed']);
const PRIORITIES=new Set(['low','normal','high','urgent']);
const CHANNELS=new Set(['web','line','email','phone','social','other']);
const DELIVERABLE_CHANNELS=new Set(['line','email','social']);
const ASSIGNABLE_ROLES=new Set(['owner','admin','operations','support']);
const staffId=request=>{const v=Number(request.headers.get('X-KCH-Staff-Id'));return Number.isInteger(v)&&v>0?v:null};
async function ticketByNo(env,ticketNo){return env.DB.prepare(`SELECT t.*,o.order_no,o.total order_total,o.payment_method,o.payment_status,o.fulfillment_status,o.status order_status,o.created_at order_created_at,c.full_name customer_name,c.phone customer_phone,c.email customer_email,s.display_name assigned_agent FROM support_tickets t LEFT JOIN orders o ON o.id=t.order_id LEFT JOIN customers c ON c.id=t.customer_id LEFT JOIN staff_users s ON s.id=t.assigned_staff_id WHERE t.ticket_no=? LIMIT 1`).bind(ticketNo).first()}
async function addEvent(env,ticketId,type,fromStatus,toStatus,staff,detail=null){await env.DB.prepare(`INSERT INTO support_ticket_events(ticket_id,event_type,from_status,to_status,staff_user_id,detail_json) VALUES(?,?,?,?,?,?)`).bind(ticketId,type,fromStatus||null,toStatus||null,staff||null,detail==null?null:JSON.stringify(detail).slice(0,4000)).run()}
async function customerSnapshot(env,ticket){
  if(!ticket?.customer_id)return null;
  const c=await env.DB.prepare(`SELECT c.id,c.full_name,c.phone,c.email,c.created_at,c.last_login_at,
    (SELECT COUNT(*) FROM orders o WHERE o.customer_id=c.id) order_count,
    (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.customer_id=c.id AND o.payment_status IN ('paid','cod_collected')) lifetime_value,
    (SELECT MAX(o.created_at) FROM orders o WHERE o.customer_id=c.id) last_order_at,
    (SELECT COUNT(*) FROM return_requests rr WHERE rr.customer_id=c.id AND rr.status IN ('requested','reviewing','approved')) open_returns,
    (SELECT COUNT(*) FROM support_tickets st WHERE st.customer_id=c.id AND st.status NOT IN ('resolved','closed')) open_support_tickets
    FROM customers c WHERE c.id=? LIMIT 1`).bind(ticket.customer_id).first();
  if(!c)return null;
  const recent=await env.DB.prepare(`SELECT order_no,total,payment_method,payment_status,fulfillment_status,status,created_at FROM orders WHERE customer_id=? ORDER BY id DESC LIMIT 6`).bind(ticket.customer_id).all();
  const orderCount=Number(c.order_count||0),ltv=Math.round(Number(c.lifetime_value||0)*100)/100;let segment='new';if(orderCount>=5||ltv>=5000)segment='vip';else if(orderCount>=2)segment='repeat';else if(orderCount===1)segment='first_order';
  return {id:Number(c.id),name:c.full_name||'',phone:c.phone||'',email:c.email||'',createdAt:c.created_at||null,lastLoginAt:c.last_login_at||null,orderCount,lifetimeValue:ltv,lastOrderAt:c.last_order_at||null,openReturns:Number(c.open_returns||0),openSupportTickets:Number(c.open_support_tickets||0),segment,recentOrders:recent.results||[]};
}
async function supportStats(env){
  const [r,s]=await Promise.all([
    env.DB.prepare(`SELECT
      COUNT(*) total,
      SUM(CASE WHEN status NOT IN ('resolved','closed') THEN 1 ELSE 0 END) open_count,
      SUM(CASE WHEN status NOT IN ('resolved','closed') AND priority='urgent' THEN 1 ELSE 0 END) urgent_open,
      SUM(CASE WHEN status NOT IN ('resolved','closed') AND assigned_staff_id IS NULL THEN 1 ELSE 0 END) unassigned,
      SUM(CASE WHEN status='pending_team' THEN 1 ELSE 0 END) pending_team,
      SUM(CASE WHEN status NOT IN ('resolved','closed') AND first_response_at IS NULL AND sla_first_response_due_at<datetime('now') THEN 1 ELSE 0 END) first_response_breached,
      SUM(CASE WHEN status NOT IN ('resolved','closed') AND sla_resolution_due_at<datetime('now') THEN 1 ELSE 0 END) resolution_breached,
      AVG(CASE WHEN first_response_at IS NOT NULL THEN (julianday(first_response_at)-julianday(created_at))*1440 END) avg_first_response_minutes
      FROM support_tickets`).first(),
    env.DB.prepare(`SELECT COUNT(*) response_count,AVG(score) avg_score,SUM(CASE WHEN score>=4 THEN 1 ELSE 0 END) positive_count,SUM(CASE WHEN score<=2 THEN 1 ELSE 0 END) detractor_count FROM support_satisfaction`).first()
  ]);
  const responses=Number(s?.response_count||0),positive=Number(s?.positive_count||0),detractors=Number(s?.detractor_count||0);
  return {total:Number(r?.total||0),open:Number(r?.open_count||0),urgentOpen:Number(r?.urgent_open||0),unassigned:Number(r?.unassigned||0),pendingTeam:Number(r?.pending_team||0),firstResponseBreached:Number(r?.first_response_breached||0),resolutionBreached:Number(r?.resolution_breached||0),avgFirstResponseMinutes:r?.avg_first_response_minutes==null?null:Math.max(0,Math.round(Number(r.avg_first_response_minutes))),csatAverage:s?.avg_score==null?null:Math.round(Number(s.avg_score)*100)/100,csatResponses:responses,csatPositivePct:responses?Math.round((positive/responses)*1000)/10:null,csatDetractorPct:responses?Math.round((detractors/responses)*1000)/10:null};
}
async function omnichannelStats(env){
  const ready=await tableExists(env,'support_outbox')&&await tableExists(env,'support_channel_contacts')&&await tableExists(env,'support_external_events');
  if(!ready)return {schemaReady:false,pending:0,failed:0,sent:0,contacts:0,inboundEvents:0};
  const [o,c,e]=await Promise.all([
    env.DB.prepare(`SELECT SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending,SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) failed,SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) sent FROM support_outbox`).first(),
    env.DB.prepare(`SELECT COUNT(*) total FROM support_channel_contacts`).first(),
    env.DB.prepare(`SELECT COUNT(*) total FROM support_external_events WHERE direction='inbound'`).first()
  ]);
  return {schemaReady:true,pending:Number(o?.pending||0),failed:Number(o?.failed||0),sent:Number(o?.sent||0),contacts:Number(c?.total||0),inboundEvents:Number(e?.total||0)};
}
async function ticketOmnichannel(env,ticket){
  const stats=await omnichannelStats(env);if(!stats.schemaReady)return {schemaReady:false,contacts:[],outbox:[],externalEvents:[]};
  const [contacts,outbox,events]=await Promise.all([
    env.DB.prepare(`SELECT channel,external_contact_id,display_name,destination,created_at,updated_at FROM support_channel_contacts WHERE ticket_id=? ORDER BY updated_at DESC,id DESC`).bind(ticket.id).all(),
    env.DB.prepare(`SELECT id,message_id,channel,destination,status,attempt_count,next_attempt_at,last_error,external_message_id,created_at,updated_at,sent_at FROM support_outbox WHERE ticket_id=? ORDER BY id DESC LIMIT 30`).bind(ticket.id).all(),
    env.DB.prepare(`SELECT channel,external_event_id,event_type,direction,processed_at,created_at FROM support_external_events WHERE ticket_id=? ORDER BY id DESC LIMIT 30`).bind(ticket.id).all()
  ]);
  return {schemaReady:true,contacts:contacts.results||[],outbox:outbox.results||[],externalEvents:events.results||[]};
}
async function queueExternalReply(env,ticket,messageId,channel){
  if(!DELIVERABLE_CHANNELS.has(channel))return {delivery:channel==='web'?'web':'manual'};
  if(!(await tableExists(env,'support_outbox'))||!(await tableExists(env,'support_channel_contacts')))return {error:'support_omnichannel_not_ready'};
  const contact=await env.DB.prepare(`SELECT destination,external_contact_id FROM support_channel_contacts WHERE ticket_id=? AND channel=? ORDER BY updated_at DESC,id DESC LIMIT 1`).bind(ticket.id,channel).first();
  const destination=clean(contact?.destination||contact?.external_contact_id,300);if(!destination)return {error:'channel_destination_missing'};
  await env.DB.prepare(`INSERT INTO support_outbox(ticket_id,message_id,channel,destination,status,next_attempt_at) VALUES(?,?,?,?, 'pending',datetime('now')) ON CONFLICT(message_id,channel) DO NOTHING`).bind(ticket.id,messageId,channel,destination).run();
  return {delivery:'queued',destination};
}
async function agents(env){const r=await env.DB.prepare("SELECT id,display_name,username,role FROM staff_users WHERE active=1 AND role IN ('owner','admin','operations','support') ORDER BY CASE role WHEN 'support' THEN 0 WHEN 'operations' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,display_name").all();return (r.results||[]).map(x=>({id:Number(x.id),name:x.display_name||x.username,username:x.username,role:x.role}))}

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);if(!env.DB)return json({error:'database_not_bound'},503);
  const url=new URL(request.url),ticketNo=clean(url.searchParams.get('ticketNo'),80);
  if(ticketNo){const ticket=await ticketByNo(env,ticketNo);if(!ticket)return json({error:'ticket_not_found'},404);const [messages,events,customer,satisfaction,omnichannel]=await Promise.all([env.DB.prepare(`SELECT m.id,m.author_type,m.body,m.visibility,m.channel,m.created_at,COALESCE(s.display_name,c.full_name,m.author_type) author_name FROM support_messages m LEFT JOIN staff_users s ON s.id=m.staff_user_id LEFT JOIN customers c ON c.id=m.customer_id WHERE m.ticket_id=? ORDER BY m.id`).bind(ticket.id).all(),env.DB.prepare(`SELECT e.event_type,e.from_status,e.to_status,e.detail_json,e.created_at,s.display_name staff_name FROM support_ticket_events e LEFT JOIN staff_users s ON s.id=e.staff_user_id WHERE e.ticket_id=? ORDER BY e.id`).bind(ticket.id).all(),customerSnapshot(env,ticket),env.DB.prepare(`SELECT score,comment,created_at,updated_at FROM support_satisfaction WHERE ticket_id=? LIMIT 1`).bind(ticket.id).first(),ticketOmnichannel(env,ticket)]);return json({ticket,messages:messages.results||[],events:events.results||[],customer,satisfaction:satisfaction||null,omnichannel});}
  const status=clean(url.searchParams.get('status'),30),priority=clean(url.searchParams.get('priority'),30),q=clean(url.searchParams.get('q'),120),mine=clean(url.searchParams.get('mine'),10),limit=Math.max(1,Math.min(200,Number(url.searchParams.get('limit'))||80)),where=[],binds=[],sid=staffId(request);
  if(STATUSES.has(status)){where.push('t.status=?');binds.push(status)}if(PRIORITIES.has(priority)){where.push('t.priority=?');binds.push(priority)}if(mine==='1'&&sid){where.push('t.assigned_staff_id=?');binds.push(sid)}if(q){where.push('(t.ticket_no LIKE ? OR t.subject LIKE ? OR t.contact_name LIKE ? OR t.contact_phone LIKE ? OR o.order_no LIKE ?)');const like=`%${q}%`;binds.push(like,like,like,like,like)}
  let sql=`SELECT t.ticket_no,t.contact_name,t.contact_phone,t.category,t.priority,t.status,t.channel,t.subject,t.assigned_staff_id,t.sla_first_response_due_at,t.sla_resolution_due_at,t.first_response_at,t.created_at,t.updated_at,o.order_no,s.display_name assigned_agent,
  CASE WHEN t.status NOT IN ('resolved','closed') AND t.first_response_at IS NULL AND t.sla_first_response_due_at<datetime('now') THEN 1 ELSE 0 END first_response_breached,
  CASE WHEN t.status NOT IN ('resolved','closed') AND t.sla_resolution_due_at<datetime('now') THEN 1 ELSE 0 END resolution_breached,
  CAST((julianday(t.sla_first_response_due_at)-julianday('now'))*1440 AS INTEGER) first_response_minutes_left,
  CAST((julianday(t.sla_resolution_due_at)-julianday('now'))*1440 AS INTEGER) resolution_minutes_left,
  (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id=t.id) message_count,
  (SELECT ss.score FROM support_satisfaction ss WHERE ss.ticket_id=t.id LIMIT 1) satisfaction_score
  FROM support_tickets t LEFT JOIN orders o ON o.id=t.order_id LEFT JOIN staff_users s ON s.id=t.assigned_staff_id`;if(where.length)sql+=` WHERE ${where.join(' AND ')}`;sql+=' ORDER BY CASE WHEN t.status NOT IN (\'resolved\',\'closed\') AND t.first_response_at IS NULL AND t.sla_first_response_due_at<datetime(\'now\') THEN 0 WHEN t.status NOT IN (\'resolved\',\'closed\') AND t.sla_resolution_due_at<datetime(\'now\') THEN 1 ELSE 2 END,CASE t.priority WHEN \'urgent\' THEN 0 WHEN \'high\' THEN 1 WHEN \'normal\' THEN 2 ELSE 3 END,t.updated_at DESC LIMIT ?';binds.push(limit);const [rows,stats,agentRows,omnichannel]=await Promise.all([env.DB.prepare(sql).bind(...binds).all(),supportStats(env),agents(env),omnichannelStats(env)]);return json({tickets:rows.results||[],stats,agents:agentRows,omnichannel});
}

export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>({})),action=clean(b.action,40),ticketNo=clean(b.ticketNo,80),ticket=await ticketByNo(env,ticketNo);if(!ticket)return json({error:'ticket_not_found'},404);const sid=staffId(request);
  if(action==='reply'||action==='note'){
    const body=clean(b.message,5000),visibility=action==='note'?'internal':'public';if(body.length<2)return json({error:'invalid_message'},400);
    let channel=CHANNELS.has(clean(b.channel,20))?clean(b.channel,20):ticket.channel||'web';if(action==='reply'&&DELIVERABLE_CHANNELS.has(ticket.channel))channel=ticket.channel;
    if(action==='reply'&&DELIVERABLE_CHANNELS.has(channel)){
      if(!(await tableExists(env,'support_outbox'))||!(await tableExists(env,'support_channel_contacts')))return json({error:'support_omnichannel_not_ready'},409);
      const target=await env.DB.prepare(`SELECT destination,external_contact_id FROM support_channel_contacts WHERE ticket_id=? AND channel=? ORDER BY updated_at DESC,id DESC LIMIT 1`).bind(ticket.id,channel).first();if(!clean(target?.destination||target?.external_contact_id,300))return json({error:'channel_destination_missing'},409);
    }
    const inserted=await env.DB.prepare(`INSERT INTO support_messages(ticket_id,author_type,staff_user_id,body,visibility,channel) VALUES(?,?,?,?,?,?) RETURNING id`).bind(ticket.id,'staff',sid,body,visibility,channel).first();let next=ticket.status,delivery='internal';
    if(action==='reply'){
      const queued=await queueExternalReply(env,ticket,Number(inserted.id),channel);if(queued.error)return json({error:queued.error},409);delivery=queued.delivery;next='pending_customer';await env.DB.prepare("UPDATE support_tickets SET status=?,first_response_at=COALESCE(first_response_at,datetime('now')),updated_at=datetime('now') WHERE id=?").bind(next,ticket.id).run();
    }else await env.DB.prepare("UPDATE support_tickets SET updated_at=datetime('now') WHERE id=?").bind(ticket.id).run();
    await addEvent(env,ticket.id,action==='reply'?'staff_replied':'internal_note_added',ticket.status,next,sid,{channel,delivery,messageId:Number(inserted.id)});await audit(env,{action:`support.${action}`,entityType:'support_ticket',entityId:ticketNo,metadata:{channel,delivery,messageId:Number(inserted.id)},actorId:sid||'legacy-admin'});return json({ok:true,status:next,delivery,messageId:Number(inserted.id)});
  }
  if(action==='assign_self'){
    if(!sid)return json({error:'staff_session_required'},409);await env.DB.prepare("UPDATE support_tickets SET assigned_staff_id=?,updated_at=datetime('now') WHERE id=?").bind(sid,ticket.id).run();await addEvent(env,ticket.id,'assigned',ticket.status,ticket.status,sid,{assignedStaffId:sid});return json({ok:true,assignedStaffId:sid});
  }
  if(action==='update'){
    const nextStatus=STATUSES.has(clean(b.status,30))?clean(b.status,30):ticket.status,nextPriority=PRIORITIES.has(clean(b.priority,30))?clean(b.priority,30):ticket.priority;let assigned=ticket.assigned_staff_id;if(b.assignedStaffId!==undefined){const x=Number(b.assignedStaffId);assigned=Number.isInteger(x)&&x>0?x:null}
    if(assigned){const exists=await env.DB.prepare('SELECT id,role FROM staff_users WHERE id=? AND active=1 LIMIT 1').bind(assigned).first();if(!exists||!ASSIGNABLE_ROLES.has(String(exists.role)))return json({error:'support_agent_not_found'},404)}
    const resolved=['resolved','closed'].includes(nextStatus)?'COALESCE(resolved_at,datetime(\'now\'))':'NULL';await env.DB.prepare(`UPDATE support_tickets SET status=?,priority=?,assigned_staff_id=?,resolved_at=${resolved},updated_at=datetime('now') WHERE id=?`).bind(nextStatus,nextPriority,assigned,ticket.id).run();await addEvent(env,ticket.id,'ticket_updated',ticket.status,nextStatus,sid,{priorityFrom:ticket.priority,priorityTo:nextPriority,assignedStaffId:assigned});await audit(env,{action:'support.update',entityType:'support_ticket',entityId:ticketNo,metadata:{status:nextStatus,priority:nextPriority,assignedStaffId:assigned},actorId:sid||'legacy-admin'});return json({ok:true,status:nextStatus,priority:nextPriority,assignedStaffId:assigned});
  }
  return json({error:'invalid_action'},400);
}
