import {getCustomer} from '../_lib/customer-auth.js';

const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const clean=(v,n=120)=>String(v??'').trim().slice(0,n);
const posInt=v=>{const n=Number(v);return Number.isInteger(n)&&n>0?n:null};
const money=n=>Math.round((Number(n)||0)*100)/100;

async function tableExists(db,name){
  const r=await db.prepare("SELECT 1 ok FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").bind(name).first();
  return Boolean(r?.ok);
}
async function sha256(text){
  const data=new TextEncoder().encode(text),buf=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function randomKey(){
  const b=new Uint8Array(24);crypto.getRandomValues(b);return [...b].map(x=>x.toString(16).padStart(2,'0')).join('');
}

export async function onRequestPost({request,env}){
  if(!env.DB)return json({error:'database_not_bound'},503);
  if(!await tableExists(env.DB,'checkout_sessions'))return json({error:'checkout_recovery_schema_not_ready',migration:'0022'},503);
  const body=await request.json().catch(()=>null);
  if(!body)return json({error:'invalid_body'},400);

  const rawItems=Array.isArray(body.items)?body.items.slice(0,50):[];
  const requested=rawItems.map(x=>({id:posInt(x.id),variantId:posInt(x.variantId),qty:Math.max(1,Math.min(20,Number(x.qty)||1))})).filter(x=>x.id);
  if(!requested.length&&body.action!=='complete'&&body.action!=='expire')return json({error:'empty_cart'},400);

  let sessionKey=clean(body.sessionKey,100);
  if(sessionKey&&!/^[A-Za-z0-9_-]{24,100}$/.test(sessionKey))return json({error:'invalid_session_key'},400);
  if(!sessionKey)sessionKey=randomKey();

  const customer=await getCustomer(request,env).catch(()=>null);
  let customerId=customer?Number(customer.customer_id):null,marketingConsent=false;
  if(customerId){
    const c=await env.DB.prepare('SELECT marketing_consent FROM customers WHERE id=?').bind(customerId).first();
    marketingConsent=Number(c?.marketing_consent||0)===1;
  }
  const recoveryAllowed=Boolean(customerId&&marketingConsent&&body.recoveryAllowed===true);

  const existing=await env.DB.prepare('SELECT id,customer_id,status FROM checkout_sessions WHERE session_key=?').bind(sessionKey).first();
  if(existing?.customer_id&&customerId&&Number(existing.customer_id)!==customerId)return json({error:'session_owner_mismatch'},403);
  if(existing?.customer_id&&!customerId)return json({error:'authentication_required_for_session'},401);

  let items=[],subtotal=0;
  if(requested.length){
    const ids=[...new Set(requested.map(x=>x.id))],ph=ids.map(()=>'?').join(',');
    const rows=await env.DB.prepare(`SELECT id,price,active,COALESCE(sale_verified,0) sale_verified FROM products WHERE id IN (${ph})`).bind(...ids).all();
    const products=new Map((rows.results||[]).map(x=>[Number(x.id),x]));
    const variantIds=[...new Set(requested.map(x=>x.variantId).filter(Boolean))],variants=new Map();
    if(variantIds.length){
      const vp=variantIds.map(()=>'?').join(','),vr=await env.DB.prepare(`SELECT id,product_id,price,active FROM product_variants WHERE id IN (${vp})`).bind(...variantIds).all();
      for(const v of vr.results||[])variants.set(Number(v.id),v);
    }
    for(const line of requested){
      const p=products.get(line.id),v=line.variantId?variants.get(line.variantId):null;
      if(!p||!Number(p.active)||!Number(p.sale_verified))continue;
      if(line.variantId&&(!v||Number(v.product_id)!==line.id||!Number(v.active)))continue;
      const price=Number((v||p).price||0);if(price<=0)continue;
      items.push({id:line.id,variantId:line.variantId||null,qty:line.qty});subtotal=money(subtotal+price*line.qty);
    }
  }

  const cartJson=JSON.stringify(items),fingerprint=await sha256(cartJson),source=clean(body.sourceChannel,24)||'direct';
  const step=['cart','address','payment','review','complete'].includes(body.lastStep)?body.lastStep:'cart';
  const action=clean(body.action,20);
  const requestedOrderNo=clean(body.orderNo,60);
  let orderId=null,status='active',convertedAt=null;
  if(action==='complete'&&requestedOrderNo){
    const o=customerId?await env.DB.prepare('SELECT id FROM orders WHERE order_no=? AND customer_id=?').bind(requestedOrderNo,customerId).first():null;
    if(o){orderId=Number(o.id);status='converted';convertedAt=new Date().toISOString()}
  }else if(action==='expire'){status='expired'}

  if(existing){
    await env.DB.prepare(`UPDATE checkout_sessions SET customer_id=COALESCE(customer_id,?),source_channel=?,cart_fingerprint=?,cart_json=?,subtotal=?,last_step=?,status=?,recovery_allowed=?,order_id=COALESCE(?,order_id),last_activity_at=datetime('now'),converted_at=COALESCE(?,converted_at),expires_at=COALESCE(expires_at,datetime('now','+7 days')),updated_at=datetime('now') WHERE session_key=?`)
      .bind(customerId,source,fingerprint,cartJson,subtotal,step,status,recoveryAllowed?1:0,orderId,convertedAt,sessionKey).run();
  }else{
    await env.DB.prepare(`INSERT INTO checkout_sessions(session_key,customer_id,source_channel,cart_fingerprint,cart_json,subtotal,last_step,status,recovery_allowed,order_id,last_activity_at,converted_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,datetime('now'),?,datetime('now','+7 days'))`)
      .bind(sessionKey,customerId,source,fingerprint,cartJson,subtotal,step,status,recoveryAllowed?1:0,orderId,convertedAt).run();
  }

  return json({ok:true,sessionKey,status,lastStep:step,subtotal,itemCount:items.reduce((n,x)=>n+x.qty,0),recoveryAllowed});
}
