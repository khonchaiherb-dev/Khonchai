function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
function authorized(request,env){return Boolean(env.ADMIN_TOKEN)&&(request.headers.get('Authorization')||'')===`Bearer ${env.ADMIN_TOKEN}`}
export async function onRequestGet({request,env}){
  if(!env.ADMIN_TOKEN)return json({error:'admin_not_configured'},503);
  if(!authorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const [promos,reviews,media]=await Promise.all([
    env.DB.prepare(`SELECT p.code,p.name,p.used_count,COALESCE(SUM(pr.discount_amount),0) discount_total,COUNT(pr.id) redemptions
      FROM promotions p LEFT JOIN promotion_redemptions pr ON pr.promotion_id=p.id
      GROUP BY p.id ORDER BY redemptions DESC,p.priority DESC`).all(),
    env.DB.prepare("SELECT COUNT(*) count,COALESCE(AVG(rating),0) average,SUM(CASE WHEN verified_purchase=1 THEN 1 ELSE 0 END) verified FROM reviews").first(),
    env.DB.prepare("SELECT COUNT(*) count,SUM(CASE WHEN media_type='image' THEN 1 ELSE 0 END) images,SUM(CASE WHEN media_type='video' THEN 1 ELSE 0 END) videos FROM review_media WHERE status='published'").first()
  ]);
  return json({promotions:(promos.results||[]).map(x=>({code:x.code,name:x.name,usedCount:Number(x.used_count||0),redemptions:Number(x.redemptions||0),discountTotal:Number(x.discount_total||0)})),reviews:{count:Number(reviews?.count||0),average:Math.round(Number(reviews?.average||0)*10)/10,verified:Number(reviews?.verified||0),media:Number(media?.count||0),images:Number(media?.images||0),videos:Number(media?.videos||0)}});
}
