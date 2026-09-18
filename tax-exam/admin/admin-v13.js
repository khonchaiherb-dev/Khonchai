(()=>{
  const CFG=window.KEXAM_ANALYTICS_CONFIG||{};
  const $=s=>document.querySelector(s);
  const esc=(x='')=>String(x).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('th-TH').format(Number(n)):'–';
  const pct=n=>Number.isFinite(Number(n))?`${Math.round(Number(n)*10)/10}%`:'–';
  const endpoint=()=>{const b=String(CFG.supabaseUrl||'').replace(/\/$/,'');return b&&CFG.dashboardFunction?`${b}/functions/v1/${CFG.dashboardFunction}`:''};
  const connected=()=>Boolean(endpoint()&&CFG.supabaseAnonKey);
  let days=30,qualityRowsCache=[];
  let publicationCoverageCache=null,sourceBacklogCache=null;

  function localEvents(){try{return JSON.parse(localStorage.getItem('kexam_analytics_local_v1')||'[]')||[]}catch{return[]}}
  function localQuestionReports(){
    const out=[];for(const [storageKey,position] of [['kexam_tax_v2','tax-auditor'],['kexam_revenue_academic_v1','revenue-academic']]){
      try{const g=JSON.parse(localStorage.getItem(storageKey)||'{}');for(const r of (Array.isArray(g.questionReports)?g.questionReports:[]))out.push({...r,position:r.position||position})}catch{}
    }
    return out.sort((a,b)=>(Number(b.reportedAt)||0)-(Number(a.reportedAt)||0)).slice(0,50);
  }
  function localItemStats(){
    const out=[];for(const [storageKey,position] of [['kexam_tax_v2','tax-auditor'],['kexam_revenue_academic_v1','revenue-academic']]){
      try{
        const g=JSON.parse(localStorage.getItem(storageKey)||'{}'),stats=g.itemStats&&typeof g.itemStats==='object'?g.itemStats:{};
        for(const [id,x] of Object.entries(stats)){
          const attempts=Number(x?.attempts)||0,correct=Number(x?.correct)||0,choices=Array.isArray(x?.choices)?x.choices.map(v=>Number(v)||0):[0,0,0,0],answer=Number(x?.answer);
          if(!attempts)continue;
          const accuracy=Math.round(correct/attempts*100),unused=choices.reduce((n,v,i)=>n+(i!==answer&&v===0?1:0),0);
          const risk=(attempts>=3?(accuracy<35?4:accuracy>95?1:0):0)+(unused>=2?3:unused)+(attempts>=5?1:0);
          const timeSamples=Number(x?.timeSamples)||0,avgTime=timeSamples?Math.round((Number(x?.timeTotal)||0)/timeSamples*10)/10:null;
          out.push({id,position,attempts,correct,accuracy,unused,risk,choices,answer,avg_time_seconds:avgTime,category:String(x?.category||''),topic:String(x?.topic||''),prompt:String(x?.prompt||''),lastSeen:Number(x?.lastSeen)||0});
        }
      }catch{}
    }
    return out.sort((a,b)=>b.risk-a.risk||b.attempts-a.attempts||a.accuracy-b.accuracy||a.id.localeCompare(b.id)).slice(0,40);
  }
  function localQualityQueue(){
    const reportCounts={};for(const r of localQuestionReports()){const id=r.questionId||r.question_id||'';if(id)reportCounts[id]=(reportCounts[id]||0)+1}
    return localItemStats().map(r=>{
      const id=r.id||r.question_id||'',attempts=Number(r.attempts)||0,accuracy=Number(r.accuracy)||0,unused=Number(r.unused??r.unused_distractors)||0,reports=reportCounts[id]||0;
      const riskScore=(accuracy<20||accuracy>95?25:0)+(unused>=2?20:unused===1?10:0)+Math.min(reports*15,45)+(attempts>=20?10:0);
      return {...r,question_id:id,reports,risk_score:riskScore,priority:riskScore>=60?'เร่งด่วน':riskScore>=35?'ควรตรวจ':'เฝ้าดู'};
    }).filter(r=>r.risk_score>0).sort((a,b)=>b.risk_score-a.risk_score||b.reports-a.reports||b.attempts-a.attempts).slice(0,40);
  }

  function localSnapshot(){
    const ev=localEvents(),now=Date.now(),today=new Date().toISOString().slice(0,10),isToday=e=>String(e.client_time||'').slice(0,10)===today;
    const pv=ev.filter(e=>e.event_name==='page_view');
    const opens=ev.filter(e=>e.event_name==='exam_open'&&!e.metadata?.show_result);
    const sub=ev.filter(e=>e.event_name==='exam_submit');
    const scores=sub.map(e=>{const score=Number(e.score),total=Number(e.metadata?.total)||100;return Number.isFinite(score)&&total>0?score*100/total:null}).filter(Number.isFinite);
    const by=(arr,key)=>Object.entries(arr.reduce((m,e)=>{const k=e[key]||e.metadata?.[key]||'ไม่ระบุ';m[k]=(m[k]||0)+1;return m},{})).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}));
    const daily={};for(let i=days-1;i>=0;i--){const d=new Date(now-i*86400000).toISOString().slice(0,10);daily[d]={day:d,page_views:0,starts:0,submissions:0}}
    ev.forEach(e=>{const d=String(e.client_time||'').slice(0,10);if(!daily[d])return;if(e.event_name==='page_view')daily[d].page_views++;if(e.event_name==='exam_open'&&!e.metadata?.show_result)daily[d].starts++;if(e.event_name==='exam_submit')daily[d].submissions++});
    const wrong={};sub.forEach(e=>(e.metadata?.wrong_questions||[]).forEach(q=>{const k=`ข้อ ${q}`;wrong[k]=(wrong[k]||0)+1}));
    return {
      mode:'local',
      summary:{unique_users_total:ev.length?1:0,unique_users_today:ev.some(isToday)?1:0,page_views_today:pv.filter(isToday).length,exam_starts_today:opens.filter(isToday).length,submissions_today:sub.filter(isToday).length,active_30m:ev.some(e=>now-new Date(e.client_time).getTime()<1800000)?1:0,avg_score:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null,completion_rate:opens.length?sub.length/opens.length*100:null},
      daily:Object.values(daily),
      sources:by(ev,'source'),
      positions:by([...opens,...sub],'position_key'),
      sets:by([...opens,...sub],'set_no'),
      modes:by([...opens,...sub],'exam_mode'),
      top_wrong:Object.entries(wrong).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,value])=>({name,value})),
      topic_stats:(()=>{
        const m={};sub.forEach(e=>Object.entries(e.metadata?.topic_result||{}).forEach(([name,v])=>{const total=Number(v?.total)||0,correct=Number(v?.correct)||0;if(!total)return;const key=`${e.position_key||e.metadata?.position||''}|${name}`;m[key]??={position:e.position_key||e.metadata?.position||'',name,total:0,correct:0};m[key].total+=total;m[key].correct+=Math.max(0,Math.min(correct,total))}));
        return Object.values(m).map(x=>({...x,accuracy:x.total?Math.round(x.correct*1000/x.total)/10:0})).sort((a,b)=>a.accuracy-b.accuracy||b.total-a.total);
      })()
    };
  }

  async function publicationCoverage(){
    if(publicationCoverageCache)return publicationCoverageCache;
    try{
      const r=await fetch('../question-publication-manifest.json',{cache:'no-store'});if(!r.ok)throw new Error('manifest');
      const m=await r.json(),positions=m?.positions||{};let published=0,retired=0,sourceVerified=0;
      for(const p of Object.values(positions)){published+=(p?.published_ids||[]).length;retired+=(p?.retired_ids||[]).length;sourceVerified+=(p?.source_verified_ids||[]).length}
      const qaVerified=published,pending=Math.max(0,published-sourceVerified);
      publicationCoverageCache={published,retired,qaVerified,sourceVerified,pending,generatedAt:m?.generated_at||null};
      return publicationCoverageCache;
    }catch{return{published:0,retired:0,qaVerified:0,sourceVerified:0,pending:0,generatedAt:null,error:true}}
  }
  async function sourceVerificationBacklog(){
    if(sourceBacklogCache)return sourceBacklogCache;
    try{
      const r=await fetch('../source-verification-backlog.json',{cache:'no-store'});if(!r.ok)throw new Error('backlog');
      const data=await r.json();sourceBacklogCache=data;return data;
    }catch{return{summary:{total_pending:0,urgent:0,high:0,normal:0,positions:{}},rows:[],error:true}}
  }
  function sourceBacklogSummaryHtml(summary={}){
    return `<div class="metrics"><div class="panel metric"><div class="label">รอตรวจทั้งหมด</div><strong>${fmt(summary.total_pending||0)}</strong><small>source_state = pending</small></div><div class="panel metric"><div class="label">เร่งด่วน</div><strong>${fmt(summary.urgent||0)}</strong><small>มาตรา/อัตรา/กำหนดเวลาหลายสัญญาณ</small></div><div class="panel metric"><div class="label">สูง</div><strong>${fmt(summary.high||0)}</strong><small>ควรตรวจเป็นลำดับต้น</small></div><div class="panel metric"><div class="label">ปกติ</div><strong>${fmt(summary.normal||0)}</strong><small>ตรวจตามลำดับ backlog</small></div></div>`;
  }
  function syncSourcePositionOptions(rows=[]){
    const el=$('#sourcePosition');if(!el)return;
    const keep=el.value,values=[...new Set(rows.map(r=>String(r.position||'')).filter(Boolean))].sort();
    el.innerHTML='<option value="">ทุกตำแหน่ง</option>'+values.map(v=>`<option value="${esc(v)}">${v==='revenue-academic'?'นักวิชาการสรรพากรปฏิบัติการ':v==='tax-auditor'?'นักตรวจสอบภาษีปฏิบัติการ':esc(v)}</option>`).join('');
    if(values.includes(keep))el.value=keep;
  }
  function filteredSourceRows(){
    const data=sourceBacklogCache||{rows:[]},pri=$('#sourcePriority')?.value||'',pos=$('#sourcePosition')?.value||'',q=String($('#sourceSearch')?.value||'').trim().toLowerCase();
    return (data.rows||[]).filter(r=>(!pri||r.priority===pri)&&(!pos||r.position===pos)&&(!q||[r.question_id,r.category,r.topic,r.prompt].some(v=>String(v||'').toLowerCase().includes(q))));
  }
  function sourceBacklogList(rows=[]){
    if(!rows.length)return '<div class="empty">ไม่พบรายการตามตัวกรอง</div>';
    return `<div class="list">${rows.slice(0,100).map(r=>{const pos=r.position==='revenue-academic'?'นักวิชาการสรรพากรฯ':r.position==='tax-auditor'?'นักตรวจสอบภาษีฯ':r.position||'-';const reasons=Array.isArray(r.reasons)?r.reasons.join(' · '):'';return `<div class="row"><div><div class="name">${esc(r.question_id||'ไม่มีรหัส')} · ${esc(r.priority||'ปกติ')} · Priority ${fmt(r.priority_score||0)}</div><div class="meta">${esc(pos)} · ชุด ${fmt(r.set)} ข้อ ${fmt(r.question)} · ${esc(r.topic||r.category||'ไม่ระบุ')}${reasons?`<br>เหตุผลจัดคิว: ${esc(reasons)}`:''}${r.prompt?`<br>${esc(String(r.prompt).slice(0,190))}`:''}</div></div><div class="val">${esc(r.priority||'ปกติ')}</div></div>`}).join('')}</div>`;
  }
  function refreshSourceBacklog(){if($('#sourceBacklog'))$('#sourceBacklog').innerHTML=sourceBacklogList(filteredSourceRows())}
  function exportSourceBacklogCsv(){
    const rows=filteredSourceRows();if(!rows.length)return;
    const header=['question_id','position','set','question','priority','priority_score','category','topic','reasons','prompt','source_state'];
    const lines=[header.join(',')];for(const r of rows)lines.push([r.question_id,r.position,r.set,r.question,r.priority,r.priority_score,r.category,r.topic,(r.reasons||[]).join(' | '),r.prompt,r.source_state].map(csvCell).join(','));
    const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`kexam-source-verification-backlog-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0);
  }

  function publicationCoverageHtml(x){
    if(x?.error)return '<div class="empty">ไม่สามารถโหลด Publication Manifest ได้</div>';
    return `<div class="metrics"><div class="panel metric"><div class="label">Published</div><strong>${fmt(x.published)}</strong><small>ข้อที่อนุญาตให้ขึ้นเว็บ</small></div><div class="panel metric"><div class="label">ผ่าน QA ระบบ</div><strong>${fmt(x.qaVerified)}</strong><small>โครงสร้าง/คุณภาพตาม Gate ปัจจุบัน</small></div><div class="panel metric"><div class="label">ยืนยันแหล่งทางการแล้ว</div><strong>${fmt(x.sourceVerified)}</strong><small>ข้อที่ผูก source reference แล้ว</small></div><div class="panel metric"><div class="label">รอตรวจแหล่งทางการ</div><strong>${fmt(x.pending)}</strong><small>backlog สำหรับ Content Verification</small></div><div class="panel metric"><div class="label">Retired</div><strong>${fmt(x.retired)}</strong><small>ข้อที่ถูกพัก/เลิกเผยแพร่</small></div></div>`;
  }

  async function remoteSnapshot(key){
    const r=await fetch(`${endpoint()}?days=${days}`,{headers:{'apikey':CFG.supabaseAnonKey,'authorization':`Bearer ${CFG.supabaseAnonKey}`,'x-kexam-admin-key':key},cache:'no-store'});
    if(r.status===401||r.status===403)throw new Error('รหัสผู้ดูแลไม่ถูกต้อง');
    if(!r.ok)throw new Error(`โหลดแดชบอร์ดไม่สำเร็จ (${r.status})`);
    return r.json();
  }

  function metric(label,value,sub='',cls=''){return `<div class="panel metric ${cls}"><div class="label">${label}</div><strong>${value}</strong><small>${sub}</small></div>`}
  function list(rows=[],empty='ยังไม่มีข้อมูล'){
    if(!rows.length)return `<div class="empty">${empty}</div>`;
    const max=Math.max(...rows.map(x=>Number(x.value)||0),1);
    return `<div class="list">${rows.slice(0,12).map(x=>`<div class="row"><div><div class="name">${esc(x.name??'ไม่ระบุ')}</div><div class="meta"><span style="display:inline-block;width:${Math.max(6,Math.round((Number(x.value)||0)/max*100))}%;height:4px;border-radius:8px;background:linear-gradient(90deg,#2563eb,#38bdf8);vertical-align:middle"></span></div></div><div class="val">${fmt(x.value)}</div></div>`).join('')}</div>`
  }
  function qualitySummaryHtml(summary={},rows=[]){
    const urgent=Number(summary.urgent??rows.filter(x=>String(x.priority)==='เร่งด่วน').length)||0;
    const review=Number(summary.review??rows.filter(x=>String(x.priority)==='ควรตรวจ').length)||0;
    const watch=Number(summary.watch??rows.filter(x=>String(x.priority)==='เฝ้าดู').length)||0;
    const total=Number(summary.total_flagged??(urgent+review+watch))||0;
    return `<div class="metrics"><div class="panel metric"><div class="label">ควรตรวจทั้งหมด</div><strong>${fmt(total)}</strong><small>Question ID ที่มีสัญญาณผิดปกติ</small></div><div class="panel metric"><div class="label">เร่งด่วน</div><strong>${fmt(urgent)}</strong><small>D ติดลบ/หลายสัญญาณร่วมกัน</small></div><div class="panel metric"><div class="label">ควรตรวจ</div><strong>${fmt(review)}</strong><small>ความเสี่ยงระดับกลาง</small></div><div class="panel metric"><div class="label">เฝ้าดู</div><strong>${fmt(watch)}</strong><small>ยังไม่ถึงระดับเร่งแก้</small></div></div>`;
  }
  function syncQualityPositionOptions(rows=[]){
    const el=$('#qualityPosition');if(!el)return;
    const keep=el.value,values=[...new Set(rows.map(r=>String(r.position||'')).filter(Boolean))].sort();
    el.innerHTML='<option value="">ทุกตำแหน่ง</option>'+values.map(v=>`<option value="${esc(v)}">${v==='revenue-academic'?'นักวิชาการสรรพากรปฏิบัติการ':v==='tax-auditor'?'นักตรวจสอบภาษีปฏิบัติการ':esc(v)}</option>`).join('');
    if(values.includes(keep))el.value=keep;
  }
  function filteredQualityRows(){
    const pri=$('#qualityPriority')?.value||'',pos=$('#qualityPosition')?.value||'';
    return qualityRowsCache.filter(r=>(!pri||String(r.priority||'')===pri)&&(!pos||String(r.position||'')===pos));
  }
  function refreshQualityQueue(){
    const rows=filteredQualityRows();$('#qualityQueue').innerHTML=qualityQueueList(rows);
  }
  function csvCell(v){const s=String(v??'');return '"'+s.replace(/"/g,'""')+'"'}
  function exportQualityCsv(){
    const rows=filteredQualityRows();if(!rows.length)return;
    const header=['question_id','position','priority','risk_score','accuracy','discrimination','unused_distractors','reports','users','attempts'];
    const lines=[header.join(',')];
    for(const r of rows)lines.push([
      r.question_id||r.id||'',r.position||'',r.priority||'',r.risk_score??'',r.accuracy??'',r.discrimination??'',r.unused_distractors??r.unused??'',r.reports??'',r.users??'',r.attempts??''
    ].map(csvCell).join(','));
    const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`kexam-quality-queue-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0);
  }

  function qualityQueueList(rows=[]){
    if(!rows.length)return '<div class="empty">ยังไม่มีข้อที่เข้าเกณฑ์คิวตรวจคุณภาพ</div>';
    return `<div class="list">${rows.slice(0,60).map(r=>{
      const id=r.question_id||r.id||'ไม่มีรหัส',score=Number(r.risk_score)||0,users=Number(r.users)||0,attempts=Number(r.attempts)||0,reports=Number(r.reports)||0,unused=Number(r.unused_distractors??r.unused)||0;
      const accuracy=Number(r.accuracy),disc=r.discrimination==null?null:Number(r.discrimination),pos=r.position==='revenue-academic'?'นักวิชาการสรรพากรฯ':r.position==='tax-auditor'?'นักตรวจสอบภาษีฯ':r.position||'-';
      const signals=[Number.isFinite(accuracy)?`ถูก ${accuracy}%`:null,disc==null?null:`D=${disc.toFixed(1)}`,`ตัวลวงไม่ทำงาน ${unused}/3`,reports?`รายงาน ${reports}`:null].filter(Boolean).join(' · ');
      return `<div class="row"><div><div class="name">${esc(id)} · ${esc(r.priority||'เฝ้าดู')} · Risk ${fmt(score)}</div><div class="meta">${esc(pos)} · ${esc(signals)} · ทำ ${fmt(attempts)} ครั้ง${users?` / ${fmt(users)} ผู้ใช้`:''}</div></div><div class="val">${esc(r.priority||'เฝ้าดู')}</div></div>`;
    }).join('')}</div>`;
  }

  function reportList(rows=null){
    const src=Array.isArray(rows)?rows:localQuestionReports();if(!src.length)return '<div class="empty">ยังไม่มีรายการแจ้งปัญหาข้อสอบ</div>';
    return `<div class="list">${src.slice(0,50).map(r=>{const ts=r.last_reported_at||r.reportedAt,when=ts?new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short'}).format(new Date(ts)):'-';const pos=r.position==='revenue-academic'?'นักวิชาการสรรพากรฯ':r.position==='tax-auditor'?'นักตรวจสอบภาษีฯ':r.position||'-';const id=r.question_id||r.questionId||'ไม่มีรหัส',type=r.type||'อื่น ๆ',count=Number(r.reports)||1;return `<div class="row"><div><div class="name">${esc(id)} · ${esc(type)}</div><div class="meta">${esc(pos)} · ${esc(r.topic||r.category||'ไม่ระบุ')} · ${esc(when)}<br>${esc(String(r.prompt||'').slice(0,160))}</div></div><div class="val">${count>1?`${fmt(count)} รายงาน`:'ตรวจ'}</div></div>`}).join('')}</div>`;
  }
  function itemStatsList(rows=null){
    const src=Array.isArray(rows)?rows:localItemStats();if(!src.length)return '<div class="empty">ยังไม่มีสถิติรายข้อ กรุณาทำและส่งข้อสอบอย่างน้อย 1 ครั้ง</div>';
    return `<div class="list">${src.slice(0,60).map(r=>{
      const id=r.question_id||r.id||'ไม่มีรหัส',unused=Number(r.unused_distractors??r.unused)||0,accuracy=Number(r.accuracy)||0,attempts=Number(r.attempts)||0,users=Number(r.users)||0;
      const pos=r.position==='revenue-academic'?'นักวิชาการสรรพากรฯ':r.position==='tax-auditor'?'นักตรวจสอบภาษีฯ':r.position||'-',choices=Array.isArray(r.choices)?r.choices.join('/'):'–';
      const diff=r.difficulty_index==null?null:Number(r.difficulty_index),disc=r.discrimination==null?null:Number(r.discrimination),de=r.distractor_efficiency==null?null:Number(r.distractor_efficiency);
      const status=String(r.quality_status||'').trim()||(attempts>=3&&(accuracy<35||accuracy>95||unused>=2)?'ควรตรวจ':'ติดตาม');
      const avgTime=r.avg_time_seconds==null?null:Number(r.avg_time_seconds),medianTime=r.median_time_seconds==null?null:Number(r.median_time_seconds);
      const statBits=[`ถูก ${accuracy}%`,diff==null?null:`p=${diff.toFixed(3)}`,disc==null?null:`D=${disc.toFixed(1)}`,de==null?null:`DE=${de.toFixed(1)}%`,avgTime==null?null:`เวลาเฉลี่ย ${Math.round(avgTime)} วิ.`,medianTime==null?null:`มัธยฐาน ${Math.round(medianTime)} วิ.`].filter(Boolean).join(' · ');
      const basis=String(r.psychometric_basis||'').trim()==='first-response-per-user'?'ฐานคำนวณ: คำตอบครั้งแรกต่อผู้ใช้':'';
      return `<div class="row"><div><div class="name">${esc(id)} · ${esc(statBits)} · ทำ ${fmt(attempts)} ครั้ง${users?` / ${fmt(users)} ผู้ใช้`:''}</div><div class="meta">${esc(pos)}${r.topic||r.category?` · ${esc(r.topic||r.category)}`:''} · เลือก ก/ข/ค/ง = ${esc(choices)} · ตัวลวงไม่เคยถูกเลือก ${unused}/3${r.avg_rest_correct!=null||r.avg_rest_incorrect!=null?`<br>คะแนนข้ออื่นเฉลี่ย: กลุ่มตอบถูก ${esc(String(r.avg_rest_correct??'–'))}% · กลุ่มตอบผิด ${esc(String(r.avg_rest_incorrect??'–'))}%`:''}${basis?`<br>${esc(basis)}`:''}${r.prompt?`<br>${esc(String(r.prompt).slice(0,170))}`:''}</div></div><div class="val">${esc(status)}</div></div>`
    }).join('')}</div>`;
  }
  function localSlowItems(){
    return localItemStats().filter(r=>Number.isFinite(Number(r.avg_time_seconds))&&Number(r.avg_time_seconds)>0).sort((a,b)=>Number(b.avg_time_seconds)-Number(a.avg_time_seconds)).slice(0,30);
  }
  function slowItemsList(rows=null){
    const src=Array.isArray(rows)?rows:localSlowItems();if(!src.length)return '<div class="empty">ยังไม่มีข้อมูลเวลาเพียงพอสำหรับจัดอันดับรายข้อ</div>';
    return `<div class="list">${src.slice(0,40).map(r=>{const id=r.question_id||r.id||'ไม่มีรหัส',avg=Number(r.avg_time_seconds)||0,med=r.median_time_seconds==null?null:Number(r.median_time_seconds),samples=Number(r.time_samples)||Number(r.attempts)||0,users=Number(r.users)||0,accuracy=Number(r.accuracy),disc=r.discrimination==null?null:Number(r.discrimination),pos=r.position==='revenue-academic'?'นักวิชาการสรรพากรฯ':r.position==='tax-auditor'?'นักตรวจสอบภาษีฯ':r.position||'-';const bits=[`เฉลี่ย ${Math.round(avg)} วิ.`,med==null?null:`มัธยฐาน ${Math.round(med)} วิ.`,Number.isFinite(accuracy)?`ถูก ${accuracy}%`:null,disc==null?null:`D=${disc.toFixed(1)}`].filter(Boolean).join(' · ');return `<div class="row"><div><div class="name">${esc(id)} · ${esc(bits)}</div><div class="meta">${esc(pos)} · ตัวอย่างเวลา ${fmt(samples)}${users?` · ${fmt(users)} ผู้ใช้`:''}</div></div><div class="val">${med==null?Math.round(avg):Math.round(med)} วิ.</div></div>`}).join('')}</div>`;
  }

  function topicStatsList(rows=[]){
    if(!rows.length)return '<div class="empty">ยังไม่มีข้อมูลหัวข้อย่อย</div>';
    return `<div class="list">${rows.slice(0,15).map(r=>{const pos=r.position==='revenue-academic'?'นักวิชาการสรรพากรฯ':r.position==='tax-auditor'?'นักตรวจสอบภาษีฯ':r.position||'-';return `<div class="row"><div><div class="name">${esc(r.name||'ไม่ระบุ')}</div><div class="meta">${esc(pos)} · ถูก ${fmt(r.correct)}/${fmt(r.total)}</div></div><div class="val">${pct(r.accuracy)}</div></div>`}).join('')}</div>`;
  }

  function chart(rows=[]){
    if(!rows.length)return '<div class="empty">ยังไม่มีข้อมูลรายวัน</div>';
    const max=Math.max(...rows.map(x=>Math.max(Number(x.page_views)||0,Number(x.starts)||0,Number(x.submissions)||0)),1);
    return `<div class="chart">${rows.map(x=>{const h=Math.max(4,Math.round((Number(x.page_views)||0)/max*205));const d=String(x.day||'').slice(5);return `<div class="barcol" title="${x.day}: เปิด ${x.page_views||0} / เริ่ม ${x.starts||0} / ส่ง ${x.submissions||0}"><div class="bar" style="height:${h}px"></div><small>${d}</small></div>`}).join('')}</div>`
  }

  function render(data,remote){
    const s=data.summary||{};
    $('#metrics').innerHTML=[
      metric('ผู้ใช้งานทั้งหมด',fmt(s.unique_users_total),'ผู้ใช้แบบไม่ระบุตัวตน','cyan'),
      metric('ผู้ใช้งานวันนี้',fmt(s.unique_users_today),'อุปกรณ์/ผู้ใช้ที่เข้าวันนี้','green'),
      metric('กำลังใช้งาน',fmt(s.active_30m),'มีเหตุการณ์ใน 30 นาทีล่าสุด','violet'),
      metric('เริ่มทำวันนี้',fmt(s.exam_starts_today),'ครั้งที่เริ่มทำข้อสอบ'),
      metric('ส่งข้อสอบวันนี้',fmt(s.submissions_today),'ครั้งที่ประมวลผลคะแนน'),
      metric('คะแนนเฉลี่ย',s.avg_score==null?'–':`${Math.round(Number(s.avg_score)*10)/10}`,'จาก 100 คะแนน','cyan')
    ].join('');
    $('#completion').textContent=s.completion_rate==null?'–':pct(s.completion_rate);
    $('#dailyChart').innerHTML=chart(data.daily||[]);
    $('#sources').innerHTML=list(data.sources||[],'ยังไม่มีข้อมูลแหล่งที่มา');
    $('#positions').innerHTML=list((data.positions||[]).map(x=>({...x,name:x.name==='tax-auditor'?'นักตรวจสอบภาษีปฏิบัติการ':x.name==='revenue-academic'?'นักวิชาการสรรพากรปฏิบัติการ':x.name})),'ยังไม่มีข้อมูลตำแหน่ง');
    $('#sets').innerHTML=list((data.sets||[]).map(x=>({...x,name:x.name==='ไม่ระบุ'?'โหมดฝึก/สุ่ม':`ชุดที่ ${x.name}`})),'ยังไม่มีข้อมูลชุดข้อสอบ');
    $('#modes').innerHTML=list((data.modes||[]).map(x=>({...x,name:x.name==='fixed'?'ชุดปกติ':x.name==='random'?'สุ่มจำลองสอบ':x.name==='wrong-practice'?'ฝึกข้อที่เคยผิด':x.name==='weak-practice'?'ฝึกหมวดอ่อน':x.name==='topic-practice'?'ฝึกหัวข้อย่อยอ่อน':x.name})),'ยังไม่มีข้อมูลโหมดฝึก');
    $('#topicStats').innerHTML=topicStatsList(data.topic_stats||[]);
    $('#wrong').innerHTML=list(data.top_wrong||[],'ระบบจะเริ่มแสดงเมื่อมีการส่งข้อสอบ');
    const qualityRows=remote?(data.quality_queue||[]):localQualityQueue();
    qualityRowsCache=Array.isArray(qualityRows)?qualityRows:[];
    syncQualityPositionOptions(qualityRowsCache);
    $('#qualitySummary').innerHTML=qualitySummaryHtml(remote?(data.quality_summary||{}):{},qualityRowsCache);
    refreshQualityQueue();
    $('#slowItems').innerHTML=slowItemsList(remote?(data.slow_items||[]):null);
    $('#itemStats').innerHTML=itemStatsList(remote?(data.item_stats||[]):null);
    $('#questionReports').innerHTML=reportList(remote?(data.question_reports||[]):null);
    $('#dataMode').textContent=remote?'ฐานข้อมูลส่วนกลาง':'ข้อมูลเฉพาะเบราว์เซอร์เครื่องนี้';
    $('#dataMode').className=`notice ${remote?'ok':''}`;
    $('#lastUpdate').textContent=new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'medium'}).format(new Date());
    $('#conn').classList.toggle('online',remote);
    $('#connText').textContent=remote?'เชื่อมฐานข้อมูลแล้ว':'ยังไม่ได้เชื่อมฐานข้อมูลส่วนกลาง';
  }

  async function load(){
    const [pub,sourceBacklog]=await Promise.all([publicationCoverage(),sourceVerificationBacklog()]);
    $('#publicationCoverage').innerHTML=publicationCoverageHtml(pub);
    if($('#sourceBacklogSummary'))$('#sourceBacklogSummary').innerHTML=sourceBacklogSummaryHtml(sourceBacklog.summary||{});
    syncSourcePositionOptions(sourceBacklog.rows||[]);
    refreshSourceBacklog();
    $('#refresh').disabled=true;
    try{
      if(!connected()){
        render(localSnapshot(),false);
        $('#adminLogin').style.display='none';
        $('#setup').style.display='block';
        return;
      }
      $('#setup').style.display='none';
      $('#adminLogin').style.display='flex';
      const key=sessionStorage.getItem('kexam_admin_key')||'';
      if(!key){render(localSnapshot(),false);return}
      const data=await remoteSnapshot(key);render(data,true);
    }catch(e){
      render(localSnapshot(),false);
      $('#dataMode').textContent=`เชื่อมต่อไม่สำเร็จ: ${e.message}`;
      $('#dataMode').className='notice';
      sessionStorage.removeItem('kexam_admin_key');
    }finally{$('#refresh').disabled=false}
  }

  $('#sourcePriority').onchange=refreshSourceBacklog;
  $('#sourcePosition').onchange=refreshSourceBacklog;
  $('#sourceSearch').oninput=refreshSourceBacklog;
  $('#exportSourceBacklog').onclick=exportSourceBacklogCsv;
  $('#qualityPriority').onchange=refreshQualityQueue;
  $('#qualityPosition').onchange=refreshQualityQueue;
  $('#exportQuality').onclick=exportQualityCsv;
  $('#refresh').onclick=load;
  $('#days').onchange=e=>{days=Number(e.target.value)||30;load()};
  $('#loginBtn').onclick=()=>{const v=$('#adminKey').value.trim();if(!v)return;sessionStorage.setItem('kexam_admin_key',v);$('#adminKey').value='';load()};
  $('#logout').onclick=()=>{sessionStorage.removeItem('kexam_admin_key');load()};
  $('#adminKey').addEventListener('keydown',e=>{if(e.key==='Enter')$('#loginBtn').click()});
  load();
})();
