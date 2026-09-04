// KHONCHAIHERB production health contract — storefront visual changes must not alter commerce readiness semantics.
const bool=v=>String(v??'').toLowerCase()==='true';

async function probe(db,sql,binds=[]){
  try{
    const stmt=db.prepare(sql),row=binds.length?await stmt.bind(...binds).first():await stmt.first();
    return {ok:true,row:row||null};
  }catch(error){
    return {ok:false,error:String(error?.message||error||'database_probe_failed').slice(0,180)};
  }
}

export async function onRequestGet({env}){
  const legacyBrowserAdminEnabled=String(env.LEGACY_ADMIN_ENABLED??'true').toLowerCase()!=='false';
  const staffCsrfEnforced=bool(env.STAFF_CSRF_ENFORCE);
  const packingVerificationRequired=bool(env.PACKING_REQUIRE_VERIFICATION);
  const orderIdempotencyRequired=bool(env.ORDER_IDEMPOTENCY_REQUIRED);
  const checkoutEnabled=bool(env.CHECKOUT_ENABLED);
  const codConfigured=bool(env.COD_ENABLED);
  const databaseBound=!!env.DB;
  const r2ProductMediaConfigured=!!env.PRODUCT_MEDIA_BUCKET;
  const securityBaselineConfigured=databaseBound&&!!env.ADMIN_TOKEN&&!!env.AUTH_PEPPER&&!!env.RATE_LIMIT_PEPPER&&!legacyBrowserAdminEnabled&&staffCsrfEnforced&&packingVerificationRequired&&orderIdempotencyRequired;

  let databaseReady=false,catalogSchemaReady=false,orderSchemaReady=false,saleReadyProducts=0,staticMediaReadyProducts=0,catalogProbe=null,staticMediaProbe=null,orderProbe=null;
  if(databaseBound){
    const dbProbe=await probe(env.DB,'SELECT 1 ok');
    databaseReady=dbProbe.ok;
    if(databaseReady){
      const saleReadyWhere=`p.active=1 AND p.sale_verified=1 AND p.price>0
        AND (CASE WHEN EXISTS(SELECT 1 FROM product_variants vx WHERE vx.product_id=p.id AND vx.active=1)
          THEN COALESCE((SELECT SUM(MAX(0,v.stock-COALESCE(v.reserved_stock,0))) FROM product_variants v WHERE v.product_id=p.id AND v.active=1),0)
          ELSE MAX(0,p.stock-COALESCE(p.reserved_stock,0)) END)>0
        AND EXISTS(SELECT 1 FROM product_media m WHERE m.product_id=p.id AND m.active=1)`;
      catalogProbe=await probe(env.DB,`SELECT COUNT(*) c FROM products p WHERE ${saleReadyWhere}`);
      catalogSchemaReady=catalogProbe.ok;
      saleReadyProducts=Number(catalogProbe.row?.c||0);
      if(catalogSchemaReady){
        staticMediaProbe=await probe(env.DB,`SELECT COUNT(*) c FROM products p WHERE ${saleReadyWhere}
          AND EXISTS(SELECT 1 FROM product_media sm WHERE sm.product_id=p.id AND sm.active=1 AND sm.object_key IN ('static/rang-jued-tea-360.webp','static/chiang-da-tea-360.webp','static/gymnema-capsules-100-512.webp'))`);
        staticMediaReadyProducts=staticMediaProbe.ok?Number(staticMediaProbe.row?.c||0):0;
      }
      orderProbe=await probe(env.DB,"SELECT idempotency_key,payment_method,payment_status,fulfillment_status FROM orders LIMIT 1");
      orderSchemaReady=orderProbe.ok;
    }
  }

  const staticProductMediaConfigured=catalogSchemaReady&&saleReadyProducts>0&&staticMediaReadyProducts===saleReadyProducts;
  const productMediaConfigured=r2ProductMediaConfigured||staticProductMediaConfigured;
  const codLaunchReady=databaseReady&&catalogSchemaReady&&orderSchemaReady&&saleReadyProducts>0&&productMediaConfigured&&checkoutEnabled&&codConfigured&&packingVerificationRequired&&orderIdempotencyRequired;
  const blockers=[];
  if(!databaseBound)blockers.push('database_not_bound');
  else if(!databaseReady)blockers.push('database_unreachable');
  if(databaseReady&&!catalogSchemaReady)blockers.push('catalog_schema_not_ready');
  if(databaseReady&&!orderSchemaReady)blockers.push('order_schema_not_ready');
  if(catalogSchemaReady&&saleReadyProducts<1)blockers.push('no_sale_ready_products');
  if(saleReadyProducts>0&&!productMediaConfigured)blockers.push('product_media_not_configured');
  if(!checkoutEnabled)blockers.push('checkout_disabled');
  if(!codConfigured)blockers.push('cod_disabled');
  if(!packingVerificationRequired)blockers.push('packing_verification_not_enforced');
  if(!orderIdempotencyRequired)blockers.push('order_idempotency_not_enforced');

  return Response.json({
    ok:databaseReady&&catalogSchemaReady&&orderSchemaReady,
    service:'khonchaiherb-commerce',
    version:'1.18.2',
    d1:codLaunchReady,
    d1Bound:databaseBound,
    databaseBound,
    databaseReady,
    catalogSchemaReady,
    orderSchemaReady,
    saleReadyProducts,
    staticMediaReadyProducts,
    checkoutEnabled,
    codConfigured,
    codLaunchReady,
    orderIntakeReady:codLaunchReady,
    launchBlockers:blockers,
    catalogProbeError:catalogProbe&&!catalogProbe.ok?catalogProbe.error:null,
    orderProbeError:orderProbe&&!orderProbe.ok?orderProbe.error:null,
    adminBridgeConfigured:!!env.ADMIN_TOKEN,
    legacyBrowserAdminEnabled,
    customerAuthConfigured:!!env.AUTH_PEPPER,
    otpConfigured:!!env.OTP_WEBHOOK_URL,
    staffSecurityReady:databaseReady,
    staffCsrfEnforced,
    rateLimitPepperConfigured:!!env.RATE_LIMIT_PEPPER,
    orderIdempotencyRequired,
    securityBaselineConfigured,
    poDualApprovalThreshold:Number(env.PO_DUAL_APPROVAL_THRESHOLD||0),
    refundDualApprovalThreshold:Number(env.REFUND_DUAL_APPROVAL_THRESHOLD||0),
    dailyCloseDualApproval:bool(env.DAILY_CLOSE_DUAL_APPROVAL),
    reviewMediaConfigured:!!env.MEDIA_BUCKET,
    productMediaConfigured,
    r2ProductMediaConfigured,
    staticProductMediaConfigured,
    shippingWebhookConfigured:!!env.SHIPPING_WEBHOOK_SECRET,
    notificationWebhookConfigured:!!env.NOTIFICATION_WEBHOOK_URL,
    packingVerificationRequired,
    reviewRewardConfigured:true,
    memberRewardWallet:true,
    responsiveCommerce:true,
    responsiveBreakpoints:{mobileMax:699,tabletMax:1023},
    conversionResponsive:true,
    desktopProductSplitView:true,
    desktopCheckoutSummary:true,
    searchDiscovery:true,
    persistentDiscovery:true,
    sellerTableSearch:true,
    recentlyViewed:true,
    localWishlist:true,
    searchHistory:true,
    cartRecommendations:true,
    sellerMobileTableTools:true,
    memberWishlistSync:true,
    personalizedCommerce:true,
    recentlyBought:true,
    serverRecentSync:true,
    sellerProductFunnel:true,
    checkoutConfidence:true,
    policyClarity:true,
    productionStabilization:true,
    browserE2E:true,
    compatibilityLayerFrozen:true,
    launchConversion:true,
    readyProductShelf:true,
    fastCartCheckout:true,
    checkoutSessionDraft:true,
    orderHealthGate:true
  },{headers:{'Cache-Control':'no-store'}});
}
