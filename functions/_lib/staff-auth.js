const enc=new TextEncoder();
const ROLES={
  owner:['*'],
  admin:['analytics.read','orders.read','orders.manage','catalog.read','catalog.manage','inventory.read','inventory.manage','procurement.read','procurement.manage','fulfillment.manage','finance.read','finance.manage','refunds.manage','returns.manage','notifications.manage','audit.read','staff.read','approvals.manage','backup.manage'],
  operations:['analytics.read','orders.read','orders.manage','fulfillment.manage','returns.manage','notifications.manage'],
  warehouse:['orders.read','inventory.read','inventory.manage','procurement.read','procurement.manage','fulfillment.manage'],
  finance:['analytics.read','orders.read','finance.read','finance.manage','refunds.manage','audit.read'],
  support:['orders.read','returns.manage','notifications.manage'],
  viewer:['analytics.read','orders.read','inventory.read']
};
export const clean=(v,n=200)=>String(v??'').trim().slice(0,n);
export function json(data,status=200,headers={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}})}
export function sameOrigin(request){const origin=request.headers.get('Origin');if(!origin)return true;try{return new URL(origin).origin===new URL(request.url).origin}catch{return false}}
export function legacyAuthorized(request,env){const expected=String(env.ADMIN_TOKEN||''),got=String(request.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!expected||got.length!==expected.length)return false;let diff=0;for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^got.charCodeAt(i);return diff===0}
export async function sha256Hex(value){const b=await crypto.subtle.digest('SHA-256',enc.encode(String(value)));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function hexBytes(hex){const out=new Uint8Array(hex.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(hex.slice(i*2,i*2+2),16);return out}
export function randomToken(bytes=32){const a=new Uint8Array(bytes);crypto.getRandomValues(a);return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
export function randomHex(bytes=16){const a=new Uint8Array(bytes);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function derivePassword(password,saltHex,iterations=180000){const key=await crypto.subtle.importKey('raw',enc.encode(String(password)),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:hexBytes(saltHex),iterations:Number(iterations)},key,256);return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export function safeUsername(v){const x=clean(v,50).toLowerCase();return /^[a-z0-9][a-z0-9._-]{2,49}$/.test(x)?x:null}
export function permissionsFor(role){return [...(ROLES[role]||[])]}
export function hasPermission(staff,permission){const p=permissionsFor(staff?.role);return p.includes('*')||p.includes(permission)}
function cookieValue(request,name){const c=request.headers.get('Cookie')||'';for(const part of c.split(';')){const [k,...rest]=part.trim().split('=');if(k===name)return decodeURIComponent(rest.join('='))}return ''}
export async function getStaffSession(request,env,{touch=true}={}){
  if(!env.DB)return null;const token=cookieValue(request,'kch_staff');if(!token)return null;const hash=await sha256Hex(token);
  const row=await env.DB.prepare(`SELECT s.token_hash,s.staff_user_id,s.expires_at,u.username,u.display_name,u.role,u.active
    FROM staff_sessions s JOIN staff_users u ON u.id=s.staff_user_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>datetime('now') AND u.active=1`).bind(hash).first();
  if(!row)return null;if(touch)env.DB.prepare("UPDATE staff_sessions SET last_seen_at=datetime('now') WHERE token_hash=?").bind(hash).run().catch(()=>{});
  return {id:Number(row.staff_user_id),username:row.username,displayName:row.display_name,role:row.role,tokenHash:hash,expiresAt:row.expires_at,permissions:permissionsFor(row.role)};
}
export async function requireStaff(request,env,permission=null){const staff=await getStaffSession(request,env);if(!staff)return {ok:false,response:json({error:'staff_auth_required'},401)};if(permission&&!hasPermission(staff,permission))return {ok:false,staff,response:json({error:'permission_denied',permission},403)};return {ok:true,staff}}
export async function securityEvent(env,{staffUserId=null,eventType,severity='info',route=null,method=null,statusCode=null,detail=null}){if(!env.DB)return;try{await env.DB.prepare(`INSERT INTO security_events(staff_user_id,event_type,severity,route,method,status_code,detail_json) VALUES(?,?,?,?,?,?,?)`).bind(staffUserId||null,clean(eventType,80),severity,route?clean(route,180):null,method?clean(method,12):null,statusCode==null?null:Number(statusCode),detail==null?null:JSON.stringify(detail).slice(0,4000)).run()}catch{}}
export async function hitRateLimit(env,{scope,fingerprint,limit,windowSeconds}){if(!env.DB)return {allowed:true,hits:0};const now=Math.floor(Date.now()/1000),windowStart=Math.floor(now/windowSeconds)*windowSeconds,key=await sha256Hex(`${scope}|${windowStart}|${fingerprint}`),expires=new Date((windowStart+windowSeconds+60)*1000).toISOString().slice(0,19).replace('T',' ');await env.DB.prepare(`INSERT INTO rate_limit_buckets(bucket_key,route_scope,window_start,hits,expires_at) VALUES(?,?,?,?,?) ON CONFLICT(bucket_key) DO UPDATE SET hits=hits+1`).bind(key,scope,windowStart,1,expires).run();const row=await env.DB.prepare('SELECT hits FROM rate_limit_buckets WHERE bucket_key=?').bind(key).first();const hits=Number(row?.hits||1);return {allowed:hits<=limit,hits,retryAfter:Math.max(1,windowStart+windowSeconds-now)}}
