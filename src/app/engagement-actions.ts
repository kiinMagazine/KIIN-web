'use server';
import {z} from 'zod';
import {cookies} from 'next/headers';
import {AuthError,currentAccount,requireUser} from '@/lib/account';
import {publicClient} from '@/lib/supabase/public';
import {isDemo} from '@/lib/supabase/config';
import {HINT_COOKIE} from '@/lib/session';

export type EngagementResult={ok:boolean;message:string;code?:string;loggedIn:boolean;liked?:boolean;saved?:boolean;likes?:number};
const id=z.uuid();
const LOGIN='Crea una cuenta o inicia sesión para dar me gusta y guardar publicaciones.';

function fail(error:unknown,where:string):EngagementResult{
  if(error instanceof AuthError)return {ok:false,code:error.code,loggedIn:error.code!=='UNAUTHENTICATED'&&error.code!=='DEMO',message:error.code==='UNAUTHENTICATED'||error.code==='DEMO'?LOGIN:error.message};
  console.error(`[interacción] ${where}:`,error instanceof Error?error.message:error);
  return {ok:false,code:'SYSTEM',loggedIn:true,message:'No pudimos guardar tu acción. Inténtalo de nuevo.'};
}
async function likeCount(postId:string){
  if(isDemo())return 0;
  const {data}=await publicClient().rpc('post_like_count',{p_post:postId});
  return typeof data==='number'?data:0;
}

/** Estado para una publicación (las páginas son estáticas: se consulta al cargar). */
export async function engagementState(postId:unknown):Promise<EngagementResult>{try{
  if(!id.safeParse(postId).success)return {ok:false,loggedIn:false,message:'Publicación inválida.'};
  const pid=String(postId),likes=await likeCount(pid);
  const current=await currentAccount();
  if(!current){(await cookies()).delete(HINT_COOKIE);return {ok:true,loggedIn:false,message:'',likes};}
  const [liked,saved]=await Promise.all([
    current.client.from('post_likes').select('post_id').eq('user_id',current.user.id).eq('post_id',pid).maybeSingle(),
    current.client.from('post_saves').select('post_id').eq('user_id',current.user.id).eq('post_id',pid).maybeSingle(),
  ]);
  return {ok:true,loggedIn:true,message:'',likes,liked:!!liked.data,saved:!!saved.data};
}catch(e){return fail(e,'engagementState');}}

/**
 * Fija el estado (no alterna): repetir la misma petición deja el mismo resultado.
 * Insertar usa ON CONFLICT DO NOTHING sobre la clave (user_id, post_id); quitar es un DELETE.
 */
async function setFlag(table:'post_likes'|'post_saves',input:unknown,where:string):Promise<EngagementResult>{try{
  const parsed=z.object({postId:id,value:z.boolean()}).safeParse(input);
  if(!parsed.success)return {ok:false,loggedIn:true,message:'Petición inválida.'};
  const {client,user}=await requireUser();
  const {postId,value}=parsed.data;
  const {error}=value
    ?await client.from(table).upsert({user_id:user.id,post_id:postId},{onConflict:'user_id,post_id',ignoreDuplicates:true})
    :await client.from(table).delete().eq('user_id',user.id).eq('post_id',postId);
  // 42501: la política RLS rechazó (publicación no publicada). Es un error de la petición, no del sistema.
  if(error?.code==='42501')return {ok:false,loggedIn:true,code:'NOT_AVAILABLE',message:'Esta publicación ya no está disponible.'};
  if(error)throw new Error(`${table}: ${error.code}`);
  const likes=await likeCount(postId);
  return table==='post_likes'
    ?{ok:true,loggedIn:true,liked:value,likes,message:value?'Te gusta esta publicación.':'Quitaste tu me gusta.'}
    :{ok:true,loggedIn:true,saved:value,likes,message:value?'Guardada en tu perfil.':'Quitada de tus guardados.'};
}catch(e){return fail(e,where);}}
export async function setLike(input:unknown){return setFlag('post_likes',input,'setLike');}
export async function setSave(input:unknown){return setFlag('post_saves',input,'setSave');}

/** Historial: una fila por publicación; la función de la base actualiza la última apertura. */
export async function recordView(postId:unknown):Promise<EngagementResult>{try{
  if(!id.safeParse(postId).success||isDemo())return {ok:false,loggedIn:false,message:''};
  const current=await currentAccount();
  if(!current||current.account.mustChange)return {ok:true,loggedIn:!!current,message:''};
  const {error}=await current.client.rpc('record_post_view',{p_post:String(postId)});
  if(error)throw new Error(`record_post_view: ${error.code}`);
  return {ok:true,loggedIn:true,message:''};
}catch(e){return fail(e,'recordView');}}

/** Borra tu historial completo (solo el tuyo; RLS). */
export async function clearHistory():Promise<EngagementResult>{try{
  const {client,user}=await requireUser();
  const {error}=await client.from('post_views').delete().eq('user_id',user.id);
  if(error)throw new Error(`clearHistory: ${error.code}`);
  return {ok:true,loggedIn:true,message:'Tu historial quedó vacío.'};
}catch(e){return fail(e,'clearHistory');}}

/** Guardar selecciones de la semana (se conservan en saved_items). Mismo criterio: fija el estado. */
export async function setPickSave(input:unknown):Promise<EngagementResult>{try{
  const parsed=z.object({pickId:id,value:z.boolean()}).safeParse(input);
  if(!parsed.success)return {ok:false,loggedIn:true,message:'Petición inválida.'};
  const {client,user}=await requireUser();
  const {pickId,value}=parsed.data;
  const {error}=value
    ?await client.from('saved_items').upsert({user_id:user.id,kind:'pick',item_id:pickId},{onConflict:'user_id,kind,item_id',ignoreDuplicates:true})
    :await client.from('saved_items').delete().eq('user_id',user.id).eq('kind','pick').eq('item_id',pickId);
  if(error)throw new Error(`saved_items: ${error.code}`);
  return {ok:true,loggedIn:true,saved:value,message:value?'Guardada en tu perfil.':'Quitada de tus guardados.'};
}catch(e){return fail(e,'setPickSave');}}
export async function pickSaveState(pickId:unknown):Promise<EngagementResult>{try{
  if(!id.safeParse(pickId).success)return {ok:false,loggedIn:false,message:''};
  const current=await currentAccount();if(!current)return {ok:true,loggedIn:false,message:''};
  const {data}=await current.client.from('saved_items').select('item_id').eq('user_id',current.user.id).eq('kind','pick').eq('item_id',String(pickId)).maybeSingle();
  return {ok:true,loggedIn:true,saved:!!data,message:''};
}catch(e){return fail(e,'pickSaveState');}}
