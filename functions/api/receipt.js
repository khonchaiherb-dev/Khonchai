function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
const digits=s=>String(s||'').replace(/\D/g,'');
export async function onRequestGet({env,request}){
  if(!env.DB) return json({error:'database_not_bound'},503);
  const url=new URL(request.url),no=String(url.searchParams.get('orderNo')||'').trim(),phone=digits(url.searchParams.get('phone'));
  if(!no||phone.length<9) return json({error:'order_verification_required'},400);
  const order=await env.DB.prepare("SELECT id,order_no,total,payment_method,payment_status FROM orders WHERE order_no=? AND REPLACE(REPLACE(REPLACE(phone,'-',''),' ',''),'+66','0')=?").bind(no,phone).first();
  if(!order) return json({error:'order_not_found'},404);
  const eligible=order.payment_status==='paid'||order.payment_status==='cod_collected';
  if(!eligible) return json({eligible:false,status:order.payment_status,message:'ใบเสร็จออกได้เมื่อชำระเงินสำเร็จหรือรับเงิน COD สำเร็จแล้ว'});
  let receipt=await env.DB.prepare("SELECT receipt_no,amount,issued_at FROM receipts WHERE order_id=?").bind(order.id).first();
  if(!receipt){const receiptNo=`RC${new Date().toISOString().replace(/\D/g,'').slice(2,14)}${order.id}`;receipt=await env.DB.prepare("INSERT INTO receipts(order_id,receipt_no,amount) VALUES(?,?,?) RETURNING receipt_no,amount,issued_at").bind(order.id,receiptNo,order.total).first()}
  return json({eligible:true,orderNo:order.order_no,...receipt});
}
