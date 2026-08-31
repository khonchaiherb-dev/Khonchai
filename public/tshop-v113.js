/* KHONCHAIHERB Commerce v1.13 — member reward wallet and retention center */
let V113_REWARDS=[],V113_REWARD_SUMMARY={active:0,used:0,expired:0,activeValue:0},V113_REWARDS_AT=0,V113_REWARD_REQUEST=0;
const v113FmtDate=s=>{if(!s)return '';try{const raw=String(s),d=new Date(raw.includes('T')?raw:`${raw.replace(' ','T')}Z`);return new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'}).format(d)}catch{return String(s)}};
function v113RewardStatus(r){return ['active','used','expired','scheduled'].includes(String(r?.status))?String(r.status):'expired'}
function v113ApplyServerRewards(data){
  V113_REWARDS=Array.isArray(data?.rewards)?data.rewards:[];V113_REWARD_SUMMARY=data?.summary||{active:0,used:0,expired:0,activeValue:0};V113_REWARDS_AT=Date.now();
  const active=V113_REWARDS.filter(r=>v113RewardStatus(r)==='active').map(r=>({code:r.code,type:r.type||'fixed',value:Number(r.value||0),minSpend:Number(r.minSpend||0),maxDiscount:r.maxDiscount==null?Number(r.value||0):Number(r.maxDiscount),expiresAt:r.expiresAt||null}));
  if(typeof V112_REWARDS!=='undefined'){V112_REWARDS=active;if(typeof v112SaveRewards==='function')v112SaveRewards()}
  const serverCodes=new Set(active.map(r=>r.code));COUPONS=COUPONS.filter(c=>!String(c.code||'').startsWith('RVW'));
  claimed=claimed.filter(code=>!String(code).startsWith('RVW')||serverCodes.has(String(code)));
  for(const r of active){if(!COUPONS.some(c=>c.code===r.code))COUPONS.push({code:r.code,type:r.type,value:r.value,min_spend:r.minSpend,max_discount:r.maxDiscount,new_customer_only:0,label:'คูปองขอบคุณสำหรับรีวิว'});if(!claimed.includes(r.code))claimed.push(r.code)}
  if(String(activeCoupon||'').startsWith('RVW')&&!serverCodes.has(activeCoupon)){activeCoupon='';localStorage.removeItem('kch-active-coupon')}
  saveCoupons();return data;
}
async function v113LoadRewards(force=false){
  const req=++V113_REWARD_REQUEST,me=await v08LoadMe(force).catch(()=>null);if(!me?.authenticated)return null;
  if(!force&&V113_REWARDS_AT&&Date.now()-V113_REWARDS_AT<30000)return {rewards:V113_REWARDS,summary:V113_REWARD_SUMMARY};
  const data=await v08CustomerFetch('/api/customer/rewards').catch(()=>null);if(req!==V113_REWARD_REQUEST||!data)return null;return v113ApplyServerRewards(data);
}
function v113RewardCard(r){const status=v113RewardStatus(r),labels={active:'พร้อมใช้',used:'ใช้แล้ว',expired:'หมดอายุ',scheduled:'รอเปิดใช้'},cls=`status-${status}`;return `<article class="v113-reward ${cls}"><div class="v113-reward-main"><span class="v113-reward-value">${M(r.value)}</span><div><b>คูปองจากรีวิว ${esc(r.productName||'สินค้า')}</b><small>ขั้นต่ำ ${M(r.minSpend||0)}${r.expiresAt?` • ถึง ${esc(v113FmtDate(r.expiresAt))}`:''}</small><code>${esc(r.code)}</code></div><i>${labels[status]}</i></div>${status==='active'?`<button data-v113-use-reward="${esc(r.code)}">ใช้คูปอง</button>`:status==='used'?`<small class="v113-used-note">${r.redeemedOrderNo?`ใช้กับ ${esc(r.redeemedOrderNo)}`:'ใช้สิทธิ์แล้ว'}${r.redeemedAt?` • ${esc(v113FmtDate(r.redeemedAt))}`:''}</small>`:''}</article>`}
function v113MountWallet(me,data){
  if(current!=='account'||!me?.authenticated)return;document.querySelector('.v113-retention')?.remove();const menu=document.querySelector('.acctmenu'),profile=document.querySelector('.v08-profile');if(!menu&&!profile)return;
  const rewards=data?.rewards||[],summary=data?.summary||{},active=rewards.filter(r=>r.status==='active'),history=rewards.filter(r=>r.status!=='active');
  const html=`<section class="v113-retention"><div class="v113-retention-head"><div>${I('workspace_premium')}<span><b>สิทธิ์และรางวัลของฉัน</b><small>ซิงก์กับบัญชี KHONCHAIHERB ใช้ได้ทุกอุปกรณ์</small></span></div><button data-v113-refresh>${I('refresh')}</button></div><div class="v113-metrics"><div><b>${Number(summary.active||0)}</b><span>คูปองพร้อมใช้</span></div><div><b>${M(summary.activeValue||0)}</b><span>มูลค่าสิทธิ์</span></div><div><b>${Number(me.summary?.orders||0)}</b><span>ออเดอร์ทั้งหมด</span></div></div><div class="v113-reward-head"><b>คูปองจากการรีวิว</b><button data-go="orders">ดูออเดอร์เพื่อรีวิว ›</button></div><div class="v113-reward-list">${active.length?active.map(v113RewardCard).join(''):'<div class="v113-empty-reward">'+I('redeem')+'<span><b>ยังไม่มีคูปองรีวิวที่พร้อมใช้</b><small>เมื่อได้รับสินค้าแล้ว รีวิวสินค้าที่ซื้อจริงเพื่อรับสิทธิ์ครั้งถัดไป</small></span></div>'}</div>${history.length?`<details class="v113-history"><summary>ประวัติคูปอง ${history.length} รายการ</summary><div>${history.slice(0,12).map(v113RewardCard).join('')}</div></details>`:''}</section>`;
  (menu||profile).insertAdjacentHTML(menu?'beforebegin':'afterend',html);bind();bindV113();
}
const v113AccountBase=account;
account=async function(){await v113AccountBase();if(current!=='account'||!V08_ME?.authenticated)return;const anchor=document.querySelector('.acctmenu')||document.querySelector('.v08-account');if(anchor&&!document.querySelector('.v113-loading'))anchor.insertAdjacentHTML('beforebegin','<section class="v113-loading">'+I('progress_activity')+'<span>กำลังซิงก์สิทธิ์ของคุณ...</span></section>');const data=await v113LoadRewards(true);document.querySelector('.v113-loading')?.remove();if(data&&current==='account')v113MountWallet(V08_ME,data)};
function v113UseReward(code){const hit=V113_REWARDS.find(r=>r.code===code&&r.status==='active');if(!hit){toast('คูปองนี้ไม่พร้อมใช้งานแล้ว');return}activeCoupon=code;localStorage.setItem('kch-active-coupon',code);toast('เลือกคูปองรีวิวแล้ว');cart.length?cartPage():home()}
function bindV113(){document.querySelector('[data-v113-refresh]')?.addEventListener('click',async()=>{const d=await v113LoadRewards(true);if(d&&current==='account')v113MountWallet(V08_ME,d)},{once:true})}
const v113BindBase=typeof bind==='function'?bind:null;
bind=function(){if(v113BindBase)v113BindBase();bindV113()};
document.addEventListener('click',e=>{const use=e.target.closest?.('[data-v113-use-reward]');if(use){e.preventDefault();v113UseReward(use.dataset.v113UseReward)}},true);
setTimeout(()=>v113LoadRewards(false).catch(()=>{}),0);
window.__KCH_V113_REWARD_HELPERS__={status:v113RewardStatus,apply:v113ApplyServerRewards,fmtDate:v113FmtDate};
