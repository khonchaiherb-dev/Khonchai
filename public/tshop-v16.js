/* KHONCHAIHERB Commerce v1.6 — production resilience, integrity and recovery */
const v16Date=s=>{if(!s)return '-';try{return new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(String(s).replace(' ','T')+'Z'))}catch{return String(s)}};
const v16SellerBase=sellerDashboard;
sellerDashboard=async function(token){
  await v16SellerBase(token);const main=document.querySelector('.sellerMain');if(!main||document.querySelector('.v16-resilience'))return;
  main.insertAdjacentHTML('beforeend',`<section class="v16-resilience"><div class="head"><div><h3>Production Resilience & Recovery</h3><p>Idempotency • Integrity Scan • Safe Maintenance • Recovery evidence</p></div><span>v1.6</span></div><div class="v16-tools">
    <button data-v16-recovery>${I('health_and_safety')}<b>Integrity & Recovery Center</b><small>ตรวจออเดอร์ สต๊อก การเงิน และประวัติ maintenance</small></button>
    <button data-v16-scan>${I('fact_check')}<b>Run Integrity Scan</b><small>สแกนความผิดสมดุลก่อนเปิดขายจริง</small></button>
  </div></section>`);
};
const v16StatusIcon=s=>s==='healthy'||s==='completed'?'check_circle':s==='warning'?'warning':'error';
const v16StatusThai=s=>s==='healthy'?'ปกติ':s==='warning'?'มีข้อควรตรวจสอบ':s==='critical'?'วิกฤต':s==='completed'?'เสร็จสมบูรณ์':s==='failed'?'ล้มเหลว':String(s||'-');
async function v16Recovery(){
  try{const d=await v10AdminFetch('/api/admin/backup'),latest=(d.integrity||[])[0]||null,maintenance=d.maintenance||[];modal(`<div class="v16-modal"><div class="v15-title"><div><h2>Integrity & Recovery Center</h2><p>ตรวจความสมบูรณ์ของข้อมูลและงานบำรุงรักษาที่ปลอดภัย</p></div><button data-close-modal>${I('close')}</button></div>
    <div class="v16-health ${esc(latest?.status||'unknown')}">${I(v16StatusIcon(latest?.status||'critical'))}<div><b>${latest?`Integrity ${v16StatusThai(latest.status)} • ${Number(latest.score||0)}%`:'ยังไม่เคยรัน Integrity Scan'}</b><small>${latest?`${Number(latest.anomalies_count||0)} anomalies • ${esc(v16Date(latest.created_at))}`:'ควรรันการตรวจครั้งแรกหลัง apply Migration 0014'}</small></div></div>
    <div class="v16-actions"><button class="primary" data-v16-scan>${I('fact_check')} รัน Integrity Scan</button><button class="secondary" data-v16-maintenance>${I('cleaning_services')} Safe Maintenance</button></div>
    <section class="v16-history"><h3>Maintenance ล่าสุด</h3>${maintenance.length?maintenance.map(x=>`<article><span>${I(v16StatusIcon(x.status))}<div><b>${esc(x.run_no)}</b><small>${esc(x.job_key)} • ${Number(x.affected_rows||0)} rows</small></div></span><small>${esc(v16Date(x.created_at))}</small></article>`).join(''):'<p class="sub">ยังไม่มีประวัติ maintenance</p>'}</section>
    <div class="v16-note"><b>Safe Maintenance ลบเฉพาะข้อมูลชั่วคราวที่หมดอายุ</b><p>Rate-limit buckets ที่หมดอายุ, Staff sessions เก่าที่หมดอายุ/ถูก revoke และ idempotency reservations ที่สร้างออเดอร์ไม่สำเร็จเกิน 24 ชั่วโมง ระบบจะไม่ลบออเดอร์ ลูกค้า รายการบัญชี หรือสต๊อกจริง</p></div><button class="secondary" data-close-modal>ปิด</button></div>`);bind()}
  catch(e){toast(e.status===403?'บัญชีนี้ไม่มีสิทธิ์ Recovery Center':'โหลด Recovery Center ไม่สำเร็จ')}
}
async function v16RunScan(){
  try{toast('กำลังตรวจความสมบูรณ์ของระบบ...');const d=await v10AdminFetch('/api/admin/backup',{method:'POST',body:JSON.stringify({action:'integrity_scan'})}),r=d.report||{},checks=r.checks||[];modal(`<div class="v16-modal"><div class="v15-title"><div><h2>Integrity Scan</h2><p>ผลตรวจจากฐานข้อมูลปัจจุบัน</p></div><button data-close-modal>${I('close')}</button></div>
    <div class="v16-score ${esc(r.status||'critical')}"><strong>${Number(r.score||0)}%</strong><div><b>${esc(v16StatusThai(r.status))}</b><small>${Number(r.anomaliesCount||0)} anomalies • ${Number(r.criticalChecks||0)} critical checks • ${Number(r.warningChecks||0)} warnings</small></div></div>
    <div class="v16-checks">${checks.map(c=>`<article class="${Number(c.count||0)>0?esc(c.severity):'healthy'}">${I(Number(c.count||0)>0?v16StatusIcon(c.severity==='critical'?'critical':'warning'):'check_circle')}<span><b>${esc(c.label)}</b><small>${Number(c.count||0)} • ${esc(c.detail)}</small></span></article>`).join('')}</div>
    <button class="primary" data-v16-recovery>กลับ Recovery Center</button><button class="secondary" data-close-modal>ปิด</button></div>`);bind()}
  catch(e){toast(e.data?.error==='order_resilience_not_ready'?'ต้อง apply Migration 0014 ก่อน':'Integrity Scan ไม่สำเร็จ')}
}
async function v16Maintenance(){
  if(!confirm('รัน Safe Maintenance ตอนนี้? ระบบจะลบเฉพาะข้อมูลชั่วคราวที่หมดอายุ และจะไม่ลบออเดอร์ ลูกค้า หรือบัญชีการเงินจริง'))return;
  try{const d=await v10AdminFetch('/api/admin/backup',{method:'POST',body:JSON.stringify({action:'safe_maintenance',confirm:'SAFE_MAINTENANCE'})});toast(`Safe Maintenance เสร็จแล้ว • ${Number(d.affectedRows||0)} rows`);v16Recovery()}
  catch(e){toast(e.status===403?'บัญชีนี้ไม่มีสิทธิ์ Maintenance':'Safe Maintenance ไม่สำเร็จ')}
}
const v16ReadinessBase=v15Readiness;
v15Readiness=async function(){await v16ReadinessBase()};
const v16BindBase=bind;
bind=function(){
  v16BindBase();
  document.querySelectorAll('[data-v16-recovery]').forEach(x=>x.onclick=v16Recovery);
  document.querySelectorAll('[data-v16-scan]').forEach(x=>x.onclick=v16RunScan);
  document.querySelectorAll('[data-v16-maintenance]').forEach(x=>x.onclick=v16Maintenance);
};
