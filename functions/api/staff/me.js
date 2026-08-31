import {json,getStaffSession} from '../../_lib/staff-auth.js';
export async function onRequestGet({request,env}){const s=await getStaffSession(request,env);if(!s)return json({authenticated:false},401);return json({authenticated:true,staff:{id:s.id,username:s.username,displayName:s.displayName,role:s.role,permissions:s.permissions,expiresAt:s.expiresAt}})}
