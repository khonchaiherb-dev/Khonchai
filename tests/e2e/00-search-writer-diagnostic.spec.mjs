import {test,expect} from '@playwright/test';

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

async function installEarlySearchDiagnostic(page){
  await page.addInitScript(()=>{
    const watched=new Set(['beforeinput','input','change','search']);
    const diag=window.__KCH_E2E_SEARCH_WRITER_DIAG__={writes:[],events:[],registrations:[]};
    const shortStack=()=>String(new Error().stack||'').split('\n').slice(1,9).map(x=>x.trim());
    const isSearch=target=>Boolean(target?.matches?.('.tshop-searchbox input,#kch-v134-search'));
    const push=(key,value,limit=240)=>{
      diag[key].push(value);
      if(diag[key].length>limit)diag[key].shift();
    };

    // Register this listener before any storefront script so stopImmediatePropagation
    // from later window/document handlers cannot hide the browser event from us.
    const nativeAdd=EventTarget.prototype.addEventListener;
    const record=(scope,type,event)=>{
      const target=event.target;
      if(!isSearch(target))return;
      push('events',{
        at:Math.round(performance.now()*10)/10,
        scope,
        type,
        value:String(target.value??''),
        trusted:event.isTrusted,
        inputType:event.inputType||'',
        data:event.data??null,
        focused:document.activeElement===target,
        phase:event.eventPhase,
        authority:window.__KCH_SEARCH_AUTHORITY_API__?.get?.()??null,
        master:window.__KCH_MASTER_SEARCH__?.get?.()??window.__KCH_MASTER_SEARCH__?.query??null
      });
    };
    for(const type of watched){
      nativeAdd.call(window,type,event=>record('window-earliest',type,event),true);
    }

    // Record every later listener registration on window/document for the search
    // event family, including the script stack where it was registered.
    EventTarget.prototype.addEventListener=function(type,listener,options){
      if(watched.has(String(type))&&(this===window||this===document)){
        const capture=options===true||Boolean(options&&typeof options==='object'&&options.capture);
        push('registrations',{
          at:Math.round(performance.now()*10)/10,
          target:this===window?'window':'document',
          type:String(type),
          capture,
          stack:shortStack()
        },320);
      }
      return nativeAdd.call(this,type,listener,options);
    };

    const proto=HTMLInputElement.prototype;
    const descriptor=Object.getOwnPropertyDescriptor(proto,'value');
    if(descriptor?.get&&descriptor?.set){
      Object.defineProperty(proto,'value',{
        configurable:descriptor.configurable,
        enumerable:descriptor.enumerable,
        get:descriptor.get,
        set(value){
          if(isSearch(this)){
            push('writes',{
              at:Math.round(performance.now()*10)/10,
              id:this.id||'',
              value:String(value??''),
              connected:this.isConnected,
              focused:document.activeElement===this,
              authority:window.__KCH_SEARCH_AUTHORITY_API__?.get?.()??null,
              master:window.__KCH_MASTER_SEARCH__?.get?.()??window.__KCH_MASTER_SEARCH__?.query??null,
              stack:shortStack()
            });
          }
          return descriptor.set.call(this,value);
        }
      });
    }
  });
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear())});

test('diagnose search input value writer',async({page})=>{
  await mockStore(page);
  await installEarlySearchDiagnostic(page);
  await page.goto('/?flagship=master',{waitUntil:'domcontentloaded'});
  await page.addStyleTag({path:'public/tshop-v131-top-conversion.css'});
  await page.addScriptTag({path:'public/kch-top-conversion.js'});
  await page.addStyleTag({path:'public/tshop-v132-conversion-storefront.css'});
  await page.addStyleTag({path:'public/tshop-v1321-search-visibility-fix.css'});
  await page.addScriptTag({path:'public/kch-conversion-storefront.js'});

  const search=page.locator('.tshop-searchbox input');
  await expect(search).toHaveCount(1);
  await search.evaluate(el=>{el.dataset.kchE2eSearchNode='diagnostic'});

  await page.addScriptTag({path:'public/kch-search-authority.js'});
  await expect.poll(()=>page.evaluate(()=>window.__KCH_SEARCH_AUTHORITY__)).toBe('1.0.9');
  await expect.poll(()=>page.evaluate(()=>window.__KCH_SEARCH_AUTHORITY_API__?.build)).toBe('1.0.9');

  await search.fill('ชารางจืด');
  await page.waitForTimeout(1200);
  const diag=await page.evaluate(()=>({
    value:document.querySelector('.tshop-searchbox input')?.value??null,
    sameNode:document.querySelector('.tshop-searchbox input')?.dataset?.kchE2eSearchNode||null,
    authority:window.__KCH_SEARCH_AUTHORITY_API__?.get?.()??null,
    master:window.__KCH_MASTER_SEARCH__?.get?.()??window.__KCH_MASTER_SEARCH__?.query??null,
    writes:window.__KCH_E2E_SEARCH_WRITER_DIAG__?.writes||[],
    events:window.__KCH_E2E_SEARCH_WRITER_DIAG__?.events||[],
    registrations:window.__KCH_E2E_SEARCH_WRITER_DIAG__?.registrations||[]
  }));
  console.log(`KCH_SEARCH_WRITER_DIAG=${JSON.stringify(diag)}`);
  expect(diag.value,`KCH_SEARCH_WRITER_DIAG=${JSON.stringify(diag)}`).toBe('ชารางจืด');
  expect(diag.authority,`KCH_SEARCH_WRITER_DIAG=${JSON.stringify(diag)}`).toBe('ชารางจืด');
});