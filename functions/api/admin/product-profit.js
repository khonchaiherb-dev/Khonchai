import {adminAuthorized,json} from '../../_lib/admin.js';

const isoDate=(v,fallback)=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):fallback;
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const u=new URL(request.url),today=new Date().toISOString().slice(0,10),fromDefault=new Date(Date.now()-29*86400000).toISOString().slice(0,10);
  const from=isoDate(u.searchParams.get('from'),fromDefault),to=isoDate(u.searchParams.get('to'),today);
  const r=await env.DB.prepare(`SELECT oi.product_id,p.name,p.sku,
      SUM(oi.qty) units,
      ROUND(SUM(oi.line_total),2) gross_sales,
      ROUND(SUM(CASE WHEN o.subtotal>0 THEN oi.line_total-(oi.line_total/o.subtotal)*o.discount_total ELSE oi.line_total END),2) net_sales,
      ROUND(SUM(COALESCE(oi.cogs_total,0)),2) cogs,
      ROUND(SUM(CASE WHEN o.subtotal>0 THEN oi.line_total-(oi.line_total/o.subtotal)*o.discount_total ELSE oi.line_total END)-SUM(COALESCE(oi.cogs_total,0)),2) gross_profit
    FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN products p ON p.id=oi.product_id
    WHERE o.status='completed' AND o.payment_status IN ('paid','cod_collected') AND date(o.created_at) BETWEEN ? AND ?
    GROUP BY oi.product_id,p.name,p.sku ORDER BY gross_profit DESC,gross_sales DESC LIMIT 200`).bind(from,to).all();
  const rows=(r.results||[]).map(x=>({...x,margin_pct:Number(x.net_sales)>0?Math.round(Number(x.gross_profit)/Number(x.net_sales)*10000)/100:0}));
  const totals=rows.reduce((a,x)=>({units:a.units+Number(x.units||0),grossSales:a.grossSales+Number(x.gross_sales||0),netSales:a.netSales+Number(x.net_sales||0),cogs:a.cogs+Number(x.cogs||0),grossProfit:a.grossProfit+Number(x.gross_profit||0)}),{units:0,grossSales:0,netSales:0,cogs:0,grossProfit:0});
  return json({from,to,rows,totals:{...totals,marginPct:totals.netSales?Math.round(totals.grossProfit/totals.netSales*10000)/100:0},note:'กำไรขั้นต้นรายสินค้าหลังเฉลี่ยส่วนลดตามสัดส่วน ยังไม่หักค่าขนส่ง ค่าธรรมเนียม และค่าใช้จ่ายดำเนินงาน'});
}
