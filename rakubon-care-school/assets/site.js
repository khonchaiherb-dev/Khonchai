const hamb=document.getElementById('hamb'),menu=document.getElementById('menu');
hamb?.addEventListener('click',()=>{
  const isOpen=menu?.classList.toggle('open')||false;
  hamb.setAttribute('aria-expanded',String(isOpen));
});
menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
  menu.classList.remove('open');
  hamb?.setAttribute('aria-expanded','false');
}));
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&menu?.classList.contains('open')){
    menu.classList.remove('open');
    hamb?.setAttribute('aria-expanded','false');
    hamb?.focus();
  }
});

const applyForm=document.getElementById('applyForm');
const applicationText=document.getElementById('applicationText');
const copyApplication=document.getElementById('copyApplication');
const formStatus=document.getElementById('formStatus');
let preparedText='';

applyForm?.addEventListener('submit',e=>{
  e.preventDefault();
  const phoneField=document.getElementById('phone');
  if(phoneField) phoneField.value=phoneField.value.replace(/[^0-9]/g,'').slice(0,10);
  if(!applyForm.checkValidity()){
    applyForm.reportValidity();
    formStatus.textContent='กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบก่อน';
    return;
  }
  const fd=new FormData(applyForm);
  const v=name=>(fd.get(name)||'').toString().trim();
  preparedText=[
    'ขอสอบถามข้อมูลสมัครเรียน โรงเรียนรักษ์อุบลการบริบาล',
    'RUKUBON HEALTHCARE SCHOOL',
    '',
    `ชื่อ–นามสกุล: ${v('fullName')}`,
    `เบอร์โทร: ${v('phone')}`,
    `LINE ID: ${v('lineId')||'-'}`,
    `สาขาที่สนใจ: ${v('branch')}`,
    `ระดับการศึกษา: ${v('education')||'-'}`,
    `เรื่องที่ต้องการสอบถาม: ${v('message')||'ขอรายละเอียดการสมัครเรียน'}`
  ].join('\n');
  applicationText.textContent=preparedText;
  copyApplication.disabled=false;
  formStatus.textContent='สร้างข้อความเรียบร้อยแล้ว กด “คัดลอก” แล้วนำไปวางใน LINE โรงเรียนได้เลย';
});

copyApplication?.addEventListener('click',async()=>{
  if(!preparedText)return;
  try{
    await navigator.clipboard.writeText(preparedText);
    formStatus.textContent='คัดลอกข้อความแล้ว เปิด LINE โรงเรียนและวางข้อความเพื่อส่งได้เลย';
    copyApplication.textContent='คัดลอกแล้ว ✓';
    setTimeout(()=>copyApplication.textContent='คัดลอก',1800);
  }catch{
    const range=document.createRange();
    range.selectNodeContents(applicationText);
    const sel=window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    formStatus.textContent='เลือกข้อความให้แล้ว กรุณาคัดลอกด้วย Ctrl+C หรือแตะค้างเพื่อคัดลอก';
  }
});

const lightbox=document.getElementById('lightbox');
const lightboxImage=document.getElementById('lightboxImage');
const lightboxCaption=document.getElementById('lightboxCaption');
document.querySelectorAll('.gallery-card .pic img,.mosaic img').forEach(img=>{
  img.addEventListener('click',()=>{
    if(!lightbox?.showModal)return;
    lightboxImage.src=img.src;
    lightboxImage.alt=img.alt;
    const cap=img.closest('figure')?.querySelector('figcaption')?.textContent || img.closest('.gallery-card')?.querySelector('h3')?.textContent || img.alt;
    lightboxCaption.textContent=cap;
    lightbox.showModal();
  });
});
document.getElementById('lightboxClose')?.addEventListener('click',()=>lightbox.close());
lightbox?.addEventListener('click',e=>{if(e.target===lightbox)lightbox.close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&lightbox?.open)lightbox.close()});
