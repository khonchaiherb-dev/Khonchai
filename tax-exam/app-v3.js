(async()=>{
  try{
    const files=['app-v3-part1.txt','app-v3-part2.txt','app-v3-part3.txt','app-v3-part4.txt'];
    const parts=await Promise.all(files.map(async f=>{const r=await fetch(f,{cache:'no-store'});if(!r.ok)throw new Error('โหลดระบบไม่สำเร็จ: '+f);return r.text()}));
    (0,eval)(parts.join(''));
    if(document.readyState!=='loading'&&typeof init==='function') init();
  }catch(e){
    const app=document.getElementById('app');
    if(app)app.innerHTML='<main style="max-width:760px;margin:40px auto;padding:24px;font-family:Tahoma,sans-serif"><h2>ไม่สามารถเปิดระบบข้อสอบได้</h2><p>กรุณารีเฟรชหน้าเว็บแล้วลองใหม่อีกครั้ง</p></main>';
    console.error(e);
  }
})();
