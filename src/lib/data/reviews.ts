import {unstable_cache} from 'next/cache';
import {isDemo} from '@/lib/supabase/config';
import {publicClient} from '@/lib/supabase/public';
import {searchSchema} from '@/lib/validators';
import {demoReviews} from './demo-reviews';
import type {Review,Media} from './types';

/** Una reseña pública es una publicación kind='review' con sus datos de post_reviews (embebidos con !inner: una sola consulta). */
const SELECT='id,slug,title,artist,body_md,spotify_url,youtube_url,published_at,created_at,updated_at,status,cover_media_id,cover:media(*),review:post_reviews!inner(subject,sources_md,stars)';
type Row={id:string;slug:string;title:string;artist:string;body_md:string;spotify_url:string|null;youtube_url:string|null;published_at:string|null;created_at:string;updated_at:string;status:string;cover_media_id:string|null;cover:Media|null;review:{subject:'album'|'sencillo';sources_md:string;stars:number|null}};
export function toReview(r:Row):Review{return {id:r.id,slug:r.slug,title:r.title,artist:r.artist,kind:r.review.subject,analysis_md:r.body_md,sources_md:r.review.sources_md,spotify_url:r.spotify_url,youtube_url:r.youtube_url,cover_media_id:r.cover_media_id,cover:r.cover,stars:r.review.stars==null?null:Number(r.review.stars),published_at:r.published_at,created_at:r.created_at,updated_at:r.updated_at,status:'published'};}
const base=()=>publicClient().from('posts').select(SELECT,{count:'exact'}).eq('kind','review').eq('status','published').lte('published_at',new Date().toISOString());

const normalize=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();

async function reviewsQuery({page=1,limit=12,kind}:{page?:number;limit?:number;kind?:'album'|'sencillo'}={}){
  const start=(Math.max(1,page)-1)*limit;
  if(isDemo()){const rows=demoReviews.filter(r=>!kind||r.kind===kind);return {items:rows.slice(start,start+limit),count:rows.length};}
  let query=base().order('published_at',{ascending:false}).order('id').range(start,start+limit-1);
  if(kind)query=query.eq('post_reviews.subject',kind);
  const {data,error,count}=await query;if(error?.code==='PGRST103')return {items:[],count:0};if(error)throw new Error('No pudimos consultar las reseñas.');
  return {items:((data??[]) as unknown as Row[]).map(toReview),count:count??0};
}
async function reviewBySlugQuery(slug:string){
  if(isDemo())return demoReviews.find(r=>r.slug===slug)??null;
  const {data,error}=await base().eq('slug',slug).maybeSingle();
  if(error)throw new Error('No pudimos consultar esta reseña.');
  return data?toReview(data as unknown as Row):null;
}
async function searchReviewsQuery(input:string){
  const parsed=searchSchema.safeParse(input);if(!parsed.success||!parsed.data)return [] as Review[];const q=parsed.data;
  if(isDemo())return demoReviews.filter(r=>normalize(`${r.title} ${r.artist} ${r.analysis_md}`).includes(normalize(q))).slice(0,20);
  const {data,error}=await base().textSearch('search',q,{type:'websearch',config:'spanish'}).limit(20);
  if(error)throw new Error('La búsqueda no está disponible.');
  return ((data??[]) as unknown as Row[]).map(toReview);
}
const cachedReviews=unstable_cache(reviewsQuery,['reviews-list'],{revalidate:300,tags:['reviews']});
const cachedBySlug=unstable_cache(reviewBySlugQuery,['review-by-slug'],{revalidate:300,tags:['reviews']});
const cachedSearch=unstable_cache(searchReviewsQuery,['reviews-search'],{revalidate:300,tags:['reviews']});
export async function getReviews(options:Parameters<typeof reviewsQuery>[0]={}){return isDemo()?reviewsQuery(options):cachedReviews(options);}
export async function getReviewBySlug(slug:string){return isDemo()?reviewBySlugQuery(slug):cachedBySlug(slug);}
export async function searchReviews(q:string){return isDemo()?searchReviewsQuery(q):cachedSearch(q);}
