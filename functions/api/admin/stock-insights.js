import {adminAuthorized,json} from '../../_lib/admin.js';
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const [best,slow,aging,summary]=await Promise.all([
    env.DB.prepare(`SELECT p.id,p.name,p.sku,SUM(oi.qty) units,SUM(oi.line_total) revenue,
      SUM(oi.cogs_total) cogs,SUM(oi.line_total-oi.cogs_total) gross_profit
      FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN products p ON p.id=oi.product_id
      WHERE o.status!='cancelled' AND o.created_at>=datetime('now','-30 day')
      GROUP BY p.id ORDER BY units DESC,revenue DESC LIMIT 20`).all(),
    env.DB.prepare(`SELECT p.id,p.name,p.sku,p.stock,COALESCE(p.reserved_stock,0) reserved_stock,
      MAX(0,p.stock-COALESCE(p.reserved_stock,0)) available,
      COALESCE(SUM(CASE WHEN o.created_at>=datetime('now','-60 day') AND o.status!='cancelled' THEN oi.qty ELSE 0 END),0) units_60d
      FROM products p LEFT JOIN order_items oi ON oi.product_id=p.id LEFT JOIN orders o ON o.id=oi.order_id
      WHERE p.active=1 GROUP BY p.id HAVING available>0 ORDER BY units_60d ASC,available DESC LIMIT 30`).all(),
    env.DB.prepare(`SELECT CASE
        WHEN julianday('now')-julianday(received_at)<=30 THEN '0-30'
        WHEN julianday('now')-julianday(received_at)<=60 THEN '31-60'
        WHEN julianday('now')-julianday(received_at)<=90 THEN '61-90'
        ELSE '90+' END age_bucket,
      SUM(qty_remaining) qty, SUM(qty_remaining*unit_cost) stock_value
      FROM inventory_lots WHERE qty_remaining>0 GROUP BY age_bucket
      ORDER BY CASE age_bucket WHEN '0-30' THEN 1 WHEN '31-60' THEN 2 WHEN '61-90' THEN 3 ELSE 4 END`).all(),
    env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM products WHERE active=1) active_products,
      (SELECT COALESCE(SUM(stock-COALESCE(reserved_stock,0)),0) FROM products WHERE active=1) available_units,
      (SELECT COALESCE(SUM(qty_remaining*unit_cost),0) FROM inventory_lots WHERE qty_remaining>0) tracked_stock_value,
      (SELECT COUNT(*) FROM products WHERE active=1 AND MAX(0,stock-COALESCE(reserved_stock,0))<=low_stock_threshold) low_stock_products`).first()
  ]);
  return json({summary:summary||{},bestSellers:best.results||[],slowMoving:slow.results||[],stockAging:aging.results||[]});
}
