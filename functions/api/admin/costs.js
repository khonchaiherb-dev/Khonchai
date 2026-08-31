import {adminAuthorized,json,clean,audit,money} from '../../_lib/admin.js';
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const products=await env.DB.prepare("SELECT id,name,sku,price,cost_price FROM products ORDER BY name").all();
  const variants=await env.DB.prepare("SELECT id,product_id,sku,option_name,option_value,price,cost_price FROM product_variants ORDER BY product_id,id").all();
  return json({products:products.results||[],variants:variants.results||[]});
}
export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const b=await request.json().catch(()=>({})),productId=Number(b.productId),variantId=Number(b.variantId)||null,cost=money(Math.max(0,Number(b.costPrice)||0));if(!productId)return json({error:'invalid_product'},400);
  if(variantId){const v=await env.DB.prepare("SELECT id FROM product_variants WHERE id=? AND product_id=?").bind(variantId,productId).first();if(!v)return json({error:'variant_not_found'},404);await env.DB.prepare("UPDATE product_variants SET cost_price=?,updated_at=datetime('now') WHERE id=?").bind(cost,variantId).run();await audit(env,{action:'cost.update',entityType:'product_variant',entityId:variantId,metadata:{productId,costPrice:cost}})}
  else{const p=await env.DB.prepare("SELECT id FROM products WHERE id=?").bind(productId).first();if(!p)return json({error:'product_not_found'},404);await env.DB.prepare("UPDATE products SET cost_price=?,updated_at=datetime('now') WHERE id=?").bind(cost,productId).run();await audit(env,{action:'cost.update',entityType:'product',entityId:productId,metadata:{costPrice:cost}})}
  return json({ok:true,costPrice:cost});
}
