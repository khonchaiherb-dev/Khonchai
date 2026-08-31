import {adminAuthorized,json,clean} from '../../_lib/admin.js';
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const orderNo=clean(new URL(request.url).searchParams.get('orderNo'),80);if(!orderNo)return json({error:'order_required'},400);
  const order=await env.DB.prepare(`SELECT o.id,o.order_no,o.customer_name,o.phone,o.address_json,o.subtotal,o.discount_total,o.shipping_total,o.total,o.payment_method,o.payment_status,o.fulfillment_status,o.created_at,s.carrier,s.tracking_no
    FROM orders o LEFT JOIN shipments s ON s.order_id=o.id WHERE o.order_no=?`).bind(orderNo).first();
  if(!order)return json({error:'order_not_found'},404);
  const items=await env.DB.prepare("SELECT product_name,sku,qty,unit_price,line_total FROM order_items WHERE order_id=? ORDER BY id").bind(order.id).all();
  let address={};try{address=JSON.parse(order.address_json||'{}')}catch{}
  return json({order:{...order,address},items:items.results||[],printedAt:new Date().toISOString()});
}
