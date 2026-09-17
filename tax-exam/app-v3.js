(async()=>{
  const showBootError=(err)=>{
    const app=document.getElementById('app');
    const message=String(err?.message||err||'เกิดข้อผิดพลาดในการเริ่มระบบ');
    if(app)app.innerHTML=`<main style="max-width:760px;margin:40px auto;padding:24px;font-family:Tahoma,'Sarabun',sans-serif"><section style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:28px;box-shadow:0 12px 35px rgba(15,23,42,.08)"><h2 style="margin:0 0 12px;color:#102a4c">ไม่สามารถเปิดระบบข้อสอบได้</h2><p style="line-height:1.7;color:#475569">${message}</p><p style="line-height:1.7;color:#64748b">ระบบจะล้างไฟล์แคชของ K-EXAM แล้วโหลดรุ่นล่าสุดให้ใหม่ได้ โดยข้อมูลคำตอบและคะแนนที่บันทึกในเครื่องจะไม่ถูกลบ</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button id="kRetry" style="border:0;border-radius:10px;padding:11px 16px;background:#0b63ce;color:#fff;font-weight:700;cursor:pointer">ลองเปิดอีกครั้ง</button><button id="kReset" style="border:1px solid #cbd5e1;border-radius:10px;padding:11px 16px;background:#fff;color:#102a4c;font-weight:700;cursor:pointer">ล้างแคชแล้วโหลดใหม่</button></div></section></main>`;
    document.getElementById('kRetry')?.addEventListener('click',()=>location.reload());
    document.getElementById('kReset')?.addEventListener('click',async()=>{
      try{
        if('caches' in window){for(const k of await caches.keys())if(k.startsWith('kexam-tax-'))await caches.delete(k)}
        if('serviceWorker' in navigator){for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister()}
      }catch(_){}
      const u=new URL(location.href);u.searchParams.set('v','11');u.searchParams.set('reset','1');location.replace(u.toString());
    });
    console.error(err);
  };

  try{
    const files=['app-v3-part1.txt','app-v3-part2.txt','app-v3-part3.txt','app-v3-part4.txt'];
    const parts=await Promise.all(files.map(async f=>{
      const r=await fetch(`${f}?v=11`,{cache:'no-store'});
      if(!r.ok)throw new Error('โหลดส่วนประกอบระบบไม่สำเร็จ: '+f);
      return r.text();
    }));

    let code=parts.join('');
    code=code.replace("'ra-bank-02.txt','ra-bank-03.txt'","'ra-bank-02a.txt','ra-bank-02b.txt','ra-bank-03a.txt','ra-bank-03b.txt'");
    code=code.replace("document.addEventListener('DOMContentLoaded',init);",'');

    (0,eval)(code);
    if(typeof window.init!=='function')throw new Error('ไม่พบฟังก์ชันเริ่มต้นระบบ');
    window.init();
  }catch(e){
    showBootError(e);
  }
})();
