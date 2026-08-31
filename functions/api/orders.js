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
    const old=await env.DB.prepare("SELECT order_no,subtotal,discount_total,shipping_total,total,status,payment_status,fulfillment_status,promotion_code,source_channel,creator_id,content_id FROM orders WHERE idempotency_key=?").bind(idempotencyKey).first();
    if(old)return json({ok:true,reused:true,orderNo:old.order_no,subtotal:Number(old.subtotal),discount:Number(old.discount_total),shipping:Number(old.shipping_total),total:Number(old.total),status:old.status,paymentStatus:old.payment_status,fulfillmentStatus:old.fulfillment_status,promotionCode:old.promotion_code||null,attribution:{source:old.source_channel||'direct',creatorId:old.creator_id||null,contentId:old.content_id||null}});
  }

  const customerName=clean(body.customerName),phone=digits(body.phone),address=body.address||{},addressLine=clean(address.addressLine),district=clean(address.district),province=clean(address.province),postalCode=clean(address.postalCode);
  if(customerName.length<2||phone.length<9||addressLine.length<5||district.length<2||province.length<2||!/^\d{5}$/.test(postalCode))return json({error:'customer_details_required'},400);
  const paymentMethod=['COD'].includes(body.paymentMethod)?body.paymentMethod:'COD';

  const attr=body.attribution||{},allowedSources=new Set(['direct','shop','live','video','creator']);
  let sourceChannel=allowedSources.has(attr.source)?attr.source:'direct',creatorId=posInt(attr.creatorId),contentId=posInt(attr.contentId);
  if(creatorId){const ok=await env.DB.prepare("SELECT id FROM creators WHERE id=? AND active=1").bind(creatorId).first();if(!ok)creatorId=null}
  if(contentId){const ok=await env.DB.prepare("SELECT id,creator_id FROM social_contents WHERE id=?").bind(contentId).first();if(!ok)contentId=null;else if(!creatorId)creatorId=Number(ok.creator_id)||null}

  const ids=[...new Set(body.items.map(x=>Number(x.id)).filter(Number.isInteger))];
  if(!ids.length)return json({error:'invalid_items'},400);
  const placeholders=ids.map(()=>'?').join(',');
  const pr=await env.DB.prepare(`SELECT id,sku,name,price,stock,COALESCE(reserved_stock,0) reserved_stock,active FROM products WHERE id IN (${placeholders})`).bind(...ids).all();
  const products=new Map((pr.results||[]).map(p=>[Number(p.id),p]));
  const variantIds=[...new Set(body.items.map(x=>posInt(x.variantId)).filter(Boolean))];
  const variants=new Map();
  if(variantIds.length){
    const vp=variantIds.map(()=>'?').join(','),vr=await env.DB.prepare(`SELECT id,product_id,sku,option_name,option_value,price,stock,COALESCE(reserved_stock,0) reserved_stock,active FROM product_variants WHERE id IN (${vp})`).bind(...variantIds).all();
    for(const v of vr.results||[])variants.set(Number(v.id),v);
  }

  let subtotal=0;const lines=[];
  for(const raw of body.items){
    const id=Number(raw.id),qty=Math.max(1,Math.min(20,Number(raw.qty)||1)),p=products.get(id),variantId=posInt(raw.variantId),v=variantId?variants.get(variantId):null;
    if(!p||!p.active)return json({error:'product_unavailable',productId:id},409);
    if(variantId&&(!v||Number(v.product_id)!==id||!Number(v.active)))return json({error:'variant_unavailable',productId:id,variantId},409);
    const source=v||p,available=Math.max(0,Number(source.stock||0)-Number(source.reserved_stock||0));
    if(available<qty)return json({error:'insufficient_stock',productId:id,variantId:variantId||null,available},409);
    const unitPrice=Number(source.price),lineTotal=money(unitPrice*qty),sku=source.sku||p.sku||'',name=v?`${p.name} (${v.option_name}: ${v.option_value})`:p.name;
    subtotal=money(subtotal+lineTotal);lines.push({productId:id,variantId:variantId||null,sku,name,unitPrice,qty,lineTotal});
  }

  const customer=await env.DB.prepare("INSERT INTO customers(phone,full_name,marketing_consent,updated_at) VALUES(?,?,?,datetime('now')) ON CONFLICT(phone) DO UPDATE SET full_name=excluded.full_name,marketing_consent=excluded.marketing_consent,updated_at=datetime('now') RETURNING id").bind(phone,customerName,body.marketingConsent?1:0).first();
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
  let discount=money(Math.min(subtotal,couponDiscount+promotionDiscount));if(couponDiscount+promotionDiscount>subtotal)promotionDiscount=money(Math.max(0,subtotal-couponDiscount));

  const settings=await env.DB.prepare("SELECT key,value FROM store_settings WHERE key IN ('shipping_fee','free_shipping_threshold')").all(),sm=Object.fromEntries((settings.results||[]).map(x=>[x.key,Number(x.value)]));
  const shippingFee=Number.isFinite(sm.shipping_fee)?sm.shipping_fee:45,freeThreshold=Number.isFinite(sm.free_shipping_threshold)?sm.free_shipping_threshold:699,shipping=subtotal>=freeThreshold?0:shippingFee,total=money(Math.max(0,subtotal-discount+shipping));
  const orderNo=`KCH${new Date().toISOString().replace(/\D/g,'').slice(2,14)}${Math.floor(Math.random()*900+100)}`,addressJson=JSON.stringify({addressLine,district,province,postalCode});

  const commissions=[];
  if(creatorId&&ids.length){
    const rates=await env.DB.prepare(`SELECT product_id,commission_rate FROM creator_products WHERE creator_id=? AND product_id IN (${placeholders})`).bind(creatorId,...ids).all(),rateMap=new Map((rates.results||[]).map(x=>[Number(x.product_id),Number(x.commission_rate||0)]));
    for(const l of lines){const rate=rateMap.get(l.productId)||0;if(rate>0)commissions.push({productId:l.productId,rate,base:l.lineTotal,amount:money(l.lineTotal*rate/100)})}
  }
  const existingAddress=await env.DB.prepare("SELECT id FROM addresses WHERE customer_id=? AND recipient_name=? AND phone=? AND address_line=? AND district=? AND province=? AND postal_code=? LIMIT 1").bind(customer.id,customerName,phone,addressLine,district,province,postalCode).first();
  const addressCount=await env.DB.prepare("SELECT COUNT(*) c FROM addresses WHERE customer_id=?").bind(customer.id).first();

  const batch=[];
  if(!existingAddress)batch.push(env.DB.prepare("INSERT INTO addresses(customer_id,label,recipient_name,phone,address_line,district,province,postal_code,is_default,updated_at) VALUES(?,'ที่อยู่จัดส่ง',?,?,?,?,?,?,?,datetime('now'))").bind(customer.id,customerName,phone,addressLine,district,province,postalCode,Number(addressCount?.c||0)===0?1:0));
  batch.push(env.DB.prepare("INSERT INTO orders(order_no,customer_id,customer_name,phone,address_json,subtotal,discount_total,shipping_total,total,payment_method,payment_status,fulfillment_status,status,coupon_code,idempotency_key,source_channel,creator_id,content_id,promotion_code) VALUES(?,?,?,?,?,?,?,?,?,?,'unpaid','pending','pending',?,?,?,?,?,?)").bind(orderNo,customer.id,customerName,phone,addressJson,subtotal,discount,shipping,total,paymentMethod,coupon?.code||null,idempotencyKey||null,sourceChannel,creatorId,contentId,promotion?.code||null));
  for(const l of lines){
    if(l.variantId)batch.push(env.DB.prepare("UPDATE product_variants SET reserved_stock=reserved_stock+?,updated_at=datetime('now') WHERE id=?").bind(l.qty,l.variantId));
    else batch.push(env.DB.prepare("UPDATE products SET reserved_stock=reserved_stock+?,updated_at=datetime('now') WHERE id=?").bind(l.qty,l.productId));
    batch.push(env.DB.prepare("INSERT INTO order_items(order_id,product_id,variant_id,sku,product_name,unit_price,qty,line_total) VALUES((SELECT id FROM orders WHERE order_no=?),?,?,?,?,?,?,?)").bind(orderNo,l.productId,l.variantId,l.sku,l.name,l.unitPrice,l.qty,l.lineTotal));
    batch.push(env.DB.prepare("INSERT INTO stock_reservations(order_id,product_id,variant_id,qty,status) VALUES((SELECT id FROM orders WHERE order_no=?),?,?,?,'active')").bind(orderNo,l.productId,l.variantId,l.qty));
  }
  for(const c of commissions)batch.push(env.DB.prepare("INSERT OR IGNORE INTO creator_commissions(order_id,creator_id,product_id,commission_rate,base_amount,amount,status) VALUES((SELECT id FROM orders WHERE order_no=?),?,?,?,?,?,'pending')").bind(orderNo,creatorId,c.productId,c.rate,c.base,c.amount));
  batch.push(env.DB.prepare("INSERT INTO payments(order_id,method,amount,status) VALUES((SELECT id FROM orders WHERE order_no=?),?,?,'pending')").bind(orderNo,paymentMethod,total));
  batch.push(env.DB.prepare("INSERT INTO shipments(order_id,status) VALUES((SELECT id FROM orders WHERE order_no=?),'pending')").bind(orderNo));
  batch.push(env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES((SELECT id FROM orders WHERE order_no=?),'order_created','รับคำสั่งซื้อและกันสต๊อกแล้ว')").bind(orderNo));
  batch.push(env.DB.prepare("INSERT INTO commerce_events(event_type,source_channel,creator_id,content_id,order_no) VALUES('purchase',?,?,?,?)").bind(sourceChannel,creatorId,contentId,orderNo));
  if(coupon){batch.push(env.DB.prepare("UPDATE coupons SET used_count=used_count+1 WHERE id=?").bind(coupon.id));batch.push(env.DB.prepare("INSERT INTO coupon_redemptions(coupon_id,order_id,customer_id,discount_amount) VALUES(?,(SELECT id FROM orders WHERE order_no=?),?,?)").bind(coupon.id,orderNo,customer.id,couponDiscount))}
  if(promotion&&promotionDiscount>0){batch.push(env.DB.prepare("UPDATE promotions SET used_count=used_count+1 WHERE id=?").bind(promotion.id));batch.push(env.DB.prepare("INSERT INTO promotion_redemptions(promotion_id,order_id,customer_id,discount_amount) VALUES(?,(SELECT id FROM orders WHERE order_no=?),?,?)").bind(promotion.id,orderNo,customer.id,promotionDiscount))}

  try{await env.DB.batch(batch)}catch(e){const msg=String(e?.message||e);if(msg.includes('insufficient_available_stock')||msg.includes('insufficient_stock'))return json({error:'insufficient_stock'},409);if(msg.includes('UNIQUE constraint failed: orders.idempotency_key')&&idempotencyKey){const old=await env.DB.prepare("SELECT order_no,total FROM orders WHERE idempotency_key=?").bind(idempotencyKey).first();if(old)return json({ok:true,reused:true,orderNo:old.order_no,total:Number(old.total)})}throw e}
  return json({ok:true,orderNo,subtotal,discount,couponDiscount,promotionDiscount,promotionCode:promotion?.code||null,shipping,total,status:'pending',paymentStatus:'unpaid',fulfillmentStatus:'pending',inventoryStatus:'reserved',attribution:{source:sourceChannel,creatorId,contentId},commissionPending:money(commissions.reduce((s,x)=>s+x.amount,0))});
}
