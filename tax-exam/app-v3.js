(async()=>{
  const showBootError=(err)=>{
    const app=document.getElementById('app');
    const message=String(err?.message||err||'เกิดข้อผิดพลาดในการเริ่มระบบ');
    if(app)app.innerHTML=`<main style="max-width:760px;margin:40px auto;padding:24px;font-family:Tahoma,'Sarabun',sans-serif"><section style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:28px;box-shadow:0 12px 35px rgba(15,23,42,.08)"><h2 style="margin:0 0 12px;color:#102a4c">ไม่สามารถเปิดระบบข้อสอบได้</h2><p style="line-height:1.7;color:#475569">${message}</p><p style="line-height:1.7;color:#64748b">ระบบจะล้างเฉพาะไฟล์แคชของ K-EXAM แล้วโหลดรุ่นล่าสุดให้ใหม่ โดยไม่ลบคำตอบ คะแนน หรือประวัติที่บันทึกไว้ในเครื่อง</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button id="kRetry" style="border:0;border-radius:10px;padding:11px 16px;background:#0b63ce;color:#fff;font-weight:700;cursor:pointer">ลองเปิดอีกครั้ง</button><button id="kReset" style="border:1px solid #cbd5e1;border-radius:10px;padding:11px 16px;background:#fff;color:#102a4c;font-weight:700;cursor:pointer">ล้างแคชแล้วโหลดใหม่</button></div></section></main>`;
    document.getElementById('kRetry')?.addEventListener('click',()=>location.reload());
    document.getElementById('kReset')?.addEventListener('click',async()=>{
      try{
        if('caches' in window){for(const k of await caches.keys())if(k.startsWith('kexam-tax-'))await caches.delete(k)}
        if('serviceWorker' in navigator){for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister()}
      }catch(_){}
      const u=new URL(location.href);u.searchParams.set('v','25');u.searchParams.set('reset','1');location.replace(u.toString());
    });
    console.error('[K-EXAM BOOT]',err);
  };

  try{
    const files=['app-v3-part1.txt','app-v3-part2.txt','app-v3-part3.txt','app-v3-part4.txt'];
    const parts=[];
    for(const f of files){
      const r=await fetch(`${f}?v=25`,{cache:'no-store'});
      if(!r.ok)throw new Error('โหลดส่วนประกอบระบบไม่สำเร็จ: '+f);
      const text=await r.text();
      if(!text.trim())throw new Error('ส่วนประกอบระบบว่างเปล่า: '+f);
      parts.push(text);
    }

    let code=parts.join('\n');
    code=code.replace("'ra-bank-02.txt','ra-bank-03.txt'","'ra-bank-02a.txt','ra-bank-02b.txt','ra-bank-03a.txt','ra-bank-03b.txt'");
    code=code.replace("document.addEventListener('DOMContentLoaded',init);",'');

    const inject=(from,to)=>{if(code.includes(from))code=code.replace(from,to);else console.warn('[K-EXAM] analytics injection target not found')};
    inject(
      "function selectPosition(key){if(!POSITIONS[key])return;currentPosition=key;setUrlPosition(key);renderSetHome()}",
      "function selectPosition(key){if(!POSITIONS[key])return;window.KEXAM_ANALYTICS?.track('position_select',{position:key});currentPosition=key;setUrlPosition(key);renderSetHome()}"
    );
    inject(
      "async function beginExam(n,reset=false,showResult=false){",
      "async function beginExam(n,reset=false,showResult=false){\n  window.KEXAM_ANALYTICS?.track('exam_open',{position:currentPosition,set_no:Number.isInteger(Number(n))?Number(n):null,exam_mode:isRandomSet(n)?'random':isWrongSet(n)?'wrong-practice':isWeakSet(n)?'weak-practice':isTopicSet(n)?'topic-practice':'fixed',reset:!!reset,show_result:!!showResult});"
    );
    inject(
      "function renderResult(){\n  stopTimer();",
      "function renderResult(){\n  try{if(state?.submitted&&state?.submittedAt){const wrongQuestions=bank?.questions?.map((q,i)=>state.answers?.[i]===q.answer?null:(q.id||q.number)).filter(Boolean)||[];const itemResponses=bank?.questions?.map((q,i)=>q.id?`${q.id}|${state.answers?.[i]}|${q.answer}`:null).filter(Boolean)||[];const itemTimes=bank?.questions?.map((q,i)=>q.id?`${q.id}|${Math.max(0,Math.round(Number(state.itemElapsed?.[i])||0))}`:null).filter(Boolean)||[];window.KEXAM_ANALYTICS?.trackOnce('exam_submit',`${currentPosition}:${currentSet}:${state.submittedAt}`,{position:currentPosition,set_no:Number.isInteger(Number(currentSet))?Number(currentSet):null,exam_mode:isRandomSet(currentSet)?'random':isWrongSet(currentSet)?'wrong-practice':isWeakSet(currentSet)?'weak-practice':isTopicSet(currentSet)?'topic-practice':'fixed',score:Number(state.score)||0,total:Number(state.total)||bank?.questions?.length||100,elapsed_seconds:Math.round(state.elapsed||0),wrong_questions:wrongQuestions,item_responses:itemResponses,item_times:itemTimes,category_result:resultStats(),topic_result:resultTopicStats()})}}catch(_){}\n  stopTimer();"
    );
    inject(
      "function openReview(wrongOnly=false,target=null){reviewWrongOnly=wrongOnly;",
      "function openReview(wrongOnly=false,target=null){window.KEXAM_ANALYTICS?.track('review_open',{position:currentPosition,set_no:Number.isInteger(Number(currentSet))?Number(currentSet):null,exam_mode:isRandomSet(currentSet)?'random':isWrongSet(currentSet)?'wrong-practice':isWeakSet(currentSet)?'weak-practice':isTopicSet(currentSet)?'topic-practice':'fixed',wrong_only:!!wrongOnly});reviewWrongOnly=wrongOnly;"
    );

    code += "\n;init();";
    (0,eval)(code);
    setTimeout(()=>window.KEXAM_ANALYTICS?.flush?.(),1200);
  }catch(e){
    showBootError(e);
  }
})();
