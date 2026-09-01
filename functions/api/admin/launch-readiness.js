import {json,tableExists} from '../../_lib/staff-auth.js';
const bool=v=>String(v??'').toLowerCase()==='true';
export async function onRequestGet({env}){
  if(!env.DB)return json({ready:false,score:0,checks:[{key:'db',label:'Cloudflare D1',status:'fail',required:true,detail:'ยังไม่ได้เชื่อมฐานข้อมูล'}]},503);
  const tables=['staff_users','staff_sessions','staff_session_meta','security_events','approval_requests','approval_decisions','approval_executions','backup_snapshots','order_request_registry','maintenance_runs','system_integrity_snapshots','customer_favorites'];
  const tableState={};for(const t of tables)tableState[t]=await tableExists(env,t);
  let staff={owners:0,admins:0,active:0},critical24h=0,pendingApprovals=0,latestIntegrity=null;
  if(tableState.staff_users){const r=await env.DB.prepare(`SELECT COUNT(*) active,SUM(CASE WHEN role='owner' AND active=1 THEN 1 ELSE 0 END) owners,SUM(CASE WHEN role='admin' AND active=1 THEN 1 ELSE 0 END) admins FROM staff_users`).first();staff={owners:Number(r?.owners||0),admins:Number(r?.admins||0),active:Number(r?.active||0)}}
  if(tableState.security_events){const r=await env.DB.prepare("SELECT COUNT(*) c FROM security_events WHERE severity='critical' AND created_at>=datetime('now','-24 hours')").first();critical24h=Number(r?.c||0)}
  if(tableState.approval_requests){const r=await env.DB.prepare("SELECT COUNT(*) c FROM approval_requests WHERE status='pending'").first();pendingApprovals=Number(r?.c||0)}
  if(tableState.system_integrity_snapshots)latestIntegrity=await env.DB.prepare("SELECT id,status,score,anomalies_count,created_at FROM system_integrity_snapshots ORDER BY id DESC LIMIT 1").first();
  const resilienceSchema=tableState.order_request_registry&&tableState.maintenance_runs&&tableState.system_integrity_snapshots;
  const orderGuard=bool(env.ORDER_IDEMPOTENCY_REQUIRED)||bool(env.PRODUCTION_MODE)||String(env.ENVIRONMENT||'').toLowerCase()==='production';
  const checks=[
    {key:'db',label:'Cloudflare D1',status:'pass',required:true,detail:'เชื่อมฐานข้อมูลแล้ว'},
    {key:'staff_schema',label:'Staff security schema',status:tableState.staff_session_meta?'pass':'fail',required:true,detail:tableState.staff_session_meta?'Migration 0013 พร้อม':'ต้อง apply migration 0013'},
    {key:'resilience_schema',label:'Resilience & recovery schema',status:resilienceSchema?'pass':'fail',required:true,detail:resilienceSchema?'Migration 0014 พร้อม':'ต้อง apply migration 0014'},
    {key:'favorites_schema',label:'Member favorites schema',status:tableState.customer_favorites?'pass':'fail',required:true,detail:tableState.customer_favorites?'Migration 0015 พร้อม':'ต้อง apply migration 0015'},
    {key:'owner',label:'Owner account',status:staff.owners>0?'pass':'fail',required:true,detail:staff.owners>0?`${staff.owners} Owner active`:'ยังไม่มี Owner account'},
    {key:'admin_bridge',label:'Server admin bridge',status:env.ADMIN_TOKEN?'pass':'fail',required:true,detail:env.ADMIN_TOKEN?'ตั้งค่า ADMIN_TOKEN แล้ว':'ยังไม่ได้ตั้งค่า ADMIN_TOKEN'},
    {key:'rate_pepper',label:'Rate-limit privacy secret',status:env.RATE_LIMIT_PEPPER?'pass':'fail',required:true,detail:env.RATE_LIMIT_PEPPER?'ตั้งค่าแล้ว':'ต้องตั้ง RATE_LIMIT_PEPPER'},
    {key:'csrf',label:'Staff CSRF enforcement',status:bool(env.STAFF_CSRF_ENFORCE)&&tableState.staff_session_meta?'pass':'warn',required:true,detail:bool(env.STAFF_CSRF_ENFORCE)?(tableState.staff_session_meta?'เปิดใช้งาน':'เปิดไว้แต่ migration ยังไม่พร้อม'):'ตั้ง STAFF_CSRF_ENFORCE=true หลัง apply migration'},
    {key:'order_guard',label:'Order idempotency guard',status:orderGuard&&resilienceSchema?'pass':'warn',required:true,detail:orderGuard?(resilienceSchema?'บังคับ Idempotency + fingerprint registry แล้ว':'เปิด guard แต่ migration ยังไม่พร้อม'):'ตั้ง ORDER_IDEMPOTENCY_REQUIRED=true ก่อนรับออเดอร์จริง'},
    {key:'integrity',label:'Latest integrity scan',status:!latestIntegrity?'warn':latestIntegrity.status==='healthy'?'pass':latestIntegrity.status==='warning'?'warn':'fail',required:true,detail:!latestIntegrity?'ยังไม่เคยรัน Integrity Scan':`${latestIntegrity.status} • ${Number(latestIntegrity.score||0)}% • anomalies ${Number(latestIntegrity.anomalies_count||0)}`},
    {key:'request_limits',label:'API request size guard',status:'pass',required:true,detail:`Order ${Number(env.ORDER_MAX_BODY_BYTES||32768).toLocaleString('en-US')} bytes • API ${Number(env.API_MAX_BODY_BYTES||131072).toLocaleString('en-US')} bytes`},
    {key:'legacy',label:'Legacy browser access',status:String(env.LEGACY_ADMIN_ENABLED??'true').toLowerCase()==='false'?'pass':'warn',required:false,detail:String(env.LEGACY_ADMIN_ENABLED??'true').toLowerCase()==='false'?'ปิด Legacy login แล้ว':'ควรปิดหลังสร้าง Owner สำเร็จ'},
    {key:'packing',label:'Packing verification',status:bool(env.PACKING_REQUIRE_VERIFICATION)?'pass':'warn',required:false,detail:bool(env.PACKING_REQUIRE_VERIFICATION)?'บังคับตรวจแพ็กก่อนส่ง':'แนะนำ PACKING_REQUIRE_VERIFICATION=true'},
    {key:'otp',label:'Customer OTP delivery',status:env.OTP_WEBHOOK_URL?'pass':'warn',required:false,detail:env.OTP_WEBHOOK_URL?'เชื่อม OTP provider แล้ว':'สมาชิกยังต้องเชื่อม OTP provider จริง'},
    {key:'shipping',label:'Shipping webhook verification',status:env.SHIPPING_WEBHOOK_SECRET?'pass':'warn',required:false,detail:env.SHIPPING_WEBHOOK_SECRET?'ตั้ง secret แล้ว':'ยังไม่ได้ตั้ง SHIPPING_WEBHOOK_SECRET'},
    {key:'product_media',label:'Product media storage',status:env.PRODUCT_MEDIA_BUCKET?'pass':'warn',required:false,detail:env.PRODUCT_MEDIA_BUCKET?'R2 พร้อม':'ยังไม่ได้ bind PRODUCT_MEDIA_BUCKET'},
    {key:'review_media',label:'Review media storage',status:env.MEDIA_BUCKET?'pass':'warn',required:false,detail:env.MEDIA_BUCKET?'R2 รีวิวพร้อม':'ยังไม่ได้ bind MEDIA_BUCKET'},
    {key:'notifications',label:'Customer notification provider',status:env.NOTIFICATION_WEBHOOK_URL?'pass':'warn',required:false,detail:env.NOTIFICATION_WEBHOOK_URL?'เชื่อม Notification provider แล้ว':'ยังไม่ได้เชื่อม Notification provider'},
    {key:'po_approval',label:'PO dual approval',status:Number(env.PO_DUAL_APPROVAL_THRESHOLD||0)>0?'pass':'warn',required:false,detail:Number(env.PO_DUAL_APPROVAL_THRESHOLD||0)>0?`เริ่มที่ ฿${Number(env.PO_DUAL_APPROVAL_THRESHOLD).toLocaleString('en-US')}`:'ยังไม่กำหนด threshold'},
    {key:'refund_approval',label:'Refund dual approval',status:Number(env.REFUND_DUAL_APPROVAL_THRESHOLD||0)>0?'pass':'warn',required:false,detail:Number(env.REFUND_DUAL_APPROVAL_THRESHOLD||0)>0?`เริ่มที่ ฿${Number(env.REFUND_DUAL_APPROVAL_THRESHOLD).toLocaleString('en-US')}`:'ยังไม่กำหนด threshold'},
    {key:'close_approval',label:'Daily closing approval',status:bool(env.DAILY_CLOSE_DUAL_APPROVAL)?'pass':'warn',required:false,detail:bool(env.DAILY_CLOSE_DUAL_APPROVAL)?'เปิด Dual Approval แล้ว':'แนะนำเปิดเมื่อมี Finance/Admin อย่างน้อย 2 คน'},
    {key:'critical_events',label:'Critical security events 24h',status:critical24h===0?'pass':'warn',required:false,detail:critical24h===0?'ไม่พบ Critical event':`${critical24h} Critical events ใน 24 ชม.`}
  ];
  const required=checks.filter(x=>x.required),requiredPassed=required.filter(x=>x.status==='pass').length,score=Math.round(checks.filter(x=>x.status==='pass').length/checks.length*100);
  return json({version:'1.18.2',ready:requiredPassed===required.length,score,requiredPassed,requiredTotal:required.length,staff,critical24h,pendingApprovals,latestIntegrity,stabilization:{browserE2E:true,compatibilityLayerFrozen:true,orderIdempotencyRequired:orderGuard},checks});
}
