const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const money=n=>Math.round((Number(n)||0)*100)/100;
const posInt=v=>{const n=Number(v);return Number.isInteger(n)&&n>0?n:null};
const calcDiscount=(row,subtotal)=>{if(!row)return 0;let d=row.type==='percent'?subtotal*(Number(row.value||0)/100):Number(row.value||0);if(row.max_discount!=null)d=Math.min(d,Number(row.max_discount));return money(Math.max(0,Math.min(d,subtotal)))};

export async function onRequestPost({request,env}){
  const body=await request.json().catch(()=>null);
  if(!body||!Array.isArray(body.items)||body.items.length===0)return json({error:'empty_order'},400);
  if(!env.DB)return json({error:'database_not_bound'},503);

  const ids=[...new Set(body.items.map(x=>Number(x.id)).filter(Number.isInteger))];
  if(!ids.length)return json({error:'invalid_items'},400);
  const placeholders=ids.map(()=>'?').join(',');
  const pr=await env.DB.prepare(`SELECT id,sku,name,price,stock,COALESCE(reserved_stock,0) reserved_stock,active,COALESCE(sale_verified,0) sale_verified FROM products WHERE id IN (${placeholders})`).bind(...ids).all();
  const products=new Map((pr.results||[]).map(p=>[Number(p.id),p]));
  const variantIds=[...new Set(body.items.map(x=>posInt(x.variantId)).filter(Boolean))];
  const variants=new Map();
  if(variantIds.length){
    const vp=variantIds.map(()=>'?').join(',');
    const vr=await env.DB.prepare(`SELECT id,product_id,sku,option_name,option_value,price,stock,COALESCE(reserved_stock,0) reserved_stock,active FROM product_variants WHERE id IN (${vp})`).bind(...variantIds).all();
    for(const v of vr.results||[])variants.set(Number(v.id),v);
  }

  let subtotal=0;const lines=[];
  for(const raw of body.items){
    const id=Number(raw.id),qty=Math.max(1,Math.min(20,Number(raw.qty)||1)),p=products.get(id),variantId=posInt(raw.variantId),v=variantId?variants.get(variantId):null;
    if(!p||!Number(p.active)||!Number(p.sale_verified)||Number(p.price)<=0)return json({error:'product_unavailable',productId:id},409);
    if(variantId&&(!v||Number(v.product_id)!==id||!Number(v.active)||Number(v.price)<=0))return json({error:'variant_unavailable',productId:id,variantId},409);
    const source=v||p,available=Math.max(0,Number(source.stock||0)-Number(source.reserved_stock||0));
    if(available<qty)return json({error:'insufficient_stock',productId:id,variantId:variantId||null,available},409);
    const unitPrice=Number(source.price),lineTotal=money(unitPrice*qty),name=v?`${p.name} (${v.option_name}: ${v.option_value})`:p.name;
    subtotal=money(subtotal+lineTotal);lines.push({productId:id,variantId:variantId||null,name,unitPrice,qty,lineTotal,available});
  }

  const promoRows=await env.DB.prepare("SELECT id,code,name,type,value,min_spend,max_discount,priority,usage_limit,used_count FROM promotions WHERE active=1 AND min_spend<=? AND (starts_at IS NULL OR starts_at<=datetime('now')) AND (ends_at IS NULL OR ends_at>=datetime('now')) AND (usage_limit IS NULL OR used_count<usage_limit) ORDER BY priority DESC,id ASC").bind(subtotal).all();
  let promotion=null,promotionDiscount=0;
  for(const p of promoRows.results||[]){const d=calcDiscount(p,subtotal);if(d>promotionDiscount){promotion=p;promotionDiscount=d}}
  const discount=money(Math.min(subtotal,promotionDiscount));

  const settings=await env.DB.prepare("SELECT key,value FROM store_settings WHERE key IN ('shipping_fee','free_shipping_threshold')").all();
  const sm=Object.fromEntries((settings.results||[]).map(x=>[x.key,Number(x.value)]));
  const shippingFee=Number.isFinite(sm.shipping_fee)?sm.shipping_fee:45;
  const freeThreshold=Number.isFinite(sm.free_shipping_threshold)?sm.free_shipping_threshold:699;
  const shipping=subtotal>=freeThreshold?0:shippingFee;
  const total=money(Math.max(0,subtotal-discount+shipping));

  return json({ok:true,lines,subtotal,discount,promotionDiscount:discount,promotionCode:promotion?.code||null,promotionName:promotion?.name||null,shipping,total,paymentMethods:['COD'],quoteSource:'server'});
}
