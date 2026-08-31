import {adminAuthorized,json,clean,money,audit,safeSlug} from '../../_lib/admin.js';

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const rows=await env.DB.prepare(`SELECT p.id,p.slug,p.sku,p.name,p.description,p.category,p.price,p.compare_at_price,p.cost_price,p.stock,p.reserved_stock,MAX(0,p.stock-p.reserved_stock) available_stock,p.low_stock_threshold,p.featured,p.active,p.barcode,p.weight_grams,p.seo_title,p.seo_description,p.updated_at,(SELECT COUNT(*) FROM product_variants v WHERE v.product_id=p.id) variant_count,(SELECT '/media/product?key='||m.object_key FROM product_media m WHERE m.product_id=p.id AND m.active=1 ORDER BY m.sort_order,m.id LIMIT 1) image_url FROM products p ORDER BY p.active DESC,p.updated_at DESC,p.id DESC LIMIT 300`).all();
  const variants=await env.DB.prepare("SELECT id,product_id,sku,option_name,option_value,price,compare_at_price,cost_price,stock,reserved_stock,MAX(0,stock-reserved_stock) available_stock,low_stock_threshold,barcode,active,updated_at FROM product_variants ORDER BY product_id,id").all();
  return json({products:rows.results||[],variants:variants.results||[]});
}

export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>({})),action=clean(b.action,30);
  if(action==='upsert_product'){
    const id=Number(b.id)||null,slug=safeSlug(b.slug),name=clean(b.name,180),sku=clean(b.sku,80)||null,category=clean(b.category,100)||null,description=clean(b.description,4000)||null;
    const price=money(b.price),compare=b.compareAtPrice==null||b.compareAtPrice===''?null:money(b.compareAtPrice),stock=Math.max(0,Math.trunc(Number(b.stock)||0)),low=Math.max(0,Math.trunc(Number(b.lowStockThreshold)||5));
    const featured=b.featured?1:0,active=b.active===false?0:1,barcode=clean(b.barcode,80)||null,weight=Math.max(0,Math.trunc(Number(b.weightGrams)||0)),seoTitle=clean(b.seoTitle,180)||null,seoDescription=clean(b.seoDescription,320)||null;
    if(!slug||name.length<2||price<0)return json({error:'invalid_product'},400);
    try{
      let productId=id,cost=0;
      if(id){
        const old=await env.DB.prepare("SELECT reserved_stock,cost_price FROM products WHERE id=?").bind(id).first();if(!old)return json({error:'product_not_found'},404);if(stock<Number(old.reserved_stock||0))return json({error:'stock_below_reserved',reserved:Number(old.reserved_stock||0)},409);cost=b.costPrice==null||b.costPrice===''?Number(old.cost_price||0):money(Math.max(0,Number(b.costPrice)||0));
        await env.DB.prepare(`UPDATE products SET slug=?,sku=?,name=?,description=?,category=?,price=?,compare_at_price=?,cost_price=?,stock=?,low_stock_threshold=?,featured=?,active=?,barcode=?,weight_grams=?,seo_title=?,seo_description=?,updated_at=datetime('now') WHERE id=?`).bind(slug,sku,name,description,category,price,compare,cost,stock,low,featured,active,barcode,weight,seoTitle,seoDescription,id).run();
      }else{
        cost=b.costPrice==null||b.costPrice===''?0:money(Math.max(0,Number(b.costPrice)||0));
        const r=await env.DB.prepare(`INSERT INTO products(slug,sku,name,description,category,price,compare_at_price,cost_price,stock,low_stock_threshold,featured,active,barcode,weight_grams,seo_title,seo_description) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`).bind(slug,sku,name,description,category,price,compare,cost,stock,low,featured,active,barcode,weight,seoTitle,seoDescription).first();productId=Number(r.id);
      }
      await audit(env,{action:id?'product.update':'product.create',entityType:'product',entityId:productId,metadata:{slug,sku,name,price,costPrice:cost,stock,active}});return json({ok:true,id:productId});
    }catch(e){const msg=String(e?.message||e);if(msg.includes('UNIQUE')||msg.includes('unique'))return json({error:'duplicate_slug_or_sku'},409);if(msg.includes('insufficient_available_stock'))return json({error:'stock_below_reserved'},409);throw e}
  }
  if(action==='toggle_product'){
    const id=Number(b.id);if(!id)return json({error:'invalid_id'},400);await env.DB.prepare("UPDATE products SET active=CASE active WHEN 1 THEN 0 ELSE 1 END,updated_at=datetime('now') WHERE id=?").bind(id).run();await audit(env,{action:'product.toggle',entityType:'product',entityId:id});return json({ok:true});
  }
  if(action==='upsert_variant'){
    const id=Number(b.id)||null,productId=Number(b.productId),sku=clean(b.sku,80),optionName=clean(b.optionName,80)||'รูปแบบ',optionValue=clean(b.optionValue,120)||'มาตรฐาน',price=money(b.price),compare=b.compareAtPrice==null||b.compareAtPrice===''?null:money(b.compareAtPrice),stock=Math.max(0,Math.trunc(Number(b.stock)||0)),low=Math.max(0,Math.trunc(Number(b.lowStockThreshold)||5)),barcode=clean(b.barcode,80)||null,active=b.active===false?0:1;
    if(!productId||!sku||price<0)return json({error:'invalid_variant'},400);
    try{
      let variantId=id,cost=0;
      if(id){const old=await env.DB.prepare("SELECT reserved_stock,cost_price FROM product_variants WHERE id=? AND product_id=?").bind(id,productId).first();if(!old)return json({error:'variant_not_found'},404);if(stock<Number(old.reserved_stock||0))return json({error:'stock_below_reserved',reserved:Number(old.reserved_stock||0)},409);cost=b.costPrice==null||b.costPrice===''?Number(old.cost_price||0):money(Math.max(0,Number(b.costPrice)||0));await env.DB.prepare("UPDATE product_variants SET product_id=?,sku=?,option_name=?,option_value=?,price=?,compare_at_price=?,cost_price=?,stock=?,low_stock_threshold=?,barcode=?,active=?,updated_at=datetime('now') WHERE id=?").bind(productId,sku,optionName,optionValue,price,compare,cost,stock,low,barcode,active,id).run()}
      else{cost=b.costPrice==null||b.costPrice===''?0:money(Math.max(0,Number(b.costPrice)||0));const r=await env.DB.prepare("INSERT INTO product_variants(product_id,sku,option_name,option_value,price,compare_at_price,cost_price,stock,low_stock_threshold,barcode,active) VALUES(?,?,?,?,?,?,?,?,?,?,?) RETURNING id").bind(productId,sku,optionName,optionValue,price,compare,cost,stock,low,barcode,active).first();variantId=Number(r.id)}
      await audit(env,{action:id?'variant.update':'variant.create',entityType:'product_variant',entityId:variantId,metadata:{productId,sku,stock,price,costPrice:cost}});return json({ok:true,id:variantId});
    }catch(e){const msg=String(e?.message||e).toLowerCase();if(msg.includes('unique'))return json({error:'duplicate_variant_sku'},409);if(msg.includes('insufficient_available_stock'))return json({error:'stock_below_reserved'},409);throw e}
  }
  return json({error:'invalid_action'},400);
}
