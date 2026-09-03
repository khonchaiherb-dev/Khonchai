import {json,tableExists} from '../../_lib/staff-auth.js';

const bool=v=>String(v??'').toLowerCase()==='true';
const isConfigured=(...values)=>values.every(Boolean);

export async function onRequestGet({env}){
  if(!env.DB)return json({ready:false,score:0,blockers:['db'],checks:[{key:'db',status:'fail',required:true,detail:'ยังไม่ได้เชื่อม Cloudflare D1'}]},503);

  const tableNames=[
    'products','orders','payments','shipments','receipts','product_media','order_request_registry',
    'commerce_sources','source_assets','source_reviews','source_product_links',
    'payment_attempts','payment_provider_events','checkout_sessions','checkout_recovery_events','cod_risk_assessments'
  ];
  const tables={};
  for(const name of tableNames)tables[name]=await tableExists(env,name);

  const productColumns=await env.DB.prepare('PRAGMA table_info(products)').all();
  const saleGateReady=(productColumns.results||[]).some(x=>x.name==='sale_verified');
  let readyProducts=0;
  if(saleGateReady&&tables.product_media){
    const r=await env.DB.prepare(`SELECT COUNT(*) c FROM products p
      WHERE p.active=1 AND p.sale_verified=1 AND p.price>0
      AND MAX(0,p.stock-COALESCE(p.reserved_stock,0))>0
      AND EXISTS(SELECT 1 FROM product_media m WHERE m.product_id=p.id AND m.active=1)`).first();
    readyProducts=Number(r?.c||0);
  }

  let sourceLibrary={sources:0,assets:0,reviews:0,links:0};
  if(tables.commerce_sources){const r=await env.DB.prepare('SELECT COUNT(*) c FROM commerce_sources WHERE active=1').first();sourceLibrary.sources=Number(r?.c||0)}
  if(tables.source_assets){const r=await env.DB.prepare('SELECT COUNT(*) c FROM source_assets WHERE status IN (\'approved\',\'published\')').first();sourceLibrary.assets=Number(r?.c||0)}
  if(tables.source_reviews){const r=await env.DB.prepare('SELECT COUNT(*) c FROM source_reviews WHERE status IN (\'approved\',\'published\')').first();sourceLibrary.reviews=Number(r?.c||0)}
  if(tables.source_product_links){const r=await env.DB.prepare('SELECT COUNT(*) c FROM source_product_links WHERE active=1').first();sourceLibrary.links=Number(r?.c||0)}

  const codEnabled=String(env.COD_ENABLED??'true').toLowerCase()!=='false';
  const shippingReady=Boolean(env.SHIPPING_WEBHOOK_SECRET);
  const notificationsReady=Boolean(env.NOTIFICATION_WEBHOOK_URL);
  const productMediaReady=Boolean(env.PRODUCT_MEDIA_BUCKET);
  const reviewMediaReady=Boolean(env.MEDIA_BUCKET);
  const orderGuard=bool(env.ORDER_IDEMPOTENCY_REQUIRED)||bool(env.PRODUCTION_MODE)||String(env.ENVIRONMENT||'').toLowerCase()==='production';
  const promptpayConfigured=isConfigured(env.PROMPTPAY_PROVIDER,env.PROMPTPAY_MERCHANT_ID,env.PROMPTPAY_WEBHOOK_SECRET);
  const gatewayConfigured=isConfigured(env.PAYMENT_GATEWAY_PROVIDER,env.PAYMENT_GATEWAY_MERCHANT_ID,env.PAYMENT_GATEWAY_WEBHOOK_SECRET);
  const onlineEnabled=bool(env.ONLINE_PAYMENTS_ENABLED);
  const onlineReady=onlineEnabled&&(promptpayConfigured||gatewayConfigured);
  const recoverySchema=tables.checkout_sessions&&tables.checkout_recovery_events;
  const paymentSchema=tables.payment_attempts&&tables.payment_provider_events;
  const codRiskSchema=tables.cod_risk_assessments;
  const sourceSchema=tables.commerce_sources&&tables.source_assets&&tables.source_reviews&&tables.source_product_links;

  const checks=[
    {key:'sale_catalog',label:'สินค้าพร้อมขายจริง',status:readyProducts>0?'pass':'fail',required:true,detail:readyProducts>0?`${readyProducts} รายการผ่านราคา + สต็อก + รูป + sale verification`:'ยังไม่มีสินค้าที่ผ่านเงื่อนไขขายจริงครบ'},
    {key:'order_idempotency',label:'ป้องกันออเดอร์ซ้ำ',status:orderGuard&&tables.order_request_registry?'pass':'fail',required:true,detail:orderGuard&&tables.order_request_registry?'เปิดใช้งานแล้ว':'ต้องเปิด order idempotency และ migration ที่เกี่ยวข้อง'},
    {key:'cod',label:'COD',status:codEnabled?'pass':'fail',required:true,detail:codEnabled?'เปิดเก็บเงินปลายทาง':'COD ถูกปิด'},
    {key:'shipping_reconciliation',label:'ขนส่งและกระทบยอด COD',status:shippingReady?'pass':'fail',required:true,detail:shippingReady?'มี Shipping webhook secret':'ต้องเชื่อม shipping webhook ก่อนรับออเดอร์จริง'},
    {key:'product_media',label:'คลังรูปสินค้า',status:productMediaReady?'pass':'warn',required:false,detail:productMediaReady?'R2 product media พร้อม':'ยังไม่ได้ bind PRODUCT_MEDIA_BUCKET'},
    {key:'notification',label:'แจ้งเตือนลูกค้า',status:notificationsReady?'pass':'warn',required:false,detail:notificationsReady?'Notification provider พร้อม':'ควรเชื่อม LINE/SMS/Email provider'},
    {key:'review_media',label:'สื่อรีวิว',status:reviewMediaReady?'pass':'warn',required:false,detail:reviewMediaReady?'R2 review media พร้อม':'ยังไม่ได้ bind MEDIA_BUCKET'},
    {key:'koonchaishop_schema',label:'Koonchaishop source library',status:sourceSchema?'pass':'warn',required:false,detail:sourceSchema?`source ${sourceLibrary.sources} • assets ${sourceLibrary.assets} • reviews ${sourceLibrary.reviews} • links ${sourceLibrary.links}`:'ต้อง apply migration 0021'},
    {key:'payment_architecture',label:'Payment architecture',status:paymentSchema?'pass':'warn',required:false,detail:paymentSchema?'payment attempts + webhook event ledger พร้อม':'ต้อง apply migration 0022'},
    {key:'online_payment',label:'PromptPay / Online payment',status:onlineReady?'pass':promptpayConfigured||gatewayConfigured?'warn':'warn',required:false,detail:onlineReady?'เปิด online payment พร้อม webhook แล้ว':promptpayConfigured||gatewayConfigured?'provider ตั้งค่าแล้ว แต่ ONLINE_PAYMENTS_ENABLED ยังไม่เปิด':'ยังไม่ได้เชื่อม provider จริง'},
    {key:'checkout_recovery',label:'Abandoned checkout recovery',status:recoverySchema?'pass':'warn',required:false,detail:recoverySchema?'schema พร้อมและบังคับ recovery_allowed ก่อนติดต่อ':'ต้อง apply migration 0022'},
    {key:'cod_risk',label:'COD risk assessment',status:codRiskSchema?'pass':'warn',required:false,detail:codRiskSchema?'schema พร้อมแบบ advisory ไม่กระทบ checkout เดิม':'ต้อง apply migration 0022'}
  ];

  const required=checks.filter(x=>x.required);
  const blockers=required.filter(x=>x.status!=='pass').map(x=>x.key);
  const score=Math.round(checks.reduce((n,x)=>n+(x.status==='pass'?1:x.status==='warn'?.5:0),0)/checks.length*100);
  return json({
    version:'1.0',
    ready:blockers.length===0,
    score,
    blockers,
    readyProducts,
    sourceLibrary,
    capabilities:{codEnabled,shippingReady,notificationsReady,onlineReady,promptpayConfigured,gatewayConfigured,recoverySchema,paymentSchema,codRiskSchema},
    checks
  });
}
