const money=n=>Math.round((Number(n)||0)*100)/100;
export async function reconcileCod(env,{orderId,shipmentId=null,provider='carrier',providerRef,grossAmount,feeAmount=0,note=null,receivedAt=null}){
  const order=await env.DB.prepare("SELECT id,order_no,total,payment_method,payment_status FROM orders WHERE id=?").bind(orderId).first();
  if(!order)throw new Error('order_not_found');if(order.payment_method!=='COD')throw new Error('not_cod_order');
  const gross=money(grossAmount),fee=money(Math.max(0,Number(feeAmount)||0)),net=money(gross-fee),ref=String(providerRef||'').trim();if(!ref||gross<0)throw new Error('invalid_reconciliation');
  const matched=Math.abs(gross-Number(order.total))<=1,status=matched?'matched':'exception',recv=receivedAt||new Date().toISOString();
  await env.DB.prepare(`INSERT INTO cod_reconciliations(order_id,shipment_id,provider,provider_ref,gross_amount,fee_amount,net_amount,status,note,received_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(provider,provider_ref) DO UPDATE SET gross_amount=excluded.gross_amount,fee_amount=excluded.fee_amount,net_amount=excluded.net_amount,status=excluded.status,note=excluded.note,received_at=excluded.received_at,updated_at=datetime('now')`)
    .bind(order.id,shipmentId,provider,ref,gross,fee,net,status,note,recv).run();
  if(matched){
    const batch=[
      env.DB.prepare("UPDATE payments SET status='cod_collected',paid_at=COALESCE(paid_at,datetime('now')),provider=?,provider_ref=? WHERE order_id=?").bind(provider,ref,order.id),
      env.DB.prepare("UPDATE orders SET payment_status='cod_collected',updated_at=datetime('now') WHERE id=?").bind(order.id),
      env.DB.prepare("UPDATE shipments SET cod_collected_at=COALESCE(cod_collected_at,datetime('now')) WHERE order_id=?").bind(order.id),
      env.DB.prepare("UPDATE creator_commissions SET status='eligible',eligible_at=COALESCE(eligible_at,datetime('now')) WHERE order_id=? AND status='pending'").bind(order.id),
      env.DB.prepare("INSERT OR IGNORE INTO financial_ledger(entry_type,amount,order_id,reference_type,reference_id,description,dedupe_key) VALUES('cod_collection',? ,?,'cod_reconciliation',?,'ยอด COD ที่กระทบตรง',?)").bind(gross,order.id,ref,`cod:${provider}:${ref}:gross`)
    ];
    if(fee>0)batch.push(env.DB.prepare("INSERT OR IGNORE INTO financial_ledger(entry_type,amount,order_id,reference_type,reference_id,description,dedupe_key) VALUES('cod_fee',? ,?,'cod_reconciliation',?,'ค่าธรรมเนียม COD/ขนส่ง',?)").bind(-fee,order.id,ref,`cod:${provider}:${ref}:fee`));
    await env.DB.batch(batch);
  }
  return {orderNo:order.order_no,status,matched,grossAmount:gross,feeAmount:fee,netAmount:net,expectedAmount:Number(order.total),difference:money(gross-Number(order.total))};
}

export async function settleCod(env,{provider,providerRef}){
  const row=await env.DB.prepare("SELECT id,status FROM cod_reconciliations WHERE provider=? AND provider_ref=?").bind(provider,providerRef).first();
  if(!row)throw new Error('reconciliation_not_found');if(row.status==='exception')throw new Error('reconciliation_exception');
  await env.DB.prepare("UPDATE cod_reconciliations SET status='settled',settled_at=COALESCE(settled_at,datetime('now')),updated_at=datetime('now') WHERE id=?").bind(row.id).run();
  return {ok:true,status:'settled'};
}
