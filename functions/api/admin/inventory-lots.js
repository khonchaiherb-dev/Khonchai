import {adminAuthorized,json,clean,audit} from '../../_lib/admin.js';

async function columns(env){
  const r=await env.DB.prepare("PRAGMA table_info('inventory_lots')").all();
  return new Set((r.results||[]).map(x=>String(x.name)));
}
const validDate=v=>{const s=clean(v,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null};

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const cols=await columns(env),enhanced=cols.has('quarantined')&&cols.has('lot_code');
  const u=new URL(request.url),productId=Number(u.searchParams.get('productId')||0),includeEmpty=u.searchParams.get('includeEmpty')==='1';
  const where=[includeEmpty?'1=1':'l.qty_remaining>0'];const bind=[];
  if(productId>0){where.push('l.product_id=?');bind.push(productId)}
  const selectEnhanced=enhanced?`,l.lot_code,l.manufactured_at,l.quarantined,l.quarantine_note,l.updated_at`:",NULL lot_code,NULL manufactured_at,0 quarantined,NULL quarantine_note,NULL updated_at";
  const q=`SELECT l.id,l.product_id,l.variant_id,p.name product_name,COALESCE(v.sku,p.sku) sku,
    l.source_type,l.source_ref,l.qty_received,l.qty_remaining,l.unit_cost,l.received_at,l.expires_at${selectEnhanced},
    CASE WHEN l.expires_at IS NULL THEN NULL ELSE CAST(julianday(date(l.expires_at))-julianday(date('now')) AS INTEGER) END days_to_expiry
    FROM inventory_lots l JOIN products p ON p.id=l.product_id LEFT JOIN product_variants v ON v.id=l.variant_id
    WHERE ${where.join(' AND ')}
    ORDER BY CASE WHEN l.expires_at IS NULL THEN 1 ELSE 0 END,date(l.expires_at) ASC,l.received_at ASC,l.id ASC LIMIT 500`;
  const lots=await env.DB.prepare(q).bind(...bind).all();
  const s=await env.DB.prepare(`SELECT
    COALESCE(SUM(qty_remaining),0) tracked_units,
    COALESCE(SUM(CASE WHEN qty_remaining>0 AND expires_at IS NOT NULL AND date(expires_at)<date('now') THEN qty_remaining ELSE 0 END),0) expired_units,
    COALESCE(SUM(CASE WHEN qty_remaining>0 AND expires_at IS NOT NULL AND date(expires_at)>=date('now') AND date(expires_at)<=date('now','+30 days') THEN qty_remaining ELSE 0 END),0) expiring_30d_units
    FROM inventory_lots`).first();
  let quarantinedUnits=0;
  if(enhanced){const qr=await env.DB.prepare("SELECT COALESCE(SUM(qty_remaining),0) n FROM inventory_lots WHERE qty_remaining>0 AND quarantined=1").first();quarantinedUnits=Number(qr?.n||0)}
  return json({schema:{enhanced,fefoAllocations:await env.DB.prepare("SELECT 1 ok FROM sqlite_master WHERE type='table' AND name='inventory_lot_allocations'").first().then(Boolean).catch(()=>false)},summary:{trackedUnits:Number(s?.tracked_units||0),expiredUnits:Number(s?.expired_units||0),expiring30dUnits:Number(s?.expiring_30d_units||0),quarantinedUnits},lots:lots.results||[]});
}

export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const cols=await columns(env);if(!(cols.has('quarantined')&&cols.has('lot_code')))return json({error:'inventory_lot_migration_required'},409);
  const b=await request.json().catch(()=>({})),action=clean(b.action,30),lotId=Number(b.lotId||0);if(!lotId)return json({error:'lot_required'},400);
  const lot=await env.DB.prepare("SELECT id,product_id,variant_id,lot_code,qty_remaining,expires_at,quarantined FROM inventory_lots WHERE id=?").bind(lotId).first();if(!lot)return json({error:'lot_not_found'},404);
  if(action==='quarantine'){
    const note=clean(b.note,500);if(note.length<3)return json({error:'quarantine_reason_required'},400);
    await env.DB.prepare("UPDATE inventory_lots SET quarantined=1,quarantine_note=?,updated_at=datetime('now') WHERE id=?").bind(note,lotId).run();
    await audit(env,{action:'inventory_lot.quarantine',entityType:'inventory_lot',entityId:lotId,metadata:{productId:lot.product_id,variantId:lot.variant_id,lotCode:lot.lot_code,note}});return json({ok:true,lotId,quarantined:true});
  }
  if(action==='release'){
    await env.DB.prepare("UPDATE inventory_lots SET quarantined=0,quarantine_note=NULL,updated_at=datetime('now') WHERE id=?").bind(lotId).run();
    await audit(env,{action:'inventory_lot.release',entityType:'inventory_lot',entityId:lotId,metadata:{productId:lot.product_id,variantId:lot.variant_id,lotCode:lot.lot_code}});return json({ok:true,lotId,quarantined:false});
  }
  if(action==='update_traceability'){
    const lotCode=clean(b.lotCode,80),manufacturedAt=b.manufacturedAt?validDate(b.manufacturedAt):null,expiresAt=b.expiresAt?validDate(b.expiresAt):null;
    if(lotCode.length<2)return json({error:'lot_code_required'},400);if(b.manufacturedAt&&!manufacturedAt)return json({error:'invalid_manufactured_date'},400);if(b.expiresAt&&!expiresAt)return json({error:'invalid_expiry_date'},400);if(manufacturedAt&&expiresAt&&manufacturedAt>expiresAt)return json({error:'manufactured_after_expiry'},400);
    await env.DB.prepare("UPDATE inventory_lots SET lot_code=?,manufactured_at=?,expires_at=?,updated_at=datetime('now') WHERE id=?").bind(lotCode,manufacturedAt,expiresAt,lotId).run();
    await audit(env,{action:'inventory_lot.traceability_update',entityType:'inventory_lot',entityId:lotId,metadata:{lotCode,manufacturedAt,expiresAt}});return json({ok:true,lotId,lotCode,manufacturedAt,expiresAt});
  }
  return json({error:'invalid_action'},400);
}
