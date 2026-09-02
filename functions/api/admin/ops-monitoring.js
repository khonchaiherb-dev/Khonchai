import {adminAuthorized,json} from '../../_lib/admin.js';
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const [kpi,dbcheck,staleOrders,codIssues,expiringLots]=await Promise.all([
    env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM orders WHERE status!='cancelled' AND fulfillment_status IN ('pending','packing')) open_fulfillment,
      (SELECT COUNT(*) FROM orders WHERE status!='cancelled' AND fulfillment_status IN ('pending','packing') AND created_at<=datetime('now','-24 hours')) stale_fulfillment,
      (SELECT COUNT(*) FROM cod_reconciliations WHERE status='exception') cod_exceptions,
      (SELECT COUNT(*) FROM cod_reconciliations WHERE status IN ('pending','matched') AND received_at<=datetime('now','-48 hours')) cod_settlement_overdue,
      (SELECT COUNT(*) FROM orders WHERE payment_method='cod' AND fulfillment_status='delivered' AND payment_status NOT IN ('cod_collected','paid')) cod_delivered_uncollected,
      (SELECT COUNT(*) FROM return_requests WHERE status IN ('requested','reviewing','approved')) open_returns,
      (SELECT COUNT(*) FROM notification_outbox WHERE status='failed') notification_failed,
      (SELECT COUNT(*) FROM notification_outbox WHERE status='pending') notification_pending,
      (SELECT COUNT(*) FROM approval_requests WHERE status='pending') approvals_pending,
      (SELECT COUNT(*) FROM purchase_orders WHERE approval_status='pending' AND status='draft') po_pending_approval,
      (SELECT COUNT(*) FROM products WHERE active=1 AND MAX(0,stock-COALESCE(reserved_stock,0))<=low_stock_threshold) low_stock_products,
      (SELECT COALESCE(SUM(qty_remaining),0) FROM inventory_lots WHERE qty_remaining>0 AND expires_at IS NOT NULL AND date(expires_at)<date('now')) expired_lot_units,
      (SELECT COALESCE(SUM(qty_remaining),0) FROM inventory_lots WHERE qty_remaining>0 AND expires_at IS NOT NULL AND date(expires_at)>=date('now') AND date(expires_at)<=date('now','+30 days')) expiring_30d_units,
      (SELECT COUNT(*) FROM picking_waves WHERE status IN ('open','picking','picked')) active_waves`).first(),
    env.DB.prepare("SELECT 1 ok").first(),
    env.DB.prepare(`SELECT order_no,customer_name,total,payment_method,payment_status,fulfillment_status,created_at,
      CAST((julianday('now')-julianday(created_at))*24 AS INTEGER) age_hours
      FROM orders WHERE status!='cancelled' AND fulfillment_status IN ('pending','packing') AND created_at<=datetime('now','-24 hours')
      ORDER BY created_at ASC LIMIT 30`).all(),
    env.DB.prepare(`SELECT cr.id,o.order_no,cr.provider,cr.provider_ref,cr.gross_amount,cr.fee_amount,cr.net_amount,cr.status,cr.note,cr.received_at
      FROM cod_reconciliations cr JOIN orders o ON o.id=cr.order_id
      WHERE cr.status='exception' OR (cr.status IN ('pending','matched') AND cr.received_at<=datetime('now','-48 hours'))
      ORDER BY CASE cr.status WHEN 'exception' THEN 0 ELSE 1 END,cr.received_at ASC LIMIT 30`).all(),
    env.DB.prepare(`SELECT l.id,l.product_id,l.variant_id,p.name product_name,COALESCE(v.sku,p.sku) sku,l.qty_remaining,l.unit_cost,l.received_at,l.expires_at,
      CAST(julianday(date(l.expires_at))-julianday(date('now')) AS INTEGER) days_to_expiry
      FROM inventory_lots l JOIN products p ON p.id=l.product_id LEFT JOIN product_variants v ON v.id=l.variant_id
      WHERE l.qty_remaining>0 AND l.expires_at IS NOT NULL AND date(l.expires_at)<=date('now','+30 days')
      ORDER BY date(l.expires_at) ASC,l.received_at ASC LIMIT 30`).all()
  ]);
  const bindings={
    d1:Boolean(env.DB),staffAuth:Boolean(env.AUTH_PEPPER),legacyAdminBridge:String(env.LEGACY_ADMIN_ENABLED||'false').toLowerCase()==='true'&&Boolean(env.ADMIN_TOKEN),
    productMedia:Boolean(env.PRODUCT_MEDIA_BUCKET),reviewMedia:Boolean(env.MEDIA_BUCKET),
    shippingWebhook:Boolean(env.SHIPPING_WEBHOOK_SECRET),notificationWebhook:Boolean(env.NOTIFICATION_WEBHOOK_URL),
    packingVerification:env.PACKING_REQUIRE_VERIFICATION==='true'
  };
  const x=kpi||{},criticalCount=Number(x.cod_exceptions||0)+Number(x.cod_delivered_uncollected||0)+Number(x.expired_lot_units||0),warningCount=Number(x.stale_fulfillment||0)+Number(x.cod_settlement_overdue||0)+Number(x.notification_failed||0)+Number(x.expiring_30d_units||0);
  const riskLevel=criticalCount>0?'critical':warningCount>0?'warning':'normal';
  const critical=bindings.d1&&bindings.staffAuth;
  return json({ok:Boolean(dbcheck?.ok)&&critical,version:'1.4.0',riskLevel,bindings,kpi:x,alerts:{staleOrders:staleOrders.results||[],codIssues:codIssues.results||[],expiringLots:expiringLots.results||[]},checkedAt:new Date().toISOString()});
}
