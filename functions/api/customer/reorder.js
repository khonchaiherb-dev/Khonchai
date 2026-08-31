import {json,getCustomer,sameOrigin} from '../../_lib/customer-auth.js';
export async function onRequestPost({request,env}){
  if(!sameOrigin(request))return json({error:'invalid_origin'},403);
  const c=await getCustomer(request,env);if(!c)return json({error:'unauthorized'},401);
  const b=await request.json().catch(()=>({})),orderNo=String(b.orderNo||'').trim();if(!orderNo)return json({error:'order_required'},400);
  const o=await env.DB.prepare("SELECT id FROM orders WHERE order_no=? AND customer_id=?").bind(orderNo,c.customer_id).first();if(!o)return json({error:'not_found'},404);
  const r=await env.DB.prepare(`SELECT oi.product_id,oi.variant_id,oi.qty,p.slug,p.sku product_sku,p.name,p.description,p.category,p.price product_price,p.compare_at_price product_compare,p.rating,p.sold_count,p.featured,p.active product_active,
    p.stock product_stock,COALESCE(p.reserved_stock,0) product_reserved,
    v.sku variant_sku,v.option_name,v.option_value,v.price variant_price,v.compare_at_price variant_compare,v.stock variant_stock,COALESCE(v.reserved_stock,0) variant_reserved,v.active variant_active
    FROM order_items oi JOIN products p ON p.id=oi.product_id LEFT JOIN product_variants v ON v.id=oi.variant_id WHERE oi.order_id=? ORDER BY oi.id`).bind(o.id).all();
  const items=(r.results||[]).map(x=>{
    const isVariant=Boolean(x.variant_id),stock=Number(isVariant?x.variant_stock:x.product_stock||0),reserved=Number(isVariant?x.variant_reserved:x.product_reserved||0),availableStock=Math.max(0,stock-reserved),active=Boolean(Number(isVariant?x.variant_active:x.product_active));
    return {product_id:x.product_id,variantId:x.variant_id||null,requestedQty:Number(x.qty),availableQty:Math.max(0,Math.min(Number(x.qty),availableStock)),available:active&&availableStock>0,slug:x.slug,sku:isVariant?x.variant_sku:x.product_sku,name:isVariant?`${x.name} (${x.option_value})`:x.name,description:x.description,category:x.category,price:Number(isVariant?x.variant_price:x.product_price),compare_at_price:Number(isVariant?x.variant_compare:x.product_compare),rating:x.rating,sold_count:x.sold_count,stock:availableStock,featured:x.featured,optionName:x.option_name||null,optionValue:x.option_value||null};
  });
  return json({orderNo,items});
}
