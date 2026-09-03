import {json,clean,sha256Hex,randomHex,tableExists,hitRateLimit} from '../../_lib/staff-auth.js';

const CHANNELS=new Set(['line','email','social','phone','other']);
const CATEGORIES=new Set(['order','shipping','payment','return','product','account','other']);
const normalizePhone=v=>String(v??'').replace(/\D/g,'').slice(-10);
const safeEmail=v=>{const x=clean(v,180).toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)?x:''};
const afterHours=h=>new Date(Date.now()+h*3600000).toISOString();
const constantTimeEqual=(a,b)=>{a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0};
function authToken(request){const bearer=String(request.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'').trim();return bearer||String(request.headers.get('X-KCH-Support-Ingest')||'').trim()}
function clientFingerprint(request,channel){return `${channel}|${request.headers.get('CF-Connecting-IP')||'unknown'}|${String(request.headers.get('User-Agent')||'').slice(0,160)}`}
function priorityFor(category,text){const t=String(text||'').toLowerCase();if(/ฉุกเฉิน|ด่วนมาก|ไม่ได้รับสินค้า|ถูกหักเงินซ้ำ|เงินหาย/.test(t))return 'urgent';if(category==='payment'||category==='return'||/คืนเงิน|เสียหาย|ผิดรายการ|ชำระ/.test(t))return 'high';return 'normal'}
function sla(priority){if(priority==='urgent')return {first:1,resolution:12};if(priority==='high')return {first:2,resolution:24};if(priority==='low')return {first:24,resolution:120};return {first:8,resolution:72}}
async function schemaReady(env){for(const name of ['support_tickets','support_messages','support_ticket_events','support_channel_contacts','support_external_events'])if(!(await tableExists(env,name)))return false;return true}
async function findOpenTicketByContact(env,channel,externalContactId){return env.DB.prepare(`SELECT t.* FROM support_channel_contacts cc JOIN support_tickets t ON t.id=cc.ticket_id WHERE cc.channel=? AND cc.external_contact_id=? AND t.status!='closed' ORDER BY t.updated_at DESC,t.id DESC LIMIT 1`).bind(channel,externalContactId).first()}
async function findTicket(env,ticketNo){const no=clean(ticketNo,80);if(!no)return null;return env.DB.prepare('SELECT * FROM support_tickets WHERE ticket_no=? LIMIT 1').bind(no).first()}
async function findOrder(env,orderNo){const no=clean(orderNo,80);if(!no)return null;return env.DB.prepare('SELECT id,order_no,customer_id,full_name,phone,email FROM orders WHERE order_no=? LIMIT 1').bind(no).first()}
async function createTicket(env,b,channel){
  const category=CATEGORIES.has(clean(b.category,30))?clean(b.category,30):'other',subject=clean(b.subject||`ข้อความจาก ${channel}`,180),message=clean(b.message,5000),priority=priorityFor(category,`${subject} ${message}`),limits=sla(priority),order=await findOrder(env,b.orderNo),ticketNo=`KCH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${randomHex(5).toUpperCase()}`,accessHash=await sha256Hex(randomHex(16));
  const contactName=clean(b.displayName||order?.full_name||`${channel} customer`,160),phone=normalizePhone(b.phone||order?.phone),email=safeEmail(b.email||order?.email);
  const row=await env.DB.prepare(`INSERT INTO support_tickets(ticket_no,customer_id,order_id,contact_name,contact_phone,contact_email,category,priority,status,channel,subject,access_code_hash,sla_first_response_due_at,sla_resolution_due_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *`).bind(ticketNo,order?.customer_id||null,order?.id||null,contactName||`${channel} customer`,phone||null,email||null,category,priority,'open',channel,subject||`ข้อความจาก ${channel}`,accessHash,afterHours(limits.first),afterHours(limits.resolution)).first();
  await env.DB.prepare(`INSERT INTO support_ticket_events(ticket_id,event_type,to_status,detail_json) VALUES(?,?,?,?)`).bind(row.id,'external_ticket_created','open',JSON.stringify({channel,externalContactId:clean(b.externalContactId,220),orderNo:order?.order_no||null})).run();
  return row;
}

export async function onRequestPost({request,env}){
  if(!env.DB)return json({error:'database_not_bound'},503);
  const expected=String(env.SUPPORT_INGEST_SECRET||'');if(expected.length<24)return json({error:'support_ingest_disabled'},503);
  const provided=authToken(request);if(provided.length<16)return json({error:'unauthorized'},401);
  const [expectedHash,providedHash]=await Promise.all([sha256Hex(expected),sha256Hex(provided)]);if(!constantTimeEqual(expectedHash,providedHash))return json({error:'unauthorized'},401);
  if(!(await schemaReady(env)))return json({error:'support_omnichannel_not_ready'},503);
  const b=await request.json().catch(()=>({})),channel=clean(b.channel,20).toLowerCase(),externalEventId=clean(b.externalEventId,240),externalContactId=clean(b.externalContactId,220),message=clean(b.message,5000);
  if(!CHANNELS.has(channel)||externalEventId.length<3||externalContactId.length<2||message.length<1)return json({error:'invalid_external_event'},400);
  const rate=await hitRateLimit(env,{scope:'support.ingest',fingerprint:clientFingerprint(request,channel),limit:240,windowSeconds:3600});if(!rate.allowed)return json({error:'rate_limited',retryAfter:rate.retryAfter},429,{'Retry-After':String(rate.retryAfter)});
  const duplicate=await env.DB.prepare('SELECT e.id,e.ticket_id,t.ticket_no FROM support_external_events e LEFT JOIN support_tickets t ON t.id=e.ticket_id WHERE e.channel=? AND e.external_event_id=? LIMIT 1').bind(channel,externalEventId).first();if(duplicate)return json({ok:true,duplicate:true,ticketNo:duplicate.ticket_no||null});
  let ticket=await findTicket(env,b.ticketNo);if(!ticket)ticket=await findOpenTicketByContact(env,channel,externalContactId);if(!ticket)ticket=await createTicket(env,{...b,message},channel);
  const destination=clean(b.destination,300)||safeEmail(b.email)||normalizePhone(b.phone)||externalContactId;
  await env.DB.prepare(`INSERT INTO support_channel_contacts(ticket_id,channel,external_contact_id,display_name,destination,metadata_json) VALUES(?,?,?,?,?,?) ON CONFLICT(ticket_id,channel,external_contact_id) DO UPDATE SET display_name=COALESCE(excluded.display_name,support_channel_contacts.display_name),destination=COALESCE(excluded.destination,support_channel_contacts.destination),metadata_json=COALESCE(excluded.metadata_json,support_channel_contacts.metadata_json),updated_at=datetime('now')`).bind(ticket.id,channel,externalContactId,clean(b.displayName,160)||null,destination||null,b.contactMetadata?JSON.stringify(b.contactMetadata).slice(0,4000):null).run();
  const msg=await env.DB.prepare(`INSERT INTO support_messages(ticket_id,author_type,customer_id,body,visibility,channel,metadata_json) VALUES(?,?,?,?,?,?,?) RETURNING id`).bind(ticket.id,'customer',ticket.customer_id||null,message,'public',channel,JSON.stringify({externalEventId,externalContactId}).slice(0,4000)).first();
  await env.DB.prepare(`INSERT INTO support_external_events(ticket_id,channel,external_event_id,event_type,direction,payload_json,processed_at) VALUES(?,?,?,?,?,?,datetime('now'))`).bind(ticket.id,channel,externalEventId,clean(b.eventType||'message',80),'inbound',JSON.stringify({messageId:msg.id,metadata:b.metadata||null}).slice(0,8000)).run();
  const from=ticket.status,to=ticket.status==='closed'?'closed':'pending_team';if(to!=='closed')await env.DB.prepare("UPDATE support_tickets SET status='pending_team',resolved_at=NULL,updated_at=datetime('now') WHERE id=?").bind(ticket.id).run();
  await env.DB.prepare(`INSERT INTO support_ticket_events(ticket_id,event_type,from_status,to_status,detail_json) VALUES(?,?,?,?,?)`).bind(ticket.id,'external_message_received',from,to,JSON.stringify({channel,externalEventId,messageId:msg.id})).run();
  return json({ok:true,duplicate:false,ticketNo:ticket.ticket_no,status:to,messageId:Number(msg.id)},202);
}
