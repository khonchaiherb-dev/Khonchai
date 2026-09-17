import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedEvents=new Set(['page_view','position_select','exam_open','exam_submit','review_open']);
const defaultOrigins=['https://khonchaiherb-dev.github.io','https://k-exam.com','https://www.k-exam.com'];
const configured=(Deno.env.get('KEXAM_ALLOWED_ORIGINS')||'').split(',').map(x=>x.trim()).filter(Boolean);
const allowedOrigins=new Set([...defaultOrigins,...configured]);

const cors=(origin:string)=>({
  'access-control-allow-origin':allowedOrigins.has(origin)?origin:defaultOrigins[0],
  'access-control-allow-headers':'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods':'POST, OPTIONS',
  'vary':'Origin',
  'content-type':'application/json; charset=utf-8'
});

const txt=(v:unknown,max:number)=>typeof v==='string'?v.slice(0,max):null;
const num=(v:unknown,min:number,max:number)=>{const n=Number(v);return Number.isFinite(n)&&n>=min&&n<=max?n:null};
const sha256=async(value:string)=>{
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
};

Deno.serve(async req=>{
  const origin=req.headers.get('origin')||defaultOrigins[0];
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors(origin)});
  if(req.method!=='POST')return new Response(JSON.stringify({error:'method_not_allowed'}),{status:405,headers:cors(origin)});
  if(!allowedOrigins.has(origin))return new Response(JSON.stringify({error:'origin_not_allowed'}),{status:403,headers:cors(origin)});

  try{
    const raw=await req.text();
    if(raw.length>12000)return new Response(JSON.stringify({error:'payload_too_large'}),{status:413,headers:cors(origin)});
    const body=JSON.parse(raw);
    if(!body?.id||!body?.anonymous_id||!body?.session_id||!allowedEvents.has(body?.event_name)){
      return new Response(JSON.stringify({error:'invalid_event'}),{status:400,headers:cors(origin)});
    }

    const meta=body.metadata&&typeof body.metadata==='object'&&!Array.isArray(body.metadata)?body.metadata:{};
    const metaJson=JSON.stringify(meta);
    if(metaJson.length>8000)return new Response(JSON.stringify({error:'metadata_too_large'}),{status:413,headers:cors(origin)});

    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const record={
      id:String(body.id),
      anonymous_hash:await sha256(String(body.anonymous_id)),
      session_hash:await sha256(String(body.session_id)),
      event_name:String(body.event_name),
      position_key:txt(body.position_key,64),
      set_no:num(body.set_no,1,10),
      score:num(body.score,0,100),
      elapsed_seconds:num(body.elapsed_seconds,0,86400),
      source:txt(body.source,80),
      device_type:txt(body.device_type,24),
      app_version:txt(body.app_version,24),
      page_path:txt(body.page_path,180),
      metadata:meta,
      client_time:body.client_time?new Date(body.client_time).toISOString():null
    };

    const {error}=await supabase.from('kexam_events').insert(record);
    if(error&&error.code!=='23505')throw error;
    return new Response(JSON.stringify({ok:true}),{status:202,headers:cors(origin)});
  }catch(err){
    console.error('[kexam-ingest]',err);
    return new Response(JSON.stringify({error:'ingest_failed'}),{status:500,headers:cors(origin)});
  }
});
