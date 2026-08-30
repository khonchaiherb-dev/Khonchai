const enc=new TextEncoder();
export const json=(data,status=200,extra={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...extra}});
export function normalizePhone(value){let d=String(value||'').replace(/\D/g,'');if(d.startsWith('66')&&d.length===11)d='0'+d.slice(2);return /^0\d{9}$/.test(d)?d:''}
export function cookieValue(request,name){const raw=request.headers.get('Cookie')||'';for(const part of raw.split(';')){const [k,...v]=part.trim().split('=');if(k===name)return decodeURIComponent(v.join('='))}return ''}
async function hexDigest(input){const b=await crypto.subtle.digest('SHA-256',enc.encode(input));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export const hashOtp=(phone,code,env)=>hexDigest(`otp:${phone}:${code}:${env.AUTH_PEPPER||''}`);
export const hashSession=(token,env)=>hexDigest(`session:${token}:${env.AUTH_PEPPER||''}`);
export function sessionCookie(token,maxAge=2592000){return `kch_customer_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`}
export function clearSessionCookie(){return 'kch_customer_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'}
export async function getCustomer(request,env){if(!env.DB)return null;const token=cookieValue(request,'kch_customer_session');if(!token)return null;const hash=await hashSession(token,env);const row=await env.DB.prepare("SELECT s.id session_id,s.customer_id,c.phone,c.full_name,c.email,c.marketing_consent,s.expires_at FROM customer_sessions s JOIN customers c ON c.id=s.customer_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>datetime('now')").bind(hash).first();if(row)env.DB.prepare("UPDATE customer_sessions SET last_seen_at=datetime('now') WHERE id=?").bind(row.session_id).run().catch(()=>{});return row||null}
export function sameOrigin(request){const origin=request.headers.get('Origin');if(!origin)return true;try{return new URL(origin).origin===new URL(request.url).origin}catch{return false}}
export function randomOtp(){const a=new Uint32Array(1);crypto.getRandomValues(a);return String(a[0]%1000000).padStart(6,'0')}
export function randomToken(){const a=new Uint8Array(32);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
