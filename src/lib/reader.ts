import 'server-only';
import {requireUser} from './account';
import type {Post,Pick} from './data/types';

export type ReaderProfile={username:string;display_name:string;follow_all:boolean;follow_territories:string[];seen_at:string};
export type ProfilePost=Post&{at:string;views?:number};
const POST='*,cover:media(*),review:post_reviews(subject,stars)';
const LIMIT=60;
type Joined={created_at?:string;last_viewed_at?:string;view_count?:number;post:Post|null};
/** Las publicaciones despublicadas desaparecen solas: RLS de posts devuelve null en el embebido. */
function posts(rows:Joined[]|null,at:'created_at'|'last_viewed_at'):ProfilePost[]{
  return (rows??[]).filter(r=>r.post).map(r=>({...r.post!,at:r[at]!,views:r.view_count}));
}

/** Todo lo del perfil en 6 consultas acotadas (sin N+1). */
export async function readerData(){
  const {client,user,account}=await requireUser();
  const now=new Date().toISOString();
  const [profile,likes,saves,history,pickRows]=await Promise.all([
    client.from('readers').select('username,display_name,follow_all,follow_territories,seen_at').eq('user_id',user.id).single(),
    client.from('post_likes').select(`created_at,post:posts(${POST})`).eq('user_id',user.id).order('created_at',{ascending:false}).limit(LIMIT),
    client.from('post_saves').select(`created_at,post:posts(${POST})`).eq('user_id',user.id).order('created_at',{ascending:false}).limit(LIMIT),
    client.from('post_views').select(`last_viewed_at,view_count,post:posts(${POST})`).eq('user_id',user.id).order('last_viewed_at',{ascending:false}).limit(LIMIT),
    client.from('saved_items').select('item_id').eq('user_id',user.id).eq('kind','pick').order('created_at',{ascending:false}).limit(LIMIT),
  ]);
  if(profile.error||likes.error||saves.error||history.error||pickRows.error)throw new Error('No pudimos cargar tu perfil.');
  const pickIds=(pickRows.data??[]).map(r=>r.item_id);
  const picks=pickIds.length?(await client.from('weekly_picks').select('*,cover:media(*)').in('id',pickIds).eq('status','published').lte('published_at',now)).data??[]:[];
  const p=profile.data as ReaderProfile;
  // Novedades de lo que sigues desde tu última visita (sin correos).
  let news:Post[]=[];
  if(p.follow_all||p.follow_territories.length){
    let q=client.from('posts').select('*,cover:media(*)').eq('kind','contenido').eq('status','published').gt('published_at',p.seen_at).lte('published_at',now).order('published_at',{ascending:false}).limit(12);
    if(!p.follow_all)q=q.in('territory',p.follow_territories);
    news=((await q).data??[]) as Post[];
  }
  return {profile:p,email:account.email,role:account.role,
    likes:posts(likes.data as unknown as Joined[],'created_at'),
    saves:posts(saves.data as unknown as Joined[],'created_at'),
    history:posts(history.data as unknown as Joined[],'last_viewed_at'),
    picks:picks as Pick[],news};
}
