import {getCustomer,normalizePhone,sameOrigin,json} from '../../_lib/customer-auth.js';
import {sha256Hex,randomHex,hitRateLimit,tableExists} from '../../_lib/staff-auth.js';

const CATEGORIES=new Set(['order','shipping','payment','return','product','account','other']);
const CHANNELS=new Set(['web','line','email','phone','social','other']);
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const email=v=>{const x=clean(v,180).toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)?x:''};
const isoAfterHours=h=>new Date(Date.now()+h*3600000).toISOString();
const fp=request=>`${request.headers.get('CF-Connecting-IP')||'unknown'}|${String(request.headers.get('User-Agent')||'').slice(0,180)}`;
function category(v){const x=clean(v,30).toLowerCase();return CATEGORIES.has(x)?x:'other'}
function priorityFor(cat,text){const t=String(text||'').toLowerCase();if(/ด่วนมาก|ฉุกเฉิน|ถูกหักเงินซ้ำ|เงินหาย|ไม่ได้รับสินค้า/.test(t))return 'urgent';if(cat==='payment'||cat==='return'||/ชำระ|คืนเงิน|เสียหาย|ผิดรายการ/.test(t))return 'high';return 'normal'}
function slaFor(priority){if(priority==='urgent')return {first:1,resolution:12};if(priority==='high')return {first:2,resolution:24};if(priority==='low')return {first:24,resolution:120};return {first:8,resolution:72}}
async function ready(env){return Boolean(env.DB)&&await tableExists(env,'support_tickets')&&await tableExists(env,'support_messages')}
async function findOrder(env,orderNo,customer,phone){const no=clean(orderNo,80);if(!no)return null;const row=await env.DB.prepare('SELECT id,order_no,customer_id,phone FROM orders WHERE order_no=? LIMIT 1').bind(no).first();if(!row)return false;const sessionOk=customer&&Number(row.customer_id||0)===Number(customer.customer_id);const phoneOk=phone&&normalizePhone(row.phone)===phone;return sessionOk||phoneOk?row:false}
async function authorizeTicket(request,env,ticketNo,accessCode){const ticket=await env.DB.prepare(`SELECT t.*,o.order_no,s.display_name assigned_agent FROM support_tickets t LEFT JOIN orders o ON o.id=t.order_id LEFT JOIN staff_users s ON s.id=t.assigned_staff_id WHERE t.ticket_no=? LIMIT 1`).bind(ticketNo).first();if(!ticket)return {ok:false,response:json({error:'ticket_not_found'},404)};const customer=await getCustomer(request,env);if(customer&&Number(ticket.customer_id||0)===Number(customer.customer_id))return {ok:true,ticket,customer};const code=clean(accessCode,40).toLowerCase();if(code&&await sha256Hex(code)===String(ticket.access_code_hash||''))return {ok:true,ticket,customer:null};return {ok:false,response:json({error:'ticket_access_denied'},403)}}
async function ticketDetail(env,ticket){const messages=await env.DB.prepare(`SELECT m.id,m.author_type,m.body,m.channel,m.created_at,CASE WHEN m.author_type='staff' THEN COALESCE(s.display_name,'ทีมบริการลูกค้า') ELSE NULL END author_name FROM support_messages m LEFT JOIN staff_users s ON s.id=m.staff_user_id WHERE m.ticket_id=? AND m.visibility='public' ORDER BY m.id`).bind(ticket.id).all();return {...ticket,access_code_hash:undefined,messages:messages.results||[]}}

export async function onRequestGet({request,env}){
  if(!(await ready(env)))return json({error:'support_not_ready'},503);
  const url=new URL(request.url),ticketNo=clean(url.searchParams.get('ticketNo'),80),accessCode=clean(url.searchParams.get('accessCode'),40);
  if(ticketNo){const auth=await authorizeTicket(request,env,ticketNo,accessCode);if(!auth.ok)return auth.response;return json({ticket:await ticketDetail(env,auth.ticket)});}
  const customer=await getCustomer(request,env);if(!customer)return json({error:'ticket_no_required'},400);
  const rows=await env.DB.prepare(`SELECT t.ticket_no,t.category,t.priority,t.status,t.subject,t.sla_first_response_due_at,t.sla_resolution_due_at,t.created_at,t.updated_at,o.order_no,(SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id=t.id AND m.visibility='public') message_count FROM support_tickets t LEFT JOIN orders o ON o.id=t.order_id WHERE t.customer_id=? ORDER BY t.updated_at DESC LIMIT 50`).bind(customer.customer_id).all();
  return json({tickets:rows.results||[]});
}

export async function onRequestPost({request,env}){
  if(!sameOrigin(request))return json({error:'invalid_origin'},403);
  if(!(await ready(env)))return json({error:'support_not_ready'},503);
  const rate=await hitRateLimit(env,{scope:'support.public',fingerprint:fp(request),limit:30,windowSeconds:3600});if(!rate.allowed)return json({error:'rate_limited',retryAfter:rate.retryAfter},429,{'Retry-After':String(rate.retryAfter)});
  const b=await request.json().catch(()=>({})),action=clean(b.action||'create',30).toLowerCase();
  if(action==='create'){
    const customer=await getCustomer(request,env),cat=category(b.category),subject=clean(b.subject,180),message=clean(b.message,5000),name=clean(b.name||customer?.full_name,160),phone=normalizePhone(b.phone||customer?.phone),mail=email(b.email||customer?.email),channel=CHANNELS.has(clean(b.channel,20))?clean(b.channel,20):'web';
    if(name.length<2||(!phone&&!mail)||subject.length<4||message.length<10)return json({error:'invalid_ticket'},400);
    const order=await findOrder(env,b.orderNo,customer,phone);if(order===false)return json({error:'order_not_found_or_phone_mismatch'},404);
    const priority=priorityFor(cat,`${subject} ${message}`),sla=slaFor(priority),ticketNo=`KCH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${randomHex(5).toUpperCase()}`,accessCode=randomHex(8).toLowerCase(),accessHash=await sha256Hex(accessCode);
    const row=await env.DB.prepare(`INSERT INTO support_tickets(ticket_no,customer_id,order_id,contact_name,contact_phone,contact_email,category,priority,status,channel,subject,access_code_hash,sla_first_response_due_at,sla_resolution_due_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id,created_at`).bind(ticketNo,customer?.customer_id||null,order?.id||null,name,phone||null,mail||null,cat,priority,'open',channel,subject,accessHash,isoAfterHours(sla.first),isoAfterHours(sla.resolution)).first();
    await env.DB.prepare(`INSERT INTO support_messages(ticket_id,author_type,customer_id,body,visibility,channel) VALUES(?,?,?,?,?,?)`).bind(row.id,'customer',customer?.customer_id||null,message,'public',channel).run();
    await env.DB.prepare(`INSERT INTO support_ticket_events(ticket_id,event_type,to_status,detail_json) VALUES(?,?,?,?)`).bind(row.id,'ticket_created','open',JSON.stringify({category:cat,priority,orderNo:order?.order_no||null})).run();
    return json({ok:true,ticketNo,accessCode,status:'open',priority,sla:{firstResponseDueAt:isoAfterHours(sla.first),resolutionDueAt:isoAfterHours(sla.resolution)},createdAt:row.created_at},201);
  }
  const ticketNo=clean(b.ticketNo,80),accessCode=clean(b.accessCode,40),auth=await authorizeTicket(request,env,ticketNo,accessCode);if(!auth.ok)return auth.response;
  if(action==='reply'){
    const message=clean(b.message,5000);if(message.length<2)return json({error:'invalid_message'},400);if(auth.ticket.status==='closed')return json({error:'ticket_closed'},409);
    await env.DB.prepare(`INSERT INTO support_messages(ticket_id,author_type,customer_id,body,visibility,channel) VALUES(?,?,?,?,?,?)`).bind(auth.ticket.id,'customer',auth.customer?.customer_id||auth.ticket.customer_id||null,message,'public','web').run();
    const from=auth.ticket.status,to='pending_team';await env.DB.prepare("UPDATE support_tickets SET status=?,resolved_at=NULL,updated_at=datetime('now') WHERE id=?").bind(to,auth.ticket.id).run();await env.DB.prepare(`INSERT INTO support_ticket_events(ticket_id,event_type,from_status,to_status) VALUES(?,?,?,?)`).bind(auth.ticket.id,'customer_replied',from,to).run();return json({ok:true,status:to});
  }
  if(action==='close'){
    if(auth.ticket.status==='closed')return json({ok:true,status:'closed'});await env.DB.prepare("UPDATE support_tickets SET status='closed',resolved_at=COALESCE(resolved_at,datetime('now')),updated_at=datetime('now') WHERE id=?").bind(auth.ticket.id).run();await env.DB.prepare(`INSERT INTO support_ticket_events(ticket_id,event_type,from_status,to_status) VALUES(?,?,?,'closed')`).bind(auth.ticket.id,'customer_closed',auth.ticket.status).run();return json({ok:true,status:'closed'});
  }
  if(action==='rate'){
    const rawScore=Math.trunc(Number(b.score)||0),score=rawScore>=1&&rawScore<=5?rawScore:0,comment=clean(b.comment,1000);if(!score||!['resolved','closed'].includes(auth.ticket.status))return json({error:'rating_not_available'},409);await env.DB.prepare(`INSERT INTO support_satisfaction(ticket_id,customer_id,score,comment) VALUES(?,?,?,?) ON CONFLICT(ticket_id) DO UPDATE SET score=excluded.score,comment=excluded.comment,updated_at=datetime('now')`).bind(auth.ticket.id,auth.customer?.customer_id||auth.ticket.customer_id||null,score,comment||null).run();return json({ok:true,score});
  }
  return json({error:'invalid_action'},400);
}
