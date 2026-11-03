'use server';
import {z} from 'zod';
import {cookies} from 'next/headers';
import {sessionClient} from '@/lib/supabase/server';
import {isDemo} from '@/lib/supabase/config';
import {ensureReader,readerClient} from '@/lib/reader';
import {ACTIVITY_COOKIE,activityCookie} from '@/lib/session';
import {passwordSchema,territories} from '@/lib/validators';

export type ReaderResult={ok:boolean;message:string;saved?:boolean;loggedIn?:boolean;needsCode?:boolean;needsLogin?:boolean;errors?:Record<string,string>};
const email=z.string().trim().toLowerCase().max(254).pipe(z.email());
const code=z.string().trim().regex(/^\d{6,8}$/,'Escribe el código numérico que recibiste por correo.');
const generic='No se pudo completar. Revisa tus datos e inténtalo de nuevo.';
function invalid(error:z.ZodError):ReaderResult{return {ok:false,message:'Revisa los campos señalados.',errors:Object.fromEntries(error.issues.map(i=>[String(i.path[0]),i.message]))};}
function demoNotice():ReaderResult{return {ok:false,message:'Las cuentas estarán disponibles al conectar el proyecto.'};}
async function touch(){(await cookies()).set(ACTIVITY_COOKIE,String(Date.now()),activityCookie);}

// Registro: el correo se confirma con un código de 6 dígitos (PIN).
export async function signUpReader(input:unknown):Promise<ReaderResult>{try{
  if(isDemo())return demoNotice();
  const parsed=z.object({email,password:passwordSchema,display_name:z.string().trim().max(60)}).safeParse(input);if(!parsed.success)return invalid(parsed.error);
  const client=await sessionClient();
  const {error}=await client.auth.signUp({email:parsed.data.email,password:parsed.data.password,options:{data:{display_name:parsed.data.display_name}}});
  if(error&&error.status!==400&&error.status!==422)return {ok:false,message:generic};
  return {ok:true,needsCode:true,message:'Si el correo es válido, te enviamos un código de verificación. Escríbelo para activar tu cuenta.'};
}catch{return {ok:false,message:generic};}}

export async function verifySignup(input:unknown):Promise<ReaderResult>{try{
  if(isDemo())return demoNotice();
  const parsed=z.object({email,code}).safeParse(input);if(!parsed.success)return invalid(parsed.error);
  const client=await sessionClient();
  const {data,error}=await client.auth.verifyOtp({email:parsed.data.email,token:parsed.data.code,type:'signup'});
  if(error||!data.user)return {ok:false,needsCode:true,message:'Código inválido o vencido.'};
  await ensureReader(client,data.user.id,String(data.user.user_metadata?.display_name??''));
  await client.auth.signOut({scope:'others'});
  await touch();
  return {ok:true,message:'Cuenta activada.'};
}catch{return {ok:false,message:generic};}}

// Login único: al iniciar sesión se cierran las demás sesiones de la misma cuenta.
export async function signInReader(input:unknown):Promise<ReaderResult>{try{
  if(isDemo())return demoNotice();
  const parsed=z.object({email,password:z.string().min(1).max(200)}).safeParse(input);if(!parsed.success)return {ok:false,message:'No se pudo iniciar sesión. Revisa tus datos.'};
  const client=await sessionClient();
  const {data,error}=await client.auth.signInWithPassword(parsed.data);
  if(error||!data.user)return {ok:false,message:'No se pudo iniciar sesión. Revisa tus datos.'};
  await ensureReader(client,data.user.id,String(data.user.user_metadata?.display_name??''));
  await client.auth.signOut({scope:'others'});
  await touch();
  return {ok:true,message:'Sesión iniciada.'};
}catch{return {ok:false,message:'No se pudo iniciar sesión. Inténtalo nuevamente.'};}}

// Recuperación: código (PIN) por correo y nueva contraseña. La respuesta no revela si el correo existe.
export async function requestReset(input:unknown):Promise<ReaderResult>{try{
  if(isDemo())return demoNotice();
  const parsed=z.object({email}).safeParse(input);if(!parsed.success)return invalid(parsed.error);
  const client=await sessionClient();
  await client.auth.signInWithOtp({email:parsed.data.email,options:{shouldCreateUser:false}});
  return {ok:true,needsCode:true,message:'Si existe una cuenta con ese correo, te enviamos un código de 6 dígitos.'};
}catch{return {ok:true,needsCode:true,message:'Si existe una cuenta con ese correo, te enviamos un código de 6 dígitos.'};}}

export async function resetPassword(input:unknown):Promise<ReaderResult>{try{
  if(isDemo())return demoNotice();
  const parsed=z.object({email,code,password:passwordSchema}).safeParse(input);if(!parsed.success)return invalid(parsed.error);
  const client=await sessionClient();
  const {data,error}=await client.auth.verifyOtp({email:parsed.data.email,token:parsed.data.code,type:'email'});
  if(error||!data.user)return {ok:false,needsCode:true,message:'Código inválido o vencido.'};
  const {error:updateError}=await client.auth.updateUser({password:parsed.data.password});
  if(updateError){await client.auth.signOut();return {ok:false,message:'No pudimos cambiar la contraseña. Solicita un código nuevo.'};}
  await ensureReader(client,data.user.id,String(data.user.user_metadata?.display_name??''));
  await client.auth.signOut({scope:'others'});
  await touch();
  return {ok:true,message:'Contraseña actualizada.'};
}catch{return {ok:false,message:generic};}}

export async function changeReaderPassword(input:unknown):Promise<ReaderResult>{try{
  const {client}=await readerClient();
  const parsed=passwordSchema.safeParse(input);if(!parsed.success)return {ok:false,message:'Usa al menos 12 caracteres.'};
  const {error}=await client.auth.updateUser({password:parsed.data});
  if(error)return {ok:false,message:'No se pudo cambiar la contraseña. Vuelve a iniciar sesión.'};
  await client.auth.signOut({scope:'others'});
  return {ok:true,message:'Contraseña actualizada. Se cerraron tus otras sesiones.'};
}catch(e){return {ok:false,message:e instanceof Error?e.message:generic};}}

export async function signOutReader():Promise<ReaderResult>{try{
  if(isDemo())return {ok:true,message:'Sesión cerrada.'};
  const client=await sessionClient();await client.auth.signOut();(await cookies()).delete(ACTIVITY_COOKIE);
  return {ok:true,message:'Sesión cerrada.'};
}catch{return {ok:false,message:'No pudimos cerrar la sesión.'};}}

/** Cierre automático por inactividad (lo dispara el navegador al detectar demasiado tiempo sin actividad). */
export async function idleLogout():Promise<ReaderResult>{return signOutReader();}
/** Marca actividad real del usuario (con throttling en el cliente). */
export async function touchActivity():Promise<ReaderResult>{try{
  if(isDemo())return {ok:false,message:''};
  const client=await sessionClient();const {data:{user}}=await client.auth.getUser();
  if(!user)return {ok:false,message:'',loggedIn:false};
  await touch();return {ok:true,message:'',loggedIn:true};
}catch{return {ok:false,message:''};}}

const target=z.object({kind:z.enum(['post','review','pick']),item_id:z.uuid()});
export async function savedState(input:unknown):Promise<ReaderResult>{try{
  const parsed=target.safeParse(input);if(!parsed.success||isDemo())return {ok:true,message:'',loggedIn:false,saved:false};
  const client=await sessionClient();const {data:{user}}=await client.auth.getUser();
  if(!user)return {ok:true,message:'',loggedIn:false,saved:false};
  const {data}=await client.from('saved_items').select('item_id').eq('kind',parsed.data.kind).eq('item_id',parsed.data.item_id).maybeSingle();
  return {ok:true,message:'',loggedIn:true,saved:!!data};
}catch{return {ok:true,message:'',loggedIn:false,saved:false};}}

export async function toggleSaved(input:unknown):Promise<ReaderResult>{try{
  const parsed=target.safeParse(input);if(!parsed.success)return {ok:false,message:'Contenido inválido.'};
  if(isDemo())return {ok:false,message:'Las cuentas estarán disponibles al conectar el proyecto.',needsLogin:true};
  let session;try{session=await readerClient();}catch{return {ok:false,message:'Inicia sesión para guardar contenido.',needsLogin:true};}
  const {client,user}=session;
  const {data:existing}=await client.from('saved_items').select('item_id').eq('kind',parsed.data.kind).eq('item_id',parsed.data.item_id).maybeSingle();
  const {error}=existing?await client.from('saved_items').delete().eq('user_id',user.id).eq('kind',parsed.data.kind).eq('item_id',parsed.data.item_id):await client.from('saved_items').insert({user_id:user.id,...parsed.data});
  if(error)return {ok:false,message:'No pudimos actualizar tus guardados.'};
  return {ok:true,saved:!existing,loggedIn:true,message:existing?'Quitado de tus guardados.':'Guardado en tu cuenta.'};
}catch{return {ok:false,message:'No pudimos actualizar tus guardados.'};}}

export async function updateFollows(input:unknown):Promise<ReaderResult>{try{
  const {client,user}=await readerClient();
  const parsed=z.object({follow_all:z.boolean(),follow_territories:z.array(z.enum(territories)).max(5)}).safeParse(input);if(!parsed.success)return {ok:false,message:'Selección inválida.'};
  const {error}=await client.from('readers').update({follow_all:parsed.data.follow_all,follow_territories:[...new Set(parsed.data.follow_territories)]}).eq('user_id',user.id);
  if(error)return {ok:false,message:'No pudimos guardar lo que sigues.'};
  return {ok:true,message:'Listo. Verás las novedades de lo que sigues en tu cuenta.'};
}catch(e){return {ok:false,message:e instanceof Error?e.message:generic};}}

export async function markSeen():Promise<ReaderResult>{try{
  const {client,user}=await readerClient();
  const {error}=await client.from('readers').update({seen_at:new Date().toISOString()}).eq('user_id',user.id);
  return error?{ok:false,message:'No pudimos marcar las novedades.'}:{ok:true,message:'Novedades marcadas como vistas.'};
}catch(e){return {ok:false,message:e instanceof Error?e.message:generic};}}
