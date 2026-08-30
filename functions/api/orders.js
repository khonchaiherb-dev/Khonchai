function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
const clean=s=>String(s||'').trim();
const digits=s=>String(s||'').replace(/\D/g,'');
const money=n=>Math.round((Number(n)||0)*100)/100;
const posInt=v=>{const n=Number(v);return Number.isInteger(n)&&n>0?n:null};
const calcDiscount=(row,subtotal)=>{if(!row)return 0;let d=row.type==='percent'?subtotal*(Number(row.value||0)/100):Number(row.value||0);if(row.max_discount!=null)d=Math.min(d,Number(row.max_discount));return money(Math.max(0,Math.min(d,subtotal)))};
export async function onRequestPost({request,env}){
  const body=await request.json().catch(()=>null);
  if(!body||!Array.isArray(body.items)||body.items.length===0)return json({error:'empty_order'},400);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const idempotencyKey=clean(body.idempotencyKey).slice(0,100);
  if(idempotencyKey){
    const old=await env.DB.prepare("SELECT order_no,subtotal,discount_total,shipping_total,total,status,payment_status,fulfillment_status,promotion_code FROM orders WHERE idempotency_key=?").bind(idempotencyKey).first();
    if(old)return json({ok:true,reused:true,orderNo:old.order_no,subtotal:Number(old.subtotal),discount:Number(old.discount_total),shipping:Number(old.shipping_total),total:Number(old.total),status:old.status,paymentStatus:old.payment_status,fulfillmentStatus:old.fulfillment_status,promotionCode:old.promotion_code||null});
  }
  const customerName=clean(body.customerName),phone=digits(body.phone),address=body.address||{},addressLine=clean(address.addressLine),district=clean(address.district),province=clean(address.province),postalCode=clean(address.postalCode);
  if(customerName.length<2||phone.length<9||addressLine.length<5||district.length<2||province.length<2||!/^\d{5}$/.test(postalCode))return json({error:'customer_details_required'},400);
  const paymentMethod=['COD'].includes(body.paymentMethod)?body.paymentMethod:'COD';
  const attr=body.attribution||{},allowedSources=new Set(['direct','shop','live','video','creator']);let sourceChannel=allowedSources.has(attr.source)?attr.source:'direct',creatorId=posInt(attr.creatorId),contentId=posInt(attr.contentId);
  if(creatorId){const ok=await env.DB.prepare("SELECT id FROM creators WHERE id=? AND active=1").bind(creatorId).first();if(!ok)creatorId=null}
  if(contentId){const ok=await env.DB.prepare("SELECT id,creator_id FROM social_contents WHERE id=?").bind(contentId).first();if(!ok)contentId=null;else if(!creatorId)creatorId=Number(ok.creator_id)||null}
  const ids=[...new Set(body.items.map(x=>Number(x.id)).filter(Number.isInteger))];if(!ids.length)return json({error:'invalid_items'},400);
  const placeholders=ids.map(()=>'?').join(','),r=await env.DB.prepare(`SELECT id,sku,name,price,stock,active FROM products WHERE id IN (${placeholders})`).bind(...ids).all(),products=new Map((r.results||[]).map(p=>[Number(p.id),p]));
  let subtotal=0;const lines=[];
  for(const raw of body.items){
    const id=Number(raw.id),qty=Math.max(1,Math.min(20,Number(raw.qty)||1)),p=products.get(id);
    if(!p||!p.active)return json({error:'product_unavailable',productId:id},409);
    if(Number(p.stock)<qty)return json({error:'insufficient_stock',productId:id,available:Number(p.stock)},409);
    const lineTotal=money(Number(p.price)*qty);subtotal=money(subtotal+lineTotal);lines.push({productId:id,sku:p.sku||'',name:p.name,unitPrice:Number(p.price),qty,lineTotal});
  }
  const customer=await env.DB.prepare("INSERT INTO customers(phone,full_name,marketing_consent) VALUES(?,?,?) ON CONFLICT(phone) DO UPDATE SET full_name=excluded.full_name,marketing_consent=excluded.marketing_consent RETURNING id").bind(phone,customerName,body.marketingConsent?1:0).first();
  const prior=await env.DB.prepare("SELECT COUNT(*) c FROM orders WHERE customer_id=? AND status!='cancelled'").bind(customer.id).first();
  let coupon=null,couponDiscount=0;const requestedCoupon=clean(body.couponCode).toUpperCase();
  if(requestedCoupon){
    const c=await env.DB.prepare("SELECT id,code,type,value,min_spend,max_discount,new_customer_only,usage_limit,used_count FROM coupons WHERE code=? AND active=1 AND (starts_at IS NULL OR starts_at<=datetime('now')) AND (ends_at IS NULL OR ends_at>=datetime('now'))").bind(requestedCoupon).first();
    if(!c||subtotal<Number(c.min_spend||0)||(c.usage_limit&&Number(c.used_count)>=Number(c.usage_limit))||(c.new_customer_only&&Number(prior?.c||0)>0))return json({error:'coupon_not_eligible'},400);
    coupon=c;couponDiscount=calcDiscount(c,subtotal);
  }
  const promoRows=await env.DB.prepare("SELECT id,code,name,type,value,min_spend,max_discount,stack_with_coupon,priority,usage_limit,used_count FROM promotions WHERE active=1 AND min_spend<=? AND (starts_at IS NULL OR starts_at<=datetime('now')) AND (ends_at IS NULL OR ends_at>=datetime('now')) AND (usage_limit IS NULL OR used_count<usage_limit) ORDER BY priority DESC,id ASC").bind(subtotal).all();
  let promotion=null,promotionDiscount=0;
  for(const p of promoRows.results||[]){if(coupon&&!Number(p.stack_with_coupon))continue;const d=calcDiscount(p,subtotal);if(d>promotionDiscount){promotion=p;promotionDiscount=d}}
  let discount=money(Math.min(subtotal,couponDiscount+promotionDiscount));
  if(couponDiscount+promotionDiscount>subtotal)promotionDiscount=money(Math.max(0,subtotal-couponDiscount));
  const settings=await env.DB.prepare("SELECT key,value FROM store_settings WHERE key IN ('shipping_fee','free_shipping_threshold')").all(),sm=Object.fromEntries((settings.results||[]).map(x=>[x.key,Number(x.value)]));
  const shippingFee=Number.isFinite(sm.shipping_fee)?sm.shipping_fee:45,freeThreshold=Number.isFinite(sm.free_shipping_threshold)?sm.free_shipping_threshold:699,shipping=subtotal>=freeThreshold?0:shippingFee,total=money(Math.max(0,subtotal-discount+shipping));
  const orderNo=`KCH${new Date().toISOString().replace(/\D/g,'').slice(2,14)}${Math.floor(Math.random()*900+100)}`,addressJson=JSON.stringify({addressLine,district,province,postalCode});
  const batch=[];
  batch.push(env.DB.prepare("INSERT INTO addresses(customer_id,recipient_name,phone,address_line,district,province,postal_code,is_default) VALUES(?,?,?,?,?,?,?,1)").bind(customer.id,customerName,phone,addressLine,district,province,postalCode));
  batch.push(env.DB.prepare("INSERT INTO orders(order_no,customer_id,customer_name,phone,address_json,subtotal,discount_total,shipping_total,total,payment_method,payment_status,fulfillment_status,status,coupon_code,idempotency_key,source_channel,creator_id,content_id,promotion_code) VALUES(?,?,?,?,?,?,?,?,?,?,'unpaid','pending','pending',?,?,?,?,?,?)").bind(orderNo,customer.id,customerName,phone,addressJson,subtotal,discount,shipping,total,paymentMethod,coupon?.code||null,idempotencyKey||null,sourceChannel,creatorId,contentId,promotion?.code||null));
  for(const l of lines){
    batch.push(env.DB.prepare("UPDATE products SET stock=stock-?,sold_count=sold_count+?,updated_at=datetime('now') WHERE id=?").bind(l.qty,l.qty,l.productId));
    batch.push(env.DB.prepare("INSERT INTO order_items(order_id,product_id,sku,product_name,unit_price,qty,line_total) VALUES((SELECT id FROM orders WHERE order_no=?),?,?,?,?,?,?)").bind(orderNo,l.productId,l.sku,l.name,l.unitPrice,l.qty,l.lineTotal));
    batch.push(env.DB.prepare("INSERT INTO inventory_movements(product_id,movement_type,qty,reference_type,reference_id,note) VALUES(?,'sale',?,'order',?,'Stock committed at checkout')").bind(l.productId,-l.qty,orderNo));
  }
  batch.push(env.DB.prepare("INSERT INTO payments(order_id,method,amount,status) VALUES((SELECT id FROM orders WHERE order_no=?),?,?,'pending')").bind(orderNo,paymentMethod,total));
  batch.push(env.DB.prepare("INSERT INTO shipments(order_id,status) VALUES((SELECT id FROM orders WHERE order_no=?),'pending')").bind(orderNo));
  batch.push(env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES((SELECT id FROM orders WHERE order_no=?),'order_created','รับคำสั่งซื้อแล้ว')").bind(orderNo));
  batch.push(env.DB.prepare("INSERT INTO commerce_events(event_type,source_channel,creator_id,content_id,order_no) VALUES('purchase',?,?,?,?)").bind(sourceChannel,creatorId,contentId,orderNo));
  if(coupon){batch.push(env.DB.prepare("UPDATE coupons SET used_count=used_count+1 WHERE id=?").bind(coupon.id));batch.push(env.DB.prepare("INSERT INTO coupon_redemptions(coupon_id,order_id,customer_id,discount_amount) VALUES(?,(SELECT id FROM orders WHERE order_no=?),?,?)").bind(coupon.id,orderNo,customer.id,couponDiscount))}
  if(promotion&&promotionDiscount>0){batch.push(env.DB.prepare("UPDATE promotions SET used_count=used_count+1 WHERE id=?").bind(promotion.id));batch.push(env.DB.prepare("INSERT INTO promotion_redemptions(promotion_id,order_id,customer_id,discount_amount) VALUES(?,(SELECT id FROM orders WHERE order_no=?),?,?)").bind(promotion.id,orderNo,customer.id,promotionDiscount))}
  try{await env.DB.batch(batch)}catch(e){if(String(e?.message||e).includes('insufficient_stock'))return json({error:'insufficient_stock'},409);throw e}
  return json({ok:true,orderNo,subtotal,discount,couponDiscount,promotionDiscount,promotionCode:promotion?.code||null,shipping,total,status:'pending',paymentStatus:'unpaid',fulfillmentStatus:'pending',attribution:{source:sourceChannel,creatorId,contentId}});
}
