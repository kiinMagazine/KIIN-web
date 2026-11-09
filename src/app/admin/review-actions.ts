'use server';
import {z} from 'zod';
import {revalidatePath,revalidateTag} from 'next/cache';
import {authorizedClient} from '@/lib/admin';
import {AuthError} from '@/lib/account';
import {voteSchema} from '@/lib/validators';
import {mexicoToIso} from '@/lib/week';
import type {ActionResult} from './actions';

// Votación y publicación de reseñas (publicaciones tipo review). Las reglas viven en la base (09_publications.sql):
// solo se publica con la autorización de todos los admins y las estrellas KIIN son el promedio a media estrella.
function failure(error:unknown):ActionResult{if(error instanceof AuthError)return {ok:false,message:error.message};console.error('[reseñas]',error instanceof Error?error.message:error);return {ok:false,message:'No pudimos completar la acción. Inténtalo de nuevo.'};}
function invalid(error:z.ZodError):ActionResult{return {ok:false,message:'Revisa los campos señalados.',errors:Object.fromEntries(error.issues.map(i=>[String(i.path[0]),i.message]))};}
function refresh(){revalidateTag('reviews',{expire:0});revalidateTag('posts',{expire:0});revalidatePath('/','layout');revalidatePath('/admin','layout');}
function dbMessage(code:string,message=''){return code==='23514'?message||'La reseña no cumple las reglas de publicación.':code==='42501'?'Esta reseña no está en votación.':'No pudimos guardar los cambios. Revisa tu sesión y los datos.';}

export async function submitReview(id:unknown):Promise<ActionResult>{try{
  const {client}=await authorizedClient();
  if(!z.uuid().safeParse(id).success)return {ok:false,message:'Reseña inválida.'};
  const {data:post}=await client.from('posts').select('title,body_md').eq('id',String(id)).eq('kind','review').maybeSingle();
  if(!post)return {ok:false,message:'Reseña no encontrada.'};
  if(post.body_md.trim().length<200)return {ok:false,message:'Escribe un análisis de al menos 200 caracteres antes de enviarlo a votación.'};
  const {error}=await client.from('post_reviews').update({state:'voting'}).eq('post_id',String(id)).eq('state','draft');
  if(error)return {ok:false,message:dbMessage(error.code,error.message)};
  await client.rpc('notify_admins',{p_code:'resena',p_message:`Reseña lista para votar: ${post.title}`});
  refresh();
  return {ok:true,message:'Enviada a votación. El equipo recibió un aviso.'};
}catch(e){return failure(e);}}

export async function voteReview(input:unknown):Promise<ActionResult>{try{
  const {client,user}=await authorizedClient();
  const parsed=voteSchema.safeParse(input);if(!parsed.success)return invalid(parsed.error);
  const v=parsed.data;
  // Upsert por (post_id, admin_id): votar dos veces actualiza el mismo voto, no lo duplica.
  const {error}=await client.from('review_votes').upsert({post_id:v.review_id,admin_id:user.id,approved:v.approved,stars_vote:v.stars_vote,comment:v.comment,updated_at:new Date().toISOString()},{onConflict:'post_id,admin_id'});
  if(error)return {ok:false,message:dbMessage(error.code,error.message)};
  const [{data:state},{data:post}]=await Promise.all([client.from('post_reviews').select('state').eq('post_id',v.review_id).single(),client.from('posts').select('title').eq('id',v.review_id).single()]);
  if(state?.state==='approved')await client.rpc('notify_admins',{p_code:'resena',p_message:`Todo el equipo autorizó la reseña «${post?.title??''}». Ya se puede publicar.`,p_dedupe:`approved-${v.review_id}-${Date.now()}`});
  refresh();
  return {ok:true,message:state?.state==='approved'?'Voto registrado. Todo el equipo la autorizó: ya se puede publicar.':'Voto registrado.'};
}catch(e){return failure(e);}}

export async function publishReview(id:unknown,publishedAt?:unknown):Promise<ActionResult>{try{
  const {client}=await authorizedClient();
  if(!z.uuid().safeParse(id).success)return {ok:false,message:'Reseña inválida.'};
  const iso=typeof publishedAt==='string'&&publishedAt?mexicoToIso(publishedAt):new Date().toISOString();
  if(!iso||Number.isNaN(new Date(iso).getTime()))return {ok:false,message:'Fecha inválida.'};
  const {error}=await client.from('posts').update({status:'published',published_at:iso}).eq('id',String(id)).eq('kind','review');
  if(error)return {ok:false,message:dbMessage(error.code,error.message)};
  refresh();
  return {ok:true,message:new Date(iso)>new Date()?'Programada: se mostrará en la fecha indicada.':'Publicada con las estrellas KIIN del equipo.'};
}catch(e){return failure(e);}}
