import {adminAuthorized,json,clean,money,audit,safeSlug} from '../../_lib/admin.js';

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const rows=await env.DB.prepare(`
    SELECT p.id,p.slug,p.sku,p.name,p.description,p.category,p.price,p.compare_at_price,p.stock,p.low_stock_threshold,
           p.featured,p.active,p.barcode,p.weight_grams,p.seo_title,p.seo_description,p.updated_at,
           (SELECT COUNT(*) FROM product_variants v WHERE v.product_id=p.id) variant_count,
           (SELECT '/media/product?key='||m.object_key FROM product_media m WHERE m.product_id=p.id AND m.active=1 ORDER BY m.sort_order,m.id LIMIT 1) image_url
    FROM products p ORDER BY p.active DESC,p.updated_at DESC,p.id DESC LIMIT 300`).all();
  const variants=await env.DB.prepare("SELECT id,product_id,sku,option_name,option_value,price,compare_at_price,stock,low_stock_threshold,barcode,active,updated_at FROM product_variants ORDER BY product_id,id").all();
  return json({products:rows.results||[],variants:variants.results||[]});
}

export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>({})),action=clean(b.action,30);
  if(action==='upsert_product'){
    const id=Number(b.id)||null,slug=safeSlug(b.slug),name=clean(b.name,180),sku=clean(b.sku,80)||null,category=clean(b.category,100)||null;
    const description=clean(b.description,4000)||null,price=money(b.price),compare=b.compareAtPrice==null||b.compareAtPrice===''?null:money(b.compareAtPrice);
    const stock=Math.max(0,Math.trunc(Number(b.stock)||0)),low=Math.max(0,Math.trunc(Number(b.lowStockThreshold)||5));
    const featured=b.featured?1:0,active=b.active===false?0:1,barcode=clean(b.barcode,80)||null,weight=Math.max(0,Math.trunc(Number(b.weightGrams)||0));
    const seoTitle=clean(b.seoTitle,180)||null,seoDescription=clean(b.seoDescription,320)||null;
    if(!slug||name.length<2||price<0)return json({error:'invalid_product'},400);
    try{
      let productId=id;
      if(id){
        await env.DB.prepare(`UPDATE products SET slug=?,sku=?,name=?,description=?,category=?,price=?,compare_at_price=?,stock=?,low_stock_threshold=?,featured=?,active=?,barcode=?,weight_grams=?,seo_title=?,seo_description=?,updated_at=datetime('now') WHERE id=?`)
          .bind(slug,sku,name,description,category,price,compare,stock,low,featured,active,barcode,weight,seoTitle,seoDescription,id).run();
      }else{
        const r=await env.DB.prepare(`INSERT INTO products(slug,sku,name,description,category,price,compare_at_price,stock,low_stock_threshold,featured,active,barcode,weight_grams,seo_title,seo_description) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`)
          .bind(slug,sku,name,description,category,price,compare,stock,low,featured,active,barcode,weight,seoTitle,seoDescription).first();
        productId=Number(r.id);
      }
      await audit(env,{action:id?'product.update':'product.create',entityType:'product',entityId:productId,metadata:{slug,sku,name,price,stock,active}});
      return json({ok:true,id:productId});
    }catch(e){
      const msg=String(e?.message||e);
      if(msg.includes('UNIQUE')||msg.includes('unique'))return json({error:'duplicate_slug_or_sku'},409);
      throw e;
    }
  }
  if(action==='toggle_product'){
    const id=Number(b.id);if(!id)return json({error:'invalid_id'},400);
    await env.DB.prepare("UPDATE products SET active=CASE active WHEN 1 THEN 0 ELSE 1 END,updated_at=datetime('now') WHERE id=?").bind(id).run();
    await audit(env,{action:'product.toggle',entityType:'product',entityId:id});
    return json({ok:true});
  }
  if(action==='upsert_variant'){
    const id=Number(b.id)||null,productId=Number(b.productId),sku=clean(b.sku,80),optionName=clean(b.optionName,80)||'รูปแบบ',optionValue=clean(b.optionValue,120)||'มาตรฐาน';
    const price=money(b.price),compare=b.compareAtPrice==null||b.compareAtPrice===''?null:money(b.compareAtPrice),stock=Math.max(0,Math.trunc(Number(b.stock)||0)),low=Math.max(0,Math.trunc(Number(b.lowStockThreshold)||5)),barcode=clean(b.barcode,80)||null,active=b.active===false?0:1;
    if(!productId||!sku||price<0)return json({error:'invalid_variant'},400);
    try{
      let variantId=id;
      if(id){
        await env.DB.prepare("UPDATE product_variants SET product_id=?,sku=?,option_name=?,option_value=?,price=?,compare_at_price=?,stock=?,low_stock_threshold=?,barcode=?,active=?,updated_at=datetime('now') WHERE id=?")
          .bind(productId,sku,optionName,optionValue,price,compare,stock,low,barcode,active,id).run();
      }else{
        const r=await env.DB.prepare("INSERT INTO product_variants(product_id,sku,option_name,option_value,price,compare_at_price,stock,low_stock_threshold,barcode,active) VALUES(?,?,?,?,?,?,?,?,?,?) RETURNING id")
          .bind(productId,sku,optionName,optionValue,price,compare,stock,low,barcode,active).first();
        variantId=Number(r.id);
      }
      await audit(env,{action:id?'variant.update':'variant.create',entityType:'product_variant',entityId:variantId,metadata:{productId,sku,stock,price}});
      return json({ok:true,id:variantId});
    }catch(e){
      if(String(e?.message||e).toLowerCase().includes('unique'))return json({error:'duplicate_variant_sku'},409);
      throw e;
    }
  }
  return json({error:'invalid_action'},400);
}
