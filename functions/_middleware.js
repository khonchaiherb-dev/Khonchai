import {getCustomer} from './_lib/customer-auth.js';

const digits=s=>String(s||'').replace(/\D/g,'');
const bool=v=>String(v??'').toLowerCase()==='true';
const phoneVariants=s=>{
  const d=digits(s);
  if(d.startsWith('66')&&d.length>=11)return [`0${d.slice(2)}`,d];
  if(d.startsWith('0')&&d.length>=9)return [d,`66${d.slice(1)}`];
  return [d,d];
};
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const canonicalOrigin=env=>String(env?.SITE_ORIGIN||'https://khonchaiherb-commerce.pages.dev').replace(/\/$/,'');
const canonicalHost=env=>new URL(canonicalOrigin(env)).host;
const legacyHosts=new Set(['khonchai.com','www.khonchai.com']);
const SELLER_KOONCHAISHOP='/seller-koonchaishop.html';
const KOONCHAISHOP_ADMIN_GUARD='/kch-koonchaishop-admin-readiness.js?v=1.0.1';
const STOREFRONT_COMMERCE_POLISH='/storefront-v1-commerce.css?v=2026.09.05.6';
const noIndexPath=pathname=>/\/(?:account|login|register|member|my-orders|seller(?:-[^/]+)?|seller-center(?:-v2)?)\.html$/i.test(String(pathname||''));

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

  // Dynamic product pages own their complete canonical/SEO metadata.
  if(/^\/product\/[^/]+\/?$/.test(String(pathname||'')))return response;

  const origin=canonicalOrigin(env);
  const canonicalPath=!pathname||pathname==='/'||pathname==='/index.html'?'/':pathname;
  const pageUrl=new URL(canonicalPath,`${origin}/`).toString();
  const home=canonicalPath==='/';

  // Customer UI remains the clean storefront-v1 generation. The only home-only
  // addition is a small truth-first conversion stylesheet; retired tshop/rescue/master
  // generations must never be injected here again.
  const rewriter=new HTMLRewriter().on('head',{element(head){
    head.append(`<link rel="canonical" href="${pageUrl}" />`,{html:true});
    head.append(`<meta property="og:url" content="${pageUrl}" />`,{html:true});
    if(home)head.append(`<link rel="stylesheet" href="${STOREFRONT_COMMERCE_POLISH}" />`,{html:true});
    if(noIndexPath(pathname))head.append('<meta name="robots" content="noindex,nofollow,noarchive" />',{html:true});
    if(pathname===SELLER_KOONCHAISHOP)head.append(`<script defer src="${KOONCHAISHOP_ADMIN_GUARD}"></script>`,{html:true});
  }});

  const transformed=rewriter.transform(response);
  if(!home)return transformed;

  // Home HTML is network-fresh during storefront stabilization so an old shell cannot
  // survive a deployment through browser/CDN caching. Static versioned assets remain
  // cacheable according to _headers/service-worker rules.
  const headers=new Headers(transformed.headers);
  headers.set('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('Pragma','no-cache');
  headers.set('Expires','0');
  headers.set('X-KCH-Storefront','v1-clean');
  return new Response(transformed.body,{status:transformed.status,statusText:transformed.statusText,headers});
};

export async function onRequest({request,env,next}){
  const u=new URL(request.url);
  const redirect=canonicalRedirect(request,env,u);
  if(redirect)return redirect;

  if(request.method==='POST'&&u.pathname==='/api/orders'){
    if(!bool(env.CHECKOUT_ENABLED)||!bool(env.COD_ENABLED))return json({error:'order_intake_closed'},503);
    const body=await request.clone().json().catch(()=>null);
    const code=String(body?.couponCode||'').trim().toUpperCase();
    const m=code.match(/^RVW(\d+)-[A-Z0-9]{12}$/);
    if(m&&env.DB){
      let customerId=null;
      const session=await getCustomer(request,env).catch(()=>null);
      if(session?.customer_id)customerId=Number(session.customer_id);
      if(!customerId){
        const [local,intl]=phoneVariants(body?.phone);
        if(local){
          const c=await env.DB.prepare('SELECT id FROM customers WHERE phone IN (?,?) ORDER BY id DESC LIMIT 1').bind(local,intl).first();
          customerId=Number(c?.id)||null;
        }
      }
      const review=await env.DB.prepare('SELECT customer_id,reward_coupon_issued FROM reviews WHERE id=?').bind(Number(m[1])).first();
      if(!customerId||!review||!Number(review.reward_coupon_issued)||Number(review.customer_id)!==customerId){
        return json({error:'coupon_not_eligible'},400);
      }
    }
  }

  const response=await next();
  return request.method==='GET'?withCanonicalMetadata(response,env,u.pathname):response;
}
