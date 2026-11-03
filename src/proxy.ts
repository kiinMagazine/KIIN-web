import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {credentials,isDemo} from '@/lib/supabase/config';
import {ACTIVITY_COOKIE,activityCookie,idleLimit,isIdle,parseActivity} from '@/lib/session';
const readerPublic=['/cuenta/entrar','/cuenta/registro','/cuenta/recuperar'];
export async function proxy(request:NextRequest){let response=NextResponse.next({request});response.headers.set('Cache-Control','private, no-store');if(isDemo())return response;const {url,key}=credentials();const client=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll:items=>{items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options));response.headers.set('Cache-Control','private, no-store');}}});
 const path=request.nextUrl.pathname,isAdminArea=path.startsWith('/admin');
 const loginPath=isAdminArea?'/admin/login':'/cuenta/entrar';
 const deny=(to:string,clear=false)=>{const next=NextResponse.redirect(new URL(to,request.url));response.cookies.getAll().forEach(c=>next.cookies.set(c));if(clear)next.cookies.delete(ACTIVITY_COOKIE);next.headers.set('Cache-Control','private, no-store');return next;};
 const {data:{user}}=await client.auth.getUser();
 // Caducidad por inactividad: se compara con la última actividad registrada.
 if(user&&isIdle(parseActivity(request.cookies.get(ACTIVITY_COOKIE)?.value),Date.now(),idleLimit(path))){await client.auth.signOut();return deny(`${loginPath}?expirada=1`,true);}
 if(user)response.cookies.set(ACTIVITY_COOKIE,String(Date.now()),activityCookie);
 if(path==='/admin/login'||(!isAdminArea&&readerPublic.includes(path)))return response;
 if(!isAdminArea){if(!user)return deny('/cuenta/entrar');return response;}
 let allowed=false,temporary=false;if(user){const {data}=await client.from('admins').select('user_id,must_change_password').eq('user_id',user.id).maybeSingle();const {data:aal,error}=await client.auth.mfa.getAuthenticatorAssuranceLevel();allowed=!!data&&!error&&!(aal?.nextLevel==='aal2'&&aal.currentLevel!=='aal2');temporary=!!data?.must_change_password;}
 if(!allowed)return deny('/admin/login');
 // Con contraseña temporal solo se puede abrir Cuenta hasta cambiarla.
 if(temporary&&path!=='/admin/cuenta')return deny('/admin/cuenta?cambiar=1');
 return response;
}
export const config={matcher:['/admin/:path*','/cuenta/:path*']};
