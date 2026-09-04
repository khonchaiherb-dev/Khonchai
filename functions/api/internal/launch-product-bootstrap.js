const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const clean=v=>String(v||'').trim();
const VERSION='rang-jued-2026-09-04-v1';
const PRODUCT_ID=1;
const STATIC_KEY='static/rang-jued-tea-360.webp';
// Keep this guarded bootstrap tied to the storefront build that includes the live-catalog fail-closed guard.

export async function onRequestGet({env}){
  return json({service:'khonchaiherb-launch-product-bootstrap',version:VERSION,enabled:Boolean(clean(env.LAUNCH_PRODUCT_TOKEN))});
}

export async function onRequestPost({request,env}){
  const expected=clean(env.LAUNCH_PRODUCT_TOKEN);
  if(!expected)return json({error:'not_found'},404);
  const supplied=clean(request.headers.get('X-KCH-Launch-Product'));
  if(!supplied||supplied!==expected)return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);

  const p=await env.DB.prepare(`SELECT id,slug,sku,name,COALESCE(reserved_stock,0) reserved_stock FROM products WHERE id=?`).bind(PRODUCT_ID).first();
  if(!p)return json({error:'launch_product_seed_missing'},409);
  if(String(p.slug)!=='rang-jued-tea'||String(p.sku)!=='KCH-TEA-001')return json({error:'launch_product_identity_mismatch'},409);
  if(Number(p.reserved_stock||0)>0)return json({error:'launch_product_has_reserved_stock',reservedStock:Number(p.reserved_stock||0)},409);

  const openOrders=await env.DB.prepare(`SELECT COUNT(*) c FROM order_items oi JOIN orders o ON o.id=oi.order_id
    WHERE oi.product_id=? AND COALESCE(o.fulfillment_status,'UNFULFILLED') NOT IN ('DELIVERED','CANCELLED','RETURNED')`).bind(PRODUCT_ID).first();
  if(Number(openOrders?.c||0)>0)return json({error:'launch_product_has_open_orders',openOrders:Number(openOrders.c)},409);

  await env.DB.prepare(`UPDATE products SET
      name='ชารางจืด 30 ซอง ตราคุณชายสมุนไพร',
      description='ชารางจืด 100% ไม่มีน้ำตาล บรรจุ 30 ซอง สำหรับชงดื่ม',
      category='ชาสมุนไพร',
      price=120,
      compare_at_price=NULL,
      rating=0,
      sold_count=0,
      stock=1,
      reserved_stock=0,
      featured=1,
      active=1,
      sale_verified=1,
      sale_verified_at=datetime('now'),
      sale_verified_by='launch_verified_official_store_2026-09-04',
      seo_title='ชารางจืด 30 ซอง | KHONCHAIHERB',
      seo_description='ชารางจืด 100% ไม่มีน้ำตาล บรรจุ 30 ซอง ตราคุณชายสมุนไพร',
      updated_at=datetime('now')
    WHERE id=?`).bind(PRODUCT_ID).run();

  // Avoid inheriting seeded/demo variant inventory. Launch with a one-unit safety cap on the base product only.
  await env.DB.prepare(`UPDATE product_variants SET active=0,stock=0,reserved_stock=0,updated_at=datetime('now') WHERE product_id=?`).bind(PRODUCT_ID).run();
  await env.DB.prepare(`UPDATE product_media SET active=0 WHERE product_id=?`).bind(PRODUCT_ID).run();
  await env.DB.prepare(`INSERT INTO product_media(product_id,object_key,media_type,alt_text,sort_order,active)
      VALUES(?,?,'image','ชารางจืด 30 ซอง ตราคุณชายสมุนไพร',0,1)
      ON CONFLICT(object_key) DO UPDATE SET product_id=excluded.product_id,alt_text=excluded.alt_text,sort_order=0,active=1`).bind(PRODUCT_ID,STATIC_KEY).run();

  try{
    await env.DB.prepare(`INSERT INTO audit_logs(actor_type,actor_id,action,entity_type,entity_id,metadata_json)
      VALUES('system','launch-bootstrap','product.sale_verified','product',?,?)`).bind(String(PRODUCT_ID),JSON.stringify({
        source:'official_company_store_public_listing',
        verifiedDate:'2026-09-04',
        launchPrice:120,
        launchSafetyStock:1,
        stockPolicy:'conservative_web_launch_cap_not_warehouse_inventory',
        staticMediaKey:STATIC_KEY
      })).run();
  }catch{}

  const out=await env.DB.prepare(`SELECT id,slug,sku,name,price,stock,COALESCE(reserved_stock,0) reserved_stock,active,sale_verified,sale_verified_at,sale_verified_by FROM products WHERE id=?`).bind(PRODUCT_ID).first();
  const media=await env.DB.prepare(`SELECT object_key,active FROM product_media WHERE product_id=? ORDER BY active DESC,sort_order,id`).bind(PRODUCT_ID).all();
  return json({ok:true,version:VERSION,product:out,media:media.results||[],policy:{launchSafetyStock:1,checkoutStillControlledByLaunchGate:true}});
}
