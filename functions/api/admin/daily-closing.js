import {adminAuthorized,json,clean,audit,money} from '../../_lib/admin.js';
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))?String(s):new Date().toISOString().slice(0,10);
async function summary(env,date){
  const r=await env.DB.prepare(`SELECT
    COALESCE(SUM(CASE WHEN entry_type='cod_collection' THEN amount ELSE 0 END),0) collected,
    COALESCE(-SUM(CASE WHEN entry_type='cod_fee' THEN amount ELSE 0 END),0) fees,
    COALESCE(-SUM(CASE WHEN entry_type='refund' THEN amount ELSE 0 END),0) refunds,
    COALESCE(-SUM(CASE WHEN entry_type='cogs' THEN amount ELSE 0 END),0) cogs,
    COUNT(DISTINCT CASE WHEN entry_type='cod_collection' THEN order_id END) orders_count
    FROM financial_ledger WHERE entry_date=?`).bind(date).first();
  const collected=money(r?.collected),fees=money(r?.fees),refunds=money(r?.refunds),cogs=money(r?.cogs);
  return {ordersCount:Number(r?.orders_count||0),grossCollected:collected,codFees:fees,refundsTotal:refunds,cogsTotal:cogs,netCash:money(collected-fees-refunds),grossProfit:money(collected-fees-refunds-cogs)};
}
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const date=validDate(new URL(request.url).searchParams.get('date')),current=await summary(env,date),closed=await env.DB.prepare("SELECT * FROM daily_closings WHERE closing_date=?").bind(date).first();
  return json({date,current,closed:closed||null});
}
export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const b=await request.json().catch(()=>({})),action=clean(b.action,20),date=validDate(b.date);
  if(action!=='close')return json({error:'invalid_action'},400);
  const existing=await env.DB.prepare("SELECT id,closing_date,closed_at FROM daily_closings WHERE closing_date=? AND status='closed'").bind(date).first();if(existing)return json({ok:true,reused:true,closed:existing});
  const s=await summary(env,date),snapshot=JSON.stringify(s);
  await env.DB.prepare(`INSERT INTO daily_closings(closing_date,orders_count,gross_collected,cod_fees,refunds_total,cogs_total,net_cash,gross_profit,status,closed_by,snapshot_json)
    VALUES(?,?,?,?,?,?,?,?,'closed','admin',?)
    ON CONFLICT(closing_date) DO UPDATE SET orders_count=excluded.orders_count,gross_collected=excluded.gross_collected,cod_fees=excluded.cod_fees,refunds_total=excluded.refunds_total,cogs_total=excluded.cogs_total,net_cash=excluded.net_cash,gross_profit=excluded.gross_profit,status='closed',closed_by='admin',closed_at=datetime('now'),snapshot_json=excluded.snapshot_json`)
    .bind(date,s.ordersCount,s.grossCollected,s.codFees,s.refundsTotal,s.cogsTotal,s.netCash,s.grossProfit,snapshot).run();
  await audit(env,{action:'finance.daily_close',entityType:'daily_closing',entityId:date,metadata:s});return json({ok:true,date,summary:s});
}
