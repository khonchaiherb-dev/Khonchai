/* KHONCHAIHERB Commerce v1.2.1 — verified runtime data gate + packing verification UX */
const KCH_V121_DEMO_PRODUCTS=new Map([
  [1,{price:189,sold:1248,name:'ชารางจืดคัดพิเศษ'}],
  [2,{price:149,sold:938,name:'บาล์มสมุนไพรสูตรเข้มข้น'}],
  [3,{price:459,sold:524,name:'ชุดสมุนไพรดูแลสุขภาพ'}],
  [4,{price:99,sold:2201,name:'เครื่องดื่มสมุนไพรสูตรดั้งเดิม'}],
  [5,{price:129,sold:781,name:'ลูกประคบสมุนไพร'}],
  [6,{price:699,sold:194,name:'กล่องของขวัญ KHONCHAIHERB'}]
]);
const KCH_V121_SOCIAL_SIGNATURES=new Map([
  ['khonchaiherb.official',12800],
  ['khonchaiherb.live',6400],
  ['khonchaiherb.guide',3900]
]);
function kchV121EnsureStyles(){
  if(document.getElementById('kch-v121-data-gate-style'))return;
  const style=document.createElement('style');
  style.id='kch-v121-data-gate-style';
  style.textContent=`
.kch-v121-hidden{display:none!important}

/* Readability standard — customer storefront */
.v118-signature-home{font-size:16px;line-height:1.55}
.v118-signature-home .tshop-searchbox input{font-size:15px!important;line-height:1.45!important}
.v118-signature-home .shop-tabs button{font-size:14px!important;line-height:1.4!important;min-height:44px}
.v118-signature-home .quick-icons button{font-size:13px!important;line-height:1.35!important}
.v118-signature-home .v118-eyebrow{font-size:13px!important}
.v118-signature-home .v118-hero-copy p{font-size:clamp(16px,1.35vw,20px)!important;line-height:1.75!important}
.v118-signature-home .v118-hero-actions button{font-size:15px!important}
.v118-signature-home .v118-hero-trust{font-size:13px!important;line-height:1.5!important}
.v118-signature-home .v118-featured-product>span b{font-size:14px!important;line-height:1.45!important}
.v118-signature-home .v118-featured-product>span small{font-size:16px!important;line-height:1.35!important}
.v118-signature-home .v118-smart-head small{font-size:13px!important;line-height:1.55!important}
.v118-signature-home .v118-smart-head>button{font-size:14px!important}
.v118-signature-home .v118-smart-options b{font-size:14px!important;line-height:1.4!important}
.v118-signature-home .v118-smart-options small{font-size:12.5px!important;line-height:1.5!important}
.v118-signature-home .tshop-card b,.v118-signature-home .tshop-card .name{font-size:15px!important;line-height:1.45!important}
.v118-signature-home .tshop-card small,.v118-signature-home .tshop-meta{font-size:12.5px!important;line-height:1.5!important}
.v118-signature-home button,.v118-signature-home a{line-height:1.4}

/* Product detail + trust */
.v118-signature-pdp{font-size:16px;line-height:1.55}
.v118-signature-pdp .v118-pdp-kicker>span:first-child{font-size:12.5px!important}
.v118-signature-pdp .v118-pdp-kicker .ready,.v118-signature-pdp .v118-pdp-kicker .pending{font-size:12px!important}
.v118-confidence-head small{font-size:13px!important;line-height:1.55!important}
.v118-confidence-grid b{font-size:14px!important}
.v118-confidence-grid small{font-size:12.5px!important;line-height:1.55!important}
.v118-policy-links a{font-size:13px!important}
.kch-pdp-assurance b{font-size:13px!important;line-height:1.4!important}
.kch-pdp-assurance small{font-size:12px!important;line-height:1.5!important}

/* Sale-ready shelf + persistent cart */
.kch-launch-status{font-size:13px!important;line-height:1.45!important}
.kch-launch-status small{font-size:12px!important}
.kch-ready-head span{font-size:12px!important}
.kch-ready-head p{font-size:13px!important;line-height:1.55!important}
.kch-ready-head button{font-size:13px!important}
.kch-ready-copy b{font-size:14px!important;line-height:1.45!important}
.kch-ready-copy small{font-size:16px!important}
.kch-ready-copy em{font-size:12px!important}
.kch-fast-cart-summary b{font-size:14px!important}
.kch-fast-cart-summary small{font-size:12px!important}
.kch-fast-cart-checkout{font-size:14px!important}

/* Checkout legibility */
.checkout-form label,.payment label{font-size:14px!important;line-height:1.45!important}
.checkout-form input,.checkout-form textarea,.checkout-form select{font-size:16px!important;line-height:1.45!important}
.kch-checkout-progress b{font-size:13px!important}
.kch-checkout-progress small{font-size:12px!important;line-height:1.4!important}
.kch-cod-note b{font-size:13px!important}
.kch-cod-note small{font-size:12px!important;line-height:1.55!important}
.kch-system-note{font-size:12.5px!important;line-height:1.45!important}
.kch-buy-hint b{font-size:13px!important}
.kch-buy-hint small{font-size:12px!important;line-height:1.5!important}

@media(max-width:699px){
  .v118-signature-home{font-size:16px}
  .v118-signature-home .shop-tabs button{font-size:14px!important;min-height:46px}
  .v118-signature-home .quick-icons button{font-size:13px!important}
  .v118-signature-home .v118-hero-copy p{font-size:16px!important;line-height:1.7!important}
  .v118-signature-home .v118-hero-trust{font-size:13px!important}
  .v118-signature-home .v118-smart-options b{font-size:14px!important}
  .v118-signature-home .v118-smart-options small{font-size:13px!important}
  .v118-signature-home .tshop-card b,.v118-signature-home .tshop-card .name{font-size:15px!important}
  .v118-signature-pdp{font-size:16px}
  .kch-pdp-assurance b{font-size:13px!important}
  .kch-pdp-assurance small{font-size:12px!important}
  .kch-fast-cart-summary b{font-size:14px!important}
  .kch-fast-cart-summary small{font-size:12px!important}
  .kch-fast-cart-checkout{font-size:14px!important;min-height:46px}
  .kch-checkout-progress b{font-size:13px!important}
  .checkout-form input,.checkout-form textarea,.checkout-form select{min-height:46px}
}
`;
  document.head.appendChild(style);
}
function kchV121Hide(elements){
  elements.forEach(el=>{el.hidden=true;el.classList.add('kch-v121-hidden');el.setAttribute('aria-hidden','true')});
}
function kchV121IsDemoProduct(p){
  const s=KCH_V121_DEMO_PRODUCTS.get(Number(p?.id));
  return Boolean(s&&Number(p?.price)===s.price&&Number(p?.sold??p?.sold_count)===s.sold&&String(p?.name||'')===s.name);
}
function kchV121SocialIsFallback(social){
  const creators=Array.isArray(social?.creators)?social.creators:[];
  return creators.length===KCH_V121_SOCIAL_SIGNATURES.size&&creators.every(c=>KCH_V121_SOCIAL_SIGNATURES.get(String(c?.handle||''))===Number(c?.followers??c?.follower_count));
}
function kchV121HasVerifiedSocial(){
  try{return Boolean(Array.isArray(V05_SOCIAL?.creators)&&V05_SOCIAL.creators.length&&Array.isArray(V05_SOCIAL?.contents)&&V05_SOCIAL.contents.length)}catch{return false}
}
function kchV121HasVerifiedDemandMetrics(){
  try{return (Array.isArray(PRODUCTS)?PRODUCTS:[]).some(p=>Number(p?.sale_verified)===1&&!p?.comingSoon&&(Number(p?.sold??p?.sold_count)>0||Number(p?.rating)>0))}catch{return false}
}
function kchV121SyncCatalogClaims(){
  const hasDemand=kchV121HasVerifiedDemandMetrics();
  const head=document.querySelector('#recommend.recommend-head,.recommend-head#recommend');
  if(head&&!hasDemand)head.textContent='สินค้า';
  const sort=document.querySelector('[data-v116-sort] option[value="popular"]');
  if(sort)sort.textContent=hasDemand?'ยอดนิยม':'แนะนำ';
  const smart=document.querySelector('[data-v118-smart="popular"]');
  if(smart)smart.textContent=hasDemand?'ดูสินค้ายอดนิยม':'ดูสินค้าที่แนะนำ';
}
function kchV121SyncVerifiedUi(){
  kchV121EnsureStyles();
  const socialReady=kchV121HasVerifiedSocial();
  if(!socialReady){
    document.querySelectorAll('.v05-creator-section').forEach(el=>el.remove());
    kchV121Hide(document.querySelectorAll('[data-v05-nav="live"],[data-v05-nav="video"],.v05-video-nav,[data-live-nav],[data-live-jump]'));
    kchV121Hide(document.querySelectorAll('#live,.v05-live-page,.v05-video-page'));
  }
  // The legacy Flash Sale countdown is not backed by a verified promotion API.
  // Keep it off the customer surface until an actual promotion window is returned by the server.
  kchV121Hide(document.querySelectorAll('#deals,[data-scroll-deals]'));
  const couponReady=typeof COUPONS!=='undefined'&&Array.isArray(COUPONS)&&COUPONS.length>0;
  if(!couponReady)kchV121Hide(document.querySelectorAll('[data-scroll-voucher]'));
  kchV121SyncCatalogClaims();
}
function kchV121ApplyVerifiedDataGate(){
  kchV121EnsureStyles();
  try{if(Array.isArray(FALLBACK_PRODUCTS))FALLBACK_PRODUCTS.splice(0,FALLBACK_PRODUCTS.length)}catch{}
  try{if(Array.isArray(PRODUCTS))PRODUCTS=PRODUCTS.filter(p=>!kchV121IsDemoProduct(p))}catch{}
  try{if(Array.isArray(TSHOP_LIVE))TSHOP_LIVE.splice(0,TSHOP_LIVE.length);if(Array.isArray(TSHOP_VIDEOS))TSHOP_VIDEOS.splice(0,TSHOP_VIDEOS.length)}catch{}
  try{
    if(Array.isArray(V05_SOCIAL_FALLBACK?.creators))V05_SOCIAL_FALLBACK.creators.splice(0,V05_SOCIAL_FALLBACK.creators.length);
    if(Array.isArray(V05_SOCIAL_FALLBACK?.contents))V05_SOCIAL_FALLBACK.contents.splice(0,V05_SOCIAL_FALLBACK.contents.length);
    if(kchV121SocialIsFallback(V05_SOCIAL))V05_SOCIAL={creators:[],contents:[]};
  }catch{}
  kchV121SyncVerifiedUi();
}
kchV121ApplyVerifiedDataGate();
if(typeof app!=='undefined'&&app){
  let kchV121Frame=0;
  new MutationObserver(()=>{if(kchV121Frame)return;kchV121Frame=requestAnimationFrame(()=>{kchV121Frame=0;kchV121SyncVerifiedUi()})}).observe(app,{childList:true,subtree:true});
}

if(typeof v11Ship==='function'){
  v11Ship=async function(orderNo){
    const carrier=prompt('บริษัทขนส่ง เช่น Flash / Kerry / ไปรษณีย์ไทย','')||'';
    const trackingNo=prompt('เลขพัสดุ','')||'';
    if(trackingNo.trim().length<5){toast('กรุณากรอกเลขพัสดุจริง');return}
    try{
      await v10AdminFetch('/api/admin/order-action',{method:'POST',body:JSON.stringify({orderNo,action:'shipped',carrier,trackingNo})});
      toast('บันทึกการจัดส่งและตัดสต๊อกจริงแล้ว');
      v11FulfillmentModal();
    }catch(e){
      if(e?.data?.error==='packing_verification_required'){
        const verified=Number(e.data.verifiedQty||0),expected=Number(e.data.expectedQty||0);
        toast(`ต้องตรวจแพ็กให้ครบก่อนส่ง (${verified}/${expected} ชิ้น)`);
        if(typeof v12PackingModal==='function')setTimeout(()=>v12PackingModal(orderNo),180);
        return;
      }
      if(e?.data?.error==='tracking_required'){toast('กรุณากรอกเลขพัสดุจริง');return}
      toast('บันทึกการจัดส่งไม่สำเร็จ');
    }
  };
}
