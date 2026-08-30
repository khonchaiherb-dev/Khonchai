function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
const digits=s=>String(s||'').replace(/\D/g,'');
export async function onRequestGet({env,request}){
  if(!env.DB) return json({error:'database_not_bound'},503);
  const url=new URL(request.url),orderNo=String(url.searchParams.get('orderNo')||'').trim(),phone=digits(url.searchParams.get('phone'));
  if(!/^KCH[A-Z0-9-]{6,30}$/i.test(orderNo)||phone.length<9) return json({error:'invalid_lookup'},400);
  const order=await env.DB.prepare("SELECT id,order_no,total,payment_method,payment_status,fulfillment_status,status,created_at FROM orders WHERE order_no=? AND REPLACE(REPLACE(REPLACE(phone,'-',''),' ',''),'+66','0')=?").bind(orderNo,phone).first();
  if(!order) return json({error:'order_not_found'},404);
  const [items,shipment,events]=await Promise.all([
    env.DB.prepare("SELECT product_id,product_name,unit_price,qty,line_total FROM order_items WHERE order_id=? ORDER BY id").bind(order.id).all(),
    env.DB.prepare("SELECT carrier,tracking_no,status,shipped_at,delivered_at FROM shipments WHERE order_id=? ORDER BY id DESC LIMIT 1").bind(order.id).first(),
    env.DB.prepare("SELECT event_type,note,created_at FROM order_events WHERE order_id=? ORDER BY id DESC LIMIT 20").bind(order.id).all()
  ]);
  return json({orderNo:order.order_no,total:Number(order.total),paymentMethod:order.payment_method,paymentStatus:order.payment_status,fulfillmentStatus:order.fulfillment_status,status:order.status,createdAt:order.created_at,carrier:shipment?.carrier||null,trackingNo:shipment?.tracking_no||null,shipmentStatus:shipment?.status||null,items:items.results||[],events:events.results||[]});
}
