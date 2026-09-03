(()=>{
  const CHANNEL_LABEL={line:'LINE',email:'Email',social:'Social',phone:'โทรศัพท์',other:'ช่องทางอื่น',web:'เว็บไซต์'};
  const state={global:null,detail:null,lastReply:null};
  const originalFetch=window.fetch.bind(window);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const integer=n=>new Intl.NumberFormat('th-TH').format(Number(n||0));
  const dt=v=>{if(!v)return '—';const d=new Date(String(v).includes('T')?v:String(v).replace(' ','T')+'Z');return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short'}).format(d)};
  const channelLabel=c=>CHANNEL_LABEL[c]||c||'—';

  function installStyle(){
    if(document.getElementById('kch-support-omni-style'))return;
    const s=document.createElement('style');s.id='kch-support-omni-style';s.textContent=`
      .omni-strip{display:grid;grid-template-columns:1.25fr repeat(4,minmax(0,1fr));gap:8px;margin:10px 0 16px}.omni-card{border:1px solid #e6e5de;border-radius:15px;background:#fff;padding:12px 13px;min-width:0}.omni-card.lead{background:linear-gradient(145deg,#0c3d2f,#15543e);border-color:#174c39;color:#fff}.omni-card span{display:block;font-size:8px;font-weight:800;letter-spacing:.04em;color:#78857d}.omni-card.lead span{color:#bad0c4}.omni-card b{display:block;margin-top:4px;font-size:17px;color:#173f31}.omni-card.lead b{color:#fff;font-size:12px}.omni-card small{display:block;margin-top:3px;font-size:7.5px;line-height:1.45;color:#849089}.omni-card.lead small{color:#c6d8ce}.omni-bad b{color:#a23f36}.omni-warn b{color:#8b6a20}
      .omni-detail{margin-top:12px}.omni-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.omni-list{display:grid;gap:7px}.omni-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:9px 10px;border:1px solid #eceae3;border-radius:11px;background:#fbfcfb}.omni-row div{min-width:0}.omni-row b{display:block;font-size:9px;color:#25483a;overflow-wrap:anywhere}.omni-row small{display:block;margin-top:2px;font-size:7.5px;color:#7a8780;overflow-wrap:anywhere}.omni-status{flex:0 0 auto;padding:4px 7px;border-radius:999px;background:#edf4ef;color:#2f684d;font-size:7px;font-weight:900}.omni-status.pending{background:#fff6dc;color:#8a681c}.omni-status.failed{background:#fff0ed;color:#a23f36}.omni-empty{padding:10px;border:1px dashed #dfe4df;border-radius:10px;color:#7b8780;font-size:8px}.omni-truth{margin:8px 0 0;padding:8px 10px;border-radius:10px;background:#f4f7f5;color:#53645b;font-size:8px;line-height:1.55}
      @media(max-width:1100px){.omni-strip{grid-template-columns:repeat(3,1fr)}.omni-card.lead{grid-column:1/-1}}@media(max-width:720px){.omni-strip,.omni-detail-grid{grid-template-columns:1fr 1fr}.omni-card.lead{grid-column:1/-1}}@media(max-width:480px){.omni-strip,.omni-detail-grid{grid-template-columns:1fr}}
    `;(document.head||document.documentElement).appendChild(s);
  }

  function ensureGlobal(){
    const metrics=document.querySelector('.metrics');if(!metrics)return null;
    let box=document.getElementById('omni-strip');if(box)return box;
    box=document.createElement('section');box.id='omni-strip';box.className='omni-strip';box.setAttribute('aria-label','สถานะ Omnichannel Support');metrics.insertAdjacentElement('afterend',box);return box;
  }
  function renderGlobal(o){
    state.global=o||null;const box=ensureGlobal();if(!box)return;
    if(!o?.schemaReady){box.innerHTML=`<article class="omni-card lead"><span>OMNICHANNEL FOUNDATION</span><b>ยังไม่พร้อมบนฐานข้อมูลนี้</b><small>ต้องมี migration 0024 ก่อน จึงจะรับ/เข้าคิว LINE, Email และ Social ได้ ระบบเว็บเดิมยังทำงานแยกตามปกติ</small></article><article class="omni-card"><span>ข้อความรอส่ง</span><b>—</b><small>Outbox</small></article><article class="omni-card"><span>ส่งไม่สำเร็จ</span><b>—</b><small>ต้องตรวจสอบ</small></article><article class="omni-card"><span>Inbound events</span><b>—</b><small>ข้อความภายนอก</small></article><article class="omni-card"><span>Channel contacts</span><b>—</b><small>ตัวตนช่องทาง</small></article>`;return;}
    box.innerHTML=`<article class="omni-card lead"><span>OMNICHANNEL FOUNDATION</span><b>Data foundation พร้อม</b><small>สถานะนี้หมายถึง schema พร้อมเท่านั้น ช่องทางภายนอกจะถือว่าเชื่อมต่อเมื่อมี credential + adapter จริง</small></article><article class="omni-card omni-warn"><span>ข้อความรอส่ง</span><b>${integer(o.pending)}</b><small>อยู่ใน Outbox</small></article><article class="omni-card ${Number(o.failed)?'omni-bad':''}"><span>ส่งไม่สำเร็จ</span><b>${integer(o.failed)}</b><small>ต้อง retry / ตรวจ adapter</small></article><article class="omni-card"><span>Inbound events</span><b>${integer(o.inboundEvents)}</b><small>รับจากช่องทางภายนอก</small></article><article class="omni-card"><span>Channel contacts</span><b>${integer(o.contacts)}</b><small>ตัวตนที่ผูกกับ Ticket</small></article>`;
  }

  function ensureDetail(){
    const conversation=document.querySelector('.conversation-card');if(!conversation)return null;
    let box=document.getElementById('omni-detail');if(box)return box;
    box=document.createElement('section');box.id='omni-detail';box.className='card omni-detail';conversation.insertAdjacentElement('beforebegin',box);return box;
  }
  function outboxRows(rows){if(!rows?.length)return '<div class="omni-empty">ยังไม่มีข้อความใน Outbox ของเคสนี้</div>';return rows.slice(0,8).map(r=>`<div class="omni-row"><div><b>${esc(channelLabel(r.channel))} → ${esc(r.destination||'—')}</b><small>${dt(r.created_at)}${r.last_error?` • ${esc(r.last_error)}`:''}</small></div><span class="omni-status ${esc(r.status)}">${esc(r.status)}</span></div>`).join('')}
  function contactRows(rows){if(!rows?.length)return '<div class="omni-empty">เคสนี้ยังไม่มีตัวตนจากช่องทางภายนอก</div>';return rows.map(r=>`<div class="omni-row"><div><b>${esc(channelLabel(r.channel))} • ${esc(r.display_name||r.external_contact_id)}</b><small>${esc(r.destination||r.external_contact_id||'—')} • อัปเดต ${dt(r.updated_at)}</small></div><span class="omni-status">linked</span></div>`).join('')}
  function renderDetail(data){
    state.detail=data||null;const box=ensureDetail();if(!box)return;const o=data?.omnichannel,t=data?.ticket;
    if(!o?.schemaReady){box.innerHTML=`<div class="card-head"><div><span>OMNICHANNEL</span><h3>ช่องทางการสนทนา</h3></div></div><div class="omni-truth">Migration 0024 ยังไม่พร้อมบนฐานข้อมูลนี้ จึงไม่มี Outbox/Channel identity สำหรับเคสนี้</div>`;updateComposeTruth(t);return;}
    box.innerHTML=`<div class="card-head"><div><span>OMNICHANNEL</span><h3>ช่องทางและสถานะการส่ง</h3></div><span class="segment">${esc(channelLabel(t?.channel))}</span></div><div class="omni-detail-grid"><div><div class="sla-line"><span>ตัวตนช่องทาง</span><b>${integer(o.contacts?.length||0)} รายการ</b></div><div class="omni-list">${contactRows(o.contacts)}</div></div><div><div class="sla-line"><span>Outbound queue</span><b>${integer(o.outbox?.length||0)} รายการล่าสุด</b></div><div class="omni-list">${outboxRows(o.outbox)}</div></div></div><div class="omni-truth">สถานะ <b>pending</b> หมายถึงข้อความถูกบันทึกเข้าคิวแล้ว แต่ยังไม่ถือว่าส่งถึง LINE/Email/Social จนกว่า adapter จะยืนยันผลสำเร็จ</div>`;
    updateComposeTruth(t);
  }
  function updateComposeTruth(ticket){
    const mode=document.getElementById('compose-mode');if(!mode||!ticket)return;
    const active=document.querySelector('[data-compose].active')?.dataset?.compose||'reply';if(active==='note'){mode.textContent='Internal note — ลูกค้าจะไม่เห็นข้อความนี้';return;}
    const c=ticket.channel||'web';
    if(['line','email','social'].includes(c))mode.textContent=`คำตอบจะถูกบันทึกและเข้าคิวส่งผ่าน ${channelLabel(c)} — ยังไม่ถือว่าส่งสำเร็จจนกว่า adapter จะยืนยัน`;
    else if(c==='web')mode.textContent='ข้อความนี้ลูกค้าจะเห็นในศูนย์ช่วยเหลือบนเว็บไซต์';
    else mode.textContent=`ตอบผ่าน ${channelLabel(c)} — ช่องทางนี้อาจต้องดำเนินการโดยเจ้าหน้าที่ภายนอกระบบ`;
  }

  function deliveryText(result){
    if(!result)return null;if(result.delivery==='queued')return 'บันทึกคำตอบแล้ว และเข้าคิวส่งผ่านช่องทางภายนอก — ยังไม่ถือว่าส่งสำเร็จ';
    if(result.delivery==='web')return 'ส่งข้อความในศูนย์ช่วยเหลือบนเว็บไซต์แล้ว';
    if(result.delivery==='manual')return 'บันทึกคำตอบแล้ว — ช่องทางนี้ต้องดำเนินการส่งต่อโดยเจ้าหน้าที่';
    return null;
  }

  window.fetch=async function(input,init){
    const response=await originalFetch(input,init);try{
      const raw=typeof input==='string'?input:input?.url||'',url=new URL(raw,location.href);if(url.pathname!='/api/admin/support-tickets')return response;
      const copy=response.clone(),data=await copy.json().catch(()=>null);if(!data)return response;
      const method=String(init?.method||'GET').toUpperCase();
      if(method==='GET'){
        if(url.searchParams.get('ticketNo'))queueMicrotask(()=>renderDetail(data));else if(data.omnichannel)queueMicrotask(()=>renderGlobal(data.omnichannel));
      }else if(method==='POST'&&response.ok){
        let body={};try{body=JSON.parse(String(init?.body||'{}'))}catch{}if(body.action==='reply'){state.lastReply=data;setTimeout(()=>{const toast=document.getElementById('toast'),text=deliveryText(data);if(toast&&text){toast.textContent=text;toast.classList.remove('hidden')}},40)}
      }
    }catch{}return response;
  };

  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-compose]'))setTimeout(()=>updateComposeTruth(state.detail?.ticket),0)});
  const observer=new MutationObserver(()=>{const toast=document.getElementById('toast');if(!toast||!state.lastReply)return;if(toast.textContent.includes('ส่งข้อความถึงลูกค้าแล้ว')){const text=deliveryText(state.lastReply);if(text)toast.textContent=text;state.lastReply=null}});observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  installStyle();
})();
