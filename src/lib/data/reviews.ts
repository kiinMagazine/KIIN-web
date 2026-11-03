import {unstable_cache} from 'next/cache';
import {isDemo} from '@/lib/supabase/config';
import {publicClient} from '@/lib/supabase/public';
import {searchSchema} from '@/lib/validators';
import {demoReviews} from './demo-reviews';
import type {Review} from './types';

const normalize=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();

async function reviewsQuery({page=1,limit=12,kind}:{page?:number;limit?:number;kind?:'album'|'sencillo'}={}){
  const start=(Math.max(1,page)-1)*limit;
  if(isDemo()){const rows=demoReviews.filter(r=>!kind||r.kind===kind);return {items:rows.slice(start,start+limit),count:rows.length};}
  let query=publicClient().from('reviews').select('*,cover:media(*)',{count:'exact'}).eq('status','published').lte('published_at',new Date().toISOString()).order('published_at',{ascending:false}).order('id').range(start,start+limit-1);
  if(kind)query=query.eq('kind',kind);
  const {data,error,count}=await query;if(error)throw new Error('No pudimos consultar las reseñas.');
  return {items:(data??[]) as Review[],count:count??0};
}
async function reviewBySlugQuery(slug:string){
  if(isDemo())return demoReviews.find(r=>r.slug===slug)??null;
  const {data,error}=await publicClient().from('reviews').select('*,cover:media(*)').eq('slug',slug).eq('status','published').lte('published_at',new Date().toISOString()).maybeSingle();
  if(error)throw new Error('No pudimos consultar esta reseña.');
  return data as Review|null;
}
async function searchReviewsQuery(input:string){
  const parsed=searchSchema.safeParse(input);if(!parsed.success||!parsed.data)return [] as Review[];const q=parsed.data;
  if(isDemo())return demoReviews.filter(r=>normalize(`${r.title} ${r.artist} ${r.analysis_md}`).includes(normalize(q))).slice(0,20);
  const {data,error}=await publicClient().from('reviews').select('*,cover:media(*)').eq('status','published').lte('published_at',new Date().toISOString()).textSearch('search',q,{type:'websearch',config:'spanish'}).limit(20);
  if(error)throw new Error('La búsqueda no está disponible.');
  return (data??[]) as Review[];
}
const cachedReviews=unstable_cache(reviewsQuery,['reviews-list'],{revalidate:300,tags:['reviews']});
const cachedBySlug=unstable_cache(reviewBySlugQuery,['review-by-slug'],{revalidate:300,tags:['reviews']});
const cachedSearch=unstable_cache(searchReviewsQuery,['reviews-search'],{revalidate:300,tags:['reviews']});
export async function getReviews(options:Parameters<typeof reviewsQuery>[0]={}){return isDemo()?reviewsQuery(options):cachedReviews(options);}
export async function getReviewBySlug(slug:string){return isDemo()?reviewBySlugQuery(slug):cachedBySlug(slug);}
export async function searchReviews(q:string){return isDemo()?searchReviewsQuery(q):cachedSearch(q);}
