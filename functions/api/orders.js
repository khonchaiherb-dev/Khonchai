function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
const clean=s=>String(s||'').trim();
export async function onRequestPost({request,env}){
  const body=await request.json().catch(()=>null);
  if(!body || !Array.isArray(body.items) || body.items.length===0) return json({error:'empty_order'},400);
  const customerName=clean(body.customerName), phone=clean(body.phone), address=body.address||{};
  if(customerName.length<2 || phone.replace(/\D/g,'').length<9 || clean(address.addressLine).length<5) return json({error:'customer_details_required'},400);
  const paymentMethod=['COD','QR'].includes(body.paymentMethod)?body.paymentMethod:'COD';
  if(!env.DB){
    const no=`KCH${Date.now()}`;
    return json({ok:true,orderNo:no,status:'pending',paymentStatus:'unpaid',demo:true});
  }
  const ids=[...new Set(body.items.map(x=>Number(x.id)).filter(Number.isInteger))];
  if(!ids.length) return json({error:'invalid_items'},400);
  const placeholders=ids.map(()=>'?').join(',');
  const result=await env.DB.prepare(`SELECT id,sku,name,price,stock,active FROM products WHERE id IN (${placeholders})`).bind(...ids).all();
  const products=new Map((result.results||[]).map(p=>[Number(p.id),p]));
  let subtotal=0;
  const lines=[];
  for(const raw of body.items){
    const id=Number(raw.id), qty=Math.max(1,Math.min(20,Number(raw.qty)||1)), p=products.get(id);
    if(!p || !p.active) return json({error:'product_unavailable',productId:id},409);
    if(Number(p.stock)<qty) return json({error:'insufficient_stock',productId:id,available:Number(p.stock)},409);
    const lineTotal=Number(p.price)*qty; subtotal+=lineTotal;
    lines.push({productId:id,sku:p.sku||'',name:p.name,unitPrice:Number(p.price),qty,lineTotal});
  }
  let discount=0, couponCode=null;
  const requestedCoupon=clean(body.couponCode).toUpperCase();
  if(requestedCoupon){
    const c=await env.DB.prepare("SELECT id,code,type,value,min_spend,max_discount,usage_limit,used_count FROM coupons WHERE code=? AND active=1").bind(requestedCoupon).first();
    if(c && subtotal>=Number(c.min_spend||0) && (!c.usage_limit || Number(c.used_count)<Number(c.usage_limit))){
      discount=c.type==='percent'?subtotal*(Number(c.value)/100):Number(c.value);
      if(c.max_discount!=null) discount=Math.min(discount,Number(c.max_discount));
      discount=Math.max(0,Math.min(discount,subtotal)); couponCode=c.code;
    }
  }
  const shipping=subtotal>=699?0:45;
  const total=Math.max(0,subtotal-discount+shipping);
  const orderNo=`KCH${new Date().toISOString().replace(/\D/g,'').slice(2,14)}${Math.floor(Math.random()*90+10)}`;
  const addressJson=JSON.stringify(address);
  const batch=[];
  const order=await env.DB.prepare("INSERT INTO orders(order_no,customer_name,phone,address_json,subtotal,discount_total,shipping_total,total,payment_method,payment_status,fulfillment_status,status,coupon_code) VALUES(?,?,?,?,?,?,?,?,?,'unpaid','pending','pending',?) RETURNING id").bind(orderNo,customerName,phone,addressJson,subtotal,discount,shipping,total,paymentMethod,couponCode).first();
  for(const l of lines){
    batch.push(env.DB.prepare("INSERT INTO order_items(order_id,product_id,sku,product_name,unit_price,qty,line_total) VALUES(?,?,?,?,?,?,?)").bind(order.id,l.productId,l.sku,l.name,l.unitPrice,l.qty,l.lineTotal));
    batch.push(env.DB.prepare("UPDATE products SET stock=stock-?, sold_count=sold_count+?, updated_at=datetime('now') WHERE id=? AND stock>=?").bind(l.qty,l.qty,l.productId,l.qty));
    batch.push(env.DB.prepare("INSERT INTO inventory_movements(product_id,movement_type,qty,reference_type,reference_id,note) VALUES(?,'sale',?,'order',?,'Reserved at checkout')").bind(l.productId,-l.qty,orderNo));
  }
  batch.push(env.DB.prepare("INSERT INTO payments(order_id,method,amount,status) VALUES(?,?,?,'pending')").bind(order.id,paymentMethod,total));
  if(couponCode) batch.push(env.DB.prepare("UPDATE coupons SET used_count=used_count+1 WHERE code=?").bind(couponCode));
  await env.DB.batch(batch);
  return json({ok:true,orderNo,subtotal,discount,shipping,total,status:'pending',paymentStatus:'unpaid'});
}
