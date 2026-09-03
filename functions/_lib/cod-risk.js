const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));

export function codRiskLevel(score){
  const n=clamp(score,0,100);
  return n>=70?'high':n>=40?'medium':'low';
}
export function codRiskDecision(score){
  const level=codRiskLevel(score);
  return level==='high'?'review':'allow';
}

/**
 * Explainable, conservative COD risk policy.
 * It intentionally never returns `block`; manual review is the strongest v1 action.
 */
export function assessCodRisk(input={}){
  let score=0;
  const reasons=[];
  const add=(points,code,label,detail={})=>{score+=points;reasons.push({code,label,points,...detail})};
  const subtract=(points,code,label,detail={})=>{score-=points;reasons.push({code,label,points:-points,...detail})};

  const total=Math.max(0,Number(input.total)||0);
  const priorOrders=Math.max(0,Number(input.priorOrders)||0);
  const deliveredOrders=Math.max(0,Number(input.deliveredOrders)||0);
  const codSettled=Math.max(0,Number(input.codSettled)||0);
  const cancelledOrders=Math.max(0,Number(input.cancelledOrders)||0);
  const returnRequests=Math.max(0,Number(input.returnRequests)||0);
  const recentOrders24h=Math.max(0,Number(input.recentOrders24h)||0);
  const sameAddressRecent=Math.max(0,Number(input.sameAddressRecent)||0);
  const phoneDigits=String(input.phone||'').replace(/\D/g,'');
  const postal=String(input.postalCode||'').trim();
  const addressLength=String(input.addressLine||'').trim().length;

  if(total>=3000)add(18,'high_value','ยอด COD สูง', {value:total});
  else if(total>=1500)add(10,'elevated_value','ยอด COD ค่อนข้างสูง',{value:total});

  if(phoneDigits.length<9)add(25,'phone_invalid','หมายเลขโทรศัพท์ไม่ครบ');
  if(!/^\d{5}$/.test(postal))add(18,'postal_invalid','รหัสไปรษณีย์ไม่ครบ 5 หลัก');
  if(addressLength<8)add(12,'address_short','รายละเอียดที่อยู่สั้นเกินไป');

  if(recentOrders24h>=4)add(20,'order_velocity','มีหลายคำสั่งซื้อใน 24 ชั่วโมง',{count:recentOrders24h});
  else if(recentOrders24h>=2)add(8,'order_velocity_watch','มีคำสั่งซื้อซ้ำใน 24 ชั่วโมง',{count:recentOrders24h});
  if(sameAddressRecent>=4)add(12,'address_velocity','ที่อยู่เดียวกันมีคำสั่งซื้อหลายรายการ',{count:sameAddressRecent});

  if(priorOrders>=2&&cancelledOrders/priorOrders>=0.5)add(20,'cancellation_history','ประวัติยกเลิกคำสั่งซื้อสูง',{cancelled:cancelledOrders,prior:priorOrders});
  if(priorOrders>=2&&returnRequests/priorOrders>=0.5)add(12,'return_history','ประวัติขอคืนสินค้าสูง',{returns:returnRequests,prior:priorOrders});

  if(deliveredOrders>=1)subtract(12,'delivered_history','มีประวัติรับสินค้าสำเร็จ',{count:deliveredOrders});
  if(codSettled>=1)subtract(18,'cod_settled_history','มีประวัติ COD กระทบยอดสำเร็จ',{count:codSettled});
  if(codSettled>=3)subtract(8,'repeat_cod_success','มีประวัติ COD สำเร็จหลายครั้ง',{count:codSettled});

  score=clamp(score,0,100);
  return {score,riskLevel:codRiskLevel(score),decision:codRiskDecision(score),reasons,policyVersion:'v1-advisory'};
}
