/* KHONCHAIHERB revenue core v1.0
 * Consolidated revenue behavior only. Do not create another tshop-v* layer.
 */
(()=>{
  const STORAGE='kch-checkout-recovery-session-v1';
  const state={timer:0,disabledUntil:0,lastFingerprint:'',fetchPatched:false};
  const now=()=>Date.now();
  const readKey=()=>{try{return localStorage.getItem(STORAGE)||''}catch{return ''}};
  const writeKey=v=>{try{if(v)localStorage.setItem(STORAGE,v);else localStorage.removeItem(STORAGE)}catch{}};
  const page=()=>typeof current!=='undefined'?String(current||''):'';
  const lines=()=>typeof cart!=='undefined'&&Array.isArray(cart)?cart.map(x=>({id:Number(x.id),variantId:Number(x.variantId)||null,qty:Math.max(1,Math.min(20,Number(x.qty)||1))})).filter(x=>Number.isInteger(x.id)&&x.id>0):[];
  const consent=()=>Boolean(document.querySelector('#marketing-consent')?.checked);
  const fingerprint=items=>JSON.stringify(items.map(x=>[x.id,x.variantId||0,x.qty]));

  async function send(payload){
    if(now()<state.disabledUntil)return null;
    try{
      const r=await fetch('/api/checkout-session',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload),credentials:'same-origin',cache:'no-store'});
      if(r.status===503){state.disabledUntil=now()+30*60*1000;return null}
      if(!r.ok)return null;
      const data=await r.json().catch(()=>null);if(data?.sessionKey)writeKey(data.sessionKey);return data;
    }catch{return null}
  }

  async function sync(force=false){
    const p=page();if(!['cart','checkout'].includes(p))return;
    const items=lines();if(!items.length)return;
    const fp=`${p}|${consent()?1:0}|${fingerprint(items)}`;if(!force&&fp===state.lastFingerprint)return;state.lastFingerprint=fp;
    await send({sessionKey:readKey()||undefined,items,lastStep:p==='checkout'?'address':'cart',recoveryAllowed:consent(),sourceChannel:'direct'});
  }
  function schedule(force=false){clearTimeout(state.timer);state.timer=setTimeout(()=>sync(force),force?80:650)}

  async function complete(orderNo){
    const key=readKey();if(!key||!orderNo)return;
    const items=lines();await send({sessionKey:key,items:items.length?items:[{id:1,qty:1}],lastStep:'complete',action:'complete',orderNo,recoveryAllowed:false,sourceChannel:'direct'});
    writeKey('');state.lastFingerprint='';
  }

  function patchFetch(){
    if(state.fetchPatched||window.__KCH_REVENUE_FETCH_PATCHED__)return;state.fetchPatched=true;window.__KCH_REVENUE_FETCH_PATCHED__=true;
    const native=window.fetch.bind(window);
    window.fetch=async function(input,init){
      const url=typeof input==='string'?input:input?.url||'',method=String(init?.method||(typeof input!=='string'?input?.method:'GET')||'GET').toUpperCase();
      const response=await native(input,init);
      if(method==='POST'&&/\/api\/orders(?:\?|$)/.test(url)&&response.ok){
        response.clone().json().then(data=>{if(data?.ok&&data?.orderNo)complete(data.orderNo)}).catch(()=>{});
      }
      return response;
    };
  }

  patchFetch();
  new MutationObserver(()=>schedule(false)).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  document.addEventListener('input',e=>{if(e.target?.closest?.('.checkout-form')||e.target?.id==='marketing-consent')schedule(false)},true);
  document.addEventListener('change',e=>{if(e.target?.closest?.('.checkout-form')||e.target?.id==='marketing-consent')schedule(true)},true);
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-add],[data-buy],[data-place],[data-go]'))schedule(true)},true);
  window.addEventListener('load',()=>schedule(true),{once:true});
})();
