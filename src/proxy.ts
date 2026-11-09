import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {credentials,isDemo} from '@/lib/supabase/config';
import {ACTIVITY_COOKIE,CHANGE_PASSWORD_PATH,HINT_COOKIE,MUST_CHANGE_COOKIE,SINCE_COOKIE,absoluteLimit,activityCookie,hardenAuthCookie,idleLimit,isIdle,parseActivity} from '@/lib/session';

/** Páginas de cuenta accesibles sin sesión. */
const accountPublic=['/cuenta/entrar','/cuenta/registro','/cuenta/recuperar','/cuenta/restablecer','/cuenta/verificar'];

/**
 * Primera capa (gruesa) de protección. Cada página y acción del servidor vuelve a verificar sesión y rol.
 * - /admin/*: sesión válida + rol admin (tabla admins) + 2FA si está activada + contraseña definitiva.
 * - /cuenta/*: sesión válida (salvo las páginas públicas de acceso).
 * - Resto del sitio (público): solo se aplica el cambio obligatorio de contraseña temporal.
 */
export async function proxy(request:NextRequest){
  const path=request.nextUrl.pathname;
  const redirect=(to:string)=>{const r=NextResponse.redirect(new URL(to,request.url));r.headers.set('Cache-Control','private, no-store');return r;};
  if(path==='/admin/login')return redirect('/cuenta/entrar?next=/admin');
  const isAdminArea=path.startsWith('/admin'),isAccount=path.startsWith('/cuenta');
  const protectedArea=isAdminArea||(isAccount&&!accountPublic.includes(path));

  // Sitio público: no se consulta Auth (las páginas son estáticas). Solo se exige cambiar la contraseña temporal.
  if(!protectedArea){
    if(request.method==='GET'&&request.cookies.get(MUST_CHANGE_COOKIE)&&!accountPublic.includes(path))return redirect(CHANGE_PASSWORD_PATH);
    return NextResponse.next();
  }

  let response=NextResponse.next({request});
  response.headers.set('Cache-Control','private, no-store');
  if(isDemo())return response;
  const {url,key}=credentials();
  const client=createServerClient(url,key,{cookieOptions:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'},cookies:{getAll:()=>request.cookies.getAll(),setAll:items=>{items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,hardenAuthCookie(options)));response.headers.set('Cache-Control','private, no-store');}}});
  const deny=async(to:string,signOut=false)=>{
    if(signOut)await client.auth.signOut({scope:'local'});
    const next=redirect(to);
    response.cookies.getAll().forEach(c=>next.cookies.set(c));
    if(signOut)for(const c of [ACTIVITY_COOKIE,SINCE_COOKIE,HINT_COOKIE,MUST_CHANGE_COOKIE])next.cookies.delete(c);
    return next;
  };
  const login=`/cuenta/entrar?next=${encodeURIComponent(path)}`;

  const {data:{user}}=await client.auth.getUser();
  if(!user)return deny(login,!!request.cookies.get(HINT_COOKIE));
  const now=Date.now();
  // Caducidad por inactividad (deslizante) y tope absoluto desde el inicio de sesión.
  if(isIdle(parseActivity(request.cookies.get(ACTIVITY_COOKIE)?.value),now,idleLimit(path)))return deny(`${login}&expirada=1`,true);
  if(isIdle(parseActivity(request.cookies.get(SINCE_COOKIE)?.value),now,absoluteLimit(path)))return deny(`${login}&expirada=1`,true);
  response.cookies.set(ACTIVITY_COOKIE,String(now),activityCookie);

  const mustChangeCookie=!!request.cookies.get(MUST_CHANGE_COOKIE);
  if(isAccount){
    if(mustChangeCookie&&path!==CHANGE_PASSWORD_PATH)return deny(CHANGE_PASSWORD_PATH);
    return response;
  }
  // Área de administración: rol verificado en la base, no en la cookie ni en el token.
  const {data:admin}=await client.from('admins').select('must_change_password').eq('user_id',user.id).maybeSingle();
  if(!admin)return deny('/?acceso=denegado');
  if(admin.must_change_password||mustChangeCookie)return deny(CHANGE_PASSWORD_PATH);
  const {data:aal,error}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(error||(aal?.nextLevel==='aal2'&&aal.currentLevel!=='aal2'))return deny(`${login}&mfa=1`,true);
  return response;
}
// Todo excepto recursos estáticos, imágenes de Next, archivos con extensión y el cron (que tiene su propio secreto).
export const config={matcher:['/((?!_next/static|_next/image|api/cron|favicon\\.svg|brand/|placeholders/|.*\\.[a-z0-9]+$).*)']};
