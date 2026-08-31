import {adminAuthorized,json,audit} from '../../_lib/admin.js';
import {scanIntegrity,saveIntegritySnapshot,runSafeMaintenance,tableExists} from '../../_lib/resilience.js';
function staffName(request){return request.headers.get('X-KCH-Staff-Name')||'legacy'}
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);if(!env.DB)return json({error:'database_not_bound'},503);
  const r=await env.DB.prepare("SELECT snapshot_no,schema_version,status,manifest_json,created_by,created_at FROM backup_snapshots ORDER BY id DESC LIMIT 20").all();
  let integrity=[],maintenance=[];
  if(await tableExists(env,'system_integrity_snapshots')){const x=await env.DB.prepare("SELECT id,status,score,anomalies_count,created_by,created_at FROM system_integrity_snapshots ORDER BY id DESC LIMIT 10").all();integrity=x.results||[]}
  if(await tableExists(env,'maintenance_runs')){const x=await env.DB.prepare("SELECT run_no,job_key,status,affected_rows,run_by,created_at FROM maintenance_runs ORDER BY id DESC LIMIT 10").all();maintenance=x.results||[]}
  return json({snapshots:r.results||[],integrity,maintenance,note:'Backup manifest is metadata only. Use Cloudflare D1 backup/time-travel procedures for physical restore.'});
}
export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);if(!env.DB)return json({error:'database_not_bound'},503);const b=await request.json().catch(()=>({})),actor=staffName(request);
  if(b.action==='integrity_scan'){
    const report=await scanIntegrity(env),snapshotId=await saveIntegritySnapshot(env,report,actor);await audit(env,{action:'integrity_scan',entityType:'system_integrity',entityId:String(snapshotId||''),metadata:{status:report.status,score:report.score,anomaliesCount:report.anomaliesCount},actorId:actor});return json({ok:true,snapshotId,report});
  }
  if(b.action==='safe_maintenance'){
    if(String(b.confirm||'')!=='SAFE_MAINTENANCE')return json({error:'confirmation_required',confirmation:'SAFE_MAINTENANCE'},400);const result=await runSafeMaintenance(env,actor);await audit(env,{action:'safe_maintenance',entityType:'system_maintenance',entityId:result.runNo,metadata:{affectedRows:result.affectedRows,status:result.status},actorId:actor});return json(result);
  }
  if(b.action==='create_manifest'){
    const names=['products','product_variants','customers','orders','order_items','payments','shipments','financial_ledger','purchase_orders','inventory_lots','staff_users','audit_logs','order_request_registry','system_integrity_snapshots'];const counts={};for(const n of names){try{const x=await env.DB.prepare(`SELECT COUNT(*) c FROM ${n}`).first();counts[n]=Number(x?.c||0)}catch{counts[n]=null}}
    const snapshotNo=`BKP-${new Date().toISOString().replace(/\D/g,'').slice(0,14)}`,manifest={version:'1.6.0',schemaVersion:'0014',counts,generatedAt:new Date().toISOString(),containsCustomerData:false,note:'Metadata manifest only; no customer rows are copied.'};await env.DB.prepare("INSERT INTO backup_snapshots(snapshot_no,schema_version,status,manifest_json,created_by) VALUES(?,'0014','verified',?,?)").bind(snapshotNo,JSON.stringify(manifest),actor).run();await audit(env,{action:'backup_manifest_created',entityType:'backup_snapshot',entityId:snapshotNo,metadata:{schemaVersion:'0014'},actorId:actor});return json({ok:true,snapshotNo,manifest});
  }
  return json({error:'invalid_action'},400);
}
