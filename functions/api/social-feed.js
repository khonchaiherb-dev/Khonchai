function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'public, max-age=60'}})}
const fallback={
  creators:[
    {id:1,handle:'khonchaiherb.official',displayName:'KHONCHAIHERB Official',bio:'ร้านทางการและทีมดูแลสินค้า',avatar:'K',followers:12800,rating:4.9,products:[{id:1},{id:3},{id:6}]},
    {id:2,handle:'khonchaiherb.live',displayName:'KHONCHAIHERB LIVE',bio:'ไลฟ์แนะนำสินค้าและดีลจากร้าน',avatar:'LIVE',followers:6400,rating:4.9,products:[{id:1},{id:2},{id:4}]},
    {id:3,handle:'khonchaiherb.guide',displayName:'Herbal Product Guide',bio:'คอนเทนต์แนะนำการเลือกผลิตภัณฑ์ของแบรนด์',avatar:'HG',followers:3900,rating:4.8,products:[{id:2},{id:5},{id:6}]}
  ],
  contents:[
    {id:1,creatorId:2,type:'live',title:'LIVE ดีลสมุนไพรขายดี',caption:'รวมสินค้าขายดีและคูปองช่วง LIVE',status:'live',viewers:1280,likes:940,products:[{id:1},{id:2},{id:4}]},
    {id:2,creatorId:1,type:'video',title:'เลือกชารางจืดให้เหมาะกับคุณ',caption:'ดูรายละเอียดสินค้าและดีลจากร้านทางการ',status:'published',viewers:18400,likes:2800,products:[{id:1}]},
    {id:3,creatorId:3,type:'video',title:'บาล์มสมุนไพรและลูกประคบ ต่างกันอย่างไร',caption:'เปรียบเทียบรูปแบบสินค้าเพื่อเลือกซื้อได้ง่ายขึ้น',status:'published',viewers:9200,likes:1100,products:[{id:2},{id:5}]},
    {id:4,creatorId:2,type:'live',title:'LIVE Gift Set & โปรของขวัญ',caption:'ดูชุดของขวัญและโปรจากร้าน',status:'scheduled',viewers:0,likes:0,products:[{id:3},{id:6}]},
    {id:5,creatorId:1,type:'video',title:'จัด Gift Set แบบพรีเมียม',caption:'ไอเดียเลือกชุดของขวัญจาก KHONCHAIHERB',status:'published',viewers:7600,likes:860,products:[{id:6},{id:3}]}
  ]
};
export async function onRequestGet({env}){
  if(!env.DB) return json({...fallback,demo:true});
  try{
    const [creatorRows,contentRows,creatorProducts,contentProducts]=await Promise.all([
      env.DB.prepare("SELECT id,handle,display_name,bio,avatar_url,follower_count,rating FROM creators WHERE active=1 ORDER BY follower_count DESC,id").all(),
      env.DB.prepare("SELECT id,creator_id,content_type,title,caption,media_url,poster_url,status,viewer_count,like_count,starts_at FROM social_contents WHERE status IN ('published','live','scheduled') ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,id DESC").all(),
      env.DB.prepare("SELECT cp.creator_id,p.id,p.slug,p.name,p.price,p.compare_at_price,p.stock FROM creator_products cp JOIN products p ON p.id=cp.product_id WHERE p.active=1 ORDER BY cp.featured DESC,cp.created_at DESC").all(),
      env.DB.prepare("SELECT cp.content_id,p.id,p.slug,p.name,p.price,p.compare_at_price,p.stock,cp.pin_label,cp.sort_order FROM content_products cp JOIN products p ON p.id=cp.product_id WHERE p.active=1 ORDER BY cp.content_id,cp.sort_order,p.id").all()
    ]);
    const byCreator=new Map();
    for(const p of creatorProducts.results||[]){const k=Number(p.creator_id);if(!byCreator.has(k))byCreator.set(k,[]);byCreator.get(k).push(p)}
    const byContent=new Map();
    for(const p of contentProducts.results||[]){const k=Number(p.content_id);if(!byContent.has(k))byContent.set(k,[]);byContent.get(k).push(p)}
    const creators=(creatorRows.results||[]).map(c=>({id:Number(c.id),handle:c.handle,displayName:c.display_name,bio:c.bio||'',avatar:c.avatar_url||'K',followers:Number(c.follower_count||0),rating:Number(c.rating||5),products:byCreator.get(Number(c.id))||[]}));
    const contents=(contentRows.results||[]).map(x=>({id:Number(x.id),creatorId:Number(x.creator_id),type:x.content_type,title:x.title,caption:x.caption||'',mediaUrl:x.media_url||'',posterUrl:x.poster_url||'',status:x.status,viewers:Number(x.viewer_count||0),likes:Number(x.like_count||0),startsAt:x.starts_at||'',products:byContent.get(Number(x.id))||[]}));
    return json({creators,contents});
  }catch(error){
    return json({...fallback,demo:true,databaseReady:false});
  }
}
