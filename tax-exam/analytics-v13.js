(()=>{
  const CFG=window.KEXAM_ANALYTICS_CONFIG||{};
  const VERSION=String(CFG.version||'13');
  const LS_ID='kexam_analytics_anon_v1';
  const LS_QUEUE='kexam_analytics_queue_v1';
  const LS_ONCE='kexam_analytics_once_v1';
  const LS_LOCAL='kexam_analytics_local_v1';
  const SS_SESSION='kexam_analytics_session_v1';
  const MAX_QUEUE=120;
  const MAX_LOCAL=500;

  const uuid=()=>{
    if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)});
  };
  const safeParse=(s,f)=>{try{return JSON.parse(s)||f}catch{return f}};
  const getLocal=(k,f)=>safeParse(localStorage.getItem(k)||'',f);
  const setLocal=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const getId=()=>{let v='';try{v=localStorage.getItem(LS_ID)||''}catch{}if(!v){v=uuid();try{localStorage.setItem(LS_ID,v)}catch{}}return v};
  const getSession=()=>{let v='';try{v=sessionStorage.getItem(SS_SESSION)||''}catch{}if(!v){v=uuid();try{sessionStorage.setItem(SS_SESSION,v)}catch{}}return v};
  const source=()=>{try{return new URL(location.href).searchParams.get('source')||sessionStorage.getItem('kexam_source')||'direct'}catch{return 'direct'}};
  const device=()=>{const w=Math.max(document.documentElement?.clientWidth||0,innerWidth||0);return w<=760?'mobile':w<=1100?'tablet':'desktop'};
  const endpoint=()=>{
    const base=String(CFG.supabaseUrl||'').replace(/\/$/,'');
    return base&&CFG.ingestFunction?`${base}/functions/v1/${CFG.ingestFunction}`:'';
  };
  const connected=()=>Boolean(endpoint()&&CFG.supabaseAnonKey);

  function cleanMeta(meta={}){
    const out={};
    for(const [k,v] of Object.entries(meta||{})){
      if(v===undefined||typeof v==='function')continue;
      if(Array.isArray(v))out[k]=v.slice(0,120).map(x=>typeof x==='number'||typeof x==='boolean'?x:String(x).slice(0,120));
      else if(v&&typeof v==='object')out[k]=JSON.parse(JSON.stringify(v));
      else if(typeof v==='string')out[k]=v.slice(0,400);
      else out[k]=v;
    }
    return out;
  }

  function makeEvent(eventName,meta={}){
    const m=cleanMeta(meta);
    return {
      id:uuid(),
      anonymous_id:getId(),
      session_id:getSession(),
      event_name:String(eventName||'event').slice(0,64),
      position_key:m.position||m.position_key||null,
      set_no:Number.isInteger(Number(m.set_no))?Number(m.set_no):null,
      score:Number.isFinite(Number(m.score))?Number(m.score):null,
      elapsed_seconds:Number.isFinite(Number(m.elapsed_seconds))?Math.max(0,Math.round(Number(m.elapsed_seconds))):null,
      source:source().slice(0,80),
      device_type:device(),
      app_version:VERSION,
      page_path:location.pathname.slice(0,180),
      metadata:m,
      client_time:new Date().toISOString()
    };
  }

  function rememberLocal(ev){
    const arr=getLocal(LS_LOCAL,[]);arr.push(ev);setLocal(LS_LOCAL,arr.slice(-MAX_LOCAL));
  }
  function queue(ev){const arr=getLocal(LS_QUEUE,[]);arr.push(ev);setLocal(LS_QUEUE,arr.slice(-MAX_QUEUE))}
  function dequeueIds(ids){if(!ids?.length)return;const s=new Set(ids);setLocal(LS_QUEUE,getLocal(LS_QUEUE,[]).filter(x=>!s.has(x.id)))}

  async function send(ev){
    if(!connected())return false;
    try{
      const r=await fetch(endpoint(),{
        method:'POST',
        keepalive:true,
        headers:{'content-type':'application/json','apikey':CFG.supabaseAnonKey,'authorization':`Bearer ${CFG.supabaseAnonKey}`},
        body:JSON.stringify(ev)
      });
      return r.ok;
    }catch{return false}
  }

  async function flush(){
    if(!connected()||!navigator.onLine)return;
    const q=getLocal(LS_QUEUE,[]).slice(0,20),done=[];
    for(const ev of q){if(await send(ev))done.push(ev.id)}
    dequeueIds(done);
  }

  async function track(eventName,meta={}){
    const ev=makeEvent(eventName,meta);rememberLocal(ev);
    if(!(await send(ev)))queue(ev);
    return ev.id;
  }

  function trackOnce(eventName,key,meta={}){
    const k=`${eventName}:${String(key||'')}`;
    const once=getLocal(LS_ONCE,{});
    if(once[k])return false;
    once[k]=Date.now();
    const entries=Object.entries(once).sort((a,b)=>b[1]-a[1]).slice(0,500);
    setLocal(LS_ONCE,Object.fromEntries(entries));
    track(eventName,meta);
    return true;
  }

  function localSnapshot(){
    const events=getLocal(LS_LOCAL,[]);
    const today=new Date().toISOString().slice(0,10);
    const isToday=e=>String(e.client_time||'').slice(0,10)===today;
    const submits=events.filter(e=>e.event_name==='exam_submit');
    const scores=submits.map(e=>Number(e.score)).filter(Number.isFinite);
    return {
      connected:connected(),
      queued:getLocal(LS_QUEUE,[]).length,
      total_events:events.length,
      page_views_today:events.filter(e=>e.event_name==='page_view'&&isToday(e)).length,
      exam_opens_today:events.filter(e=>e.event_name==='exam_open'&&isToday(e)&&!e.metadata?.show_result).length,
      submissions_today:submits.filter(isToday).length,
      avg_score:scores.length?Math.round((scores.reduce((a,b)=>a+b,0)/scores.length)*10)/10:null,
      unique_local_user:getId()
    };
  }

  window.KEXAM_ANALYTICS={
    track,trackOnce,flush,connected,localSnapshot,
    status:()=>({connected:connected(),endpoint:endpoint(),queued:getLocal(LS_QUEUE,[]).length,version:VERSION})
  };

  window.addEventListener('online',flush);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});
  trackOnce('page_view',`${getSession()}:${location.pathname}:${location.search}`,{href:location.href.slice(0,300)});
  setTimeout(flush,1600);
})();
