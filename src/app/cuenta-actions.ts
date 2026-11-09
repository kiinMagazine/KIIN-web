'use server';
import {z} from 'zod';
import {cookies} from 'next/headers';
import {createClient} from '@supabase/supabase-js';
import {sessionClient} from '@/lib/supabase/server';
import {serviceClient} from '@/lib/supabase/service';
import {credentials,isDemo} from '@/lib/supabase/config';
import {AuthError,currentAccount,requireUser,safeNext} from '@/lib/account';
import {allow,clientIp,TOO_MANY} from '@/lib/auth/rate-limit';
import {checkPassword,PASSWORD_MAX} from '@/lib/auth/password-policy';
import {hashToken,isTokenShape,matchesTemp,newToken} from '@/lib/auth/crypto';
import {existingAccountMail,resetMail,sendMail,siteBase,verifyMail} from '@/lib/auth/mail';
import {ACTIVITY_COOKIE,CHANGE_PASSWORD_PATH,HINT_COOKIE,MUST_CHANGE_COOKIE,SINCE_COOKIE,activityCookie,hintCookie,privateCookie} from '@/lib/session';
import {territories} from '@/lib/validators';

/** Resultado tipado: code es estable (la interfaz decide qué hacer), message es para la persona. */
export type ReaderResult={ok:boolean;message:string;code?:string;errors?:Record<string,string>;next?:string;needsOtp?:boolean;loggedIn?:boolean;role?:'admin'|'usuario';username?:string;mustChange?:boolean};

const RESET_MINUTES=30,VERIFY_HOURS=24;
const email=z.string().trim().toLowerCase().max(254).pipe(z.email('Escribe un correo válido.'));
const username=z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,30}$/,'Usa de 3 a 30 caracteres: letras sin acentos, números, punto o guion bajo.');
const password=z.string().min(1,'Escribe una contraseña.').max(PASSWORD_MAX);
const LOGIN_FAILED='No pudimos iniciar sesión. Revisa tu correo y contraseña.';
const GENERIC='No pudimos completar la acción. Inténtalo de nuevo en un momento.';

function invalid(error:z.ZodError):ReaderResult{return {ok:false,code:'INVALID',message:'Revisa los campos señalados.',errors:Object.fromEntries(error.issues.map(i=>[String(i.path[0]??'form'),i.message]))};}
/** Traduce errores: los de autorización tienen mensaje para la persona; los del sistema se registran y se responde genérico. */
function fail(error:unknown,where:string):ReaderResult{
  if(error instanceof AuthError)return {ok:false,code:error.code,message:error.message,next:error.code==='MUST_CHANGE_PASSWORD'?CHANGE_PASSWORD_PATH:undefined};
  console.error(`[cuenta] ${where}:`,error instanceof Error?error.message:error);
  return {ok:false,code:'SYSTEM',message:GENERIC};
}
const demo=():ReaderResult=>({ok:false,code:'DEMO',message:'Las cuentas estarán disponibles al conectar el proyecto.'});

async function startSessionCookies(mustChange:boolean){
  const store=await cookies(),now=String(Date.now());
  store.set(ACTIVITY_COOKIE,now,activityCookie);store.set(SINCE_COOKIE,now,privateCookie);store.set(HINT_COOKIE,'1',hintCookie);
  if(mustChange)store.set(MUST_CHANGE_COOKIE,'1',privateCookie);else store.delete(MUST_CHANGE_COOKIE);
}
async function clearSessionCookies(){const store=await cookies();for(const c of [ACTIVITY_COOKIE,SINCE_COOKIE,HINT_COOKIE,MUST_CHANGE_COOKIE])store.delete(c);}

/** Perfil para toda cuenta (lectores y admins). Nombre de usuario generado si no se eligió. */
async function ensureProfile(userId:string,preferred?:string){
  const service=serviceClient();
  const {data}=await service.from('readers').select('username').eq('user_id',userId).maybeSingle();
  if(data)return data.username as string;
  const name=preferred||`lector_${userId.replace(/-/g,'').slice(0,8)}`;
  const {error}=await service.from('readers').insert({user_id:userId,username:name});
  if(error&&error.code!=='23505')throw new Error(`perfil: ${error.code}`);
  return name;
}

/** Emite un token de un solo uso; invalida los anteriores abiertos del mismo propósito. Devuelve el token en claro (solo para el correo). */
async function issueToken(userId:string,purpose:'password_reset'|'email_verify',ttlMs:number){
  const service=serviceClient(),token=newToken();
  await service.from('auth_tokens').update({used_at:new Date().toISOString()}).eq('user_id',userId).eq('purpose',purpose).is('used_at',null);
  const {error}=await service.from('auth_tokens').insert({user_id:userId,purpose,token_hash:hashToken(token),expires_at:new Date(Date.now()+ttlMs).toISOString()});
  if(error)throw new Error(`token: ${error.code}`);
  return token;
}
/** Consume un token de forma atómica (un solo UPDATE): un segundo uso no encuentra token abierto. */
async function consumeToken(token:string,purpose:'password_reset'|'email_verify'){
  const {data,error}=await serviceClient().from('auth_tokens').update({used_at:new Date().toISOString()}).eq('token_hash',hashToken(token)).eq('purpose',purpose).is('used_at',null).gt('expires_at',new Date().toISOString()).select('user_id').maybeSingle();
  if(error)throw new Error(`consumo de token: ${error.code}`);
  return data?.user_id as string|undefined;
}
async function peekToken(token:string,purpose:'password_reset'|'email_verify'){
  const {data}=await serviceClient().from('auth_tokens').select('user_id').eq('token_hash',hashToken(token)).eq('purpose',purpose).is('used_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
  return data?.user_id as string|undefined;
}
async function findUserByEmail(address:string){
  const {data,error}=await serviceClient().rpc('auth_user_by_email',{p_email:address});
  if(error)throw new Error(`búsqueda de cuenta: ${error.code}`);
  const row=(data as {id:string;email_confirmed:boolean}[]|null)?.[0];
  return row??null;
}
/** Tras un cambio real de contraseña: fuera la temporal y la bandera de cambio obligatorio. */
async function clearTemporary(userId:string){
  const service=serviceClient();
  const [a,b]=await Promise.all([service.from('account_secrets').delete().eq('user_id',userId),service.from('admins').update({must_change_password:false}).eq('user_id',userId)]);
  if(a.error||b.error)throw new Error('no se pudo limpiar la contraseña temporal');
}
async function tempHash(userId:string){const {data}=await serviceClient().from('account_secrets').select('temp_password_hash,temp_password_expires_at').eq('user_id',userId).maybeSingle();return data as {temp_password_hash:string;temp_password_expires_at:string}|null;}

// ───────────── Entrar ─────────────
export async function signIn(input:unknown):Promise<ReaderResult>{try{
  if(isDemo())return demo();
  const parsed=z.object({email,password,otp:z.string().regex(/^\d{6}$/).optional().or(z.literal('')),next:z.string().optional()}).safeParse(input);
  if(!parsed.success)return {ok:false,code:'LOGIN_FAILED',message:LOGIN_FAILED};
  const {email:address,password:secret,otp,next}=parsed.data;
  if(!(await allow('login_ip',await clientIp()))||!(await allow('login_account',address)))return {ok:false,code:'RATE_LIMITED',message:TOO_MANY};
  const client=await sessionClient();
  const {data,error}=await client.auth.signInWithPassword({email:address,password:secret});
  if(error||!data.user)return {ok:false,code:'LOGIN_FAILED',message:LOGIN_FAILED};
  // Correo sin confirmar: mismo mensaje genérico con una pista útil, sin confirmar si la cuenta existe para quien no conoce la contraseña.
  if(!data.user.email_confirmed_at){await client.auth.signOut({scope:'local'});return {ok:false,code:'EMAIL_UNCONFIRMED',message:'Confirma tu correo con el enlace que te enviamos antes de entrar.'};}
  const service=serviceClient();
  const [{data:admin},temp]=await Promise.all([service.from('admins').select('user_id,must_change_password').eq('user_id',data.user.id).maybeSingle(),tempHash(data.user.id)]);
  if(temp&&new Date(temp.temp_password_expires_at).getTime()<Date.now()){await client.auth.signOut({scope:'local'});return {ok:false,code:'TEMP_EXPIRED',message:'Tu contraseña temporal venció. Usa «Olvidé mi contraseña» o pide una nueva a otro administrador.'};}
  if(admin){
    const {data:factors,error:factorError}=await client.auth.mfa.listFactors();
    if(factorError){await client.auth.signOut({scope:'local'});return fail(new Error(`mfa: ${factorError.message}`),'signIn');}
    const factor=factors.totp.find(f=>f.status==='verified');
    if(factor){
      if(!otp)return {ok:false,code:'OTP_REQUIRED',needsOtp:true,message:'Escribe el código de 6 dígitos de tu aplicación de autenticación.'};
      const {error:otpError}=await client.auth.mfa.challengeAndVerify({factorId:factor.id,code:otp});
      if(otpError)return {ok:false,code:'OTP_INVALID',needsOtp:true,message:'El código no es válido o ya venció. Escribe el código actual.'};
    }
  }
  await client.auth.signOut({scope:'others'});
  const mustChange=!!admin?.must_change_password||!!temp;
  await ensureProfile(data.user.id);
  await startSessionCookies(mustChange);
  return {ok:true,message:'Sesión iniciada.',mustChange,role:admin?'admin':'usuario',next:mustChange?CHANGE_PASSWORD_PATH:safeNext(next,admin?'/admin':'/cuenta')};
}catch(e){return fail(e,'signIn');}}

// ───────────── Crear cuenta ─────────────
export async function signUp(input:unknown):Promise<ReaderResult>{try{
  if(isDemo())return demo();
  const parsed=z.object({email,username,password,display_name:z.string().trim().max(60).optional()}).safeParse(input);
  if(!parsed.success)return invalid(parsed.error);
  const v=parsed.data;
  if(!(await allow('signup_ip',await clientIp())))return {ok:false,code:'RATE_LIMITED',message:TOO_MANY};
  const policy=await checkPassword(v.password,{email:v.email,username:v.username});
  if(!policy.ok)return {ok:false,code:policy.code,message:policy.message,errors:{password:policy.message}};
  const service=serviceClient();
  const {data:taken}=await service.from('readers').select('user_id').eq('username',v.username).maybeSingle();
  if(taken)return {ok:false,code:'USERNAME_TAKEN',message:'Ese nombre de usuario ya está en uso. Prueba con otro.',errors:{username:'Ese nombre de usuario ya está en uso.'}};
  const sent:ReaderResult={ok:true,code:'CHECK_EMAIL',message:`Te enviamos un correo a ${v.email} para confirmar tu cuenta. El enlace vence en ${VERIFY_HOURS} horas.`};
  const existing=await findUserByEmail(v.email);
  if(existing){
    // No revelamos que existe: misma respuesta, y el aviso llega solo al dueño del correo.
    await sendMail(existingAccountMail(v.email,`${siteBase()}/cuenta/entrar`,`${siteBase()}/cuenta/recuperar`));
    return sent;
  }
  const {data,error}=await service.auth.admin.createUser({email:v.email,password:v.password,email_confirm:false,user_metadata:{display_name:v.display_name??''}});
  if(error||!data.user)throw new Error(`createUser: ${error?.message}`);
  const {error:profileError}=await service.from('readers').insert({user_id:data.user.id,username:v.username,display_name:v.display_name??''});
  if(profileError){await service.auth.admin.deleteUser(data.user.id);if(profileError.code==='23505')return {ok:false,code:'USERNAME_TAKEN',message:'Ese nombre de usuario ya está en uso. Prueba con otro.',errors:{username:'Ese nombre de usuario ya está en uso.'}};throw new Error(`perfil: ${profileError.code}`);}
  const token=await issueToken(data.user.id,'email_verify',VERIFY_HOURS*3600*1000);
  await sendMail(verifyMail(v.email,`${siteBase()}/cuenta/verificar?token=${token}`,VERIFY_HOURS));
  return sent;
}catch(e){return fail(e,'signUp');}}

/** Confirma el correo. Se llama desde un botón (POST), no al abrir el enlace: los escáneres de enlaces no lo consumen. */
export async function verifyEmail(token:unknown):Promise<ReaderResult>{try{
  if(isDemo())return demo();
  if(!(await allow('verify_ip',await clientIp())))return {ok:false,code:'RATE_LIMITED',message:TOO_MANY};
  if(!isTokenShape(token))return {ok:false,code:'TOKEN_INVALID',message:'El enlace no es válido o ya venció. Crea la cuenta de nuevo o pide otro enlace.'};
  const userId=await consumeToken(token,'email_verify');
  if(!userId)return {ok:false,code:'TOKEN_INVALID',message:'El enlace no es válido, ya se usó o venció.'};
  const {error}=await serviceClient().auth.admin.updateUserById(userId,{email_confirm:true});
  if(error)throw new Error(`confirmar correo: ${error.message}`);
  return {ok:true,message:'Tu correo quedó confirmado. Ya puedes entrar.',next:'/cuenta/entrar?aviso=confirmado'};
}catch(e){return fail(e,'verifyEmail');}}

// ───────────── Recuperar contraseña ─────────────
export async function requestPasswordReset(input:unknown):Promise<ReaderResult>{
  const same:ReaderResult={ok:true,code:'CHECK_EMAIL',message:`Si hay una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña. Vence en ${RESET_MINUTES} minutos.`};
  try{
    if(isDemo())return demo();
    const parsed=z.object({email}).safeParse(input);if(!parsed.success)return invalid(parsed.error);
    if(!(await allow('reset_request_ip',await clientIp())))return {ok:false,code:'RATE_LIMITED',message:TOO_MANY};
    // Por cuenta: si se excede, se responde igual (no revela nada) pero no se envía otro correo.
    if(!(await allow('reset_request_account',parsed.data.email)))return same;
    const user=await findUserByEmail(parsed.data.email);
    if(user){const token=await issueToken(user.id,'password_reset',RESET_MINUTES*60*1000);await sendMail(resetMail(parsed.data.email,`${siteBase()}/cuenta/restablecer?token=${token}`,RESET_MINUTES));}
    return same;
  }catch(e){console.error('[cuenta] requestPasswordReset:',e instanceof Error?e.message:e);return same;}
}

export async function resetPassword(input:unknown):Promise<ReaderResult>{try{
  if(isDemo())return demo();
  const parsed=z.object({token:z.string(),password}).safeParse(input);if(!parsed.success)return invalid(parsed.error);
  if(!(await allow('reset_confirm_ip',await clientIp())))return {ok:false,code:'RATE_LIMITED',message:TOO_MANY};
  const {token,password:secret}=parsed.data;
  const expired:ReaderResult={ok:false,code:'TOKEN_INVALID',message:'El enlace no es válido, ya se usó o venció. Pide uno nuevo.'};
  if(!isTokenShape(token))return expired;
  const userId=await peekToken(token,'password_reset');if(!userId)return expired;
  const service=serviceClient();
  const {data:{user}}=await service.auth.admin.getUserById(userId);
  const {data:profile}=await service.from('readers').select('username').eq('user_id',userId).maybeSingle();
  const policy=await checkPassword(secret,{email:user?.email,username:profile?.username});
  if(!policy.ok)return {ok:false,code:policy.code,message:policy.message,errors:{password:policy.message}};
  const temp=await tempHash(userId);
  if(temp&&await matchesTemp(secret,temp.temp_password_hash))return {ok:false,code:'REUSED_TEMP',message:'No puedes usar la contraseña temporal como definitiva.',errors:{password:'Elige una contraseña distinta a la temporal.'}};
  // La API de administrador no impide repetir la contraseña actual: se comprueba con un cliente aparte.
  const {url,key}=credentials();
  const probe=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  if(user?.email){
    const {error:differs}=await probe.auth.signInWithPassword({email:user.email,password:secret});
    if(!differs){await probe.auth.signOut({scope:'local'});return {ok:false,code:'SAME_PASSWORD',message:'La nueva contraseña debe ser distinta a la actual.',errors:{password:'Debe ser distinta a la actual.'}};}
  }
  // Ahora sí se consume (atómico): si dos pestañas lo usan a la vez, solo una gana.
  if(await consumeToken(token,'password_reset')!==userId)return expired;
  const {error}=await service.auth.admin.updateUserById(userId,{password:secret,email_confirm:true});
  if(error)throw new Error(`cambio por enlace: ${error.message}`);
  await clearTemporary(userId);
  // Revoca todas las sesiones abiertas (quien pidió el enlace pudo perder el control de la cuenta).
  if(user?.email){
    const {error:loginError}=await probe.auth.signInWithPassword({email:user.email,password:secret});
    if(loginError||(await probe.auth.signOut({scope:'global'})).error)console.error('[cuenta] resetPassword: no se pudieron revocar las sesiones');
  }
  return {ok:true,message:'Listo: tu contraseña cambió. Entra con la nueva.',next:'/cuenta/entrar?aviso=contrasena'};
}catch(e){return fail(e,'resetPassword');}}

// ───────────── Cambiar contraseña (con sesión) ─────────────
export async function changePassword(input:unknown):Promise<ReaderResult>{try{
  const {client,user,account}=await requireUser({allowTemporary:true});
  const parsed=z.object({current:password,password}).safeParse(input);if(!parsed.success)return invalid(parsed.error);
  const {current,password:next}=parsed.data;
  if(!(await allow('password_change_account',user.id)))return {ok:false,code:'RATE_LIMITED',message:TOO_MANY};
  // Verifica la contraseña actual con un cliente aparte y cierra esa sesión de prueba.
  const {url,key}=credentials();
  const probe=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error:wrong}=await probe.auth.signInWithPassword({email:account.email,password:current});
  if(wrong)return {ok:false,code:'WRONG_PASSWORD',message:'La contraseña actual no es correcta.',errors:{current:'La contraseña actual no es correcta.'}};
  await probe.auth.signOut({scope:'local'});
  if(current===next)return {ok:false,code:'SAME_PASSWORD',message:'La nueva contraseña debe ser distinta a la actual.',errors:{password:'Debe ser distinta a la actual.'}};
  const {data:profile}=await serviceClient().from('readers').select('username').eq('user_id',user.id).maybeSingle();
  const policy=await checkPassword(next,{email:account.email,username:profile?.username});
  if(!policy.ok)return {ok:false,code:policy.code,message:policy.message,errors:{password:policy.message}};
  const temp=await tempHash(user.id);
  if(temp&&await matchesTemp(next,temp.temp_password_hash))return {ok:false,code:'REUSED_TEMP',message:'No puedes reutilizar la contraseña temporal.',errors:{password:'Elige una contraseña distinta a la temporal.'}};
  const {error}=await client.auth.updateUser({password:next});
  if(error)throw new Error(`updateUser: ${error.message}`);
  await clearTemporary(user.id);
  await client.auth.signOut({scope:'others'});
  (await cookies()).delete(MUST_CHANGE_COOKIE);
  return {ok:true,message:'Tu contraseña cambió. Cerramos tus otras sesiones.',next:account.role==='admin'&&account.mustChange?'/admin':undefined};
}catch(e){return fail(e,'changePassword');}}

// ───────────── Sesión ─────────────
export async function signOut():Promise<ReaderResult>{try{
  if(!isDemo()){const client=await sessionClient();await client.auth.signOut({scope:'local'});}
  await clearSessionCookies();
  return {ok:true,message:'Sesión cerrada.'};
}catch(e){await clearSessionCookies();return fail(e,'signOut');}}
export async function idleLogout():Promise<ReaderResult>{return signOut();}
export async function touchActivity():Promise<ReaderResult>{try{
  const current=await currentAccount();
  if(!current){(await cookies()).delete(HINT_COOKIE);return {ok:false,message:'',loggedIn:false};}
  (await cookies()).set(ACTIVITY_COOKIE,String(Date.now()),activityCookie);
  return {ok:true,message:'',loggedIn:true};
}catch{return {ok:false,message:''};}}

/** Quién soy (para la barra de navegación de páginas estáticas). */
export async function whoAmI():Promise<ReaderResult>{try{
  const current=await currentAccount();
  if(!current){(await cookies()).delete(HINT_COOKIE);return {ok:true,message:'',loggedIn:false};}
  const {data}=await serviceClient().from('readers').select('username').eq('user_id',current.user.id).maybeSingle();
  return {ok:true,message:'',loggedIn:true,role:current.account.role,mustChange:current.account.mustChange,username:data?.username??''};
}catch{return {ok:true,message:'',loggedIn:false};}}

// ───────────── Perfil ─────────────
export async function updateUsername(input:unknown):Promise<ReaderResult>{try{
  const {client,user}=await requireUser();
  const parsed=z.object({username}).safeParse(input);if(!parsed.success)return invalid(parsed.error);
  const {error}=await client.from('readers').update({username:parsed.data.username}).eq('user_id',user.id);
  if(error?.code==='23505')return {ok:false,code:'USERNAME_TAKEN',message:'Ese nombre de usuario ya está en uso.',errors:{username:'Ese nombre de usuario ya está en uso.'}};
  if(error)throw new Error(`username: ${error.code}`);
  return {ok:true,message:'Nombre de usuario actualizado.',username:parsed.data.username};
}catch(e){return fail(e,'updateUsername');}}

export async function updateFollows(input:unknown):Promise<ReaderResult>{try{
  const {client,user}=await requireUser();
  const parsed=z.object({follow_all:z.boolean(),follow_territories:z.array(z.enum(territories)).max(5)}).safeParse(input);if(!parsed.success)return invalid(parsed.error);
  const {error}=await client.from('readers').update({follow_all:parsed.data.follow_all,follow_territories:[...new Set(parsed.data.follow_territories)]}).eq('user_id',user.id);
  if(error)throw new Error(`follows: ${error.code}`);
  return {ok:true,message:'Guardado. Verás las novedades de lo que sigues en tu perfil.'};
}catch(e){return fail(e,'updateFollows');}}

export async function markSeen():Promise<ReaderResult>{try{
  const {client,user}=await requireUser();
  const {error}=await client.from('readers').update({seen_at:new Date().toISOString()}).eq('user_id',user.id);
  if(error)throw new Error(`seen: ${error.code}`);
  return {ok:true,message:'Novedades marcadas como vistas.'};
}catch(e){return fail(e,'markSeen');}}
