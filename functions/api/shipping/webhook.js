import {reconcileCod} from '../../_lib/finance.js';
const enc=new TextEncoder();
function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
function hex(bytes){return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function sign(raw,secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,enc.encode(raw)))}
function safeEq(a,b){if(!a||!b||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
const money=n=>Math.round((Number(n)||0)*100)/100;

async function reservationStatements(env,row,orderNo){
  const rr=await env.DB.prepare(`SELECT sr.id,sr.product_id,sr.variant_id,sr.qty,COALESCE(v.cost_price,p.cost_price,0) cost_price
    FROM stock_reservations sr JOIN products p ON p.id=sr.product_id LEFT JOIN product_variants v ON v.id=sr.variant_id
    WHERE sr.order_id=? AND sr.status='active' ORDER BY sr.id`).bind(row.order_id).all();
  const out=[];
  for(const x of rr.results||[]){
    if(x.variant_id)out.push(env.DB.prepare("UPDATE product_variants SET stock=stock-?,reserved_stock=reserved_stock-?,updated_at=datetime('now') WHERE id=?").bind(x.qty,x.qty,x.variant_id));
    else out.push(env.DB.prepare("UPDATE products SET stock=stock-?,reserved_stock=reserved_stock-?,updated_at=datetime('now') WHERE id=?").bind(x.qty,x.qty,x.product_id));
    out.push(env.DB.prepare("UPDATE products SET sold_count=sold_count+?,updated_at=datetime('now') WHERE id=?").bind(x.qty,x.product_id));
    out.push(env.DB.prepare("UPDATE stock_reservations SET status='committed',committed_at=datetime('now') WHERE id=? AND status='active'").bind(x.id));
    out.push(env.DB.prepare("INSERT INTO inventory_movements(product_id,variant_id,movement_type,qty,reference_type,reference_id,note) VALUES(?,?,'sale',?,'order',?,'ตัดสต๊อกจาก shipping webhook')").bind(x.product_id,x.variant_id,-Number(x.qty),orderNo));
    const cogs=money(Number(x.cost_price||0)*Number(x.qty));if(cogs>0)out.push(env.DB.prepare("INSERT OR IGNORE INTO financial_ledger(entry_type,amount,order_id,reference_type,reference_id,description,dedupe_key) VALUES('cogs',?,?,'order',?,'ต้นทุนสินค้าที่จัดส่ง',?)").bind(-cogs,row.order_id,orderNo,`cogs:${orderNo}:${x.id}`));
  }
  return out;
}

export async function onRequestPost({request,env}){
  if(!env.SHIPPING_WEBHOOK_SECRET)return json({error:'shipping_webhook_not_configured'},503);
  const raw=await request.text(),expected=await sign(raw,env.SHIPPING_WEBHOOK_SECRET),provided=(request.headers.get('X-KCH-Signature')||'').toLowerCase();if(!safeEq(expected,provided))return json({error:'invalid_signature'},401);
  let b={};try{b=JSON.parse(raw||'{}')}catch{return json({error:'invalid_json'},400)}
  const orderNo=String(b.orderNo||'').trim(),provider=String(b.provider||'carrier').trim().slice(0,40),eventId=String(b.eventId||'').trim().slice(0,120),status=String(b.status||'').trim().slice(0,40),eventCode=String(b.eventCode||'').trim().slice(0,80),note=String(b.note||'').trim().slice(0,240),carrier=String(b.carrier||provider).trim().slice(0,80),trackingNo=String(b.trackingNo||'').trim().slice(0,120),providerRef=String(b.providerRef||'').trim().slice(0,120),occurredAt=b.occurredAt?new Date(b.occurredAt).toISOString():new Date().toISOString();
  if(!orderNo||!eventId||!status)return json({error:'invalid_event'},400);
  const row=await env.DB.prepare("SELECT o.id order_id,o.order_no,o.total,o.payment_method,s.id shipment_id FROM orders o JOIN shipments s ON s.order_id=o.id WHERE o.order_no=?").bind(orderNo).first();if(!row)return json({error:'order_not_found'},404);
  const duplicate=await env.DB.prepare("SELECT id FROM shipment_events WHERE provider=? AND event_id=?").bind(provider,eventId).first();if(duplicate)return json({ok:true,reused:true});
  const mapped=new Set(['pending','packing','shipping','delivered','returned','cancelled']).has(status)?status:'shipping';
  const batch=[
    env.DB.prepare("INSERT INTO shipment_events(shipment_id,provider,event_id,event_code,status,note,occurred_at) VALUES(?,?,?,?,?,?,?)").bind(row.shipment_id,provider,eventId,eventCode||null,mapped,note||null,occurredAt),
    env.DB.prepare("UPDATE shipments SET provider=?,provider_ref=?,carrier=?,tracking_no=COALESCE(NULLIF(?,''),tracking_no),status=?,shipped_at=CASE WHEN ? IN ('shipping','delivered') AND shipped_at IS NULL THEN datetime('now') ELSE shipped_at END,delivered_at=CASE WHEN ?='delivered' THEN datetime('now') ELSE delivered_at END WHERE id=?").bind(provider,providerRef||null,carrier,trackingNo,mapped,mapped,mapped,row.shipment_id),
    env.DB.prepare("UPDATE orders SET fulfillment_status=?,status=CASE WHEN ?='delivered' THEN 'completed' WHEN ? IN ('shipping','packing') THEN 'processing' ELSE status END,updated_at=datetime('now') WHERE id=?").bind(mapped,mapped,mapped,row.order_id),
    env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES(?,'shipping_update',?)").bind(row.order_id,note||`${carrier} • ${mapped}`)
  ];
  if(['shipping','delivered'].includes(mapped))batch.push(...await reservationStatements(env,row,orderNo));
  if(mapped==='returned'||mapped==='cancelled')batch.push(env.DB.prepare("UPDATE creator_commissions SET status='void' WHERE order_id=? AND status IN ('pending','eligible')").bind(row.order_id));
  await env.DB.batch(batch);
  let reconciliation=null;
  if(Boolean(b.codCollected)&&row.payment_method==='COD'&&mapped==='delivered'){
    try{reconciliation=await reconcileCod(env,{orderId:row.order_id,shipmentId:row.shipment_id,provider,providerRef:providerRef||eventId,grossAmount:b.codAmount==null?Number(row.total):Number(b.codAmount),feeAmount:Number(b.codFee)||0,note:note||'Trusted shipping webhook',receivedAt:occurredAt})}catch(e){reconciliation={status:'error',error:String(e.message||e)}}
  }
  return json({ok:true,orderNo,status:mapped,codCollected:Boolean(b.codCollected),reconciliation});
}
