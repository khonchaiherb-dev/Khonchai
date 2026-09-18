(()=>{
  const CFG=window.KEXAM_ANALYTICS_CONFIG||{};
  const $=s=>document.querySelector(s);
  const esc=(x='')=>String(x).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('th-TH').format(Number(n)):'–';
  const pct=n=>Number.isFinite(Number(n))?`${Math.round(Number(n)*10)/10}%`:'–';
  const endpoint=()=>{const b=String(CFG.supabaseUrl||'').replace(/\/$/,'');return b&&CFG.dashboardFunction?`${b}/functions/v1/${CFG.dashboardFunction}`:''};
  const connected=()=>Boolean(endpoint()&&CFG.supabaseAnonKey);
  let days=30;

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
          out.push({id,position,attempts,correct,accuracy,unused,risk,choices,answer,category:String(x?.category||''),topic:String(x?.topic||''),prompt:String(x?.prompt||''),lastSeen:Number(x?.lastSeen)||0});
        }
      }catch{}
    }
    return out.sort((a,b)=>b.risk-a.risk||b.attempts-a.attempts||a.accuracy-b.accuracy||a.id.localeCompare(b.id)).slice(0,40);
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
      const statBits=[`ถูก ${accuracy}%`,diff==null?null:`p=${diff.toFixed(3)}`,disc==null?null:`D=${disc.toFixed(1)}`,de==null?null:`DE=${de.toFixed(1)}%`].filter(Boolean).join(' · ');
      return `<div class="row"><div><div class="name">${esc(id)} · ${esc(statBits)} · ทำ ${fmt(attempts)} ครั้ง${users?` / ${fmt(users)} ผู้ใช้`:''}</div><div class="meta">${esc(pos)}${r.topic||r.category?` · ${esc(r.topic||r.category)}`:''} · เลือก ก/ข/ค/ง = ${esc(choices)} · ตัวลวงไม่เคยถูกเลือก ${unused}/3${r.avg_rest_correct!=null||r.avg_rest_incorrect!=null?`<br>คะแนนข้ออื่นเฉลี่ย: กลุ่มตอบถูก ${esc(String(r.avg_rest_correct??'–'))}% · กลุ่มตอบผิด ${esc(String(r.avg_rest_incorrect??'–'))}%`:''}${r.prompt?`<br>${esc(String(r.prompt).slice(0,170))}`:''}</div></div><div class="val">${esc(status)}</div></div>`
    }).join('')}</div>`;
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
    $('#itemStats').innerHTML=itemStatsList(remote?(data.item_stats||[]):null);
    $('#questionReports').innerHTML=reportList(remote?(data.question_reports||[]):null);
    $('#dataMode').textContent=remote?'ฐานข้อมูลส่วนกลาง':'ข้อมูลเฉพาะเบราว์เซอร์เครื่องนี้';
    $('#dataMode').className=`notice ${remote?'ok':''}`;
    $('#lastUpdate').textContent=new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'medium'}).format(new Date());
    $('#conn').classList.toggle('online',remote);
    $('#connText').textContent=remote?'เชื่อมฐานข้อมูลแล้ว':'ยังไม่ได้เชื่อมฐานข้อมูลส่วนกลาง';
  }

  async function load(){
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

  $('#refresh').onclick=load;
  $('#days').onchange=e=>{days=Number(e.target.value)||30;load()};
  $('#loginBtn').onclick=()=>{const v=$('#adminKey').value.trim();if(!v)return;sessionStorage.setItem('kexam_admin_key',v);$('#adminKey').value='';load()};
  $('#logout').onclick=()=>{sessionStorage.removeItem('kexam_admin_key');load()};
  $('#adminKey').addEventListener('keydown',e=>{if(e.key==='Enter')$('#loginBtn').click()});
  load();
})();
