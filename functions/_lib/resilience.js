const clean=(v,n=160)=>String(v??'').trim().slice(0,n);
const scalar=async(env,sql,bind=[])=>{try{const r=await env.DB.prepare(sql).bind(...bind).first();return Number(r?.c??r?.value??0)}catch{return null}};
export async function tableExists(env,name){if(!env.DB)return false;try{const r=await env.DB.prepare("SELECT 1 ok FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").bind(name).first();return Boolean(r?.ok)}catch{return false}}
export async function scanIntegrity(env){
  if(!env.DB)return {status:'critical',score:0,anomaliesCount:1,checks:[{key:'database',label:'Cloudflare D1',severity:'critical',count:1,detail:'Database binding is unavailable'}],generatedAt:new Date().toISOString()};
  const required=['orders','order_items','payments','shipments','products','product_variants','stock_reservations','financial_ledger','order_request_registry','system_integrity_snapshots'];
  const missing=[];for(const t of required)if(!(await tableExists(env,t)))missing.push(t);
  const checks=[];const add=(key,label,severity,count,detail)=>{if(count==null){checks.push({key,label,severity:'critical',count:1,detail:`Query failed: ${detail}`});return}checks.push({key,label,severity,count:Number(count),detail})};
  if(missing.length)add('schema_missing','Required resilience schema','critical',missing.length,`Missing tables: ${missing.join(', ')}`);
  if(await tableExists(env,'orders')){
    add('orders_without_items','Orders without line items','critical',await scalar(env,"SELECT COUNT(*) c FROM orders o WHERE NOT EXISTS(SELECT 1 FROM order_items i WHERE i.order_id=o.id)"),'Every order must have at least one order item');
    add('orders_without_payment','Orders without payment record','critical',await scalar(env,"SELECT COUNT(*) c FROM orders o WHERE NOT EXISTS(SELECT 1 FROM payments p WHERE p.order_id=o.id)"),'Every order must have a payment record');
    add('orders_without_shipment','Orders without shipment record','warning',await scalar(env,"SELECT COUNT(*) c FROM orders o WHERE NOT EXISTS(SELECT 1 FROM shipments s WHERE s.order_id=o.id)"),'Every order should have a shipment record');
    add('order_total_mismatch','Order total mismatch','critical',await scalar(env,"SELECT COUNT(*) c FROM orders o LEFT JOIN (SELECT order_id,SUM(line_total) items_total FROM order_items GROUP BY order_id) i ON i.order_id=o.id WHERE ABS(COALESCE(i.items_total,0)-COALESCE(o.discount_total,0)+COALESCE(o.shipping_total,0)-COALESCE(o.total,0))>0.01"),'Stored total must equal item totals minus discounts plus shipping');
  }
  if(await tableExists(env,'stock_reservations')){
    add('product_reserved_mismatch','Product reserved stock mismatch','critical',await scalar(env,"SELECT COUNT(*) c FROM products p LEFT JOIN (SELECT product_id,SUM(qty) qty FROM stock_reservations WHERE status='active' AND variant_id IS NULL GROUP BY product_id) r ON r.product_id=p.id WHERE COALESCE(r.qty,0)<>COALESCE(p.reserved_stock,0)"),'Product reserved_stock must match active reservations');
    add('variant_reserved_mismatch','Variant reserved stock mismatch','critical',await scalar(env,"SELECT COUNT(*) c FROM product_variants v LEFT JOIN (SELECT variant_id,SUM(qty) qty FROM stock_reservations WHERE status='active' AND variant_id IS NOT NULL GROUP BY variant_id) r ON r.variant_id=v.id WHERE COALESCE(r.qty,0)<>COALESCE(v.reserved_stock,0)"),'Variant reserved_stock must match active reservations');
    add('cancelled_active_reservations','Cancelled orders with active reservation','critical',await scalar(env,"SELECT COUNT(*) c FROM stock_reservations r JOIN orders o ON o.id=r.order_id WHERE r.status='active' AND o.status='cancelled'"),'Cancelled orders must release active reservations');
  }
  if(await tableExists(env,'financial_ledger')){
    add('ledger_without_order','Ledger rows referencing missing orders','critical',await scalar(env,"SELECT COUNT(*) c FROM financial_ledger l LEFT JOIN orders o ON o.id=l.order_id WHERE l.order_id IS NOT NULL AND o.id IS NULL"),'Financial ledger references must resolve to an order');
  }
  if(await tableExists(env,'order_request_registry')){
    add('stale_order_requests','Stale idempotency reservations','warning',await scalar(env,"SELECT COUNT(*) c FROM order_request_registry WHERE order_no IS NULL AND first_seen_at<datetime('now','-24 hours')"),'Failed request reservations older than 24 hours can be cleaned safely');
    add('registry_missing_order','Idempotency registry pointing to missing order','critical',await scalar(env,"SELECT COUNT(*) c FROM order_request_registry r LEFT JOIN orders o ON o.order_no=r.order_no WHERE r.order_no IS NOT NULL AND o.id IS NULL"),'Registry order_no must resolve to an order');
  }
  const active=checks.filter(x=>x.count>0),critical=active.filter(x=>x.severity==='critical').length,warnings=active.filter(x=>x.severity==='warning').length;
  const score=Math.max(0,100-critical*18-warnings*6),status=critical?'critical':warnings?'warning':'healthy',anomaliesCount=active.reduce((s,x)=>s+x.count,0);
  return {status,score,anomaliesCount,criticalChecks:critical,warningChecks:warnings,checks,generatedAt:new Date().toISOString()};
}
export async function saveIntegritySnapshot(env,report,createdBy='system'){
  if(!(await tableExists(env,'system_integrity_snapshots')))return null;
  const r=await env.DB.prepare("INSERT INTO system_integrity_snapshots(status,score,anomalies_count,detail_json,created_by) VALUES(?,?,?,?,?) RETURNING id").bind(report.status,report.score,report.anomaliesCount,JSON.stringify(report).slice(0,30000),clean(createdBy,100)).first();return Number(r?.id||0)||null;
}
export async function runSafeMaintenance(env,runBy='system'){
  if(!env.DB)throw new Error('database_not_bound');
  const jobs=[];const run=async(key,table,sql)=>{if(!(await tableExists(env,table))){jobs.push({key,status:'skipped',affectedRows:0,detail:`${table} not available`});return}const r=await env.DB.prepare(sql).run(),changes=Number(r?.meta?.changes||0);jobs.push({key,status:'completed',affectedRows:changes})};
  await run('expired_rate_limits','rate_limit_buckets',"DELETE FROM rate_limit_buckets WHERE expires_at<datetime('now')");
  await run('old_staff_sessions','staff_sessions',"DELETE FROM staff_sessions WHERE expires_at<datetime('now','-7 days') OR (revoked_at IS NOT NULL AND revoked_at<datetime('now','-7 days'))");
  await run('stale_order_requests','order_request_registry',"DELETE FROM order_request_registry WHERE order_no IS NULL AND first_seen_at<datetime('now','-24 hours')");
  const affectedRows=jobs.reduce((s,x)=>s+x.affectedRows,0),runNo=`MNT-${new Date().toISOString().replace(/\D/g,'').slice(0,14)}-${crypto.randomUUID().slice(0,8)}`,status=jobs.some(x=>x.status==='skipped')?'warning':'completed';
  if(await tableExists(env,'maintenance_runs'))await env.DB.prepare("INSERT INTO maintenance_runs(run_no,job_key,status,affected_rows,detail_json,run_by) VALUES(?,'safe_cleanup',?,?,?,?)").bind(runNo,status,affectedRows,JSON.stringify(jobs).slice(0,12000),clean(runBy,100)).run();
  return {ok:true,runNo,status,affectedRows,jobs,completedAt:new Date().toISOString()};
}
