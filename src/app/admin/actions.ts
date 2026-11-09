'use server';
import {z} from 'zod';
import {revalidatePath,revalidateTag} from 'next/cache';
import {authorizedClient} from '@/lib/admin';
import {AuthError} from '@/lib/account';
import {postSchema,pickSchema,mediaSchema} from '@/lib/validators';
import {pickSlug} from '@/lib/week';
export type ActionResult={ok:boolean;message:string;id?:string;errors?:Record<string,string>;needsOtp?:boolean;secret?:string;factorId?:string;temp?:string};
function failure(error:unknown):ActionResult{if(error instanceof AuthError)return {ok:false,message:error.message};console.error('[panel]',error instanceof Error?error.message:error);return {ok:false,message:'No pudimos guardar los cambios. Inténtalo de nuevo.'};}
function invalid(error:z.ZodError):ActionResult{return {ok:false,message:'Revisa los campos señalados.',errors:Object.fromEntries(error.issues.map(i=>[String(i.path[0]),i.message]))};}
function refresh(){revalidateTag('posts',{expire:0});revalidateTag('reviews',{expire:0});revalidateTag('picks',{expire:0});revalidatePath('/','layout');revalidatePath('/admin','layout');}
function dbMessage(code:string,message=''){return code==='23514'&&message?message:code==='23505'?'Ese slug ya existe o ya hay una selección de ese tipo en la semana.':code==='23503'?'Este archivo está en uso o ya no existe.':'No pudimos guardar los cambios. Revisa tu sesión y los datos.';}
/**
 * Guarda una publicación de cualquier tipo. Para reseñas además guarda sus datos (post_reviews) y, si se envía a votación,
 * registra el voto de quien la escribe. Las reglas de publicación de reseñas las impone la base (triggers).
 */
export async function savePost(id:string|null,input:unknown):Promise<ActionResult>{try{
  const {client,user}=await authorizedClient();
  const parsed=postSchema.safeParse(input);if(!parsed.success)return invalid(parsed.error);
  if(id&&!z.uuid().safeParse(id).success)return {ok:false,message:'Publicación inválida.'};
  const {kind,review,...row}=parsed.data;
  let postId=id;
  if(id){
    const {data:existing}=await client.from('posts').select('kind').eq('id',id).maybeSingle();
    if(!existing)return {ok:false,message:'Publicación no encontrada.'};
    if(existing.kind!==kind)return {ok:false,message:'El tipo de una publicación no se puede cambiar.'};
    const {error}=await client.from('posts').update(row).eq('id',id);
    if(error)return {ok:false,message:dbMessage(error.code,error.message)};
  }else{
    const {data,error}=await client.from('posts').insert({...row,kind,created_by:user.id}).select('id').single();
    if(error)return {ok:false,message:dbMessage(error.code,error.message)};
    postId=data.id;
  }
  let note='';
  if(kind==='review'&&review&&postId){
    const {data:current}=await client.from('post_reviews').select('state').eq('post_id',postId).maybeSingle();
    const state=current?.state??'draft';
    const {error:reviewError}=current
      ?await client.from('post_reviews').update({subject:review.subject,sources_md:review.sources_md,...(review.submit&&state==='draft'?{state:'voting'}:{})}).eq('post_id',postId)
      :await client.from('post_reviews').insert({post_id:postId,subject:review.subject,sources_md:review.sources_md,state:review.submit?'voting':'draft'});
    if(reviewError){if(!id)await client.from('posts').delete().eq('id',postId);return {ok:false,message:dbMessage(reviewError.code,reviewError.message)};}
    const {data:after}=await client.from('post_reviews').select('state').eq('post_id',postId).single();
    if(review.my_stars&&after&&after.state!=='draft'){
      const {error:voteError}=await client.from('review_votes').upsert({post_id:postId,admin_id:user.id,approved:true,stars_vote:review.my_stars,updated_at:new Date().toISOString()},{onConflict:'post_id,admin_id'});
      if(voteError)return {ok:false,id:postId,message:'Se guardó la reseña, pero no tu voto. Vota desde Reseñas.'};
    }
    if(review.submit&&state==='draft'){await client.rpc('notify_admins',{p_code:'resena',p_message:`Reseña lista para votar: ${row.title}`});note=' Se envió a votación del equipo.';}
    else if(current&&state!=='draft'&&after?.state==='voting'&&state==='approved')note=' Al cambiar el texto se reinició la votación.';
  }
  refresh();
  return {ok:true,id:postId!,message:(kind==='review'?'Reseña guardada.':'Publicación guardada.')+note};
}catch(e){return failure(e);}}
export async function savePick(id:string|null,input:unknown):Promise<ActionResult>{try{const {client,user}=await authorizedClient();const parsed=pickSchema.safeParse(input);if(!parsed.success)return invalid(parsed.error);if(id&&!z.uuid().safeParse(id).success)return {ok:false,message:'Selección inválida.'};if(parsed.data.cover_media_id){const {data:cover}=await client.from('media').select('width,height').eq('id',parsed.data.cover_media_id).single();if(!cover||cover.width!==cover.height)return {ok:false,message:'La portada de la semana debe ser cuadrada (1:1).'};}const row={...parsed.data,slug:pickSlug(parsed.data.kind,parsed.data.year,parsed.data.iso_week)};const query=id?client.from('weekly_picks').update(row).eq('id',id):client.from('weekly_picks').insert({...row,created_by:user.id});const {data,error}=await query.select('id').single();if(error)return {ok:false,message:dbMessage(error.code)};refresh();return {ok:true,id:data.id,message:'Selección guardada.'};}catch(e){return failure(e);}}
export async function changeContent(input:unknown):Promise<ActionResult>{try{const {client}=await authorizedClient();const parsed=z.object({table:z.enum(['posts','weekly_picks']),id:z.uuid(),operation:z.enum(['archive','delete'])}).safeParse(input);if(!parsed.success)return invalid(parsed.error);const p=parsed.data;const query=p.operation==='delete'?client.from(p.table).delete():client.from(p.table).update({status:'archived'});const {error}=await query.eq('id',p.id);if(error)return {ok:false,message:dbMessage(error.code)};refresh();return {ok:true,message:p.operation==='delete'?'Contenido eliminado.':'Contenido archivado.'};}catch(e){return failure(e);}}
export async function registerMedia(input:unknown):Promise<ActionResult>{try{const {client,user}=await authorizedClient();const parsed=mediaSchema.safeParse(input);if(!parsed.success)return invalid(parsed.error);const {data:files,error:filesError}=await client.storage.from('kiin-media').list(parsed.data.path_base,{limit:10});if(filesError||!files)return {ok:false,message:'No pudimos verificar los archivos subidos.'};for(const name of ['sm','md','lg'] as const){const file=files.find(f=>f.name===`${name}.webp`),variant=parsed.data.variants[name];if(!file||file.metadata?.mimetype!=='image/webp'||Number(file.metadata?.size)!==variant.bytes)return {ok:false,message:'Las variantes subidas no coinciden con los metadatos.'};}const {data,error}=await client.from('media').insert({...parsed.data,created_by:user.id}).select('id').single();if(error)return {ok:false,message:dbMessage(error.code)};refresh();return {ok:true,id:data.id,message:'Imagen guardada en la biblioteca.'};}catch(e){return failure(e);}}
export async function updateMedia(input:unknown):Promise<ActionResult>{try{const {client}=await authorizedClient();const parsed=z.object({id:z.uuid(),alt:z.string().trim().min(1).max(500),credit:z.string().max(500)}).safeParse(input);if(!parsed.success)return invalid(parsed.error);const {id,...row}=parsed.data;const {error}=await client.from('media').update(row).eq('id',id);if(error)return {ok:false,message:dbMessage(error.code)};refresh();return {ok:true,message:'Descripción actualizada.'};}catch(e){return failure(e);}}
export async function deleteMedia(id:unknown):Promise<ActionResult>{try{const {client}=await authorizedClient();if(!z.uuid().safeParse(id).success)return {ok:false,message:'Archivo inválido.'};const {data:row,error}=await client.from('media').delete().eq('id',String(id)).select('variants').single();if(error)return {ok:false,message:dbMessage(error.code)};const paths=Object.values(row.variants as Record<string,{path:string}>).map(v=>v.path);const {error:storageError}=await client.storage.from('kiin-media').remove(paths);refresh();return storageError?{ok:false,message:'La ficha se eliminó, pero Storage no respondió. Elimina las variantes huérfanas desde el panel de Supabase.'}:{ok:true,message:'Imagen y variantes eliminadas.'};}catch(e){return failure(e);}}
export async function enrollTotp():Promise<ActionResult>{try{const {client}=await authorizedClient();const {data:existing}=await client.auth.mfa.listFactors();for(const f of existing?.all??[])if(f.factor_type==='totp'&&f.status==='unverified')await client.auth.mfa.unenroll({factorId:f.id});const {data,error}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'KIIN'});if(error)return {ok:false,message:'No pudimos preparar la verificación. Comprueba si ya está activada.'};return {ok:true,message:'Añade la clave a tu aplicación y confirma un código.',secret:data.totp.secret,factorId:data.id};}catch(e){return failure(e);}}
export async function verifyTotp(input:unknown):Promise<ActionResult>{try{const {client}=await authorizedClient();const parsed=z.object({factorId:z.uuid(),code:z.string().regex(/^\d{6}$/)}).safeParse(input);if(!parsed.success)return invalid(parsed.error);const {error}=await client.auth.mfa.challengeAndVerify(parsed.data);return error?{ok:false,message:'Código inválido. Inténtalo con uno nuevo.'}:{ok:true,message:'Verificación en dos pasos activada.'};}catch(e){return failure(e);}}
