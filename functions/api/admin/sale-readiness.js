import {adminAuthorized,json,clean,audit} from '../../_lib/admin.js';

const money=n=>Math.round((Number(n)||0)*100)/100;
const posInt=v=>{const n=Math.trunc(Number(v));return Number.isInteger(n)&&n>=0?n:null};

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const rows=await env.DB.prepare(`SELECT p.id,p.slug,p.sku,p.name,p.price,p.compare_at_price,p.stock,COALESCE(p.reserved_stock,0) reserved_stock,p.active,p.sale_verified,p.sale_verified_at,p.sale_verified_by,
    (SELECT COUNT(*) FROM product_media m WHERE m.product_id=p.id AND m.active=1) media_count,
    (SELECT COUNT(*) FROM product_variants v WHERE v.product_id=p.id AND v.active=1) active_variants
    FROM products p ORDER BY p.sale_verified DESC,p.active DESC,p.featured DESC,p.id`).all();
  const products=(rows.results||[]).map(p=>({...p,available_stock:Math.max(0,Number(p.stock||0)-Number(p.reserved_stock||0)),sale_ready:Boolean(Number(p.active)&&Number(p.sale_verified)&&Number(p.price)>0&&Math.max(0,Number(p.stock||0)-Number(p.reserved_stock||0))>0&&Number(p.media_count)>0)}));
  return json({products});
}

export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>({})),productId=Number(b.productId),verify=Boolean(b.verify),actor=clean(b.actor||'admin',80);
  if(!Number.isInteger(productId)||productId<=0)return json({error:'invalid_product'},400);
  const p=await env.DB.prepare(`SELECT id,name,price,stock,COALESCE(reserved_stock,0) reserved_stock,active,
    (SELECT COUNT(*) FROM product_media m WHERE m.product_id=products.id AND m.active=1) media_count
    FROM products WHERE id=?`).bind(productId).first();
  if(!p)return json({error:'product_not_found'},404);

  if(!verify){
    await env.DB.prepare("UPDATE products SET sale_verified=0,sale_verified_at=NULL,sale_verified_by=NULL,updated_at=datetime('now') WHERE id=?").bind(productId).run();
    await audit(env,{action:'product.sale_unverified',entityType:'product',entityId:productId,metadata:{actor}});
    return json({ok:true,productId,saleVerified:false});
  }

  const nextPrice=b.price==null?Number(p.price):money(b.price),nextStock=b.stock==null?Number(p.stock):posInt(b.stock),nextActive=b.active==null?Number(p.active):Number(Boolean(b.active));
  if(!(nextPrice>0))return json({error:'price_required'},400);
  if(nextStock==null||nextStock<=Number(p.reserved_stock||0))return json({error:'available_stock_required',reserved:Number(p.reserved_stock||0)},400);
  if(Number(p.media_count||0)<=0)return json({error:'product_media_required'},400);
  if(!nextActive)return json({error:'product_must_be_active'},400);

  await env.DB.prepare("UPDATE products SET price=?,stock=?,active=1,sale_verified=1,sale_verified_at=datetime('now'),sale_verified_by=?,updated_at=datetime('now') WHERE id=?").bind(nextPrice,nextStock,actor,productId).run();
  await audit(env,{action:'product.sale_verified',entityType:'product',entityId:productId,metadata:{actor,price:nextPrice,stock:nextStock}});
  return json({ok:true,productId,saleVerified:true,price:nextPrice,stock:nextStock});
}
