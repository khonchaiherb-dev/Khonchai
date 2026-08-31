import {adminAuthorized,json,clean,audit} from '../../_lib/admin.js';
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const [waves,orders]=await Promise.all([
    env.DB.prepare(`SELECT w.id,w.wave_no,w.status,w.note,w.created_at,w.updated_at,COUNT(pwo.order_id) order_count,
      COALESCE(SUM((SELECT SUM(oi.qty) FROM order_items oi WHERE oi.order_id=pwo.order_id)),0) item_qty
      FROM picking_waves w LEFT JOIN picking_wave_orders pwo ON pwo.wave_id=w.id
      GROUP BY w.id ORDER BY w.id DESC LIMIT 100`).all(),
    env.DB.prepare(`SELECT o.id,o.order_no,o.customer_name,o.fulfillment_status,o.created_at,
      SUM(oi.qty) item_qty,COUNT(oi.id) line_count
      FROM orders o JOIN order_items oi ON oi.order_id=o.id
      LEFT JOIN picking_wave_orders pwo ON pwo.order_id=o.id
      WHERE o.status!='cancelled' AND o.fulfillment_status IN ('pending','packing') AND pwo.order_id IS NULL
      GROUP BY o.id ORDER BY o.id ASC LIMIT 150`).all()
  ]);
  return json({waves:waves.results||[],orders:orders.results||[]});
}
export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>({})),action=clean(b.action,30);
  if(action==='create_wave'){
    const orderNos=[...new Set((Array.isArray(b.orderNos)?b.orderNos:[]).map(x=>clean(x,80)).filter(Boolean))].slice(0,100);
    if(!orderNos.length)return json({error:'orders_required'},400);
    const ph=orderNos.map(()=>'?').join(','),r=await env.DB.prepare(`SELECT o.id,o.order_no FROM orders o LEFT JOIN picking_wave_orders pwo ON pwo.order_id=o.id
      WHERE o.order_no IN (${ph}) AND o.status!='cancelled' AND o.fulfillment_status IN ('pending','packing') AND pwo.order_id IS NULL`).bind(...orderNos).all();
    if((r.results||[]).length!==orderNos.length)return json({error:'some_orders_not_eligible'},409);
    const waveNo=`WV${new Date().toISOString().replace(/\D/g,'').slice(2,14)}${Math.floor(Math.random()*900+100)}`;
    const batch=[env.DB.prepare("INSERT INTO picking_waves(wave_no,status,note,created_by) VALUES(?,'open',?,'admin')").bind(waveNo,clean(b.note,500)||null)];
    for(const o of r.results||[])batch.push(env.DB.prepare("INSERT INTO picking_wave_orders(wave_id,order_id) VALUES((SELECT id FROM picking_waves WHERE wave_no=?),?)").bind(waveNo,o.id));
    await env.DB.batch(batch);await audit(env,{action:'picking_wave.create',entityType:'picking_wave',entityId:waveNo,metadata:{orders:orderNos.length}});
    return json({ok:true,waveNo});
  }
  if(action==='set_status'){
    const waveNo=clean(b.waveNo,80),status=clean(b.status,20),allowed=new Set(['open','picking','picked','closed','cancelled']);
    if(!waveNo||!allowed.has(status))return json({error:'invalid_status'},400);
    const w=await env.DB.prepare("SELECT id,status FROM picking_waves WHERE wave_no=?").bind(waveNo).first();if(!w)return json({error:'not_found'},404);
    const transitions={open:['picking','cancelled'],picking:['picked','cancelled'],picked:['closed'],closed:[],cancelled:[]};
    if(!(transitions[w.status]||[]).includes(status))return json({error:'invalid_transition'},409);
    const batch=[env.DB.prepare("UPDATE picking_waves SET status=?,updated_at=datetime('now') WHERE id=?").bind(status,w.id)];
    if(status==='picked')batch.push(env.DB.prepare("UPDATE picking_wave_orders SET picked_at=COALESCE(picked_at,datetime('now')) WHERE wave_id=?").bind(w.id));
    await env.DB.batch(batch);await audit(env,{action:'picking_wave.status',entityType:'picking_wave',entityId:waveNo,metadata:{status}});
    return json({ok:true,status});
  }
  return json({error:'invalid_action'},400);
}
