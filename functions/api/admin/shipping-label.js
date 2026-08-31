import {adminAuthorized,json,clean} from '../../_lib/admin.js';

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const orderNo=clean(new URL(request.url).searchParams.get('orderNo'),80);
  if(!orderNo)return json({error:'order_required'},400);
  const o=await env.DB.prepare(`SELECT o.id,o.order_no,o.customer_name,o.phone,o.address_json,o.total,o.payment_method,o.payment_status,
    s.carrier,s.tracking_no,s.status shipment_status,s.shipped_at,
    COALESCE(SUM(COALESCE(p.weight_grams,0)*oi.qty),0) total_weight_grams
    FROM orders o JOIN shipments s ON s.order_id=o.id
    JOIN order_items oi ON oi.order_id=o.id JOIN products p ON p.id=oi.product_id
    WHERE o.order_no=? GROUP BY o.id,s.id`).bind(orderNo).first();
  if(!o)return json({error:'order_not_found'},404);
  if(!o.tracking_no)return json({error:'tracking_required'},409);
  let address={};try{address=JSON.parse(o.address_json||'{}')}catch{}
  return json({label:{
    orderNo:o.order_no,customerName:o.customer_name,phone:o.phone,address,
    carrier:o.carrier||'',trackingNo:o.tracking_no,totalWeightGrams:Number(o.total_weight_grams||0),
    codAmount:o.payment_method==='COD'&&!['paid','cod_collected'].includes(o.payment_status)?Number(o.total||0):0,
    paymentMethod:o.payment_method,shipmentStatus:o.shipment_status,shippedAt:o.shipped_at
  }});
}
