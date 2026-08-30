export async function onRequestGet({env}){
  if(!env.DB) return Response.json({demo:true,revenueToday:24580,ordersToday:86,pendingShipments:5,lowStock:2});
  const revenue=await env.DB.prepare("SELECT COALESCE(SUM(total),0) v, COUNT(*) c FROM orders WHERE date(created_at)=date('now') AND status!='cancelled'").first();
  const pending=await env.DB.prepare("SELECT COUNT(*) c FROM orders WHERE fulfillment_status IN ('pending','packing')").first();
  const low=await env.DB.prepare("SELECT COUNT(*) c FROM products WHERE active=1 AND stock<=low_stock_threshold").first();
  return Response.json({revenueToday:Number(revenue?.v||0),ordersToday:Number(revenue?.c||0),pendingShipments:Number(pending?.c||0),lowStock:Number(low?.c||0)},{headers:{'Cache-Control':'no-store'}});
}
