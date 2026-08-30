function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
const EVENTS=new Set(['content_view','creator_view','product_pin_click','add_to_cart','checkout_start']);
const SOURCES=new Set(['direct','shop','live','video','creator']);
const posInt=v=>{const n=Number(v);return Number.isInteger(n)&&n>0?n:null};
export async function onRequestPost({request,env}){
  if(!env.DB) return json({error:'database_not_bound'},503);
  const len=Number(request.headers.get('content-length')||0);if(len>4096)return json({error:'payload_too_large'},413);
  const origin=request.headers.get('Origin');if(origin){try{if(new URL(origin).host!==new URL(request.url).host)return json({error:'cross_origin_forbidden'},403)}catch{return json({error:'invalid_origin'},400)}}
  const body=await request.json().catch(()=>null);if(!body)return json({error:'invalid_request'},400);
  const eventType=String(body.eventType||'').trim(),source=SOURCES.has(body.source)?body.source:'direct';
  if(!EVENTS.has(eventType))return json({error:'invalid_event'},400);
  const creatorId=posInt(body.creatorId),contentId=posInt(body.contentId),productId=posInt(body.productId);
  await env.DB.prepare("INSERT INTO commerce_events(event_type,source_channel,creator_id,content_id,product_id) VALUES(?,?,?,?,?)").bind(eventType,source,creatorId,contentId,productId).run();
  return json({ok:true},202);
}
