/* KHONCHAIHERB Thai-first customer UI v1.23.0 */
(()=>{
  if(typeof document==='undefined'||window.__KCH_THAI_FIRST__==='1.23.0')return;
  window.__KCH_THAI_FIRST__='1.23.0';
  document.documentElement.lang='th';

  const exact=new Map([
    ['HOME','หน้าแรก'],['Home','หน้าแรก'],
    ['SHOP','สินค้าทั้งหมด'],['Shop','สินค้าทั้งหมด'],
    ['BEST SELLERS','สินค้าแนะนำ'],['Best Sellers','สินค้าแนะนำ'],
    ['NEW ARRIVALS','สินค้าใหม่'],['New Arrivals','สินค้าใหม่'],
    ['PROMOTIONS','โปรโมชั่น'],['Promotions','โปรโมชั่น'],
    ['ABOUT US','เกี่ยวกับเรา'],['About Us','เกี่ยวกับเรา'],
    ['CONTACT','ติดต่อเรา'],['Contact','ติดต่อเรา'],
    ['SHOP NOW 🌿','เลือกซื้อสินค้า 🌿'],['SHOP NOW','เลือกซื้อสินค้า'],
    ['EXPLORE COLLECTION','เลือกดูหมวดสินค้า'],
    ['PREMIUM THAI HERBAL','สมุนไพรไทยพรีเมียม'],
    ['Ancient Wisdom. Future Wellness.','ภูมิปัญญาสมุนไพรไทย สู่การดูแลสุขภาพยุคใหม่'],
    ['Account','บัญชีของฉัน'],['My Account','บัญชีของฉัน'],
    ['Wishlist','รายการโปรด'],['Favorites','รายการโปรด'],
    ['Cart','ตะกร้าสินค้า'],['Shopping Cart','ตะกร้าสินค้า'],
    ['Orders','คำสั่งซื้อ'],['My Orders','คำสั่งซื้อของฉัน'],['Me','บัญชีของฉัน'],
    ['LIVE','ไลฟ์'],['Live','ไลฟ์'],
    ['Search','ค้นหา'],['Search products','ค้นหาสินค้า'],
    ['Product Details','รายละเอียดสินค้า'],['Description','รายละเอียด'],
    ['Add to cart','เพิ่มลงตะกร้า'],['Add to Cart','เพิ่มลงตะกร้า'],
    ['Buy now','ซื้อเลย'],['Buy Now','ซื้อเลย'],
    ['Checkout','ชำระเงิน'],['Continue Shopping','เลือกซื้อสินค้าต่อ'],
    ['Order Summary','สรุปคำสั่งซื้อ'],['Subtotal','ยอดสินค้า'],['Shipping','ค่าจัดส่ง'],
    ['Discount','ส่วนลด'],['Total','ยอดรวม'],
    ['Cash on Delivery','เก็บเงินปลายทาง'],['Place Order','ยืนยันคำสั่งซื้อ'],
    ['Track Order','ติดตามคำสั่งซื้อ'],['Order Tracking','ติดตามคำสั่งซื้อ'],
    ['Sign in','เข้าสู่ระบบ'],['Sign In','เข้าสู่ระบบ'],
    ['Sign out','ออกจากระบบ'],['Sign Out','ออกจากระบบ'],
    ['Recommended','แนะนำ'],['Newest','ใหม่ล่าสุด'],
    ['Price: Low to High','ราคา: ต่ำไปสูง'],['Price: High to Low','ราคา: สูงไปต่ำ'],
    ['No results','ไม่พบสินค้า'],['No products found','ไม่พบสินค้า'],
    ['Back','ย้อนกลับ'],['Close','ปิด'],['Save','บันทึก'],['Continue','ดำเนินการต่อ'],
    ['COD','เก็บเงินปลายทาง (COD)'],['TRACK','ติดตามพัสดุ'],['RECEIPT','ใบเสร็จรับเงิน']
  ]);

  const menuLabels=['หน้าแรก','สินค้าทั้งหมด','สินค้าแนะนำ','สินค้าใหม่','โปรโมชั่น','เกี่ยวกับเรา','ติดต่อเรา'];
  const skip=el=>Boolean(el?.closest?.('script,style,code,pre,.material-symbols-rounded,.kch-brand-lockup,.kch-master-hero h1'));

  function translateText(root){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let node;
    while((node=walker.nextNode()))nodes.push(node);
    nodes.forEach(n=>{
      const parent=n.parentElement;
      if(!parent||skip(parent))return;
      const raw=n.nodeValue||'',trim=raw.trim();
      if(!trim||!exact.has(trim))return;
      n.nodeValue=raw.replace(trim,exact.get(trim));
    });
  }

  function setVisibleLabel(el,text){
    if(!el)return;
    const spans=[...el.querySelectorAll(':scope > span')].filter(s=>!s.classList.contains('material-symbols-rounded'));
    const target=spans.at(-1);
    if(target){target.textContent=text;return}
    const texts=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.nodeValue.trim());
    if(texts.length)texts.at(-1).nodeValue=text;
  }

  function localizeMasterMenu(){
    const desktop=[...document.querySelectorAll('.kch-ref-menu button')];
    const mobile=[...document.querySelectorAll('.kch-ref-mobile-panel button')];
    [desktop,mobile].forEach(group=>group.forEach((b,i)=>{
      if(menuLabels[i])b.textContent=menuLabels[i];
    }));
  }

  function localizeBottomNav(){
    const map=[
      ['[data-go="home"]','หน้าแรก'],
      ['[data-go="orders"]','คำสั่งซื้อ'],
      ['[data-go="account"]','บัญชีของฉัน']
    ];
    map.forEach(([sel,label])=>document.querySelectorAll(`.tshop-bottom ${sel}`).forEach(el=>{
      setVisibleLabel(el,label);
      el.setAttribute('aria-label',label);
    }));
    document.querySelectorAll('.tshop-bottom [data-v05-nav="live"],.tshop-bottom [data-live-nav]').forEach(el=>{
      setVisibleLabel(el,'ไลฟ์');
      el.setAttribute('aria-label','ไลฟ์');
    });
  }

  function localizeControls(){
    const search=document.querySelector('.tshop-searchbox input');
    if(search){
      search.placeholder='ค้นหาสินค้าและสมุนไพร';
      search.setAttribute('aria-label','ค้นหาสินค้าและสมุนไพร');
    }
    document.querySelectorAll('[data-go="account"]').forEach(el=>el.setAttribute('aria-label','บัญชีของฉัน'));
    document.querySelectorAll('[data-go="cart"]').forEach(el=>el.setAttribute('aria-label','ตะกร้าสินค้า'));
    document.querySelectorAll('[data-go="orders"]').forEach(el=>el.setAttribute('aria-label','คำสั่งซื้อ'));
    document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{
      const p=el.getAttribute('placeholder')||'';
      if(exact.has(p))el.setAttribute('placeholder',exact.get(p));
    });
    document.querySelectorAll('option').forEach(el=>{
      const t=el.textContent.trim();
      if(exact.has(t))el.textContent=exact.get(t);
    });
  }

  function localizeMasterCopy(){
    const kicker=document.querySelector('.kch-master-kicker');
    if(kicker&&/PREMIUM THAI HERBAL/i.test(kicker.textContent))kicker.textContent='KHONCHAIHERB • สมุนไพรไทยพรีเมียม';
    const tagline=document.querySelector('.kch-master-tagline');
    if(tagline)tagline.textContent='ภูมิปัญญาสมุนไพรไทย สู่การดูแลสุขภาพยุคใหม่';
    const shop=document.querySelector('.kch-master-shop');if(shop)shop.textContent='เลือกซื้อสินค้า 🌿';
    const explore=document.querySelector('.kch-master-explore');if(explore)explore.textContent='เลือกดูหมวดสินค้า';
    document.querySelectorAll('.kch-master-footer-brand p').forEach(p=>p.innerHTML='ภูมิปัญญาสมุนไพรไทย<br>สู่การดูแลสุขภาพยุคใหม่');
    document.querySelectorAll('.kch-master-review .stars').forEach(el=>el.textContent='ตรวจสอบจากคำสั่งซื้อ');
    document.querySelectorAll('.kch-master-promo strong').forEach(el=>{
      const t=el.textContent.trim().toUpperCase();
      if(t==='COD')el.textContent='ชำระปลายทาง';
      if(t==='TRACK')el.textContent='ติดตามพัสดุ';
      if(t==='RECEIPT')el.textContent='ใบเสร็จรับเงิน';
    });
    document.querySelectorAll('.kch-master-payments span').forEach(el=>{
      const t=el.textContent.trim().toUpperCase();
      if(t==='VISA'||t==='MASTER')el.remove();
      else if(t==='COD')el.textContent='เก็บเงินปลายทาง (COD)';
    });
  }

  function localize(){
    document.documentElement.lang='th';
    localizeMasterMenu();
    localizeBottomNav();
    localizeControls();
    localizeMasterCopy();
    translateText(document.body);
  }

  if(!document.getElementById('kch-thai-first-style')){
    const style=document.createElement('style');
    style.id='kch-thai-first-style';
    style.textContent=`
      body,button,input,textarea,select{font-family:'Noto Sans Thai','Tahoma',sans-serif!important}
      .kch-brand-lockup b,.kch-master-hero h1{font-family:Georgia,'Times New Roman','Noto Sans Thai',serif!important}
      .kch-master-tagline{font-family:'Noto Sans Thai','Tahoma',sans-serif!important;font-weight:700!important;line-height:1.55!important;letter-spacing:0!important}
      .kch-ref-menu button,.kch-ref-mobile-panel button{letter-spacing:0!important;font-weight:800!important;line-height:1.45!important}
      .kch-master-kicker{letter-spacing:.02em!important}
      .kch-master-payments span{white-space:nowrap!important}
      @media(max-width:699px){
        .kch-ref-mobile-panel button{font-size:16px!important;line-height:1.5!important}
        .kch-master-hero-actions button{font-size:15px!important}
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  let frame=0;
  const schedule=()=>{
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;localize()});
  };

  const root=document.getElementById('app')||document.body;
  if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
  document.addEventListener('click',schedule,true);
  window.addEventListener('load',schedule,{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
})();
