import {adminAuthorized,json} from '../../_lib/admin.js';
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))?String(s):new Date().toISOString().slice(0,10);
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const u=new URL(request.url),date=validDate(u.searchParams.get('date'));
  const sums=await env.DB.prepare(`SELECT
    COALESCE(SUM(CASE WHEN entry_type='cod_collection' THEN amount ELSE 0 END),0) cod_collected,
    COALESCE(-SUM(CASE WHEN entry_type='cod_fee' THEN amount ELSE 0 END),0) cod_fees,
    COALESCE(-SUM(CASE WHEN entry_type='refund' THEN amount ELSE 0 END),0) refunds,
    COALESCE(-SUM(CASE WHEN entry_type='cogs' THEN amount ELSE 0 END),0) cogs,
    COUNT(DISTINCT CASE WHEN entry_type='cod_collection' THEN order_id END) paid_orders
    FROM financial_ledger WHERE entry_date=?`).bind(date).first();
  const codException=await env.DB.prepare("SELECT COUNT(*) c FROM cod_reconciliations WHERE status='exception'").first();
  const refundPending=await env.DB.prepare("SELECT COUNT(*) c FROM refunds WHERE status IN ('requested','approved','processing')").first();
  const ledger=await env.DB.prepare(`SELECT l.id,l.entry_date,l.entry_type,l.amount,l.reference_type,l.reference_id,l.description,l.created_at,o.order_no FROM financial_ledger l LEFT JOIN orders o ON o.id=l.order_id WHERE l.entry_date=? ORDER BY l.id DESC LIMIT 300`).bind(date).all();
  const collected=Number(sums?.cod_collected||0),fees=Number(sums?.cod_fees||0),refunds=Number(sums?.refunds||0),cogs=Number(sums?.cogs||0);
  return json({date,summary:{codCollected:collected,codFees:fees,refunds,cogs,paidOrders:Number(sums?.paid_orders||0),netCash:Math.round((collected-fees-refunds)*100)/100,grossProfit:Math.round((collected-fees-refunds-cogs)*100)/100,codExceptions:Number(codException?.c||0),refundsPending:Number(refundPending?.c||0)},ledger:ledger.results||[]});
}
