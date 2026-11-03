'use server';
import {z} from 'zod';
import {revalidatePath,revalidateTag} from 'next/cache';
import {authorizedClient} from '@/lib/admin';
import {serviceClient} from '@/lib/supabase/service';
import {tempPassword} from '@/lib/temp-password';
import {mexicoToIso} from '@/lib/week';
import type {ActionResult} from './actions';

function failure(error:unknown):ActionResult{return {ok:false,message:error instanceof Error?error.message:'No pudimos completar la acción. Inténtalo de nuevo.'};}
function invalid(error:z.ZodError):ActionResult{return {ok:false,message:'Revisa los campos señalados.',errors:Object.fromEntries(error.issues.map(i=>[String(i.path[0]),i.message]))};}
function refresh(){revalidateTag('posts',{expire:0});revalidatePath('/','layout');revalidatePath('/admin','layout');}

// ---- Equipo (máx. 3 administradores del mismo nivel) ----
const teamSchema=z.object({email:z.string().trim().toLowerCase().max(254).pipe(z.email()),display_name:z.string().trim().max(60)});
export async function addAdmin(input:unknown):Promise<ActionResult>{try{
  const {client}=await authorizedClient();
  const parsed=teamSchema.safeParse(input);if(!parsed.success)return invalid(parsed.error);
  const service=serviceClient();
  const {count}=await service.from('admins').select('user_id',{count:'exact',head:true});
  if((count??0)>=3)return {ok:false,message:'Ya hay 3 administradores. Es el máximo del equipo.'};
  const temp=tempPassword();
  const {data,error}=await service.auth.admin.createUser({email:parsed.data.email,password:temp,email_confirm:true});
  if(error||!data.user)return {ok:false,message:'No pudimos crear la cuenta. Quizá ese correo ya existe.'};
  const {error:insertError}=await service.from('admins').insert({user_id:data.user.id,email:parsed.data.email,display_name:parsed.data.display_name,must_change_password:true});
  if(insertError){await service.auth.admin.deleteUser(data.user.id);return {ok:false,message:'No pudimos registrar al administrador.'};}
  await client.rpc('notify_admins',{p_code:'equipo',p_message:`Se agregó a ${parsed.data.display_name||parsed.data.email} al equipo.`});
  refresh();
  return {ok:true,message:'Administrador creado. Copia la contraseña temporal: solo se muestra una vez.',temp};
}catch(e){return failure(e);}}

export async function resetAdminPassword(userId:unknown):Promise<ActionResult>{try{
  await authorizedClient();
  if(!z.uuid().safeParse(userId).success)return {ok:false,message:'Administrador inválido.'};
  const id=String(userId),service=serviceClient();
  const {data:target}=await service.from('admins').select('user_id').eq('user_id',id).maybeSingle();
  if(!target)return {ok:false,message:'Administrador no encontrado.'};
  const temp=tempPassword();
  const {error}=await service.auth.admin.updateUserById(id,{password:temp});
  if(error)return {ok:false,message:'No pudimos generar la contraseña temporal.'};
  const {error:flagError}=await service.from('admins').update({must_change_password:true}).eq('user_id',id);
  if(flagError)return {ok:false,message:'No pudimos marcar el cambio obligatorio.'};
  refresh();
  return {ok:true,message:'Contraseña temporal generada. Solo se muestra una vez.',temp};
}catch(e){return failure(e);}}

export async function heartbeat():Promise<ActionResult>{try{const {client}=await authorizedClient({allowTemporary:true});await client.rpc('touch_presence');return {ok:true,message:''};}catch{return {ok:false,message:''};}}

// ---- Parrilla ----
const gridSchema=z.object({post_id:z.uuid(),web_publish_at:z.string().max(40).nullable(),instagram:z.boolean(),instagram_at:z.string().max(40).nullable(),note:z.string().max(500)}).refine(v=>!v.instagram||!!v.instagram_at,{message:'Indica cuándo publicar en Instagram.',path:['instagram_at']});
export async function saveGridItem(input:unknown):Promise<ActionResult>{try{
  const {client,user}=await authorizedClient();
  const parsed=gridSchema.safeParse(input);if(!parsed.success)return invalid(parsed.error);
  const v=parsed.data,web=v.web_publish_at?mexicoToIso(v.web_publish_at):null,ig=v.instagram&&v.instagram_at?mexicoToIso(v.instagram_at):null;
  const row={post_id:v.post_id,web_publish_at:web,instagram:v.instagram,instagram_at:ig,instagram_notified_at:null,note:v.note};
  const {data:existing}=await client.from('grid_items').select('id').eq('post_id',v.post_id).maybeSingle();
  const {error}=existing?await client.from('grid_items').update(row).eq('id',existing.id):await client.from('grid_items').insert({...row,created_by:user.id});
  if(error)return {ok:false,message:'No pudimos guardar en la parrilla. Revisa las fechas.'};
  if(web){const {error:postError}=await client.from('posts').update({status:'published',published_at:web}).eq('id',v.post_id);if(postError)return {ok:false,message:'Se guardó en la parrilla, pero no pudimos programar la publicación en la web.'};}
  await client.rpc('notify_admins',{p_code:'parrilla',p_message:'Parrilla actualizada.'});
  refresh();
  return {ok:true,message:web?'Programada en la web y guardada en la parrilla.':'Guardada en la parrilla.'};
}catch(e){return failure(e);}}

export async function removeGridItem(id:unknown):Promise<ActionResult>{try{
  const {client}=await authorizedClient();
  if(!z.uuid().safeParse(id).success)return {ok:false,message:'Elemento inválido.'};
  const {error}=await client.from('grid_items').delete().eq('id',String(id));
  if(error)return {ok:false,message:'No pudimos quitarlo de la parrilla.'};
  refresh();
  return {ok:true,message:'Quitado de la parrilla.'};
}catch(e){return failure(e);}}

export async function toggleLike(id:unknown):Promise<ActionResult>{try{
  const {client,user}=await authorizedClient();
  if(!z.uuid().safeParse(id).success)return {ok:false,message:'Elemento inválido.'};
  const item=String(id);
  const {data}=await client.from('grid_likes').select('item_id').eq('item_id',item).eq('user_id',user.id).maybeSingle();
  const {error}=data?await client.from('grid_likes').delete().eq('item_id',item).eq('user_id',user.id):await client.from('grid_likes').insert({item_id:item,user_id:user.id});
  if(error)return {ok:false,message:'No pudimos registrar tu me gusta.'};
  revalidatePath('/admin/parrilla');
  return {ok:true,message:data?'Me gusta retirado.':'Me gusta registrado.'};
}catch(e){return failure(e);}}

// ---- Notificaciones internas (no es un chat) ----
const notices={publicacion_lista:'Publicación lista.',parrilla:'Parrilla actualizada.',reunion:'Hay que hacer una reunión.'} as const;
export async function sendNotice(kind:unknown):Promise<ActionResult>{try{
  const {client}=await authorizedClient();
  const parsed=z.enum(['publicacion_lista','parrilla','reunion']).safeParse(kind);if(!parsed.success)return {ok:false,message:'Aviso inválido.'};
  const {error}=await client.rpc('notify_admins',{p_code:parsed.data,p_message:notices[parsed.data]});
  if(error)return {ok:false,message:'No pudimos enviar el aviso.'};
  revalidatePath('/admin','layout');
  return {ok:true,message:'Aviso enviado al equipo.'};
}catch(e){return failure(e);}}

export async function markNotificationsRead():Promise<ActionResult>{try{
  const {client,user}=await authorizedClient();
  const {error}=await client.from('notifications').update({read_at:new Date().toISOString()}).eq('recipient_id',user.id).is('read_at',null);
  if(error)return {ok:false,message:'No pudimos marcar los avisos.'};
  revalidatePath('/admin','layout');
  return {ok:true,message:'Avisos marcados como leídos.'};
}catch(e){return failure(e);}}

export async function clearNotifications():Promise<ActionResult>{try{
  const {client,user}=await authorizedClient();
  const {error}=await client.from('notifications').delete().eq('recipient_id',user.id);
  if(error)return {ok:false,message:'No pudimos borrar tu historial.'};
  revalidatePath('/admin','layout');
  return {ok:true,message:'Tu historial se borró. El de tus compañeros no cambia.'};
}catch(e){return failure(e);}}
