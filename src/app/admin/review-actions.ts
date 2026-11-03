'use server';
import {z} from 'zod';
import {revalidatePath,revalidateTag} from 'next/cache';
import {authorizedClient} from '@/lib/admin';
import {reviewSchema,voteSchema} from '@/lib/validators';
import type {ActionResult} from './actions';

function failure(error:unknown):ActionResult{return {ok:false,message:error instanceof Error?error.message:'No pudimos completar la acción. Inténtalo de nuevo.'};}
function invalid(error:z.ZodError):ActionResult{return {ok:false,message:'Revisa los campos señalados.',errors:Object.fromEntries(error.issues.map(i=>[String(i.path[0]),i.message]))};}
function refresh(){revalidateTag('reviews',{expire:0});revalidatePath('/','layout');revalidatePath('/admin','layout');}
function dbMessage(code:string,message=''){return code==='23505'?'Ese slug ya existe.':code==='23514'?message||'La reseña no cumple las reglas de publicación.':code==='23503'?'La portada ya no existe.':'No pudimos guardar los cambios. Revisa tu sesión y los datos.';}

export async function saveReview(id:string|null,input:unknown):Promise<ActionResult>{try{
  const {client,user}=await authorizedClient();
  const parsed=reviewSchema.safeParse(input);if(!parsed.success)return invalid(parsed.error);
  if(id&&!z.uuid().safeParse(id).success)return {ok:false,message:'Reseña inválida.'};
  const {data,error}=await (id?client.from('reviews').update(parsed.data).eq('id',id):client.from('reviews').insert({...parsed.data,created_by:user.id,status:'draft'})).select('id,status').single();
  if(error)return {ok:false,message:dbMessage(error.code,error.message)};
  refresh();
  return {ok:true,id:data.id,message:data.status==='pending'?'Reseña guardada. Al cambiar el texto se reinició la votación del equipo.':'Reseña guardada.'};
}catch(e){return failure(e);}}

export async function submitReview(id:unknown):Promise<ActionResult>{try{
  const {client}=await authorizedClient();
  if(!z.uuid().safeParse(id).success)return {ok:false,message:'Reseña inválida.'};
  const {data:review}=await client.from('reviews').select('title,analysis_md').eq('id',String(id)).maybeSingle();
  if(!review)return {ok:false,message:'Reseña no encontrada.'};
  if(review.analysis_md.trim().length<200)return {ok:false,message:'Escribe un análisis de al menos 200 caracteres antes de enviarlo a evaluación.'};
  const {error}=await client.from('reviews').update({status:'pending'}).eq('id',String(id)).eq('status','draft');
  if(error)return {ok:false,message:dbMessage(error.code,error.message)};
  await client.rpc('notify_admins',{p_code:'resena',p_message:`Reseña lista para evaluar: ${review.title}`});
  refresh();
  return {ok:true,message:'Enviada a evaluación. Los tres administradores recibieron un aviso.'};
}catch(e){return failure(e);}}

export async function voteReview(input:unknown):Promise<ActionResult>{try{
  const {client,user}=await authorizedClient();
  const parsed=voteSchema.safeParse(input);if(!parsed.success)return invalid(parsed.error);
  const v=parsed.data;
  const {data:review}=await client.from('reviews').select('title,status').eq('id',v.review_id).maybeSingle();
  if(!review||!['pending','approved'].includes(review.status))return {ok:false,message:'Esta reseña no está en evaluación.'};
  const {error}=await client.from('review_approvals').upsert({review_id:v.review_id,admin_id:user.id,approved:v.approved,stars_vote:v.stars_vote,comment:v.comment,updated_at:new Date().toISOString()},{onConflict:'review_id,admin_id'});
  if(error)return {ok:false,message:'No pudimos registrar tu evaluación.'};
  const {data:after}=await client.from('reviews').select('status').eq('id',v.review_id).single();
  if(after?.status==='approved')await client.rpc('notify_admins',{p_code:'resena',p_message:`Reseña aprobada por todo el equipo: ${review.title}. Ya se puede publicar.`,p_dedupe:`approved-${v.review_id}-${Date.now()}`});
  refresh();
  return {ok:true,message:after?.status==='approved'?'Evaluación registrada. ¡Todo el equipo la aprobó!':'Evaluación registrada.'};
}catch(e){return failure(e);}}

export async function publishReview(id:unknown,publishedAt?:unknown):Promise<ActionResult>{try{
  const {client}=await authorizedClient();
  if(!z.uuid().safeParse(id).success)return {ok:false,message:'Reseña inválida.'};
  const when=typeof publishedAt==='string'&&publishedAt?new Date(`${publishedAt}:00-06:00`):new Date();
  if(Number.isNaN(when.getTime()))return {ok:false,message:'Fecha inválida.'};
  const {error}=await client.from('reviews').update({status:'published',published_at:when.toISOString()}).eq('id',String(id)).eq('status','approved');
  if(error)return {ok:false,message:dbMessage(error.code,error.message)};
  refresh();
  return {ok:true,message:when>new Date()?'Programada. Se mostrará en la fecha indicada.':'Publicada con la calificación promedio del equipo.'};
}catch(e){return failure(e);}}

export async function archiveReview(id:unknown):Promise<ActionResult>{try{
  const {client}=await authorizedClient();
  if(!z.uuid().safeParse(id).success)return {ok:false,message:'Reseña inválida.'};
  const {error}=await client.from('reviews').update({status:'archived'}).eq('id',String(id));
  if(error)return {ok:false,message:dbMessage(error.code,error.message)};
  refresh();
  return {ok:true,message:'Reseña archivada.'};
}catch(e){return failure(e);}}

export async function deleteReview(id:unknown):Promise<ActionResult>{try{
  const {client}=await authorizedClient();
  if(!z.uuid().safeParse(id).success)return {ok:false,message:'Reseña inválida.'};
  const {error}=await client.from('reviews').delete().eq('id',String(id));
  if(error)return {ok:false,message:dbMessage(error.code,error.message)};
  refresh();
  return {ok:true,message:'Reseña eliminada.'};
}catch(e){return failure(e);}}
