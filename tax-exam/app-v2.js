const LETTERS=['ก','ข','ค','ง'];
const APP_KEY='kexam_tax_v2';
const SETS=10;
const BANK_FILES=['bank-01.txt','bank-02-03.txt','bank-04-05.txt','bank-06-07.txt','bank-08-09.txt','bank-10-11.txt','bank-12-13.txt','bank-14-15.txt','bank-16-17.txt','bank-18.txt'];
let compactBankPromise=null,bank=null,state=null,currentSet=1,currentIndex=0,timerHandle=null,startTimestamp=null;
let reviewWrongOnly=false,reviewIndices=[],reviewPos=0;
const $=s=>document.querySelector(s);
const esc=(x='')=>String(x).replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const pct=(a,b)=>b?Math.round((a/b)*100):0;
function loadGlobal(){try{return JSON.parse(localStorage.getItem(APP_KEY)||'{}')}catch{return {}}}
function saveGlobal(g){localStorage.setItem(APP_KEY,JSON.stringify(g))}
function getSetState(n){return loadGlobal()['set'+n]||null}
function putSetState(n,s){const g=loadGlobal();g['set'+n]=s;saveGlobal(g)}
function getHistory(n){const g=loadGlobal();return (g.history&&g.history['set'+n])||[]}
function appendHistory(n,record){const g=loadGlobal();g.history??={};const k='set'+n;const arr=Array.isArray(g.history[k])?g.history[k]:[];arr.unshift(record);g.history[k]=arr.slice(0,20);saveGlobal(g)}
function fmtTime(sec){sec=Math.max(0,Math.floor(sec||0));const h=String(Math.floor(sec/3600)).padStart(2,'0'),m=String(Math.floor((sec%3600)/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');return `${h}:${m}:${s}`}
function fmtDate(ts){if(!ts)return '-';try{return new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short'}).format(new Date(ts))}catch{return new Date(ts).toLocaleString('th-TH')}}
function footer(){return `<footer class="footer"><div><strong>K-EXAM</strong> | ติวสอบราชการ อาจารย์คิม</div><div>www.k-exam.com &nbsp;|&nbsp; สงวนสิทธิ์ ห้ามทำซ้ำ ดัดแปลง และจำหน่ายโดยไม่ได้รับอนุญาต</div></footer>`}
function header(extra=''){return `<header class="topbar"><div class="brand"><div class="brand-mark">K-EXAM</div><div class="brand-sub">ติวสอบราชการ อาจารย์คิม</div></div><div class="top-title">ระบบทำข้อสอบ</div><div class="top-actions">${extra}</div></header>`}
function toast(msg){const d=document.createElement('div');d.className='toast';d.textContent=msg;document.body.appendChild(d);setTimeout(()=>d.remove(),1800)}
function modal(html,wide=false){document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal ${wide?'modal-wide':''}">${html}</div></div>`)}
async function loadCompactBank(){
  if(!compactBankPromise)compactBankPromise=(async()=>{
    const parts=await Promise.all(BANK_FILES.map(async f=>{
      const r=await fetch(f,{cache:'no-store'});
      if(!r.ok)throw new Error(`โหลดข้อมูลไม่สำเร็จ: ${f}`);
      return (await r.text()).trim();
    }));
    const b64=parts.join('').replace(/\s+/g,'');
    const bin=atob(b64),bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    if(typeof DecompressionStream==='undefined')throw new Error('เบราว์เซอร์นี้ไม่รองรับการเปิดคลังข้อสอบ กรุณาใช้ Chrome, Edge หรือ Safari รุ่นปัจจุบัน');
    const ds=new DecompressionStream('gzip');
    const data=await new Response(new Blob([bytes]).stream().pipeThrough(ds)).json();
    if(!Array.isArray(data.q)||data.q.length!==10||data.q.some(x=>!Array.isArray(x)||x.length!==100))throw new Error('คลังข้อสอบไม่ครบ 10 ชุด ชุดละ 100 ข้อ');
    return data;
  })();
  return compactBankPromise;
}
async function loadSet(n){const c=await loadCompactBank(),t=c.s,rows=c.q[n-1];return{set:n,title:`ชุดที่ ${n}`,questions:rows.map((r,i)=>({number:(n-1)*100+i+1,category:t[r[0]],prompt:t[r[1]],choices:r[2].map(x=>t[x]),answer:r[3],explanation:t[r[4]],wrongReasons:t[r[5]]}))}}
function showError(err){$('#app').innerHTML=`${header()}<main class="page"><section class="panel main-panel"><h2>ไม่สามารถเปิดข้อสอบได้</h2><p>${esc(err.message||err)}</p><button class="primary-btn" onclick="location.reload()">ลองอีกครั้ง</button></section></main>${footer()}`}
function bestScore(n){const h=getHistory(n);return h.length?Math.max(...h.map(x=>Number(x.score)||0)):null}
function renderHome(){
  stopTimer();const g=loadGlobal();let cards='';
  for(let s=1;s<=SETS;s++){
    const st=g['set'+s],answered=st?Object.keys(st.answers||{}).length:0,best=bestScore(s);
    const score=st?.submitted?`${st.score}/100`:(answered?`ทำแล้ว ${answered} ข้อ`:'ยังไม่ได้เริ่ม');
    const right=st?.submitted?'ดูผล / ทำใหม่':answered?'ทำต่อ':'เริ่มทำข้อสอบ';
    cards+=`<button class="set-card" data-set="${s}"><div class="n">ชุดที่ ${s}</div><div class="meta">ข้อ ${(s-1)*100+1}–${s*100} · 100 ข้อ</div><div class="set-progress"><span style="width:${st?.submitted?100:answered}%"></span></div><div class="set-score"><span>${score}</span><span>${right}</span></div>${best!==null?`<div class="best-score">คะแนนสูงสุด ${best}/100</div>`:''}</button>`;
  }
  $('#app').innerHTML=`${header()}<main class="page"><section class="home-hero"><div><h1>ข้อสอบนักตรวจสอบภาษีปฏิบัติการ<br>กรมสรรพากร</h1><p>คลังข้อสอบ 1,000 ข้อ แบ่งเป็น 10 ชุด ชุดละ 100 ข้อ ระบบจะตรวจคำตอบและคำนวณคะแนนหลังตอบครบและส่งข้อสอบเท่านั้น</p><div class="hero-chips"><span class="chip">4 ตัวเลือก ก ข ค ง</span><span class="chip">ตรวจคะแนนหลังส่ง</span><span class="chip">ดูเฉลยครบ 100 ข้อ</span><span class="chip">บันทึกความคืบหน้าอัตโนมัติ</span></div></div><div class="hero-stat"><span>คลังข้อสอบ</span><strong>1,000</strong><span>ข้อ · K-EXAM โดยอาจารย์คิม</span></div></section><div class="section-title">เลือกชุดข้อสอบ</div><section class="sets">${cards}</section></main>${footer()}`;
  document.querySelectorAll('.set-card').forEach(el=>el.onclick=()=>openSet(+el.dataset.set));
}
function openSet(n){
  currentSet=n;const old=getSetState(n);const hist=getHistory(n);
  if(old?.submitted){
    modal(`<h3>ชุดที่ ${n} ทำเสร็จแล้ว</h3><p>คะแนนล่าสุด <strong>${old.score}/100</strong>${hist.length?` · คะแนนสูงสุด <strong>${Math.max(...hist.map(x=>x.score))}/100</strong>`:''}</p><div class="modal-actions wrap"><button class="ghost-btn" id="mClose">ยกเลิก</button><button class="ghost-btn" id="mHistory">ประวัติคะแนน</button><button class="primary-btn" id="mResult">ดูผลและเฉลย</button><button class="danger-btn" id="mRestart">เริ่มทำใหม่</button></div>`);
    $('#mClose').onclick=()=>$('#modal').remove();
    $('#mHistory').onclick=()=>{$('#modal').remove();renderHistory(n)};
    $('#mResult').onclick=()=>{$('#modal').remove();beginExam(n,false,true)};
    $('#mRestart').onclick=()=>{$('#modal').remove();beginExam(n,true,false)};
  }else{
    const answered=old?Object.keys(old.answers||{}).length:0;
    modal(`<h3>${old?'ทำต่อจากครั้งก่อน':'เริ่มทำข้อสอบ'} · ชุดที่ ${n}</h3><p>${old?`มีคำตอบที่บันทึกไว้ ${answered} ข้อ ระบบจะเปิดต่อจากเดิม`:'ระบบจะไม่แสดงเฉลยระหว่างทำข้อสอบ และจะเปิดให้ส่งคำตอบเมื่อทำครบ 100 ข้อ'}</p><div class="modal-actions"><button class="ghost-btn" id="mClose">ยกเลิก</button><button class="primary-btn" id="mStart">${old?'ทำต่อ':'เริ่มทำข้อสอบ'}</button></div>`);
    $('#mClose').onclick=()=>$('#modal').remove();
    $('#mStart').onclick=()=>{$('#modal').remove();beginExam(n,false,false)};
  }
}
async function beginExam(n,reset=false,showResult=false){
  try{
    bank=await loadSet(n);let st=getSetState(n);
    if(reset||!st){st={answers:{},flags:{},startedAt:Date.now(),elapsed:0,submitted:false,score:null,lastIndex:0};putSetState(n,st)}
    state=st;currentSet=n;currentIndex=Math.min(99,state.lastIndex||0);
    if(showResult||state.submitted){renderResult();return}
    startTimestamp=Date.now();renderExam();
  }catch(e){showError(e)}
}
function stopTimer(){if(timerHandle){clearInterval(timerHandle);timerHandle=null}}
function startTimer(){stopTimer();timerHandle=setInterval(()=>{if(!state||state.submitted)return;const sec=(state.elapsed||0)+(Date.now()-startTimestamp)/1000;document.querySelectorAll('[data-time]').forEach(x=>x.textContent=fmtTime(sec))},1000)}
function persist(){if(!state||state.submitted)return;if(startTimestamp){state.elapsed=(state.elapsed||0)+(Date.now()-startTimestamp)/1000;startTimestamp=Date.now()}state.lastIndex=currentIndex;putSetState(currentSet,state)}
window.addEventListener('beforeunload',persist);
function answeredCount(){return Object.keys(state?.answers||{}).length}
function flagCount(){return Object.values(state?.flags||{}).filter(Boolean).length}
function categoryProgress(){const m={};bank.questions.forEach((q,i)=>{m[q.category]??={total:0,answered:0};m[q.category].total++;if(state.answers[i]!==undefined)m[q.category].answered++});return m}
function examNavButtons(){let nav='';for(let i=0;i<100;i++){const cls=['qnum'];if(state.answers[i]!==undefined)cls.push('answered');if(state.flags[i])cls.push('flagged');if(i===currentIndex)cls.push('current');nav+=`<button class="${cls.join(' ')}" data-i="${i}" aria-label="ข้อ ${i+1}">${i+1}</button>`}return nav}
function renderExam(){
  startTimer();const q=bank.questions[currentIndex],answered=answeredCount(),flags=flagCount(),complete=answered===100;
  const choices=q.choices.map((c,i)=>`<button class="choice ${state.answers[currentIndex]===i?'selected':''}" data-choice="${i}"><span class="choice-letter">${LETTERS[i]}</span><span>${esc(c)}</span></button>`).join('');
  const cats=categoryProgress();const catHtml=Object.entries(cats).map(([k,v])=>`<div class="cat-row"><div class="label"><span>${esc(k)}</span><span>${v.answered}/${v.total}</span></div><div class="bar"><span style="width:${pct(v.answered,v.total)}%"></span></div></div>`).join('');
  const extra=`<span class="chip">ชุดที่ ${currentSet}</span><span class="chip">ข้อ ${(currentSet-1)*100+1}–${currentSet*100}</span><span class="timer" data-time>${fmtTime((state.elapsed||0)+(Date.now()-startTimestamp)/1000)}</span>`;
  $('#app').innerHTML=`${header(extra)}<main class="page"><div class="exam-grid"><aside class="panel left-panel"><h3>แผงข้อสอบ</h3><div class="legend"><span><i class="dot a"></i>ตอบแล้ว</span><span><i class="dot u"></i>ยังไม่ตอบ</span><span><i class="dot f"></i>ทบทวน</span></div><div class="qgrid">${examNavButtons()}</div></aside><section class="panel main-panel"><div class="progress-row"><div class="progress-title">ข้อ ${currentIndex+1} / 100</div><div class="progressbar"><span style="width:${answered}%"></span></div><button class="ghost-btn" id="flagBtn">${state.flags[currentIndex]?'✓ ทำเครื่องหมายแล้ว':'⚑ ทำเครื่องหมายไว้'}</button></div><div class="question-card"><div class="category">${esc(q.category)}</div><div class="question">${esc(q.prompt)}</div><div class="choices">${choices}</div><div class="copyright-note">จัดทำโดย อาจารย์คิม · www.k-exam.com · สงวนสิทธิ์ ห้ามทำซ้ำ ดัดแปลง และจำหน่ายโดยไม่ได้รับอนุญาต</div></div><div class="exam-actions"><div class="action-left"><button class="ghost-btn" id="prevBtn">← ข้อก่อนหน้า</button><button class="ghost-btn" id="clearBtn">ล้างคำตอบ</button></div><div class="submit-area"><div class="submit-hint">${complete?'ตอบครบ 100 ข้อแล้ว สามารถส่งคำตอบได้':`ตอบแล้ว ${answered}/100 ข้อ · ต้องตอบให้ครบก่อนส่ง`}</div><div class="action-right"><button class="primary-btn" id="nextBtn">ข้อถัดไป →</button><button class="primary-btn submit-btn" id="submitBtn" ${complete?'':'disabled'}>${complete?'ส่งคำตอบและประมวลผลคะแนน':'ส่งข้อสอบ'}</button></div></div></div></section><aside class="panel right-panel"><div class="stat-card"><div class="time-label">เวลาที่ใช้</div><div class="time-value" data-time>${fmtTime((state.elapsed||0)+(Date.now()-startTimestamp)/1000)}</div></div><div class="stat-row"><div class="mini green"><span>ตอบแล้ว</span><div class="v">${answered}</div><small>จาก 100 ข้อ</small></div><div class="mini gray"><span>ยังไม่ตอบ</span><div class="v">${100-answered}</div><small>จาก 100 ข้อ</small></div><div class="mini red"><span>ทบทวน</span><div class="v">${flags}</div><small>ทำเครื่องหมาย</small></div><div class="mini"><span>ความคืบหน้า</span><div class="v">${answered}%</div><small>ตอบแล้ว</small></div></div><h3 style="margin-top:18px">สัดส่วนเนื้อหา</h3>${catHtml}</aside></div></main><div class="mobile-nav"><button class="ghost-btn" id="mPrev">← ก่อนหน้า</button><button class="ghost-btn" id="mGrid">ข้อ 1–100</button><button class="primary-btn" id="mNext">ถัดไป →</button></div>${footer()}`;
  document.querySelectorAll('.qnum').forEach(b=>b.onclick=()=>go(+b.dataset.i));
  document.querySelectorAll('.choice').forEach(b=>b.onclick=()=>select(+b.dataset.choice));
  $('#flagBtn').onclick=toggleFlag;$('#prevBtn').onclick=()=>go(currentIndex-1);$('#nextBtn').onclick=()=>go(currentIndex+1);$('#clearBtn').onclick=clearAnswer;
  if(complete)$('#submitBtn').onclick=confirmSubmit;
  $('#mPrev').onclick=()=>go(currentIndex-1);$('#mNext').onclick=()=>go(currentIndex+1);$('#mGrid').onclick=openExamNavigator;
}
function openExamNavigator(){modal(`<div class="progress-row"><h3 style="margin:0">เลือกข้อสอบ</h3><button class="ghost-btn" id="navClose">ปิด</button></div><div class="legend" style="margin-top:12px"><span><i class="dot a"></i>ตอบแล้ว</span><span><i class="dot u"></i>ยังไม่ตอบ</span><span><i class="dot f"></i>ทบทวน</span></div><div class="qgrid qgrid-modal">${examNavButtons()}</div>`,true);$('#navClose').onclick=()=>$('#modal').remove();document.querySelectorAll('#modal .qnum').forEach(b=>b.onclick=()=>{$('#modal').remove();go(+b.dataset.i)})}
function go(i){if(i<0||i>99)return;persist();currentIndex=i;renderExam();scrollTo({top:0,behavior:'smooth'})}
function select(i){state.answers[currentIndex]=i;persist();renderExam()}
function clearAnswer(){delete state.answers[currentIndex];persist();renderExam();toast('ล้างคำตอบแล้ว')}
function toggleFlag(){state.flags[currentIndex]=!state.flags[currentIndex];persist();renderExam()}
function confirmSubmit(){
  persist();const left=100-answeredCount();
  if(left>0){const first=Array.from({length:100},(_,i)=>i).find(i=>state.answers[i]===undefined);modal(`<h3>ยังส่งข้อสอบไม่ได้</h3><p>ยังไม่ได้ตอบ ${left} ข้อ กรุณาตอบให้ครบทั้ง 100 ข้อก่อนส่งคำตอบ</p><div class="modal-actions"><button class="ghost-btn" id="mClose">กลับไปทำต่อ</button><button class="primary-btn" id="mFirst">ไปยังข้อที่ยังไม่ได้ตอบ</button></div>`);$('#mClose').onclick=()=>$('#modal').remove();$('#mFirst').onclick=()=>{$('#modal').remove();go(first)};return}
  modal(`<h3>ยืนยันส่งคำตอบ</h3><p>ตอบครบทั้ง 100 ข้อแล้ว เมื่อยืนยัน ระบบจะตรวจถูก–ผิด คำนวณคะแนน และล็อกคำตอบของการทำครั้งนี้</p><div class="modal-actions"><button class="ghost-btn" id="mClose">กลับไปตรวจทาน</button><button class="primary-btn" id="mSubmit">ยืนยันส่งและประมวลผล</button></div>`);$('#mClose').onclick=()=>$('#modal').remove();$('#mSubmit').onclick=()=>{$('#modal').remove();submitExam()};
}
function submitExam(){
  persist();stopTimer();let score=0;bank.questions.forEach((q,i)=>{if(state.answers[i]===q.answer)score++});
  state.score=score;state.submitted=true;state.submittedAt=Date.now();state.lastIndex=0;putSetState(currentSet,state);
  const cats=resultStats();appendHistory(currentSet,{score,elapsed:Math.round(state.elapsed||0),submittedAt:state.submittedAt,category:Object.fromEntries(Object.entries(cats).map(([k,v])=>[k,{correct:v.correct,total:v.total}]))});
  renderResult();
}
function resultStats(){const m={};bank.questions.forEach((q,i)=>{m[q.category]??={total:0,correct:0};m[q.category].total++;if(state.answers[i]===q.answer)m[q.category].correct++});return m}
function renderResult(){
  stopTimer();const answered=Object.keys(state.answers||{}).length,score=Number(state.score)||0,wrong=answered-score,unanswered=100-answered,cats=resultStats(),percent=pct(score,100);
  const rows=Object.entries(cats).map(([k,v])=>`<div class="cat-result"><div class="cat-result-head"><strong>${esc(k)}</strong><span>${v.correct}/${v.total} · ${pct(v.correct,v.total)}%</span></div><div class="bar"><span style="width:${pct(v.correct,v.total)}%"></span></div></div>`).join('');
  $('#app').innerHTML=`${header(`<span class="chip">ชุดที่ ${currentSet}</span>`)}<main class="page"><div class="result-wrap"><section class="score-card"><div><div class="score-label">ผลการทำข้อสอบ ชุดที่ ${currentSet}</div><div class="score-big">${score} / 100</div><div class="score-meta">${percent}% · ใช้เวลา ${fmtTime(state.elapsed)}</div></div><div class="score-ring"><strong>${percent}%</strong><span>คะแนนรวม</span></div></section><section class="result-grid"><div class="result-box good"><span>ตอบถูก</span><strong>${score}</strong><small>ข้อ</small></div><div class="result-box bad"><span>ตอบผิด</span><strong>${wrong}</strong><small>ข้อ</small></div><div class="result-box"><span>ไม่ตอบ</span><strong>${unanswered}</strong><small>ข้อ</small></div><div class="result-box"><span>เวลาที่ใช้</span><strong class="time-result">${fmtTime(state.elapsed)}</strong><small>ชั่วโมง:นาที:วินาที</small></div></section><section class="panel main-panel result-actions-panel"><div class="result-actions"><button class="primary-btn" id="reviewAll">ดูเฉลยทั้ง 100 ข้อ</button><button class="ghost-btn" id="reviewWrong">ดูเฉพาะข้อที่ตอบผิด</button><button class="ghost-btn" id="history">ประวัติการทำข้อสอบ</button><button class="danger-btn" id="restart">ทำชุดนี้ใหม่</button><button class="ghost-btn" id="home">กลับหน้าเลือกชุด</button></div><h3>ผลแยกตามหมวดเนื้อหา</h3><div class="category-results">${rows}</div></section></div></main>${footer()}`;
  $('#reviewAll').onclick=()=>openReview(false);$('#reviewWrong').onclick=()=>openReview(true);$('#history').onclick=()=>renderHistory(currentSet);$('#restart').onclick=()=>beginExam(currentSet,true,false);$('#home').onclick=renderHome;
}
function reviewStatus(i){const q=bank.questions[i],ua=state.answers[i];if(ua===undefined)return'unanswered';return ua===q.answer?'correct':'wrong'}
function buildReviewNav(){let nav='';for(let i=0;i<100;i++){const st=reviewStatus(i),cls=['qnum','review-'+st];if(reviewIndices[reviewPos]===i)cls.push('current');nav+=`<button class="${cls.join(' ')}" data-review-i="${i}" aria-label="ข้อ ${i+1}">${i+1}</button>`}return nav}
function openReview(wrongOnly=false,startIndex=null){
  reviewWrongOnly=wrongOnly;reviewIndices=bank.questions.map((_,i)=>i).filter(i=>!wrongOnly||reviewStatus(i)!=='correct');
  if(!reviewIndices.length){toast('ไม่มีข้อที่ตอบผิด');renderResult();return}
  reviewPos=startIndex!==null?Math.max(0,reviewIndices.indexOf(startIndex)):0;if(reviewPos<0)reviewPos=0;renderReviewPage();
}
function renderReviewPage(){
  const idx=reviewIndices[reviewPos],q=bank.questions[idx],ua=state.answers[idx],st=reviewStatus(idx),correct=q.answer;
  const choices=q.choices.map((c,i)=>{const cls=['choice','review-choice'];if(i===correct)cls.push('review-correct');if(ua===i&&i!==correct)cls.push('review-wrong');if(ua===i)cls.push('review-selected');let badge='';if(i===correct)badge+='<span class="answer-badge correct-badge">คำตอบที่ถูก</span>';if(ua===i)badge+=`<span class="answer-badge ${i===correct?'your-correct':'your-wrong'}">คำตอบของคุณ</span>`;return `<div class="${cls.join(' ')}"><span class="choice-letter">${LETTERS[i]}</span><div><div class="review-choice-line"><span>${esc(c)}</span><span class="badges">${badge}</span></div></div></div>`}).join('');
  const extra=`<span class="chip">ชุดที่ ${currentSet}</span><span class="chip">เฉลย ${reviewWrongOnly?'ข้อผิด':'ทั้งหมด'}</span>`;
  $('#app').innerHTML=`${header(extra)}<main class="page"><div class="exam-grid review-grid"><aside class="panel left-panel"><h3>เฉลยข้อ 1–100</h3><div class="legend review-legend"><span><i class="dot a"></i>ถูก</span><span><i class="dot f"></i>ผิด</span><span><i class="dot u"></i>ไม่ตอบ</span></div><div class="qgrid">${buildReviewNav()}</div></aside><section class="panel main-panel"><div class="progress-row"><div><div class="progress-title">ข้อ ${idx+1} / 100</div><div class="review-state ${st}">${st==='correct'?'ตอบถูก':st==='wrong'?'ตอบผิด':'ไม่ได้ตอบ'}</div></div><button class="ghost-btn" id="backResult">← กลับผลคะแนน</button></div><article class="question-card review-card"><div class="category">${esc(q.category)}</div><div class="question">${esc(q.prompt)}</div><div class="choices">${choices}</div><div class="explain-block"><h4>อธิบายเพิ่มเติม</h4><div>${esc(q.explanation)}</div></div><div class="explain-block"><h4>ข้อที่ผิดเพราะ</h4><div>${esc(q.wrongReasons)}</div></div></article><div class="review-actions"><button class="ghost-btn" id="rPrev">← ข้อก่อนหน้า</button><span>${reviewPos+1} / ${reviewIndices.length}${reviewWrongOnly?' ข้อที่ผิด/ไม่ตอบ':''}</span><button class="primary-btn" id="rNext">ข้อถัดไป →</button></div></section><aside class="panel right-panel review-summary"><h3>สรุปผล</h3><div class="stat-row"><div class="mini green"><span>ถูก</span><div class="v">${state.score}</div></div><div class="mini red"><span>ผิด</span><div class="v">${100-state.score}</div></div></div><div class="review-mode"><button class="${!reviewWrongOnly?'primary-btn':'ghost-btn'}" id="modeAll">ทั้งหมด</button><button class="${reviewWrongOnly?'primary-btn':'ghost-btn'}" id="modeWrong">เฉพาะข้อผิด</button></div></aside></div></main><div class="mobile-nav"><button class="ghost-btn" id="mrPrev">← ก่อนหน้า</button><button class="ghost-btn" id="mrGrid">ข้อ 1–100</button><button class="primary-btn" id="mrNext">ถัดไป →</button></div>${footer()}`;
  document.querySelectorAll('[data-review-i]').forEach(b=>b.onclick=()=>{const target=+b.dataset.reviewI;if(reviewWrongOnly&&reviewStatus(target)==='correct'){openReview(false,target);return}const p=reviewIndices.indexOf(target);if(p>=0){reviewPos=p;renderReviewPage();scrollTo({top:0,behavior:'smooth'})}});
  $('#backResult').onclick=renderResult;$('#modeAll').onclick=()=>openReview(false,idx);$('#modeWrong').onclick=()=>openReview(true,reviewStatus(idx)==='correct'?null:idx);
  const prev=()=>{if(reviewPos>0){reviewPos--;renderReviewPage();scrollTo({top:0,behavior:'smooth'})}};const next=()=>{if(reviewPos<reviewIndices.length-1){reviewPos++;renderReviewPage();scrollTo({top:0,behavior:'smooth'})}};
  $('#rPrev').onclick=prev;$('#rNext').onclick=next;$('#mrPrev').onclick=prev;$('#mrNext').onclick=next;$('#mrGrid').onclick=openReviewNavigator;
}
function openReviewNavigator(){modal(`<div class="progress-row"><h3 style="margin:0">เลือกข้อเพื่อดูเฉลย</h3><button class="ghost-btn" id="navClose">ปิด</button></div><div class="legend review-legend" style="margin-top:12px"><span><i class="dot a"></i>ถูก</span><span><i class="dot f"></i>ผิด</span><span><i class="dot u"></i>ไม่ตอบ</span></div><div class="qgrid qgrid-modal">${buildReviewNav()}</div>`,true);$('#navClose').onclick=()=>$('#modal').remove();document.querySelectorAll('#modal [data-review-i]').forEach(b=>b.onclick=()=>{const target=+b.dataset.reviewI;$('#modal').remove();if(reviewWrongOnly&&reviewStatus(target)==='correct')openReview(false,target);else{const p=reviewIndices.indexOf(target);if(p>=0){reviewPos=p;renderReviewPage()}}})}
function renderHistory(n){
  stopTimer();const hist=getHistory(n),best=hist.length?Math.max(...hist.map(x=>x.score)):null;
  const rows=hist.length?hist.map((h,i)=>`<div class="history-row"><div><strong>ครั้งที่ ${hist.length-i}</strong><span>${fmtDate(h.submittedAt)}</span></div><div><strong>${h.score}/100</strong><span>${pct(h.score,100)}%</span></div><div><strong>${fmtTime(h.elapsed)}</strong><span>เวลาที่ใช้</span></div></div>`).join(''):'<div class="empty-state">ยังไม่มีประวัติการส่งข้อสอบชุดนี้</div>';
  $('#app').innerHTML=`${header(`<span class="chip">ชุดที่ ${n}</span>`)}<main class="page"><div class="result-wrap"><section class="panel main-panel"><div class="progress-row"><div><div class="section-title" style="margin:0">ประวัติการทำข้อสอบ ชุดที่ ${n}</div>${best!==null?`<p class="muted">คะแนนสูงสุด ${best}/100 · เก็บประวัติสูงสุด 20 ครั้งในอุปกรณ์นี้</p>`:''}</div><button class="ghost-btn" id="backHome">กลับ</button></div><div class="history-list">${rows}</div></section></div></main>${footer()}`;
  $('#backHome').onclick=()=>{const st=getSetState(n);if(st?.submitted){currentSet=n;beginExam(n,false,true)}else renderHome()};
}
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw-v2.js?v=8').catch(()=>{}));
renderHome();
