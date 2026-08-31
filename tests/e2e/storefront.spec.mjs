import {test,expect} from '@playwright/test';

const products=[
  {id:1,slug:'rang-jued-tea',sku:'KCH-TEA-001',name:'ชารางจืดดีท็อกซ์',description:'ใบคัดคุณภาพ กลิ่นหอม ดื่มง่าย',category:'ชาสมุนไพร',price:189,compare_at_price:259,rating:4.9,sold_count:1248,stock:86,featured:1,image_url:null},
  {id:2,slug:'herbal-balm',sku:'KCH-BALM-001',name:'ยาหม่องสมุนไพรสูตรเข้มข้น',description:'กลิ่นสมุนไพรสดชื่น',category:'ดูแลร่างกาย',price:149,compare_at_price:199,rating:4.8,sold_count:938,stock:120,featured:1,image_url:null}
];
const coupons=[{code:'WELCOME50',type:'fixed',value:50,min_spend:499,max_discount:50,new_customer_only:1}];

async function mockCommerce(page,state){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/**',async route=>{
    const req=route.request(),u=new URL(req.url()),path=u.pathname,method=req.method();
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products});
    if(path==='/api/coupons')return fulfill({coupons});
    if(path==='/api/product-detail')return fulfill({product:{...products[0],available_stock:86,variants:[{id:101,product_id:1,sku:'KCH-TEA-001-STD',option_name:'ขนาด',option_value:'มาตรฐาน',price:189,compare_at_price:259,stock:86,reserved_stock:0,available_stock:86,active:1}],media:[],reviewSummary:{count:0,average:0}}});
    if(path==='/api/customer/me'||path==='/api/customer/favorites'||path==='/api/customer/personalized'||path==='/api/customer/recent'||path==='/api/customer/rewards')return fulfill({authenticated:false},401);
    if(path==='/api/recommendations')return fulfill({products});
    if(path==='/api/social-feed')return fulfill({items:[],creators:[]});
    if(path==='/api/commerce-event'&&method==='POST')return fulfill({ok:true});
    if(path==='/api/orders'&&method==='POST'){
      state.orderPayload=JSON.parse(req.postData()||'{}');
      return fulfill({orderNo:'KCH-E2E-0001',subtotal:189,discount:0,shipping:45,total:234,paymentStatus:'unpaid',fulfillmentStatus:'pending',status:'pending',attribution:{source:'shop'}});
    }
    return fulfill({ok:true});
  });
}

async function installMobileTouchTrace(page){
  await page.evaluate(()=>{
    window.__kchTouchTrace=[];
    const describe=target=>{
      const el=target&&target.nodeType===1?target:null;
      const card=el?.closest?.('.tshop-card[data-product]');
      return {tag:el?.tagName||null,className:typeof el?.className==='string'?el.className:null,product:card?.dataset?.product||null};
    };
    const viewport=()=>({scrollX:window.scrollX,scrollY:window.scrollY,innerWidth:window.innerWidth,innerHeight:window.innerHeight,visualViewport:window.visualViewport?{offsetLeft:visualViewport.offsetLeft,offsetTop:visualViewport.offsetTop,pageLeft:visualViewport.pageLeft,pageTop:visualViewport.pageTop,width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale}:null});
    const state=()=>({current:typeof current!=='undefined'?current:null,hotfix:window.__KCH_INTERACTION_HOTFIX__||null,build:document.documentElement.dataset.kchBuild||null,productType:typeof product,pdp:!!document.querySelector('.pdp-title'),...viewport()});
    const record=e=>{const t=e.changedTouches?.[0]||e.touches?.[0]||null;window.__kchTouchTrace.push({type:e.type,...describe(e.target),pointerType:e.pointerType||null,pointerId:e.pointerId??null,clientX:t?.clientX??e.clientX??null,clientY:t?.clientY??e.clientY??null,touches:e.touches?.length??null,changedTouches:e.changedTouches?.length??null,defaultPrevented:e.defaultPrevented,...state()})};
    ['touchstart','touchmove','touchend','touchcancel','pointerdown','pointermove','pointerup','pointercancel','click'].forEach(type=>document.addEventListener(type,record,true));
    window.__kchTouchTrace.push({type:'trace-installed',...state()});
  });
}

async function readMobileTouchTrace(page){
  return page.evaluate(()=>({events:Array.isArray(window.__kchTouchTrace)?window.__kchTouchTrace:[],final:{current:typeof current!=='undefined'?current:null,hotfix:window.__KCH_INTERACTION_HOTFIX__||null,build:document.documentElement.dataset.kchBuild||null,productType:typeof product,pdp:!!document.querySelector('.pdp-title'),bodyClass:document.body.className||null,scrollX:window.scrollX,scrollY:window.scrollY,innerWidth:window.innerWidth,innerHeight:window.innerHeight,visualViewport:window.visualViewport?{offsetLeft:visualViewport.offsetLeft,offsetTop:visualViewport.offsetTop,pageLeft:visualViewport.pageLeft,pageTop:visualViewport.pageTop,width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale}:null}}));
}

async function tapVisualViewport(page,locator,label='element'){
  const point=await locator.evaluate(async(el,name)=>{
    const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    let previous=null;
    for(let attempt=0;attempt<24;attempt++){
      el.scrollIntoView({block:'center',inline:'nearest'});await frames();
      const r=el.getBoundingClientRect(),geometry=[r.left,r.top,r.width,r.height],stable=previous&&geometry.every((v,i)=>Math.abs(v-previous[i])<1);previous=geometry;
      if(r.width>0&&r.height>0&&stable){
        const candidates=[[r.left+r.width*.5,r.top+r.height*.5],[r.left+r.width*.5,r.top+r.height*.68],[r.left+r.width*.5,r.top+r.height*.32],[r.left+r.width*.28,r.top+r.height*.5],[r.left+r.width*.72,r.top+r.height*.5]];
        for(const [x,y] of candidates){
          if(x<1||y<1||x>=innerWidth-1||y>=innerHeight-1)continue;
          const hit=document.elementFromPoint(x,y);
          if(hit&&(hit===el||el.contains(hit))){
            const vv=window.visualViewport,offsetX=vv?.offsetLeft||0,offsetY=vv?.offsetTop||0;
            return {label:name,x,y,inputX:x-offsetX,inputY:y-offsetY,scrollX:window.scrollX||0,scrollY:window.scrollY||0,hit:typeof hit.className==='string'?hit.className:hit.tagName,rect:geometry,layoutViewport:[innerWidth,innerHeight],visualViewport:vv?{offsetLeft:vv.offsetLeft,offsetTop:vv.offsetTop,pageLeft:vv.pageLeft,pageTop:vv.pageTop,width:vv.width,height:vv.height,scale:vv.scale}:null};
          }
        }
      }
      await wait(35);
    }
    const r=el.getBoundingClientRect(),x=Math.max(1,Math.min(innerWidth-2,r.left+r.width/2)),y=Math.max(1,Math.min(innerHeight-2,r.top+r.height/2)),hit=document.elementFromPoint(x,y);
    throw new Error(`mobile ${name} has no stable touch hit target: rect=${JSON.stringify([r.left,r.top,r.width,r.height])} viewport=${innerWidth}x${innerHeight} visual=${JSON.stringify(window.visualViewport?{offsetTop:visualViewport.offsetTop,width:visualViewport.width,height:visualViewport.height}:null)} hit=${hit?.className||hit?.tagName||'none'}`);
  },label);
  const visualWidth=point.visualViewport?.width||point.layoutViewport?.[0]||0,visualHeight=point.visualViewport?.height||point.layoutViewport?.[1]||0;
  if(!(point.inputX>0&&point.inputY>0&&point.inputX<visualWidth&&point.inputY<visualHeight))throw new Error(`mobile ${label} visual-viewport coordinate invalid: ${JSON.stringify(point)}`);
  await page.touchscreen.tap(point.inputX,point.inputY);return point;
}

async function activate(page,locator,viewport,label){
  if(viewport.width<=390)return tapVisualViewport(page,locator,label);
  await locator.click();return null;
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear())});

test('browse → variant-safe cart → checkout → COD confirmation on real browser',async({page},testInfo)=>{
  const state={orderPayload:null};await mockCommerce(page,state);await page.goto('/?e2e=stability',{waitUntil:'domcontentloaded'});await expect(page.locator('#product-grid [data-product]').first()).toBeVisible();
  const viewport=page.viewportSize(),shell=await page.locator('.shell').first().boundingBox();expect(shell).not.toBeNull();expect(shell.width).toBeLessThanOrEqual(viewport.width+1);
  if(viewport.width>=1024){expect(shell.width).toBeGreaterThan(900);await expect(page.locator('.v115-desktop-nav')).toBeVisible();await expect(page.locator('nav.tshop-bottom')).toBeHidden()}else{await expect(page.locator('nav.tshop-bottom')).toBeVisible();expect(shell.width).toBeGreaterThan(viewport.width*0.9)}

  const productCard=page.locator('#product-grid [data-product="rang-jued-tea"]'),productTitle=productCard.locator('.tshop-card-title');await expect(productCard.locator('.tshop-card-info')).toBeVisible();await expect(productTitle).toContainText('ชารางจืดดีท็อกซ์');
  if(viewport.width<=390){
    await installMobileTouchTrace(page);
    const touchPoint=await tapVisualViewport(page,productCard,'product-card');
    await testInfo.attach('mobile-touch-hit',{body:Buffer.from(JSON.stringify(touchPoint,null,2)),contentType:'application/json'});await page.waitForTimeout(180);
    const trace=await readMobileTouchTrace(page);await testInfo.attach('mobile-touch-trace',{body:Buffer.from(JSON.stringify(trace,null,2)),contentType:'application/json'});
    if(!trace.final.pdp)throw new Error(`mobile visual-viewport touch did not open PDP: ${JSON.stringify({touchPoint,trace})}`);
  }else await productCard.click();

  await expect(page.locator('.pdp-title')).toContainText('ชารางจืด');await expect(page.locator('[data-v17-variant="101"]')).toBeVisible();
  await activate(page,page.locator('button[data-add="1"]:visible').last(),viewport,'add-to-cart');
  await expect(page.locator('header .badge').first()).toHaveText('1');
  await activate(page,page.locator('header button[data-go="cart"]'),viewport,'open-cart');
  await expect(page.locator('.page-title')).toHaveText('ตะกร้าสินค้า');await expect(page.locator('.v17-line-variant')).toContainText('มาตรฐาน');
  await activate(page,page.locator('button[data-go="checkout"]:visible').last(),viewport,'open-checkout');
  await expect(page.locator('#customer-name')).toBeVisible();await page.locator('#customer-name').fill('ผู้ทดสอบระบบ');await page.locator('#customer-phone').fill('0812345678');await page.locator('#customer-address').fill('99 หมู่ 1 ถนนทดสอบ');if(await page.locator('#customer-subdistrict').count())await page.locator('#customer-subdistrict').fill('ในเมือง');await page.locator('#customer-district').fill('เมือง');await page.locator('#customer-province').fill('อุบลราชธานี');await page.locator('#customer-postal').fill('34000');await expect(page.locator('input[name="pay"][value="COD"]')).toBeChecked();
  await activate(page,page.locator('[data-place]'),viewport,'place-cod-order');
  await expect(page.getByRole('heading',{name:'สั่งซื้อสำเร็จ'})).toBeVisible();await expect(page.getByText('KCH-E2E-0001')).toBeVisible();expect(state.orderPayload).not.toBeNull();expect(state.orderPayload.paymentMethod).toBe('COD');expect(state.orderPayload.items?.[0]?.variantId).toBe(101);expect(String(state.orderPayload.idempotencyKey||'').length).toBeGreaterThan(10);await testInfo.attach('viewport',{body:Buffer.from(JSON.stringify(viewport)),contentType:'application/json'});
});
