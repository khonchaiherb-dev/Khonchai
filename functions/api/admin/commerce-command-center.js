import {adminAuthorized,json} from '../../_lib/admin.js';

const num=v=>Number(v||0);
const money=v=>Math.round(num(v)*100)/100;

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);

  const [catalog,orders,customers,cod,profit]=await Promise.all([
    env.DB.prepare(`SELECT
      COUNT(*) total_products,
      SUM(CASE WHEN active=1 THEN 1 ELSE 0 END) active_products,
      SUM(CASE WHEN active=1 AND COALESCE(sale_verified,0)=1 AND price>0 AND (stock-COALESCE(reserved_stock,0))>0 AND EXISTS(SELECT 1 FROM product_media m WHERE m.product_id=products.id AND m.active=1) THEN 1 ELSE 0 END) sale_ready,
      SUM(CASE WHEN active=1 AND COALESCE(sale_verified,0)=0 THEN 1 ELSE 0 END) awaiting_verification,
      SUM(CASE WHEN active=1 AND (stock-COALESCE(reserved_stock,0))<=COALESCE(low_stock_threshold,5) THEN 1 ELSE 0 END) low_stock
      FROM products`).first(),
    env.DB.prepare(`SELECT
      COUNT(*) orders_30d,
      COALESCE(SUM(total),0) gross_30d,
      COALESCE(AVG(total),0) aov_30d,
      SUM(CASE WHEN fulfillment_status='pending' AND status!='cancelled' THEN 1 ELSE 0 END) waiting_fulfillment,
      SUM(CASE WHEN fulfillment_status IN ('packing','shipping') AND status!='cancelled' THEN 1 ELSE 0 END) in_fulfillment
      FROM orders WHERE datetime(created_at)>=datetime('now','-30 day')`).first(),
    env.DB.prepare(`SELECT
      COUNT(*) customers_total,
      SUM(CASE WHEN order_count>=2 THEN 1 ELSE 0 END) repeat_customers,
      COALESCE(AVG(CASE WHEN order_count>0 THEN lifetime_value END),0) avg_customer_value
      FROM (
        SELECT c.id,COUNT(o.id) order_count,COALESCE(SUM(CASE WHEN o.payment_status IN ('paid','cod_collected') THEN o.total ELSE 0 END),0) lifetime_value
        FROM customers c LEFT JOIN orders o ON o.customer_id=c.id
        GROUP BY c.id
      )`).first(),
    env.DB.prepare(`SELECT
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending,
      SUM(CASE WHEN status='exception' THEN 1 ELSE 0 END) exceptions,
      SUM(CASE WHEN status='matched' THEN 1 ELSE 0 END) matched,
      SUM(CASE WHEN status='settled' THEN 1 ELSE 0 END) settled,
      COALESCE(SUM(CASE WHEN status IN ('matched','settled') THEN net_amount ELSE 0 END),0) net_collected
      FROM cod_reconciliations`).first(),
    env.DB.prepare(`SELECT
      COALESCE(SUM(CASE WHEN o.subtotal>0 THEN oi.line_total-(oi.line_total/o.subtotal)*o.discount_total ELSE oi.line_total END),0) net_sales,
      COALESCE(SUM(oi.cogs_total),0) cogs
      FROM order_items oi JOIN orders o ON o.id=oi.order_id
      WHERE o.status='completed' AND o.payment_status IN ('paid','cod_collected') AND datetime(o.created_at)>=datetime('now','-30 day')`).first()
  ]);

  const netSales=money(profit?.net_sales),cogs=money(profit?.cogs),grossProfit=money(netSales-cogs);
  const repeatRate=num(customers?.customers_total)?Math.round(num(customers?.repeat_customers)/num(customers?.customers_total)*10000)/100:0;
  const marginPct=netSales?Math.round(grossProfit/netSales*10000)/100:0;

  const actions=[];
  if(num(catalog?.awaiting_verification)>0)actions.push({type:'catalog',priority:'high',count:num(catalog.awaiting_verification),label:'สินค้ารอการยืนยันเปิดขาย'});
  if(num(catalog?.low_stock)>0)actions.push({type:'stock',priority:'high',count:num(catalog.low_stock),label:'สินค้าใกล้หมดหรือหมด'});
  if(num(orders?.waiting_fulfillment)>0)actions.push({type:'fulfillment',priority:'high',count:num(orders.waiting_fulfillment),label:'ออเดอร์รอจัดเตรียม'});
  if(num(cod?.exceptions)>0)actions.push({type:'cod',priority:'critical',count:num(cod.exceptions),label:'COD ต้องตรวจสอบ'});

  return json({
    generatedAt:new Date().toISOString(),
    catalog:{total:num(catalog?.total_products),active:num(catalog?.active_products),saleReady:num(catalog?.sale_ready),awaitingVerification:num(catalog?.awaiting_verification),lowStock:num(catalog?.low_stock)},
    sales30d:{orders:num(orders?.orders_30d),gross:money(orders?.gross_30d),aov:money(orders?.aov_30d),waitingFulfillment:num(orders?.waiting_fulfillment),inFulfillment:num(orders?.in_fulfillment)},
    profit30d:{netSales,cogs,grossProfit,marginPct},
    customers:{total:num(customers?.customers_total),repeat:num(customers?.repeat_customers),repeatRate,avgCustomerValue:money(customers?.avg_customer_value)},
    cod:{pending:num(cod?.pending),exceptions:num(cod?.exceptions),matched:num(cod?.matched),settled:num(cod?.settled),netCollected:money(cod?.net_collected)},
    actions
  });
}
