import {json,getCustomer} from '../../_lib/customer-auth.js';
export async function onRequestGet({request,env}){
  const c=await getCustomer(request,env);if(!c)return json({error:'unauthorized'},401);
  const u=new URL(request.url),limit=Math.min(50,Math.max(1,Number(u.searchParams.get('limit'))||20));
  const r=await env.DB.prepare("SELECT o.id,o.order_no,o.total,o.subtotal,o.discount_total,o.shipping_total,o.payment_method,o.payment_status,o.fulfillment_status,o.status,o.created_at,o.promotion_code,o.coupon_code,s.carrier,s.tracking_no,s.status shipment_status FROM orders o LEFT JOIN shipments s ON s.order_id=o.id WHERE o.customer_id=? ORDER BY o.id DESC LIMIT ?").bind(c.customer_id,limit).all();
  const orders=[];
  for(const o of r.results||[]){
    const [items,shipmentEvents,orderEvents]=await Promise.all([
      env.DB.prepare(`SELECT oi.id order_item_id,oi.product_id,oi.variant_id,oi.sku,oi.product_name,oi.unit_price,oi.qty,oi.line_total,p.slug,
        CASE WHEN oi.variant_id IS NOT NULL THEN MAX(0,COALESCE(v.stock,0)-COALESCE(v.reserved_stock,0)) ELSE MAX(0,COALESCE(p.stock,0)-COALESCE(p.reserved_stock,0)) END stock,
        CASE WHEN oi.variant_id IS NOT NULL THEN v.active ELSE p.active END active,v.option_name,v.option_value
        FROM order_items oi LEFT JOIN products p ON p.id=oi.product_id LEFT JOIN product_variants v ON v.id=oi.variant_id WHERE oi.order_id=? ORDER BY oi.id`).bind(o.id).all(),
      env.DB.prepare("SELECT se.event_code,se.status,se.note,se.occurred_at,se.provider FROM shipment_events se JOIN shipments s ON s.id=se.shipment_id WHERE s.order_id=? ORDER BY se.occurred_at DESC LIMIT 12").bind(o.id).all(),
      env.DB.prepare("SELECT event_type,note,created_at FROM order_events WHERE order_id=? ORDER BY id DESC LIMIT 12").bind(o.id).all()
    ]);
    orders.push({...o,items:items.results||[],shipmentEvents:shipmentEvents.results||[],orderEvents:orderEvents.results||[]});
  }
  return json({orders});
}
