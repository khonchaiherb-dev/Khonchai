function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
const digits=s=>String(s||'').replace(/\D/g,'');
function phones(value){const d=digits(value);if(d.startsWith('66')&&d.length>=11){const local=`0${d.slice(2)}`;return [local,d]}if(d.startsWith('0')&&d.length>=9)return [d,`66${d.slice(1)}`];return [d,d]}
export async function onRequestGet({env,request}){
  if(!env.DB) return json({error:'database_not_bound'},503);
  const url=new URL(request.url),no=String(url.searchParams.get('orderNo')||'').trim(),[phoneLocal,phoneIntl]=phones(url.searchParams.get('phone'));
  if(!no||phoneLocal.length<9) return json({error:'order_verification_required'},400);
  const order=await env.DB.prepare("SELECT id,order_no,total,payment_method,payment_status FROM orders WHERE order_no=? AND phone IN (?,?)").bind(no,phoneLocal,phoneIntl).first();
  if(!order) return json({error:'order_not_found'},404);
  const eligible=order.payment_status==='paid'||order.payment_status==='cod_collected';
  if(!eligible) return json({eligible:false,status:order.payment_status,message:'ใบเสร็จออกได้เมื่อชำระเงินสำเร็จหรือรับเงิน COD สำเร็จแล้ว'});
  let receipt=await env.DB.prepare("SELECT receipt_no,amount,issued_at FROM receipts WHERE order_id=?").bind(order.id).first();
  if(!receipt){const receiptNo=`RC${new Date().toISOString().replace(/\D/g,'').slice(2,14)}${order.id}`;receipt=await env.DB.prepare("INSERT INTO receipts(order_id,receipt_no,amount) VALUES(?,?,?) RETURNING receipt_no,amount,issued_at").bind(order.id,receiptNo,order.total).first()}
  return json({eligible:true,orderNo:order.order_no,...receipt});
}
