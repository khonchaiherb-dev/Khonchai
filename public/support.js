(()=>{
const $=s=>document.querySelector(s),form=$('#ticket-form'),track=$('#track-form'),createStatus=$('#create-status'),trackStatus=$('#track-status'),created=$('#ticket-created'),view=$('#ticket-view'),summary=$('#ticket-summary'),messages=$('#messages'),reply=$('#reply-form');
let active={ticketNo:'',accessCode:''};
const clean=v=>String(v??'').trim();
function setStatus(el,text,ok=false){el.textContent=text||'';el.style.color=ok?'#246143':'#7a6750'}
function saveAccess(ticketNo,accessCode){try{sessionStorage.setItem('kch-support-access',JSON.stringify({ticketNo,accessCode}))}catch{}}
function loadAccess(){try{return JSON.parse(sessionStorage.getItem('kch-support-access')||'{}')||{}}catch{return {}}}
async function api(url,opt={}){const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json','Content-Type':'application/json',...(opt.headers||{})},...opt});const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(data.error||'request_failed'),{status:r.status,data});return data}
function humanStatus(s){return ({open:'เปิดเคสแล้ว',pending_customer:'รอข้อมูลจากลูกค้า',pending_team:'ทีมกำลังตรวจสอบ',resolved:'แก้ไขแล้ว',closed:'ปิดเคส'})[s]||s}
function humanPriority(s){return ({low:'ทั่วไป',normal:'ปกติ',high:'สำคัญ',urgent:'เร่งด่วน'})[s]||s}
function humanCategory(s){return ({order:'คำสั่งซื้อ',shipping:'การจัดส่ง',payment:'การชำระเงิน',return:'คืนสินค้า / คืนเงิน',product:'ข้อมูลสินค้า',account:'บัญชีสมาชิก',other:'เรื่องอื่น'})[s]||s}
function date(v){if(!v)return '-';try{return new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch{return v}}
function renderTicket(t){view.hidden=false;summary.replaceChildren();const h=document.createElement('h3');h.textContent=`${t.ticket_no} • ${t.subject}`;const meta=document.createElement('div');meta.className='ticket-meta';[humanStatus(t.status),humanPriority(t.priority),humanCategory(t.category),t.order_no?`ออเดอร์ ${t.order_no}`:null,t.assigned_agent?`ผู้ดูแล ${t.assigned_agent}`:null].filter(Boolean).forEach(x=>{const s=document.createElement('span');s.textContent=x;meta.appendChild(s)});const due=document.createElement('small');due.textContent=`อัปเดตล่าสุด ${date(t.updated_at)} • SLA ตอบครั้งแรก ${date(t.sla_first_response_due_at)}`;summary.append(h,meta,due);messages.replaceChildren();(t.messages||[]).forEach(m=>{const box=document.createElement('div');box.className=`message ${m.author_type==='staff'?'staff':''}`;const p=document.createElement('div');p.textContent=m.body;const s=document.createElement('small');s.textContent=`${m.author_name||(m.author_type==='staff'?'ทีมบริการลูกค้า':'คุณ')} • ${date(m.created_at)}`;box.append(p,s);messages.appendChild(box)});messages.scrollTop=messages.scrollHeight;reply.hidden=t.status==='closed'}
async function fetchTicket(){const no=clean(track.elements.ticketNo.value),code=clean(track.elements.accessCode.value);setStatus(trackStatus,'กำลังตรวจสอบเคส…');const q=new URLSearchParams({ticketNo:no});if(code)q.set('accessCode',code);try{const data=await api(`/api/support/tickets?${q}`);active={ticketNo:no,accessCode:code};saveAccess(no,code);renderTicket(data.ticket);setStatus(trackStatus,'พบข้อมูลเคสแล้ว',true)}catch(e){view.hidden=true;setStatus(trackStatus,e.status===403?'รหัสเข้าถึงไม่ถูกต้อง หรือเคสนี้อยู่ในบัญชีสมาชิกอื่น':'ไม่พบเคสหรือระบบยังไม่พร้อม')}}
form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const fd=new FormData(form),payload=Object.fromEntries(fd.entries());payload.action='create';setStatus(createStatus,'กำลังสร้างเคส…');try{const data=await api('/api/support/tickets',{method:'POST',body:JSON.stringify(payload)});created.hidden=false;created.replaceChildren();const b=document.createElement('b');b.textContent=`สร้างเคสสำเร็จ: ${data.ticketNo}`;const p=document.createElement('p');p.textContent='เก็บเลขเคสและรหัสเข้าถึงนี้ไว้สำหรับติดตามสถานะ';const c=document.createElement('code');c.textContent=data.accessCode;const s=document.createElement('small');s.textContent=`ระดับความสำคัญ: ${humanPriority(data.priority)} • กำหนดตอบครั้งแรก: ${date(data.sla.firstResponseDueAt)}`;created.append(b,p,c,s);saveAccess(data.ticketNo,data.accessCode);track.elements.ticketNo.value=data.ticketNo;track.elements.accessCode.value=data.accessCode;active={ticketNo:data.ticketNo,accessCode:data.accessCode};setStatus(createStatus,'ส่งเรื่องให้ทีมดูแลแล้ว',true);form.reset();await fetchTicket()}catch(err){setStatus(createStatus,err.data?.error==='order_not_found_or_phone_mismatch'?'ไม่พบเลขคำสั่งซื้อ หรือเบอร์โทรไม่ตรงกับคำสั่งซื้อนั้น':'ยังสร้างเคสไม่ได้ กรุณาตรวจข้อมูลแล้วลองอีกครั้ง')}});
track.addEventListener('submit',e=>{e.preventDefault();fetchTicket()});
reply.addEventListener('submit',async e=>{e.preventDefault();const msg=clean(reply.elements.message.value);if(!msg)return;try{await api('/api/support/tickets',{method:'POST',body:JSON.stringify({action:'reply',ticketNo:active.ticketNo,accessCode:active.accessCode,message:msg})});reply.reset();await fetchTicket()}catch{setStatus(trackStatus,'ส่งข้อความไม่สำเร็จ กรุณาลองอีกครั้ง')}});
document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{form.elements.category.value=b.dataset.category;form.elements.subject.focus();form.scrollIntoView({behavior:'smooth',block:'start'})}));
const recent=loadAccess();if(recent.ticketNo){track.elements.ticketNo.value=recent.ticketNo;track.elements.accessCode.value=recent.accessCode||''}
function applyStorefrontContext(){
  const params=new URLSearchParams(location.search),allowed=new Set(['order','shipping','payment','return','product','account','other']);
  const category=clean(params.get('category')),orderNo=clean(params.get('orderNo')),subject=clean(params.get('subject')),focus=clean(params.get('focus')),ticketNo=clean(params.get('ticketNo'));
  if(allowed.has(category))form.elements.category.value=category;
  if(orderNo)form.elements.orderNo.value=orderNo.slice(0,80);
  if(subject)form.elements.subject.value=subject.slice(0,180);
  if(ticketNo)track.elements.ticketNo.value=ticketNo.slice(0,100);
  if(category||orderNo||subject){
    const p=$('.panel form#ticket-form');
    p?.closest?.('.panel')?.setAttribute?.('data-context-prefilled','1');
  }
  if(focus==='track')requestAnimationFrame(()=>track.scrollIntoView({behavior:'smooth',block:'start'}));
}
applyStorefrontContext();
})();
