(()=>{
  const CFG=window.KEXAM_ANALYTICS_CONFIG||{};
  const $=s=>document.querySelector(s);
  const esc=(x='')=>String(x).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('th-TH').format(Number(n)):'–';
  const pct=n=>Number.isFinite(Number(n))?`${Math.round(Number(n)*10)/10}%`:'–';
  const endpoint=()=>{const b=String(CFG.supabaseUrl||'').replace(/\/$/,'');return b&&CFG.dashboardFunction?`${b}/functions/v1/${CFG.dashboardFunction}`:''};
  const connected=()=>Boolean(endpoint()&&CFG.supabaseAnonKey);
  let days=30,qualityRowsCache=[],sourceReservationMap=new Map();
  let publicationCoverageCache=null,sourceBacklogCache=null,contentIntegrityCache=null,sourceFreshnessCache=null,sourceBatchRegistryCache=null,answerConspicuousnessCache=null,academicRemediationCache=null,academicRemediationStatusCache=null;

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
      const m=await r.json(),positions=m?.positions||{};let draft=0,reviewed=0,verified=0,published=0,retired=0,sourceVerified=0;
      for(const p of Object.values(positions)){
        draft+=(p?.draft_ids||[]).length;reviewed+=(p?.reviewed_ids||[]).length;verified+=(p?.verified_ids||[]).length;
        published+=(p?.published_ids||[]).length;retired+=(p?.retired_ids||[]).length;sourceVerified+=(p?.source_verified_ids||[]).length
      }
      const pending=Math.max(0,published-sourceVerified),decisionLog=Array.isArray(m?.lifecycle_decision_log)?m.lifecycle_decision_log:[];
      publicationCoverageCache={draft,reviewed,verified,published,retired,sourceVerified,pending,decisionLog,decisionCount:decisionLog.length,generatedAt:m?.generated_at||null};
      return publicationCoverageCache;
    }catch{return{draft:0,reviewed:0,verified:0,published:0,retired:0,sourceVerified:0,pending:0,decisionLog:[],decisionCount:0,generatedAt:null,error:true}}
  }
  async function contentIntegrityCoverage(){
    if(contentIntegrityCache)return contentIntegrityCache;
    try{
      const r=await fetch('../question-content-integrity.json',{cache:'no-store'});if(!r.ok)throw new Error('integrity');
      const x=await r.json(),ids=Object.keys(x?.questions||{}),byPosition={};
      for(const q of Object.values(x?.questions||{})){const p=String(q?.position||'unknown');byPosition[p]=(byPosition[p]||0)+1}
      contentIntegrityCache={
        total:ids.length,
        algorithm:String(x?.algorithm||''),
        schema:Number(x?.schema_version)||0,
        fields:Array.isArray(x?.canonical_fields)?x.canonical_fields:[],
        generatedAt:x?.generated_at||null,
        byPosition
      };
      return contentIntegrityCache;
    }catch{return{total:0,algorithm:'',schema:0,fields:[],generatedAt:null,byPosition:{},error:true}}
  }
  async function sourceFreshnessWatchlist(){
    if(sourceFreshnessCache)return sourceFreshnessCache;
    try{
      const r=await fetch('../source-reverification-watchlist.json',{cache:'no-store'});if(!r.ok)throw new Error('freshness');
      const data=await r.json();sourceFreshnessCache=data;return data;
    }catch{return{summary:{total_verified:0,overdue:0,due_soon:0,fresh:0,positions:{}},rows:[],error:true}}
  }
  async function sourceVerificationBacklog(){
    if(sourceBacklogCache)return sourceBacklogCache;
    try{
      const r=await fetch('../source-verification-backlog.json',{cache:'no-store'});if(!r.ok)throw new Error('backlog-http-'+r.status);
      const raw=await r.text();if(!raw.trim())throw new Error('backlog-empty');
      const data=JSON.parse(raw);
      if(Number(data?.schema_version)!==1||!data?.summary||!Array.isArray(data?.rows))throw new Error('backlog-schema');
      sourceBacklogCache=data;return data;
    }catch(e){
      return{schema_version:1,generation_mode:'unavailable',summary:{total_pending:0,urgent:0,high:0,normal:0,positions:{}},rows:[],error:true,error_message:String(e?.message||e||'backlog-error')};
    }
  }
  async function academicRemediationStatus(){
    if(academicRemediationStatusCache)return academicRemediationStatusCache;
    try{
      const r=await fetch('../academic-answer-remediation-status.json',{cache:'no-store'});if(!r.ok)throw new Error('academic-remediation-status-http-'+r.status);
      const raw=await r.text();if(!raw.trim())throw new Error('academic-remediation-status-empty');
      const data=JSON.parse(raw);
      if(Number(data?.schema_version)!==1||data?.status_model!=='academic-answer-remediation-status-v1'||!data?.summary||!Array.isArray(data?.rows))throw new Error('academic-remediation-status-schema');
      academicRemediationStatusCache=data;return data;
    }catch(e){return{schema_version:1,status_model:'academic-answer-remediation-status-v1',summary:{scope_total:0,current_flagged:0,waiting_review:0,reserved_for_review:0,decision_incomplete:0,ready_to_apply:0,applied_watch:0,resolved:0,needs_rework:0,gate_passed:0,fully_resolved:0,progress_percent:0,strong_remaining:0,moderate_remaining:0,watch_remaining:0,active_reserved_question_ids:0,active_generated_batches:0,applied_batches:0,expired_generated_batches:0,sets:{}},rows:[],error:true,error_message:String(e?.message||e||'academic-remediation-status-error')}}
  }
  async function academicAnswerRemediationBacklog(){
    if(academicRemediationCache)return academicRemediationCache;
    try{
      const r=await fetch('../academic-answer-remediation-backlog.json',{cache:'no-store'});if(!r.ok)throw new Error('academic-remediation-http-'+r.status);
      const raw=await r.text();if(!raw.trim())throw new Error('academic-remediation-empty');
      const data=JSON.parse(raw);
      if(Number(data?.schema_version)!==1||data?.backlog_model!=='academic-answer-remediation-v1'||!data?.summary||!Array.isArray(data?.rows))throw new Error('academic-remediation-schema');
      academicRemediationCache=data;return data;
    }catch(e){return{schema_version:1,backlog_model:'academic-answer-remediation-v1',summary:{total_questions:1000,flagged_questions:0,strong:0,moderate:0,watch:0,sets:{}},rows:[],error:true,error_message:String(e?.message||e||'academic-remediation-error')}}
  }
  async function answerConspicuousnessAudit(){
    if(answerConspicuousnessCache)return answerConspicuousnessCache;
    try{
      const r=await fetch('../answer-conspicuousness-audit.json',{cache:'no-store'});if(!r.ok)throw new Error('answer-audit-http-'+r.status);
      const raw=await r.text();if(!raw.trim())throw new Error('answer-audit-empty');
      const data=JSON.parse(raw);
      if(Number(data?.schema_version)!==1||data?.audit_model!=='answer-conspicuousness-v1'||!data?.summary||!Array.isArray(data?.rows))throw new Error('answer-audit-schema');
      answerConspicuousnessCache=data;return data;
    }catch(e){return{schema_version:1,audit_model:'answer-conspicuousness-v1',summary:{total:0,strong:0,moderate:0,watch:0,positions:{}},rows:[],error:true,error_message:String(e?.message||e||'answer-audit-error')}}
  }
  async function sourceReviewBatchRegistry(){
    if(sourceBatchRegistryCache)return sourceBatchRegistryCache;
    try{
      const r=await fetch('../source-review-batch-registry.json',{cache:'no-store'});if(!r.ok)throw new Error('registry');
      const data=await r.json();
      if(Number(data?.schema_version)!==1||!Array.isArray(data?.batches))throw new Error('registry schema');
      sourceBatchRegistryCache=data;return data;
    }catch{return{schema_version:1,updated_at:null,batches:[],error:true}}
  }
  function qaDataHealthHtml(pub={},backlog={},integrity={},freshness={},registry={}){
    const checks=[];
    const add=(label,state,value,note)=>checks.push({label,state,value,note});
    const published=Number(pub?.published)||0,pending=Number(pub?.pending)||0,sourceVerified=Number(pub?.sourceVerified)||0;
    const fingerprint=Number(integrity?.total)||0,backlogTotal=Number(backlog?.summary?.total_pending)||0,freshVerified=Number(freshness?.summary?.total_verified)||0;
    add('วงจรสถานะข้อสอบ',pub?.error?'bad':published>0?'ok':'warn',fmt(published),pub?.error?'อ่าน publication manifest ไม่สำเร็จ':`Published ${fmt(published)} · Source verified ${fmt(sourceVerified)} · Pending ${fmt(pending)}`);
    add('Fingerprint เนื้อหา',integrity?.error?'bad':fingerprint===published?'ok':'warn',fmt(fingerprint),integrity?.error?'อ่าน content integrity ไม่สำเร็จ':`ควรตรงกับ Published ${fmt(published)} ข้อ`);
    const backlogState=backlog?.error?'bad':backlogTotal===pending?'ok':'warn';
    const backlogMode=String(backlog?.generation_mode||'')==='integrity-baseline'?'คิวฐานจาก Content Integrity':'คิวจัดลำดับตรวจ';
    add('คิวตรวจแหล่งอ้างอิง',backlogState,fmt(backlogTotal),backlog?.error?`ไฟล์คิวใช้งานไม่ได้: ${backlog.error_message||'ไม่ทราบสาเหตุ'}`:`${backlogMode} · ควรตรงกับ Pending ${fmt(pending)} ข้อ`);
    add('รอบทบทวน Source',freshness?.error?'bad':freshVerified===sourceVerified?'ok':'warn',fmt(freshVerified),freshness?.error?'อ่าน re-verification watchlist ไม่สำเร็จ':`ควรตรงกับ Source verified ${fmt(sourceVerified)} ข้อ`);
    const batchCount=Array.isArray(registry?.batches)?registry.batches.length:0;
    add('Source Review Batch',registry?.error?'warn':'ok',fmt(batchCount),registry?.error?'อ่าน Batch Registry ไม่สำเร็จ':'ทะเบียนชุดตรวจพร้อมใช้งาน');
    const bad=checks.filter(x=>x.state==='bad').length,warn=checks.filter(x=>x.state==='warn').length;
    const overall=bad?'พบข้อมูล QA ที่ใช้งานไม่ได้':warn?'พบข้อมูลที่ควรตรวจความสอดคล้อง':'ข้อมูล QA สอดคล้องกัน';
    const cls=bad?'bad':warn?'warn':'ok';
    return `<div class="qa-health-head ${cls}"><strong>${esc(overall)}</strong><span>${bad?bad+' รายการผิดปกติ':warn?warn+' รายการควรตรวจ':'พร้อมติดตามต่อ'}</span></div><div class="qa-health-grid">${checks.map(x=>`<div class="qa-health-card ${x.state}"><div class="qa-health-label">${esc(x.label)}</div><strong>${esc(x.value)}</strong><div class="qa-health-note">${esc(x.note)}</div></div>`).join('')}</div>`;
  }
  function resetQaCaches(){
    publicationCoverageCache=null;sourceBacklogCache=null;contentIntegrityCache=null;sourceFreshnessCache=null;sourceBatchRegistryCache=null;answerConspicuousnessCache=null;academicRemediationCache=null;academicRemediationStatusCache=null;sourceReservationMap=new Map();
  }

  function sourceBacklogModelHtml(data={}){
    if(data?.error)return '<div class="notice">ไม่สามารถอ่านรายละเอียด Risk Model ของ backlog ได้</div>';
    const mode=String(data?.generation_mode||'ไม่ระบุ'),model=String(data?.risk_model||'ไม่ระบุ'),t=data?.risk_thresholds||{};
    const gate=Number(t.publication_gate);
    return `<div class="source-model-strip"><div><span>Generation</span><strong>${esc(mode)}</strong></div><div><span>Risk Model</span><strong>${esc(model)}</strong></div><div><span>เร่งด่วน</span><strong>${Number.isFinite(Number(t.urgent))?'≥ '+fmt(t.urgent):'–'}</strong></div><div><span>สูง</span><strong>${Number.isFinite(Number(t.high))?fmt(t.high)+'–'+fmt((Number(t.urgent)||0)-1):'–'}</strong></div><div><span>Publication Gate</span><strong>${Number.isFinite(gate)?'≥ '+fmt(gate):'–'}</strong></div></div>`;
  }
  function sourceTopTopicsHtml(summary={}){
    const rows=Array.isArray(summary?.top_topics)?summary.top_topics:[];
    if(!rows.length)return '<div class="empty">ยังไม่มีข้อมูลหัวข้อจาก Risk Model</div>';
    const max=Math.max(...rows.map(x=>Number(x.count)||0),1);
    return `<div class="compact-bars">${rows.slice(0,8).map(x=>`<div class="compact-bar-row"><div><span>${esc(x.name||'ไม่ระบุ')}</span><i style="width:${Math.max(5,Math.round((Number(x.count)||0)/max*100))}%"></i></div><strong>${fmt(x.count)}</strong></div>`).join('')}</div>`;
  }
  function sourceBatchAllocate(groups,target){
    const entries=Object.entries(groups).map(([key,rows])=>({key,rows,size:rows.length,raw:0,quota:0}));
    const total=entries.reduce((n,x)=>n+x.size,0);if(!total||target<=0)return new Map();
    for(const x of entries){x.raw=x.size/total*target;x.quota=Math.floor(x.raw)}
    if(target>=entries.length)for(const x of entries)if(x.size>0&&x.quota===0)x.quota=1;
    let used=entries.reduce((n,x)=>n+x.quota,0);
    if(used>target){
      entries.sort((a,b)=>(a.raw-a.quota)-(b.raw-b.quota)||a.size-b.size);
      for(const x of entries){while(used>target&&x.quota>0&&(target<entries.length||x.quota>1)){x.quota--;used--}}
    }else if(used<target){
      entries.sort((a,b)=>(b.raw-b.quota)-(a.raw-a.quota)||b.size-a.size||a.key.localeCompare(b.key,'th'));
      let guard=0;while(used<target&&guard++<10000){let advanced=false;for(const x of entries){if(used>=target)break;if(x.quota<x.size){x.quota++;used++;advanced=true}}if(!advanced)break}
    }
    return new Map(entries.map(x=>[x.key,Math.min(x.quota,x.size)]));
  }
  function sourceBatchStratifyTier(rows,target){
    if(rows.length<=target)return [...rows];
    const byPos={};for(const r of rows)(byPos[r.position]??=[]).push(r);
    const posQuota=sourceBatchAllocate(byPos,target),out=[];
    for(const [position,pRows] of Object.entries(byPos)){
      const pq=posQuota.get(position)||0;if(!pq)continue;
      const byTopic={};for(const r of pRows)(byTopic[r.topic||r.category||'อื่น ๆ']??=[]).push(r);
      const topicQuota=sourceBatchAllocate(byTopic,pq);
      for(const [topic,tRows] of Object.entries(byTopic)){const tq=topicQuota.get(topic)||0;out.push(...tRows.slice(0,tq))}
      const have=out.filter(x=>x.position===position).length;
      if(have<pq){const usedIds=new Set(out.map(x=>x.question_id));out.push(...pRows.filter(x=>!usedIds.has(x.question_id)).slice(0,pq-have))}
    }
    if(out.length<target){const usedIds=new Set(out.map(x=>x.question_id));out.push(...rows.filter(x=>!usedIds.has(x.question_id)).slice(0,target-out.length))}
    return out.slice(0,target);
  }
  function nextSourceBatchRows(){
    const rows=(sourceBacklogCache?.rows||[]).filter(r=>!sourceReservationMap.has(String(r.question_id||'')));
    if(rows.length<=50)return [...rows];
    const tiers=new Map();
    for(const r of rows){const score=Number(r.priority_score)||0;(tiers.get(score)??tiers.set(score,[]).get(score)).push(r)}
    const out=[];
    for(const score of [...tiers.keys()].sort((a,b)=>b-a)){const tier=tiers.get(score),left=50-out.length;if(left<=0)break;out.push(...sourceBatchStratifyTier(tier,Math.min(left,tier.length)))}
    return out.slice(0,50);
  }
  function sourceNextBatchHtml(rows=[]){
    if(!rows.length)return '<div class="empty">ไม่มี Question ID ว่างสำหรับจัด Batch</div>';
    const counts={urgent:0,high:0,normal:0},pos={},topics={};
    for(const r of rows){
      if(r.priority==='เร่งด่วน')counts.urgent++;else if(r.priority==='สูง')counts.high++;else counts.normal++;
      pos[r.position]=(pos[r.position]||0)+1;const t=r.topic||r.category||'ไม่ระบุ';topics[t]=(topics[t]||0)+1;
    }
    const topTopics=Object.entries(topics).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k} ${v}`).join(' · ');
    const posText=Object.entries(pos).map(([k,v])=>`${k==='revenue-academic'?'นักวิชาการฯ':k==='tax-auditor'?'นักตรวจสอบฯ':k} ${v}`).join(' · ');
    const sample=rows.slice(0,8).map(r=>`<span class="batch-id">${esc(r.question_id)} · ${fmt(r.priority_score)}</span>`).join('');
    return `<div class="batch-preview-stats"><span>เร่งด่วน <strong>${fmt(counts.urgent)}</strong></span><span>สูง <strong>${fmt(counts.high)}</strong></span><span>ปกติ <strong>${fmt(counts.normal)}</strong></span></div><div class="meta" style="margin-top:8px">${esc(posText||'-')}<br>${esc(topTopics||'-')}</div><div class="batch-id-wrap">${sample}</div>`;
  }

  function sourceBacklogSummaryHtml(summary={},reservedCount=0){
    const total=Number(summary.total_pending||0),available=Math.max(0,total-Number(reservedCount||0));
    const baseline=String(sourceBacklogCache?.generation_mode||'')==='integrity-baseline'?'<div class="notice qa-baseline">คิวนี้กู้คืนจาก Content Integrity เพื่อให้ Question ID ที่ยัง pending กลับมาอยู่ในระบบครบถ้วน ขณะนี้ลำดับความสำคัญใช้ระดับปกติจนกว่าจะสร้างคะแนนความเร่งด่วนจากเนื้อหาใหม่</div>':'';
    return baseline+`<div class="metrics"><div class="panel metric"><div class="label">รอตรวจทั้งหมด</div><strong>${fmt(total)}</strong><small>source_state = pending</small></div><div class="panel metric"><div class="label">ว่างสำหรับ Batch</div><strong>${fmt(available)}</strong><small>ยังไม่อยู่ใน active reservation</small></div><div class="panel metric"><div class="label">อยู่ใน Batch</div><strong>${fmt(reservedCount)}</strong><small>Question ID ที่ถูกจองชั่วคราว</small></div><div class="panel metric"><div class="label">เร่งด่วน</div><strong>${fmt(summary.urgent||0)}</strong><small>มาตรา/อัตรา/กำหนดเวลาหลายสัญญาณ</small></div><div class="panel metric"><div class="label">สูง</div><strong>${fmt(summary.high||0)}</strong><small>ควรตรวจเป็นลำดับต้น</small></div><div class="panel metric"><div class="label">ปกติ</div><strong>${fmt(summary.normal||0)}</strong><small>ตรวจตามลำดับ backlog</small></div></div>`;
  }
  function buildSourceReservationMap(registry={}){
    const map=new Map(),now=Date.now();
    for(const b of registry.batches||[]){
      if(b.status!=='generated'||b.operational_batch===false||b.reservation_released_at)continue;
      const expires=Date.parse(String(b.reservation_expires_at||''));if(!Number.isFinite(expires)||expires<=now)continue;
      for(const id of b.question_ids||[])map.set(String(id),{batch_id:b.batch_id,reservation_expires_at:b.reservation_expires_at,generated_at:b.generated_at});
    }
    return map;
  }
  function batchEffectiveStatus(b){
    if(b.status==='applied')return'Applied';
    if(b.operational_batch===false||b.reservation_released_at)return'Released';
    const expires=Date.parse(String(b.reservation_expires_at||''));if(Number.isFinite(expires)&&expires<=Date.now())return'Expired';
    return'Active';
  }
  function sourceBatchSummaryHtml(registry={}){
    const rows=Array.isArray(registry.batches)?registry.batches:[],active=rows.filter(x=>batchEffectiveStatus(x)==='Active').length,applied=rows.filter(x=>batchEffectiveStatus(x)==='Applied').length,released=rows.filter(x=>['Released','Expired'].includes(batchEffectiveStatus(x))).length,totalQuestions=rows.reduce((n,x)=>n+(Number(x.batch_size)||0),0);
    return `<div class="metrics"><div class="panel metric"><div class="label">Batch ทั้งหมด</div><strong>${fmt(rows.length)}</strong><small>ประวัติชุดตรวจที่ลงทะเบียน</small></div><div class="panel metric"><div class="label">Active Reservation</div><strong>${fmt(active)}</strong><small>จอง Question ID อยู่</small></div><div class="panel metric"><div class="label">Apply แล้ว</div><strong>${fmt(applied)}</strong><small>ผลตรวจถูก apply แล้ว</small></div><div class="panel metric"><div class="label">Released / Expired</div><strong>${fmt(released)}</strong><small>ไม่จอง backlog แล้ว</small></div><div class="panel metric"><div class="label">Question ID รวม</div><strong>${fmt(totalQuestions)}</strong><small>นับตาม batch history</small></div></div>`;
  }
  function sourceBatchHistoryHtml(registry={}){
    const rows=Array.isArray(registry.batches)?registry.batches:[];if(!rows.length)return '<div class="empty">ยังไม่มี Source Review Batch Registry</div>';
    return `<div class="list">${rows.slice(0,50).map(b=>{
      const when=b.generated_at?new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short'}).format(new Date(b.generated_at)):'-';
      const pos=Object.entries(b.selection_summary?.positions||{}).map(([k,v])=>`${k==='revenue-academic'?'นักวิชาการฯ':k==='tax-auditor'?'นักตรวจสอบฯ':k} ${fmt(v)}`).join(' · ');
      const topics=Object.entries(b.selection_summary?.topics||{}).sort((a,c)=>Number(c[1])-Number(a[1])).slice(0,4).map(([k,v])=>`${k} ${fmt(v)}`).join(' · ');
      const counts=b.decision_counts?Object.entries(b.decision_counts).map(([k,v])=>`${k} ${fmt(v)}`).join(' · '):'ยังไม่ Apply';
      const effective=batchEffectiveStatus(b),expiry=b.reservation_expires_at?new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short'}).format(new Date(b.reservation_expires_at)):'-';const operational=effective==='Active'?`จองถึง ${expiry}`:effective==='Released'?'ปลด reservation แล้ว':effective==='Expired'?'reservation หมดอายุ':'ผลตรวจถูก apply แล้ว';return `<div class="row"><div><div class="name">${esc(b.batch_id||'ไม่มี Batch ID')} · ${esc(effective)} · ${fmt(b.batch_size)} ข้อ</div><div class="meta">สร้าง ${esc(when)} · โหมด ${esc(b.review_mode||'-')} · ${esc(operational)}<br>ตำแหน่ง: ${esc(pos||'-')}${topics?`<br>หัวข้อ: ${esc(topics)}`:''}<br>ผลรวม: ${esc(counts)} · Snapshot ${esc(String(b.batch_snapshot_sha256||'').slice(0,16))}…${b.reservation_release_reason?`<br>เหตุผลปลด: ${esc(b.reservation_release_reason)}`:''}</div></div><div class="val">${esc(effective)}</div></div>`
    }).join('')}</div>`;
  }
  function syncSourcePositionOptions(rows=[]){
    const el=$('#sourcePosition');if(!el)return;
    const keep=el.value,values=[...new Set(rows.map(r=>String(r.position||'')).filter(Boolean))].sort();
    el.innerHTML='<option value="">ทุกตำแหน่ง</option>'+values.map(v=>`<option value="${esc(v)}">${v==='revenue-academic'?'นักวิชาการสรรพากรปฏิบัติการ':v==='tax-auditor'?'นักตรวจสอบภาษีปฏิบัติการ':esc(v)}</option>`).join('');
    if(values.includes(keep))el.value=keep;
  }
  function filteredSourceRows(){
    const data=sourceBacklogCache||{rows:[]},pri=$('#sourcePriority')?.value||'',pos=$('#sourcePosition')?.value||'',reservation=$('#sourceReservation')?.value||'',q=String($('#sourceSearch')?.value||'').trim().toLowerCase();
    return (data.rows||[]).filter(r=>{
      const reserved=sourceReservationMap.has(String(r.question_id||''));
      return (!pri||r.priority===pri)&&(!pos||r.position===pos)&&(!reservation||(reservation==='reserved'?reserved:!reserved))&&(!q||[r.question_id,r.category,r.topic,r.prompt].some(v=>String(v||'').toLowerCase().includes(q)))
    });
  }
  function sourceBacklogList(rows=[]){
    if(!rows.length)return '<div class="empty">ไม่พบรายการตามตัวกรอง</div>';
    return `<div class="list">${rows.slice(0,100).map(r=>{const pos=r.position==='revenue-academic'?'นักวิชาการสรรพากรฯ':r.position==='tax-auditor'?'นักตรวจสอบภาษีฯ':r.position||'-';const reasons=Array.isArray(r.reasons)?r.reasons.join(' · '):'',reservation=sourceReservationMap.get(String(r.question_id||''));const reserveText=reservation?`<br>อยู่ใน Batch ${esc(reservation.batch_id)} · จองถึง ${esc(new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short'}).format(new Date(reservation.reservation_expires_at)))}`:'';return `<div class="row"><div><div class="name">${esc(r.question_id||'ไม่มีรหัส')} · ${esc(r.priority||'ปกติ')} · Priority ${fmt(r.priority_score||0)}</div><div class="meta">${esc(pos)} · ชุด ${fmt(r.set)} ข้อ ${fmt(r.question)} · ${esc(r.topic||r.category||'ไม่ระบุ')}${reserveText}${reasons?`<br>เหตุผลจัดคิว: ${esc(reasons)}`:''}${r.prompt?`<br>${esc(String(r.prompt).slice(0,190))}`:''}</div></div><div class="val">${reservation?'อยู่ใน Batch':esc(r.priority||'ปกติ')}</div></div>`}).join('')}</div>`;
  }
  function refreshSourceBacklog(){if($('#sourceBacklog'))$('#sourceBacklog').innerHTML=sourceBacklogList(filteredSourceRows())}
  function exportNextSourceBatchCsv(){
    const rows=nextSourceBatchRows();if(!rows.length)return;
    const header=['question_id','position','set','question','priority','priority_score','category','topic','reasons','prompt','source_state'];
    const lines=[header.join(',')];
    for(const r of rows)lines.push([r.question_id,r.position,r.set,r.question,r.priority,r.priority_score,r.category,r.topic,(r.reasons||[]).join(' | '),r.prompt,r.source_state].map(csvCell).join(','));
    const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=`kexam-source-review-next-50-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0);
  }
  function exportSourceBacklogCsv(){
    const rows=filteredSourceRows();if(!rows.length)return;
    const header=['question_id','position','set','question','priority','priority_score','category','topic','reservation_batch_id','reservation_expires_at','reasons','prompt','source_state'];
    const lines=[header.join(',')];for(const r of rows){const reservation=sourceReservationMap.get(String(r.question_id||''));lines.push([r.question_id,r.position,r.set,r.question,r.priority,r.priority_score,r.category,r.topic,reservation?.batch_id||'',reservation?.reservation_expires_at||'',(r.reasons||[]).join(' | '),r.prompt,r.source_state].map(csvCell).join(','))}
    const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`kexam-source-verification-backlog-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0);
  }

  function sourceFreshnessSummaryHtml(summary={}){
    return `<div class="metrics"><div class="panel metric"><div class="label">Source Verified</div><strong>${fmt(summary.total_verified||0)}</strong><small>รายการที่อยู่ในรอบทบทวน</small></div><div class="panel metric"><div class="label">เกินกำหนด</div><strong>${fmt(summary.overdue||0)}</strong><small>ควรตรวจแหล่งทางการซ้ำ</small></div><div class="panel metric"><div class="label">ใกล้ครบกำหนด</div><strong>${fmt(summary.due_soon||0)}</strong><small>เหลือไม่เกิน 30 วัน</small></div><div class="panel metric"><div class="label">ยังสดใหม่</div><strong>${fmt(summary.fresh||0)}</strong><small>ยังไม่ถึงรอบทบทวน</small></div></div>`;
  }
  function syncFreshnessPositionOptions(rows=[]){
    const el=$('#freshnessPosition');if(!el)return;
    const keep=el.value,values=[...new Set(rows.map(r=>String(r.position||'')).filter(Boolean))].sort();
    el.innerHTML='<option value="">ทุกตำแหน่ง</option>'+values.map(v=>`<option value="${esc(v)}">${v==='revenue-academic'?'นักวิชาการสรรพากรปฏิบัติการ':v==='tax-auditor'?'นักตรวจสอบภาษีปฏิบัติการ':esc(v)}</option>`).join('');
    if(values.includes(keep))el.value=keep;
  }
  function filteredFreshnessRows(){
    const data=sourceFreshnessCache||{rows:[]},status=$('#freshnessStatus')?.value||'',pos=$('#freshnessPosition')?.value||'';
    return (data.rows||[]).filter(r=>(!status||r.status===status)&&(!pos||r.position===pos));
  }
  function freshnessListHtml(rows=[]){
    if(!rows.length)return '<div class="empty">ไม่พบรายการตามตัวกรอง</div>';
    return `<div class="list">${rows.slice(0,100).map(r=>{const pos=r.position==='revenue-academic'?'นักวิชาการสรรพากรฯ':r.position==='tax-auditor'?'นักตรวจสอบภาษีฯ':r.position||'-';const d=Number(r.days_until_due)||0,remain=d<0?`เกิน ${Math.abs(d)} วัน`:`เหลือ ${d} วัน`;return `<div class="row"><div><div class="name">${esc(r.question_id||'ไม่มีรหัส')} · ${esc(r.status||'-')} · ${esc(remain)}</div><div class="meta">${esc(pos)} · ${esc(r.freshness_tier||'')} · ตรวจล่าสุด ${esc(r.checked_at||'-')} · ครบกำหนด ${esc(r.due_at||'-')} · รอบ ${fmt(r.review_interval_days)} วัน${r.prompt?`<br>${esc(String(r.prompt).slice(0,180))}`:''}</div></div><div class="val">${esc(r.status||'-')}</div></div>`}).join('')}</div>`;
  }
  function refreshFreshness(){if($('#freshnessList'))$('#freshnessList').innerHTML=freshnessListHtml(filteredFreshnessRows())}
  function exportFreshnessCsv(){
    const rows=filteredFreshnessRows();if(!rows.length)return;
    const header=['question_id','position','status','checked_at','due_at','days_until_due','review_interval_days','freshness_tier','category','prompt'];
    const lines=[header.join(',')];
    for(const r of rows)lines.push([r.question_id,r.position,r.status,r.checked_at,r.due_at,r.days_until_due,r.review_interval_days,r.freshness_tier,r.category,r.prompt].map(csvCell).join(','));
    const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`kexam-source-reverification-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0);
  }

  function publicationCoverageHtml(x){
    if(x?.error)return '<div class="empty">ไม่สามารถโหลด Publication Manifest ได้</div>';
    return `<div class="metrics"><div class="panel metric"><div class="label">Draft</div><strong>${fmt(x.draft)}</strong><small>ยังไม่อนุญาตให้ขึ้นเว็บ</small></div><div class="panel metric"><div class="label">Reviewed</div><strong>${fmt(x.reviewed)}</strong><small>รอตรวจ QA/เนื้อหาต่อ</small></div><div class="panel metric"><div class="label">Verified</div><strong>${fmt(x.verified)}</strong><small>ผ่าน QA พร้อมพิจารณาเผยแพร่</small></div><div class="panel metric"><div class="label">Published</div><strong>${fmt(x.published)}</strong><small>ข้อที่ Runtime ใช้งานได้</small></div><div class="panel metric"><div class="label">Retired</div><strong>${fmt(x.retired)}</strong><small>ถอนจากการใช้งาน แต่คงประวัติ</small></div><div class="panel metric"><div class="label">Source Verified</div><strong>${fmt(x.sourceVerified)}</strong><small>ผูกแหล่งทางการและ content hash แล้ว</small></div><div class="panel metric"><div class="label">Source Pending</div><strong>${fmt(x.pending)}</strong><small>รอ Content Verification</small></div><div class="panel metric"><div class="label">Lifecycle Decisions</div><strong>${fmt(x.decisionCount)}</strong><small>รายการ transition ที่ apply แล้ว</small></div></div>`;
  }
  function lifecycleDecisionList(rows=[]){
    if(!rows.length)return '<div class="empty">ยังไม่มี lifecycle decision ที่ถูก apply</div>';
    return `<div class="list">${[...rows].sort((a,b)=>String(b.applied_at||'').localeCompare(String(a.applied_at||''))).slice(0,20).map(r=>{const pos=r.position==='revenue-academic'?'นักวิชาการสรรพากรฯ':r.position==='tax-auditor'?'นักตรวจสอบภาษีฯ':r.position||'-';return `<div class="row"><div><div class="name">${esc(r.question_id||'')} · ${esc(r.from_status||'?')} → ${esc(r.to_status||'?')}</div><div class="meta">${esc(pos)} · ${esc(r.decision_id||'')} · วันที่ตัดสินใจ ${esc(r.decided_at||'-')}${r.reason?`<br>${esc(String(r.reason).slice(0,220))}`:''}</div></div><div class="val">${esc(r.to_status||'')}</div></div>`}).join('')}</div>`;
  }

  function contentIntegrityCoverageHtml(x){
    if(x?.error)return '<div class="empty">ไม่สามารถโหลด Content Integrity Baseline ได้</div>';
    const when=x.generatedAt?new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short'}).format(new Date(x.generatedAt)):'–';
    const ta=Number(x.byPosition?.['tax-auditor'])||0,ra=Number(x.byPosition?.['revenue-academic'])||0;
    return `<div class="metrics"><div class="panel metric"><div class="label">Content Fingerprint</div><strong>${fmt(x.total)}</strong><small>Question ID ที่มี SHA-256 baseline</small></div><div class="panel metric"><div class="label">นักตรวจสอบภาษีฯ</div><strong>${fmt(ta)}</strong><small>fingerprint ครบตามตำแหน่ง</small></div><div class="panel metric"><div class="label">นักวิชาการสรรพากรฯ</div><strong>${fmt(ra)}</strong><small>fingerprint ครบตามตำแหน่ง</small></div><div class="panel metric"><div class="label">Algorithm</div><strong>${esc(String(x.algorithm||'–').toUpperCase())}</strong><small>Schema ${fmt(x.schema)} · ${esc(x.fields.join(', '))}</small></div><div class="panel metric"><div class="label">Baseline ล่าสุด</div><strong>${esc(when)}</strong><small>แก้สาระแล้ว hash เปลี่ยน → Gate ไม่ผ่าน</small></div></div>`;
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
  function academicRemediationProgressHtml(data={}){
    if(data?.error)return `<div class="notice">ยังไม่สามารถอ่าน Progress Ledger ได้: ${esc(data.error_message||'ไม่ทราบสาเหตุ')}</div>`;
    const s=data.summary||{},g=data.regression_guard||{},pct=Math.max(0,Math.min(100,Number(s.progress_percent)||0));
    const guardOk=!g.comparable||g.result==='pass';
    const setRows=Object.entries(s.sets||{}).sort((a,b)=>Number(a[0])-Number(b[0])).map(([k,v])=>{
      const sp=Number(v.scope)||0,done=Number(v.gate_passed)||0,p=sp?Math.round(done*100/sp):0;
      return `<div class="remediation-set"><span>ชุด ${esc(k)}</span><div><i style="width:${p}%"></i></div><strong>${fmt(done)}/${fmt(sp)}</strong></div>`
    }).join('');
    return `<div class="remediation-progress-card">
      <div class="remediation-progress-head"><div><span>ความคืบหน้า Atomic Remediation</span><strong>${pct}%</strong></div><div class="guard-badge ${guardOk?'pass':'fail'}">Regression Guard: ${guardOk?'PASS':'FAIL'}</div></div>
      <div class="remediation-progress-track"><i style="width:${pct}%"></i></div>
      <div class="batch-preview-stats" style="margin-top:10px">
        <span>ขอบเขต <strong>${fmt(s.scope_total||0)}</strong></span>
        <span>รอตรวจ <strong>${fmt(s.waiting_review||0)}</strong></span>
        <span>อยู่ใน Batch <strong>${fmt(s.reserved_for_review||0)}</strong></span>
        <span>พร้อม Apply <strong>${fmt(s.ready_to_apply||0)}</strong></span>
        <span>ผ่าน Gate <strong>${fmt(s.gate_passed||0)}</strong></span>
        <span>Resolved <strong>${fmt(s.resolved||0)}</strong></span>
        <span>Needs Rework <strong>${fmt(s.needs_rework||0)}</strong></span>
      </div>
      <div class="meta" style="margin-top:8px">คงเหลือ Strong ${fmt(s.strong_remaining||0)} · Moderate ${fmt(s.moderate_remaining||0)} · Watch ${fmt(s.watch_remaining||0)} · Source Verified ในคิว ${fmt(s.source_verified_current||0)}</div>
      <div class="meta" style="margin-top:5px">Batch ที่กำลังจอง ${fmt(s.active_generated_batches||0)} ชุด / ${fmt(s.active_reserved_question_ids||0)} ข้อ · Applied Batch ${fmt(s.applied_batches||0)} · Batch หมดอายุ ${fmt(s.expired_generated_batches||0)}${s.latest_batch_id?' · ล่าสุด '+esc(String(s.latest_batch_id)):''}</div>
      <div class="meta" style="margin-top:5px">Audit เทียบรอบก่อน: ดีขึ้น ${fmt(g.improved||0)} · Resolved ${fmt(g.resolved||0)} · แย่ลง ${fmt(g.worsened||0)} · Flag ใหม่ ${fmt(g.new_flags||0)}</div>
      <div class="remediation-sets">${setRows}</div>
    </div>`;
  }
  function academicRemediationSummaryHtml(data={}){
    if(data?.error)return `<div class="notice">ยังไม่สามารถอ่าน Academic Remediation Backlog ได้: ${esc(data.error_message||'ไม่ทราบสาเหตุ')}</div>`;
    const s=data.summary||{},remaining=(Number(s.strong)||0)+(Number(s.moderate)||0)+(Number(s.watch)||0);
    return `<div class="metrics"><div class="panel metric"><div class="label">คิวทั้งหมด</div><strong>${fmt(remaining)}</strong><small>Question ID ที่ต้องตรวจ</small></div><div class="panel metric"><div class="label">Strong</div><strong>${fmt(s.strong||0)}</strong><small>แก้เป็นลำดับแรก</small></div><div class="panel metric"><div class="label">Moderate</div><strong>${fmt(s.moderate||0)}</strong><small>ลำดับถัดไป</small></div><div class="panel metric"><div class="label">Watch</div><strong>${fmt(s.watch||0)}</strong><small>เฝ้าระวัง</small></div><div class="panel metric"><div class="label">Source Verified ในคิว</div><strong>${fmt(s.source_verified_flagged||0)}</strong><small>แก้แล้วต้องตรวจ source ใหม่</small></div></div>`;
  }
  function filteredAcademicRemediationRows(){
    const rows=academicRemediationCache?.rows||[],level=$('#academicRemediationLevel')?.value||'',set=$('#academicRemediationSet')?.value||'';
    return rows.filter(r=>(!level||r.signal_level===level)&&(!set||String(r.set)===set));
  }
  function academicRemediationListHtml(rows=[]){
    if(!rows.length)return '<div class="empty">ไม่พบรายการตามตัวกรอง</div>';
    return `<div class="list">${rows.slice(0,120).map(r=>{
      const direction=r.correct_strictly_longest?'คำตอบยาวเด่น':r.correct_strictly_shortest?'คำตอบสั้นเด่น':'อยู่นอกช่วงตัวลวง';
      const source=r.source_state==='verified'?'Source Verified — ต้อง reset เมื่อแก้':'Source Pending';
      const st=(academicRemediationStatusCache?.rows||[]).find(x=>x.question_id===r.question_id);
      const statusLabel={waiting_review:'รอตรวจ',reserved_for_review:'อยู่ใน Batch',decision_incomplete:'Decision ยังไม่ครบ',ready_to_apply:'พร้อม Apply',applied_watch:'Apply แล้ว · Watch',resolved:'Resolved',needs_rework:'ต้องแก้ซ้ำ'}[st?.status]||'รอตรวจ';
      return `<div class="row"><div><div class="name">${esc(r.question_id)} · ${esc(String(r.signal_level||'').toUpperCase())}</div><div class="meta">ชุด ${fmt(r.set)} ข้อ ${fmt(r.question)} · ${esc(direction)} · outside ${fmt(r.outside_by)} ตัวอักษร · ratio ${esc(String(r.ratio_to_distractor_median??'–'))} · ${esc(source)} · ${esc(statusLabel)}</div></div><div class="val">${esc(statusLabel)}</div></div>`
    }).join('')}</div>`;
  }
  function refreshAcademicRemediation(){
    if($('#academicRemediationList'))$('#academicRemediationList').innerHTML=academicRemediationListHtml(filteredAcademicRemediationRows());
  }
  function exportAcademicRemediationCsv(){
    const rows=filteredAcademicRemediationRows();if(!rows.length)return;
    const header=['question_id','set','question','signal_level','correct_length','distractor_min','distractor_max','distractor_median','outside_by','ratio_to_distractor_median','correct_strictly_longest','correct_strictly_shortest','lifecycle_status','source_state','content_sha256'];
    const lines=[header.join(',')];for(const r of rows)lines.push(header.map(k=>csvCell(r[k])).join(','));
    const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`kexam-academic-answer-remediation-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0);
  }

  function answerConspicuousnessSummaryHtml(data={}){
    if(data?.error)return `<div class="notice">ยังไม่มีรายงาน Answer Conspicuousness Audit หรืออ่านรายงานไม่สำเร็จ: ${esc(data.error_message||'ไม่ทราบสาเหตุ')}</div>`;
    const s=data.summary||{},flagged=(Number(s.strong)||0)+(Number(s.moderate)||0)+(Number(s.watch)||0);
    return `<div class="metrics"><div class="panel metric"><div class="label">ตรวจทั้งหมด</div><strong>${fmt(s.total||0)}</strong><small>Question ID ในคลัง</small></div><div class="panel metric"><div class="label">Strong</div><strong>${fmt(s.strong||0)}</strong><small>ควรตรวจเป็นลำดับแรก</small></div><div class="panel metric"><div class="label">Moderate</div><strong>${fmt(s.moderate||0)}</strong><small>ควรตรวจรูปแบบตัวเลือก</small></div><div class="panel metric"><div class="label">Watch</div><strong>${fmt(s.watch||0)}</strong><small>เฝ้าระวังความเด่น</small></div><div class="panel metric"><div class="label">Flagged รวม</div><strong>${fmt(flagged)}</strong><small>${s.total?Math.round(flagged*1000/Number(s.total))/10:0}% ของคลัง</small></div></div>`;
  }
  function filteredAnswerConspicuousnessRows(){
    const rows=answerConspicuousnessCache?.rows||[],level=$('#answerLengthLevel')?.value||'',pos=$('#answerLengthPosition')?.value||'';
    return rows.filter(r=>(!level||r.level===level)&&(!pos||r.position===pos));
  }
  function answerConspicuousnessListHtml(rows=[]){
    if(!rows.length)return '<div class="empty">ไม่พบรายการตามตัวกรอง</div>';
    return `<div class="list">${rows.slice(0,100).map(r=>{
      const pos=r.position==='revenue-academic'?'นักวิชาการสรรพากรฯ':r.position==='tax-auditor'?'นักตรวจสอบภาษีฯ':r.position||'-';
      const direction=r.correct_strictly_longest?'คำตอบยาวกว่า':r.correct_strictly_shortest?'คำตอบสั้นกว่า':'อยู่นอกช่วงตัวลวง';
      return `<div class="row"><div><div class="name">${esc(r.question_id||'ไม่มีรหัส')} · ${esc(String(r.level||'').toUpperCase())}</div><div class="meta">${esc(pos)} · ชุด ${fmt(r.set)} ข้อ ${fmt(r.question)} · ${esc(direction)} · คำตอบ ${fmt(r.correct_length)} ตัวอักษร · ตัวลวง ${fmt(r.distractor_min)}–${fmt(r.distractor_max)} · median ${fmt(r.distractor_median)} · ratio ${esc(String(r.ratio_to_distractor_median??'–'))}</div></div><div class="val">${esc(String(r.level||'').toUpperCase())}</div></div>`
    }).join('')}</div>`;
  }
  function refreshAnswerConspicuousness(){
    if($('#answerConspicuousnessList'))$('#answerConspicuousnessList').innerHTML=answerConspicuousnessListHtml(filteredAnswerConspicuousnessRows());
  }
  function exportAnswerConspicuousnessCsv(){
    const rows=filteredAnswerConspicuousnessRows();if(!rows.length)return;
    const header=['question_id','position','set','question','level','correct_length','distractor_min','distractor_max','distractor_median','outside_by','ratio_to_distractor_median','correct_strictly_longest','correct_strictly_shortest'];
    const lines=[header.join(',')];for(const r of rows)lines.push(header.map(k=>csvCell(r[k])).join(','));
    const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`kexam-answer-conspicuousness-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0);
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
    const [pub,sourceBacklog,integrity,freshness,batchRegistry,answerAudit,academicRemediation,academicRemediationStatusData]=await Promise.all([publicationCoverage(),sourceVerificationBacklog(),contentIntegrityCoverage(),sourceFreshnessWatchlist(),sourceReviewBatchRegistry(),answerConspicuousnessAudit(),academicAnswerRemediationBacklog(),academicRemediationStatus()]);
    if($('#qaDataHealth'))$('#qaDataHealth').innerHTML=qaDataHealthHtml(pub,sourceBacklog,integrity,freshness,batchRegistry);
    $('#publicationCoverage').innerHTML=publicationCoverageHtml(pub);
    if($('#lifecycleDecisions'))$('#lifecycleDecisions').innerHTML=lifecycleDecisionList(pub.decisionLog||[]);
    if($('#contentIntegrityCoverage'))$('#contentIntegrityCoverage').innerHTML=contentIntegrityCoverageHtml(integrity);
    sourceReservationMap=buildSourceReservationMap(batchRegistry);
    if($('#sourceBacklogSummary'))$('#sourceBacklogSummary').innerHTML=sourceBacklogSummaryHtml(sourceBacklog.summary||{},sourceReservationMap.size);
    if($('#sourceBacklogModel'))$('#sourceBacklogModel').innerHTML=sourceBacklogModelHtml(sourceBacklog);
    if($('#sourceTopTopics'))$('#sourceTopTopics').innerHTML=sourceTopTopicsHtml(sourceBacklog.summary||{});
    if($('#sourceNextBatch'))$('#sourceNextBatch').innerHTML=sourceNextBatchHtml(nextSourceBatchRows());
    if($('#sourceBatchSummary'))$('#sourceBatchSummary').innerHTML=sourceBatchSummaryHtml(batchRegistry);
    if($('#sourceBatchHistory'))$('#sourceBatchHistory').innerHTML=sourceBatchHistoryHtml(batchRegistry);
    syncSourcePositionOptions(sourceBacklog.rows||[]);
    refreshSourceBacklog();
    if($('#answerConspicuousnessSummary'))$('#answerConspicuousnessSummary').innerHTML=answerConspicuousnessSummaryHtml(answerAudit);
    answerConspicuousnessCache=answerAudit;
    refreshAnswerConspicuousness();
    if($('#academicRemediationSummary'))$('#academicRemediationSummary').innerHTML=academicRemediationSummaryHtml(academicRemediation);
    academicRemediationCache=academicRemediation;
    academicRemediationStatusCache=academicRemediationStatusData;
    if($('#academicRemediationProgress'))$('#academicRemediationProgress').innerHTML=academicRemediationProgressHtml(academicRemediationStatusData);
    refreshAcademicRemediation();
    if($('#freshnessSummary'))$('#freshnessSummary').innerHTML=sourceFreshnessSummaryHtml(freshness.summary||{});
    syncFreshnessPositionOptions(freshness.rows||[]);
    refreshFreshness();
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

  $('#freshnessStatus').onchange=refreshFreshness;
  $('#freshnessPosition').onchange=refreshFreshness;
  $('#exportFreshness').onclick=exportFreshnessCsv;
  $('#sourcePriority').onchange=refreshSourceBacklog;
  $('#sourcePosition').onchange=refreshSourceBacklog;
  $('#sourceReservation').onchange=refreshSourceBacklog;
  $('#sourceSearch').oninput=refreshSourceBacklog;
  $('#exportSourceBacklog').onclick=exportSourceBacklogCsv;
  $('#exportNextSourceBatch').onclick=exportNextSourceBatchCsv;
  $('#academicRemediationLevel').onchange=refreshAcademicRemediation;
  $('#academicRemediationSet').onchange=refreshAcademicRemediation;
  $('#exportAcademicRemediation').onclick=exportAcademicRemediationCsv;
  $('#answerLengthLevel').onchange=refreshAnswerConspicuousness;
  $('#answerLengthPosition').onchange=refreshAnswerConspicuousness;
  $('#exportAnswerLength').onclick=exportAnswerConspicuousnessCsv;
  $('#qualityPriority').onchange=refreshQualityQueue;
  $('#qualityPosition').onchange=refreshQualityQueue;
  $('#exportQuality').onclick=exportQualityCsv;
  $('#refresh').onclick=()=>{resetQaCaches();load()};
  $('#days').onchange=e=>{days=Number(e.target.value)||30;load()};
  $('#loginBtn').onclick=()=>{const v=$('#adminKey').value.trim();if(!v)return;sessionStorage.setItem('kexam_admin_key',v);$('#adminKey').value='';load()};
  $('#logout').onclick=()=>{sessionStorage.removeItem('kexam_admin_key');load()};
  $('#adminKey').addEventListener('keydown',e=>{if(e.key==='Enter')$('#loginBtn').click()});
  load();
})();
