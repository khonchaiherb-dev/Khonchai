const hamb=document.getElementById('hamb'),menu=document.getElementById('menu');
hamb?.addEventListener('click',()=>menu.classList.toggle('open'));
menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>menu.classList.remove('open')));

const imageMap={
  'นักเรียนหญิงฝึกการบันทึกข้อมูล':'assets/learning-2.webp',
  'นักเรียนหญิงมุสลิมฝึกปฏิบัติในสถานพยาบาล':'assets/learning-3.webp',
  'นักเรียนหญิงโรงเรียนรักษ์อุบลการบริบาล':'assets/learning-2.webp',
  'นักเรียนหญิงมุสลิมโรงเรียนรักษ์อุบลการบริบาล':'assets/learning-3.webp'
};
document.querySelectorAll('img[alt]').forEach(img=>{if(imageMap[img.alt]) img.src=imageMap[img.alt]});
