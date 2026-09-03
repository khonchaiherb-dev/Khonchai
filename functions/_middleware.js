import {getCustomer} from './_lib/customer-auth.js';
const digits=s=>String(s||'').replace(/\D/g,'');
const phoneVariants=s=>{const d=digits(s);if(d.startsWith('66')&&d.length>=11)return [`0${d.slice(2)}`,d];if(d.startsWith('0')&&d.length>=9)return [d,`66${d.slice(1)}`];return [d,d]};
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const canonicalOrigin=env=>String(env?.SITE_ORIGIN||'https://khonchaiherb-commerce.pages.dev').replace(/\/$/,'');
const canonicalHost=env=>new URL(canonicalOrigin(env)).host;
const legacyHosts=new Set(['khonchai.com','www.khonchai.com']);
const SELLER_KOONCHAISHOP='/seller-koonchaishop.html';
const KOONCHAISHOP_ADMIN_GUARD='/kch-koonchaishop-admin-readiness.js?v=1.0.1';
const noIndexPath=pathname=>/\/(?:account|login|register|member|seller(?:-[^/]+)?|seller-center(?:-v2)?)\.html$/i.test(String(pathname||''));
const canonicalRedirect=(request,env,u)=>{
  if(!['GET','HEAD'].includes(request.method))return null;
  const host=String(u.host||'').toLowerCase();
  const targetHost=canonicalHost(env).toLowerCase();
  if(host===targetHost&&u.protocol==='https:')return null;
  if(host!==targetHost&&!legacyHosts.has(host))return null;
  const target=new URL(`${u.pathname}${u.search}`,canonicalOrigin(env));
  return new Response(null,{status:301,headers:{Location:target.toString(),'Cache-Control':'public, max-age=3600'}});
};
const withCanonicalMetadata=(response,env,pathname='')=>{
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('text/html')||typeof HTMLRewriter==='undefined')return response;
  const origin=canonicalOrigin(env);
  const canonicalPath=!pathname||pathname==='/'||pathname==='/index.html'?'/':pathname;
  const pageUrl=new URL(canonicalPath,`${origin}/`).toString();
  return new HTMLRewriter().on('head',{element(head){
    head.append(`<link rel="canonical" href="${pageUrl}" />`,{html:true});
    head.append(`<meta property="og:url" content="${pageUrl}" />`,{html:true});
    if(noIndexPath(pathname))head.append('<meta name="robots" content="noindex,nofollow,noarchive" />',{html:true});
    head.append('<link rel="stylesheet" href="/tshop-v127-footer-premium.css?v=1.27.0">',{html:true});
    head.append('<link rel="stylesheet" href="/tshop-v128-future-standard.css?v=1.28.0">',{html:true});
    head.append('<link rel="stylesheet" href="/tshop-v129-readable-future.css?v=1.29.0">',{html:true});
    head.append('<link rel="stylesheet" href="/tshop-v130-koonchaishop.css?v=1.30.0">',{html:true});
    head.append('<link rel="stylesheet" href="/tshop-v131-top-conversion.css?v=1.31.0">',{html:true});
    head.append('<link rel="stylesheet" href="/tshop-v132-conversion-storefront.css?v=1.32.0">',{html:true});
    head.append('<link rel="stylesheet" href="/tshop-v1321-search-visibility-fix.css?v=1.32.1">',{html:true});
    head.append('<link rel="stylesheet" href="/tshop-v133-readable-storefront.css?v=1.33.1">',{html:true});
    head.append('<link rel="stylesheet" href="/tshop-v134-structural-storefront.css?v=1.34.0">',{html:true});
    head.append('<link rel="stylesheet" href="/tshop-v1341-header-dedupe.css?v=1.34.1">',{html:true});
    head.append('<link rel="stylesheet" href="/tshop-v135-lower-standard.css?v=1.35.0">',{html:true});
    head.append('<link rel="stylesheet" href="/kch-v136-fast-purchase.css?v=1.36.0">',{html:true});
    head.append('<link rel="stylesheet" href="/kch-v137-contextual-care.css?v=1.37.0">',{html:true});
    head.append('<link rel="stylesheet" href="/kch-storefront-stability.css?v=1.0.0">',{html:true});
    head.append('<script defer src="/kch-thai-first.js?v=1.23.1"></script>',{html:true});
    head.append('<script defer src="/kch-footer-premium.js?v=1.27.0"></script>',{html:true});
    head.append('<script defer src="/kch-future-standard.js?v=1.28.1"></script>',{html:true});
    head.append('<script defer src="/kch-koonchaishop-commerce.js?v=1.30.1"></script>',{html:true});
    head.append('<script defer src="/kch-top-conversion.js?v=1.31.2"></script>',{html:true});
    head.append('<script defer src="/kch-conversion-storefront.js?v=1.32.0"></script>',{html:true});
    head.append('<script defer src="/kch-search-authority.js?v=1.0.5"></script>',{html:true});
    head.append('<script defer src="/kch-readable-storefront.js?v=1.33.1"></script>',{html:true});
    head.append('<script defer src="/kch-v134-structural-storefront.js?v=1.34.0"></script>',{html:true});
    head.append('<script defer src="/kch-v1341-header-dedupe.js?v=1.34.1"></script>',{html:true});
    head.append('<script defer src="/kch-v136-fast-purchase.js?v=1.36.0"></script>',{html:true});
    head.append('<script defer src="/kch-v137-contextual-care.js?v=1.37.0"></script>',{html:true});
    if(pathname===SELLER_KOONCHAISHOP)head.append(`<script defer src="${KOONCHAISHOP_ADMIN_GUARD}"></script>`,{html:true});
  }}).transform(response);
};
export async function onRequest({request,env,next}){
  const u=new URL(request.url);
  const redirect=canonicalRedirect(request,env,u);
  if(redirect)return redirect;
  if(request.method==='POST'&&u.pathname==='/api/orders'){
    const body=await request.clone().json().catch(()=>null),code=String(body?.couponCode||'').trim().toUpperCase(),m=code.match(/^RVW(\d+)-[A-Z0-9]{12}$/);
    if(m&&env.DB){
      let customerId=null;
      const session=await getCustomer(request,env).catch(()=>null);if(session?.customer_id)customerId=Number(session.customer_id);
      if(!customerId){const [local,intl]=phoneVariants(body?.phone);if(local){const c=await env.DB.prepare("SELECT id FROM customers WHERE phone IN (?,?) ORDER BY id DESC LIMIT 1").bind(local,intl).first();customerId=Number(c?.id)||null}}
      const review=await env.DB.prepare("SELECT customer_id,reward_coupon_issued FROM reviews WHERE id=?").bind(Number(m[1])).first();
      if(!customerId||!review||!Number(review.reward_coupon_issued)||Number(review.customer_id)!==customerId)return json({error:'coupon_not_eligible'},400);
    }
  }
  const response=await next();
  return request.method==='GET'?withCanonicalMetadata(response,env,u.pathname):response;
}