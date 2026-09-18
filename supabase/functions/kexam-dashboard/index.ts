/// <reference lib="deno.ns" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const defaultOrigins=['https://khonchaiherb-dev.github.io','https://k-exam.com','https://www.k-exam.com'];
const configured=(Deno.env.get('KEXAM_ALLOWED_ORIGINS')||'').split(',').map(x=>x.trim()).filter(Boolean);
const allowedOrigins=new Set([...defaultOrigins,...configured]);
const cors=(origin:string)=>({
  'access-control-allow-origin':allowedOrigins.has(origin)?origin:defaultOrigins[0],
  'access-control-allow-headers':'authorization, x-client-info, apikey, content-type, x-kexam-admin-key',
  'access-control-allow-methods':'GET, OPTIONS',
  'vary':'Origin',
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store'
});
const safeEqual=(a:string,b:string)=>{
  if(a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;
};

Deno.serve(async req=>{
  const origin=req.headers.get('origin')||defaultOrigins[0];
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors(origin)});
  if(req.method!=='GET')return new Response(JSON.stringify({error:'method_not_allowed'}),{status:405,headers:cors(origin)});
  if(!allowedOrigins.has(origin))return new Response(JSON.stringify({error:'origin_not_allowed'}),{status:403,headers:cors(origin)});

  const expected=Deno.env.get('KEXAM_ADMIN_KEY')||'';
  const supplied=req.headers.get('x-kexam-admin-key')||'';
  if(!expected||!safeEqual(supplied,expected))return new Response(JSON.stringify({error:'unauthorized'}),{status:401,headers:cors(origin)});

  try{
    const u=new URL(req.url);
    const requested=Number(u.searchParams.get('days')||30);
    const days=Math.max(1,Math.min(Number.isFinite(requested)?Math.round(requested):30,180));
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const {data,error}=await supabase.rpc('kexam_dashboard_snapshot',{p_days:days});
    if(error)throw error;
    return new Response(JSON.stringify(data||{}),{status:200,headers:cors(origin)});
  }catch(err){
    console.error('[kexam-dashboard]',err);
    return new Response(JSON.stringify({error:'dashboard_failed'}),{status:500,headers:cors(origin)});
  }
});
