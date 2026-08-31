import {adminAuthorized,json,clean,audit} from '../../_lib/admin.js';

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const rows=await env.DB.prepare(`SELECT p.id product_id,p.name,p.sku,p.stock,p.reserved_stock,MAX(0,p.stock-p.reserved_stock) available_stock,p.low_stock_threshold,(SELECT COUNT(*) FROM product_variants v WHERE v.product_id=p.id AND v.active=1) active_variants FROM products p ORDER BY (MAX(0,p.stock-p.reserved_stock)<=p.low_stock_threshold) DESC,p.name LIMIT 300`).all();
  const variants=await env.DB.prepare("SELECT id,product_id,sku,option_name,option_value,stock,reserved_stock,MAX(0,stock-reserved_stock) available_stock,low_stock_threshold,active FROM product_variants ORDER BY product_id,id").all();
  return json({products:rows.results||[],variants:variants.results||[]});
}

export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const b=await request.json().catch(()=>({})),productId=Number(b.productId),variantId=Number(b.variantId)||null,delta=Math.trunc(Number(b.delta)),reason=clean(b.reason,300);
  if(!productId||!Number.isInteger(delta)||delta===0||Math.abs(delta)>100000||reason.length<3)return json({error:'invalid_adjustment'},400);
  try{
    if(variantId){
      const v=await env.DB.prepare("SELECT id,product_id,stock,reserved_stock FROM product_variants WHERE id=? AND product_id=?").bind(variantId,productId).first();if(!v)return json({error:'variant_not_found'},404);
      if(Number(v.stock)+delta<Number(v.reserved_stock||0))return json({error:'stock_below_reserved',reserved:Number(v.reserved_stock||0)},409);
      await env.DB.batch([env.DB.prepare("UPDATE product_variants SET stock=stock+?,updated_at=datetime('now') WHERE id=?").bind(delta,variantId),env.DB.prepare("INSERT INTO inventory_movements(product_id,variant_id,movement_type,qty,reference_type,reference_id,note) VALUES(?,?,'adjustment',?,'admin',?,?)").bind(productId,variantId,delta,`variant:${variantId}`,reason)]);
      await audit(env,{action:'inventory.adjust',entityType:'product_variant',entityId:variantId,metadata:{productId,delta,reason}});return json({ok:true});
    }
    const p=await env.DB.prepare("SELECT id,stock,reserved_stock FROM products WHERE id=?").bind(productId).first();if(!p)return json({error:'product_not_found'},404);
    if(Number(p.stock)+delta<Number(p.reserved_stock||0))return json({error:'stock_below_reserved',reserved:Number(p.reserved_stock||0)},409);
    await env.DB.batch([env.DB.prepare("UPDATE products SET stock=stock+?,updated_at=datetime('now') WHERE id=?").bind(delta,productId),env.DB.prepare("INSERT INTO inventory_movements(product_id,movement_type,qty,reference_type,reference_id,note) VALUES(?,'adjustment',?,'admin',?,?)").bind(productId,delta,`product:${productId}`,reason)]);
    await audit(env,{action:'inventory.adjust',entityType:'product',entityId:productId,metadata:{delta,reason}});return json({ok:true});
  }catch(e){if(String(e?.message||e).includes('insufficient_available_stock'))return json({error:'stock_below_reserved'},409);throw e}
}
