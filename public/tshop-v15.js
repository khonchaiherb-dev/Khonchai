/* KHONCHAIHERB Commerce v1.5 — CSRF, session/device controls and launch readiness */
let V15_CSRF='';
const V15_NATIVE_FETCH=window.fetch.bind(window);
window.fetch=async function(input,init={}){
  let url;try{url=new URL(typeof input==='string'?input:input.url,location.href)}catch{return V15_NATIVE_FETCH(input,init)}
  const method=String(init.method||(typeof input!=='string'&&input.method)||'GET').toUpperCase(),unsafe=!['GET','HEAD','OPTIONS'].includes(method),protectedPath=url.origin===location.origin&&(url.pathname.startsWith('/api/admin/')||url.pathname.startsWith('/api/staff/'));
  if(protectedPath&&unsafe&&url.pathname!=='/api/staff/login'){
    const headers=new Headers(init.headers||(typeof input!=='string'?input.headers:undefined));if(V15_CSRF)headers.set('X-KCH-CSRF',V15_CSRF);init={...init,headers,credentials:'same-origin'};
  }
  return V15_NATIVE_FETCH(input,init);
};
v14StaffMe=async function(){try{const d=await v14Fetch('/api/staff/me');V14_STAFF=d.staff||null;V15_CSRF=d.csrfToken||'';return d}catch{V14_STAFF=null;V15_CSRF='';return {authenticated:false}}};
v14StaffLogin=async function(){
  const username=document.querySelector('#v14-staff-user')?.value.trim()||'',password=document.querySelector('#v14-staff-pass')?.value||'',err=document.querySelector('#v14-staff-error');if(err)err.textContent='';
  try{const d=await v14Fetch('/api/staff/login',{method:'POST',body:JSON.stringify({username,password})});V14_STAFF=d.staff;V15_CSRF=d.csrfToken||'';sessionStorage.setItem('kch-admin-token',V14_STAFF_MARKER);sellerDashboard(V14_STAFF_MARKER)}
  catch(e){if(err)err.textContent=e.data?.error==='account_temporarily_locked'?'บัญชีถูกล็อกชั่วคราวจากการเข้าสู่ระบบผิดหลายครั้ง':e.status===429?'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่':'Username หรือรหัสผ่านไม่ถูกต้อง'}
};
v14StaffLogout=async function(){try{await v14Fetch('/api/staff/logout',{method:'POST',body:'{}'})}catch{}V15_CSRF='';V14_STAFF=null;sessionStorage.removeItem('kch-admin-token');sellerLogin()};

const v15Date=s=>{if(!s)return '-';try{return new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(String(s).replace(' ','T')+'Z'))}catch{return String(s)}};
const v15SellerBase=sellerDashboard;
sellerDashboard=async function(token){
  await v15SellerBase(token);const main=document.querySelector('.sellerMain');if(!main||document.querySelector('.v15-security'))return;
  main.insertAdjacentHTML('beforeend',`<section class="v15-security"><div class="head"><div><h3>Security Hardening & Launch Control</h3><p>CSRF • Sessions • High-risk approvals • Launch readiness</p></div><span>v1.5</span></div><div class="v15-tools">
    <button data-v15-sessions ${V14_STAFF?'':'disabled'}>${I('devices')}<b>Sessions & Devices</b><small>${V14_STAFF?'ดูและยกเลิก Session ของบัญชีนี้':'ใช้ได้เมื่อเข้าสู่ระบบด้วย Staff Account'}</small></button>
    <button data-v15-readiness>${I('fact_check')}<b>Launch Readiness</b><small>ตรวจฐานข้อมูล Secrets และ Security controls</small></button>
  </div></section>`);
};
async function v15Sessions(){
  if(!V14_STAFF){toast('กรุณาเข้าสู่ระบบด้วย Staff Account');return}
  try{const d=await v14Fetch('/api/staff/sessions'),sessions=d.sessions||[];modal(`<div class="v15-modal"><div class="v15-title"><div><h2>Sessions & Devices</h2><p>ควบคุมอุปกรณ์ที่กำลังเข้าใช้ Seller Center</p></div><button data-close-modal>${I('close')}</button></div>
    <div class="v15-session-list">${sessions.map(s=>`<article class="${Number(s.current_session)?'current':''}"><span>${I(Number(s.current_session)?'verified_user':'devices')}<div><b>${esc(s.device_label||'Browser session')}${Number(s.current_session)?' • เครื่องนี้':''}</b><small>ใช้งานล่าสุด ${esc(v15Date(s.last_seen_at))}</small><small>หมดอายุ ${esc(v15Date(s.expires_at))}</small></div></span>${Number(s.current_session)?'<i>Current</i>':`<button data-v15-revoke-session="${esc(s.session_ref)}">ออกจากระบบ</button>`}</article>`).join('')||'<p class="sub">ไม่พบ Session ที่ใช้งานอยู่</p>'}</div>
    ${sessions.length>1?'<button class="danger-btn" data-v15-revoke-others>ออกจากระบบอุปกรณ์อื่นทั้งหมด</button>':''}<button class="secondary" data-close-modal>ปิด</button></div>`)}
  catch(e){toast(e.data?.error==='session_security_migration_required'?'ต้อง apply Migration 0013 ก่อนใช้ Session Center':'โหลด Session ไม่สำเร็จ')}
}
async function v15RevokeSession(sessionRef){
  if(!confirm('ให้อุปกรณ์นี้ออกจาก Seller Center?'))return;
  try{const d=await v14Fetch('/api/staff/sessions',{method:'POST',body:JSON.stringify({action:'revoke',sessionRef})});if(d.current){V15_CSRF='';V14_STAFF=null;sessionStorage.removeItem('kch-admin-token');document.querySelector('#kch-modal')?.remove();sellerLogin();return}toast('ยกเลิก Session แล้ว');v15Sessions()}catch(e){toast(e.data?.error==='csrf_invalid'?'Security token หมดอายุ กรุณาเข้า Seller Center ใหม่':'ยกเลิก Session ไม่สำเร็จ')}
}
async function v15RevokeOthers(){
  if(!confirm('ให้อุปกรณ์อื่นทั้งหมดออกจาก Seller Center?'))return;
  try{const d=await v14Fetch('/api/staff/sessions',{method:'POST',body:JSON.stringify({action:'revoke_others'})});toast(`ยกเลิก ${Number(d.revoked||0)} Session แล้ว`);v15Sessions()}catch{toast('ยกเลิก Session ไม่สำเร็จ')}
}
const v15StatusIcon=s=>s==='pass'?'check_circle':s==='fail'?'cancel':'warning';
async function v15Readiness(){
  try{const d=await v10AdminFetch('/api/admin/launch-readiness'),checks=d.checks||[];modal(`<div class="v15-modal v15-ready-modal"><div class="v15-title"><div><h2>Launch Readiness</h2><p>ประเมินความพร้อมก่อนเปิดใช้งาน Production</p></div><button data-close-modal>${I('close')}</button></div>
    <div class="v15-score ${d.ready?'ready':'pending'}"><strong>${Number(d.score||0)}%</strong><div><b>${d.ready?'Required controls พร้อม':'ยังมี Required controls ที่ต้องตั้งค่า'}</b><small>${Number(d.requiredPassed||0)}/${Number(d.requiredTotal||0)} required checks ผ่าน • ${Number(d.pendingApprovals||0)} approval รอดำเนินการ</small></div></div>
    <div class="v15-checks">${checks.map(c=>`<article class="${esc(c.status)}">${I(v15StatusIcon(c.status))}<span><b>${esc(c.label)} ${c.required?'<em>Required</em>':''}</b><small>${esc(c.detail)}</small></span></article>`).join('')}</div>
    <div class="v15-launch-note"><b>ลำดับเปิดใช้งานที่ปลอดภัย</b><p>Apply Migration 0013 → ตั้ง RATE_LIMIT_PEPPER → เปิด STAFF_CSRF_ENFORCE → ตรวจ Staff/Owner → ปิด Legacy browser access → เปิด Dual Approval ตามวงเงินของบริษัท</p></div><button class="secondary" data-close-modal>ปิด</button></div>`)}
  catch(e){toast(e.status===403?'บัญชีนี้ไม่มีสิทธิ์ดู Launch Readiness':'ตรวจความพร้อมไม่สำเร็จ')}
}
const v15BindBase=bind;
bind=function(){
  v15BindBase();
  document.querySelectorAll('[data-v15-sessions]').forEach(x=>x.onclick=v15Sessions);
  document.querySelectorAll('[data-v15-readiness]').forEach(x=>x.onclick=v15Readiness);
  document.querySelectorAll('[data-v15-revoke-session]').forEach(x=>x.onclick=()=>v15RevokeSession(x.dataset.v15RevokeSession));
  document.querySelectorAll('[data-v15-revoke-others]').forEach(x=>x.onclick=v15RevokeOthers);
};
