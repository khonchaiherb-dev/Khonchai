import {test,expect} from '@playwright/test';

// Browser-only fixtures use non-production IDs and zero social proof.
const products=[
  {id:901,slug:'rang-jued-tea-e2e',sku:'E2E-TEA-901',name:'ชารางจืดสำหรับทดสอบระบบ',description:'ข้อมูลสำหรับทดสอบเส้นทางเลือกซื้อเท่านั้น',category:'ชาสมุนไพร',price:190,compare_at_price:null,rating:0,sold_count:0,stock:5,featured:1,sale_verified:1,image_url:'/assets/products/rang-jued-tea-360.webp'},
  {id:902,slug:'chiang-da-tea-e2e',sku:'E2E-TEA-902',name:'ชาเชียงดาสำหรับทดสอบระบบ',description:'ข้อมูลสำหรับทดสอบเส้นทางเลือกซื้อเท่านั้น',category:'ชาสมุนไพร',price:220,compare_at_price:null,rating:0,sold_count:0,stock:5,featured:1,sale_verified:1,image_url:'/assets/products/chiang-da-tea-360.webp'}
];

async function mockStore(page){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products});
    if(path==='/api/coupons')return fulfill({coupons:[]});
    if(path==='/api/recommendations')return fulfill({products});
    if(path==='/api/social-feed')return fulfill({items:[],contents:[],creators:[]});
    if(path==='/api/health')return fulfill({ok:true,d1:true,version:'1.18.2'});
    if(path.startsWith('/api/customer/'))return fulfill({authenticated:false},401);
    return fulfill({ok:true});
  });
}

async function loadV131(page){
  await page.addStyleTag({path:'public/tshop-v131-top-conversion.css'});
  await page.addScriptTag({path:'public/kch-top-conversion.js'});
  await expect.poll(()=>page.evaluate(()=>window.__KCH_TOP_CONVERSION__)).toBe('1.31.2');
}

async function loadV132(page){
  await page.addStyleTag({path:'public/tshop-v132-conversion-storefront.css'});
  await page.addStyleTag({path:'public/tshop-v1321-search-visibility-fix.css'});
  await page.addScriptTag({path:'public/kch-conversion-storefront.js'});
  await expect.poll(()=>page.evaluate(()=>window.__KCH_CONVERSION_STOREFRONT__)).toBe('1.32.0');
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear())});

test('master storefront discovery is readable, Thai-first and stable across viewports',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mockStore(page);
  await page.goto('/?flagship=master',{waitUntil:'domcontentloaded'});
  await loadV131(page);
  await loadV132(page);

  await expect(page.locator('.shell')).toHaveClass(/kch-master-shell/);
  await expect(page.locator('.shell')).toHaveClass(/kch-v131/);
  await expect(page.locator('.shell')).toHaveClass(/kch-v132/);
  await expect(page.locator('.kch-master-home')).toBeVisible();
  await expect(page.locator('.kch-master-home')).toHaveClass(/kch-v131-home/);
  await expect(page.locator('.kch-master-home')).toHaveClass(/kch-v132-home/);
  await expect(page.getByRole('heading',{level:1})).toContainText('KHONCHAIHERB');
  await expect(page.getByRole('heading',{level:1})).toContainText('สมุนไพรไทยที่คัดสรร');

  const nav=page.locator('.kch-ref-menu');
  if((page.viewportSize()?.width||0)>=700){
    await expect(nav).toBeVisible();
    for(const label of ['หน้าแรก','สินค้าทั้งหมด','สินค้าแนะนำ','สินค้าใหม่','โปรโมชั่น','เกี่ยวกับเรา','ติดต่อเรา'])await expect(nav.getByRole('button',{name:label})).toBeVisible();
  }

  const hero=page.locator('.kch-master-hero');
  await expect(hero).toContainText('เพื่อการดูแลสุขภาพในทุกวัน');
  await expect(hero).toContainText('เก็บเงินปลายทาง');
  await expect(page.locator('.kch-master-showcase')).toHaveCount(3);
  await expect(page.locator('.kch-master-showcase img[src="/assets/products/chiang-da-tea-360.webp"]')).toBeVisible();
  await expect(page.locator('.kch-master-showcase img[src="/assets/products/gymnema-capsules-100-512.webp"]')).toBeVisible();

  const memberInterrupt=page.locator('.kch-v131-member-interrupt');
  await expect(memberInterrupt).toHaveCount(1);
  await expect(memberInterrupt).toBeHidden();
  await expect(page.locator('.kch-master-range')).toBeHidden();

  const grid=page.locator('.kch-master-products');
  await expect(grid).toBeVisible();
  const rangJued=grid.locator('[data-product="rang-jued-tea-e2e"]');
  const chiangDa=grid.locator('[data-product="chiang-da-tea-e2e"]');
  await expect(rangJued).toContainText('ชารางจืด');
  await expect(rangJued).toHaveAttribute('data-kch-v132-ready','1');
  await expect(rangJued.getByRole('button',{name:/สั่งซื้อ ชารางจืด/})).toBeVisible();
  await expect(rangJued).toContainText('฿190');

  const mediaHeight=await rangJued.locator('.kch-master-product-media').evaluate(el=>Math.round(el.getBoundingClientRect().height));
  const viewportWidth=page.viewportSize()?.width||0;
  if(viewportWidth<=520)expect(mediaHeight).toBeLessThanOrEqual(170);
  else if(viewportWidth<=899)expect(mediaHeight).toBeLessThanOrEqual(180);
  else expect(mediaHeight).toBeLessThanOrEqual(215);

  const search=page.locator('.tshop-searchbox input');
  await search.fill('ชารางจืด');
  await expect(rangJued).toBeVisible();
  await expect(chiangDa).toBeHidden();
  await expect(chiangDa).toHaveAttribute('data-kch-v131-search-match','0');
  await search.fill('');
  await expect(chiangDa).not.toHaveAttribute('data-kch-v131-search-match','0');

  const bodyText=await page.locator('body').innerText();
  expect(bodyText).not.toContain('ขายแล้ว 0');
  expect(bodyText).not.toContain('Verified Purchase');
  expect(bodyText).not.toContain('FLASH DEAL');
  expect(bodyText).not.toContain('สินค้าขายดี');
  expect(bodyText).not.toContain('088-5807909');
  expect(bodyText).not.toContain('0885807909');

  const metrics=await page.evaluate(()=>{
    const root=document.documentElement;
    const clientWidth=root.clientWidth;
    const offenders=[...document.querySelectorAll('body *')].map((el,index)=>{
      const rect=el.getBoundingClientRect();
      const cs=getComputedStyle(el);
      const visible=cs.display!=='none'&&cs.visibility!=='hidden'&&rect.width>0&&rect.height>0;
      if(!visible)return null;
      const rightOverflow=Math.max(0,rect.right-clientWidth);
      const leftOverflow=Math.max(0,-rect.left);
      if(rightOverflow<=1&&leftOverflow<=1)return null;
      const cls=typeof el.className==='string'?el.className.trim().split(/\s+/).slice(0,5).join('.'):'';
      return {
        index,
        selector:`${el.tagName.toLowerCase()}${el.id?`#${el.id}`:''}${cls?`.${cls}`:''}`,
        left:Math.round(rect.left*10)/10,
        right:Math.round(rect.right*10)/10,
        width:Math.round(rect.width*10)/10,
        rightOverflow:Math.round(rightOverflow*10)/10,
        leftOverflow:Math.round(leftOverflow*10)/10,
        scrollWidth:el.scrollWidth,
        clientWidth:el.clientWidth,
        position:cs.position,
        display:cs.display,
        overflowX:cs.overflowX,
        whiteSpace:cs.whiteSpace,
        text:String(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,80)
      };
    }).filter(Boolean).sort((a,b)=>Math.max(b.rightOverflow,b.leftOverflow)-Math.max(a.rightOverflow,a.leftOverflow)).slice(0,20);
    return {scrollWidth:root.scrollWidth,clientWidth,offenders};
  });
  expect(metrics.scrollWidth,`horizontal overflow diagnostics: ${JSON.stringify(metrics.offenders)}`).toBeLessThanOrEqual(metrics.clientWidth+1);
  expect(errors).toEqual([]);
});