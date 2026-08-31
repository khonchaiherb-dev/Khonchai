const hamb=document.getElementById('hamb'),menu=document.getElementById('menu');
hamb?.addEventListener('click',()=>menu.classList.toggle('open'));
menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>menu.classList.remove('open')));
