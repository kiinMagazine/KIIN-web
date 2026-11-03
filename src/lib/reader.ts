import {sessionClient} from './supabase/server';
import {isDemo} from './supabase/config';
import type {Post,Pick,Review} from './data/types';
export type SavedKind='post'|'review'|'pick';
export type ReaderProfile={display_name:string;follow_all:boolean;follow_territories:string[];seen_at:string};
export async function readerClient(){
  if(isDemo())throw new Error('Supabase no está configurado: las cuentas estarán disponibles al conectar el proyecto.');
  const client=await sessionClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)throw new Error('Inicia sesión para continuar.');
  return {client,user};
}
/** Crea la ficha de lector la primera vez que entra. */
export async function ensureReader(client:Awaited<ReturnType<typeof sessionClient>>,userId:string,displayName=''){
  await client.from('readers').upsert({user_id:userId,display_name:displayName.slice(0,60)},{onConflict:'user_id',ignoreDuplicates:true});
}
export async function readerData(){
  const {client,user}=await readerClient();
  await ensureReader(client,user.id,String(user.user_metadata?.display_name??''));
  const {data:profile}=await client.from('readers').select('display_name,follow_all,follow_territories,seen_at').eq('user_id',user.id).single();
  const {data:saved}=await client.from('saved_items').select('kind,item_id').order('created_at',{ascending:false}).limit(500);
  const ids=(kind:SavedKind)=>(saved??[]).filter(s=>s.kind===kind).map(s=>s.item_id);
  const now=new Date().toISOString();
  const [posts,reviews,picks]=await Promise.all([
    ids('post').length?client.from('posts').select('*,cover:media(*)').in('id',ids('post')).eq('status','published').lte('published_at',now):{data:[]},
    ids('review').length?client.from('reviews').select('*,cover:media(*)').in('id',ids('review')).eq('status','published').lte('published_at',now):{data:[]},
    ids('pick').length?client.from('weekly_picks').select('*,cover:media(*)').in('id',ids('pick')).eq('status','published').lte('published_at',now):{data:[]},
  ]);
  // Novedades: lo publicado desde tu última visita en lo que sigues (sin envíos por correo).
  const p=profile as ReaderProfile;
  let news:Post[]=[];
  if(p.follow_all||p.follow_territories.length){
    let q=client.from('posts').select('*,cover:media(*)').eq('status','published').gt('published_at',p.seen_at).lte('published_at',now).order('published_at',{ascending:false}).limit(20);
    if(!p.follow_all)q=q.in('territory',p.follow_territories);
    const {data}=await q;news=(data??[]) as Post[];
  }
  return {profile:p,email:user.email??'',saved:{posts:(posts.data??[]) as Post[],reviews:(reviews.data??[]) as Review[],picks:(picks.data??[]) as Pick[]},news};
}
