(()=>{
  const VERSION='9';
  const showLoading=(title='กำลังเตรียมข้อสอบ...',sub='กรุณารอสักครู่')=>{
    if(document.querySelector('.kexam-loading'))return;
    const d=document.createElement('div');d.className='kexam-loading';d.innerHTML=`<div class="kexam-loading-card" role="status" aria-live="polite"><div class="kexam-spinner"></div><div class="kexam-loading-title">${title}</div><div class="kexam-loading-sub">${sub}</div></div>`;document.body.appendChild(d);
  };
  const hideLoading=()=>document.querySelector('.kexam-loading')?.remove();
  const friendlyError=(err)=>{
    const raw=String(err?.message||err||'');
    if(/atob|base64|gzip|decode|DecompressionStream/i.test(raw))return 'ระบบโหลดคลังข้อสอบไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต แล้วกด “ลองอีกครั้ง”';
    if(/โหลดข้อมูลไม่สำเร็จ|fetch|network|Failed to fetch/i.test(raw))return 'ไม่สามารถเชื่อมต่อข้อมูลข้อสอบได้ในขณะนี้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง';
    return raw||'เกิดข้อผิดพลาดชั่วคราว กรุณาลองอีกครั้ง';
  };

  const originalBegin=window.beginExam;
  if(typeof originalBegin==='function'){
    window.beginExam=async function(...args){
      showLoading(args[2]?'กำลังเปิดผลการทำข้อสอบ...':'กำลังเตรียมข้อสอบ...','กำลังโหลดข้อมูล K-EXAM');
      try{return await originalBegin.apply(this,args)}finally{setTimeout(hideLoading,120)}
    };
  }
  if(typeof window.showError==='function'){
    window.showError=function(err){
      hideLoading();
      const msg=friendlyError(err);
      const app=document.querySelector('#app');
      if(!app)return;
      app.innerHTML=`${typeof header==='function'?header():''}<main class="page"><section class="panel main-panel" style="max-width:760px;margin:40px auto;text-align:center;padding:34px"><div style="font-size:42px;margin-bottom:8px">!</div><h2 style="margin:0 0 10px">ไม่สามารถเปิดข้อสอบได้</h2><p style="color:#667085;line-height:1.7">${msg}</p><button class="primary-btn" id="retryKexam">ลองอีกครั้ง</button></section></main>${typeof footer==='function'?footer():''}`;
      document.querySelector('#retryKexam')?.addEventListener('click',()=>location.reload());
    };
  }

  function enhance(){
    document.documentElement.dataset.kexamVersion=VERSION;
    const title=document.querySelector('.progress-title');
    if(title)document.title=`${title.textContent.trim()} | K-EXAM`;
    else if(document.querySelector('.score-card'))document.title='ผลการทำข้อสอบ | K-EXAM';
    else if(document.querySelector('.review-card'))document.title='เฉลยข้อสอบ | K-EXAM';
    else document.title='K-EXAM | ระบบทำข้อสอบนักตรวจสอบภาษีปฏิบัติการ';

    document.querySelectorAll('.choice').forEach(el=>{if(el.tagName==='BUTTON')el.setAttribute('aria-pressed',el.classList.contains('selected')?'true':'false')});
    document.querySelectorAll('.qnum.current').forEach(el=>el.setAttribute('aria-current','true'));
    document.querySelectorAll('.progressbar').forEach(el=>{el.setAttribute('role','progressbar');const w=el.querySelector('span')?.style.width||'0%';el.setAttribute('aria-valuenow',String(parseInt(w)||0));el.setAttribute('aria-valuemin','0');el.setAttribute('aria-valuemax','100')});

    const hint=document.querySelector('.submit-hint');const submit=document.querySelector('#submitBtn');
    if(hint&&submit?.disabled&&!hint.querySelector('.jump-unanswered')){const b=document.createElement('button');b.className='jump-unanswered';b.type='button';b.textContent='ไปยังข้อที่ยังไม่ได้ตอบ';b.onclick=()=>{const q=[...document.querySelectorAll('.left-panel .qnum')].find(x=>!x.classList.contains('answered'));q?.click()};hint.append(document.createElement('br'),b)}
    const question=document.querySelector('.question');if(question&&!question.hasAttribute('tabindex'))question.setAttribute('tabindex','-1');
    document.querySelectorAll('.set-card').forEach(card=>{const set=card.dataset.set;if(set)card.setAttribute('aria-label',`เปิดข้อสอบชุดที่ ${set}`)});
  }

  let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})});observer.observe(document.documentElement,{childList:true,subtree:true});enhance();
  const banner=(text)=>{document.querySelector('.network-banner')?.remove();const d=document.createElement('div');d.className='network-banner';d.textContent=text;document.body.appendChild(d);setTimeout(()=>d.remove(),3500)};
  window.addEventListener('offline',()=>banner('อินเทอร์เน็ตขาดการเชื่อมต่อ ระบบจะเก็บคำตอบในเครื่องนี้ไว้'));
  window.addEventListener('online',()=>banner('เชื่อมต่ออินเทอร์เน็ตแล้ว'));
})();
