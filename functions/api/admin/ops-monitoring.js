import {adminAuthorized,json} from '../../_lib/admin.js';
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const [kpi,dbcheck]=await Promise.all([
    env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM orders WHERE status!='cancelled' AND fulfillment_status IN ('pending','packing')) open_fulfillment,
      (SELECT COUNT(*) FROM cod_reconciliations WHERE status='exception') cod_exceptions,
      (SELECT COUNT(*) FROM return_requests WHERE status IN ('requested','reviewing','approved')) open_returns,
      (SELECT COUNT(*) FROM notification_outbox WHERE status='failed') notification_failed,
      (SELECT COUNT(*) FROM notification_outbox WHERE status='pending') notification_pending,
      (SELECT COUNT(*) FROM purchase_orders WHERE approval_status='pending' AND status='draft') po_pending_approval,
      (SELECT COUNT(*) FROM products WHERE active=1 AND MAX(0,stock-COALESCE(reserved_stock,0))<=low_stock_threshold) low_stock_products,
      (SELECT COUNT(*) FROM picking_waves WHERE status IN ('open','picking','picked')) active_waves`).first(),
    env.DB.prepare("SELECT 1 ok").first()
  ]);
  const bindings={
    d1:Boolean(env.DB),admin:Boolean(env.ADMIN_TOKEN),auth:Boolean(env.AUTH_PEPPER),
    productMedia:Boolean(env.PRODUCT_MEDIA_BUCKET),reviewMedia:Boolean(env.MEDIA_BUCKET),
    shippingWebhook:Boolean(env.SHIPPING_WEBHOOK_SECRET),notificationWebhook:Boolean(env.NOTIFICATION_WEBHOOK_URL),
    packingVerification:env.PACKING_REQUIRE_VERIFICATION==='true'
  };
  const critical=bindings.d1&&bindings.admin&&bindings.auth;
  return json({ok:Boolean(dbcheck?.ok)&&critical,version:'1.3.0',bindings,kpi:kpi||{},checkedAt:new Date().toISOString()});
}
