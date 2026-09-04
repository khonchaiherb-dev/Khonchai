const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const clean=v=>String(v||'').trim();

async function columns(db,table){
  const r=await db.prepare(`PRAGMA table_info('${table.replace(/'/g,"''")}')`).all();
  return new Set((r.results||[]).map(x=>String(x.name||'')));
}

export async function onRequestPost({request,env}){
  const expected=clean(env.LAUNCH_REPAIR_TOKEN);
  if(!expected)return json({error:'not_found'},404);
  const supplied=clean(request.headers.get('X-KCH-Launch-Repair'));
  if(!supplied||supplied!==expected)return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);

  const before=await columns(env.DB,'products');
  if(!before.size)return json({error:'products_table_missing'},409);

  const applied=[];
  if(!before.has('sale_verified')){
    await env.DB.prepare('ALTER TABLE products ADD COLUMN sale_verified INTEGER NOT NULL DEFAULT 0').run();
    applied.push('products.sale_verified');
  }
  const afterVerified=await columns(env.DB,'products');
  if(!afterVerified.has('sale_verified_at')){
    await env.DB.prepare('ALTER TABLE products ADD COLUMN sale_verified_at TEXT').run();
    applied.push('products.sale_verified_at');
  }
  const afterAt=await columns(env.DB,'products');
  if(!afterAt.has('sale_verified_by')){
    await env.DB.prepare('ALTER TABLE products ADD COLUMN sale_verified_by TEXT').run();
    applied.push('products.sale_verified_by');
  }
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_products_sale_ready ON products(active,sale_verified,featured)').run();

  const finalCols=await columns(env.DB,'products');
  const ready=['sale_verified','sale_verified_at','sale_verified_by'].every(x=>finalCols.has(x));
  if(!ready)return json({error:'repair_incomplete',applied},500);

  const count=await env.DB.prepare('SELECT COUNT(*) c FROM products WHERE active=1').first();
  return json({ok:true,repair:'0018_sale_readiness',applied,activeProducts:Number(count?.c||0)});
}

export async function onRequest(){
  return json({error:'method_not_allowed'},405);
}
