export async function onRequestGet({env,request}){
  if(!env.DB) return Response.json({error:'database_not_bound'},{status:503});
  const no=new URL(request.url).searchParams.get('orderNo');
  if(!no) return Response.json({error:'order_no_required'},{status:400});
  const order=await env.DB.prepare("SELECT id,order_no,total,payment_method,payment_status FROM orders WHERE order_no=?").bind(no).first();
  if(!order) return Response.json({error:'order_not_found'},{status:404});
  const eligible=order.payment_status==='paid' || order.payment_status==='cod_collected';
  if(!eligible) return Response.json({eligible:false,status:order.payment_status,message:'ใบเสร็จออกได้เมื่อชำระเงินสำเร็จหรือรับเงิน COD สำเร็จแล้ว'});
  let receipt=await env.DB.prepare("SELECT receipt_no,amount,issued_at FROM receipts WHERE order_id=?").bind(order.id).first();
  if(!receipt){
    const receiptNo=`RC${new Date().toISOString().replace(/\D/g,'').slice(2,14)}${order.id}`;
    receipt=await env.DB.prepare("INSERT INTO receipts(order_id,receipt_no,amount) VALUES(?,?,?) RETURNING receipt_no,amount,issued_at").bind(order.id,receiptNo,order.total).first();
  }
  return Response.json({eligible:true,orderNo:order.order_no,...receipt},{headers:{'Cache-Control':'no-store'}});
}
