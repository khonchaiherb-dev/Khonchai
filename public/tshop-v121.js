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
function kchV121SyncVerifiedUi(){
  const socialReady=kchV121HasVerifiedSocial();
  if(!socialReady){
    document.querySelectorAll('.v05-creator-section').forEach(el=>el.remove());
    document.querySelectorAll('[data-v05-nav="live"],.v05-video-nav,[data-live-nav],[data-live-jump]').forEach(el=>el.hidden=true);
    document.querySelectorAll('#live,.v05-live-page,.v05-video-page').forEach(el=>el.hidden=true);
  }
  // The legacy Flash Sale countdown is not backed by a verified promotion API.
  // Keep it off the customer surface until an actual promotion window is returned by the server.
  document.querySelectorAll('#deals,[data-scroll-deals]').forEach(el=>el.hidden=true);
}
function kchV121ApplyVerifiedDataGate(){
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
