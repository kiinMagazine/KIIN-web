import {demoPosts,demoPicks} from './demo';
import {isDemo} from '@/lib/supabase/config';
import {publicClient} from '@/lib/supabase/public';
import {isoWeek} from '@/lib/week';
import {searchSchema} from '@/lib/validators';
import type {Post,Pick} from './types';
import {unstable_cache} from 'next/cache';
export {isDemo};
async function postsQuery({page=1,limit=12,territory}:{page?:number;limit?:number;territory?:string}={}){
  const start=(Math.max(1,page)-1)*limit;
  if(isDemo()){const rows=demoPosts.filter(p=>!territory||p.territory===territory);return {items:rows.slice(start,start+limit),count:rows.length};}
  let query=publicClient().from('posts').select('*,cover:media(*)',{count:'exact'}).eq('kind','contenido').eq('status','published').lte('published_at',new Date().toISOString()).order('published_at',{ascending:false}).order('id').range(start,start+limit-1);
  if(territory)query=query.eq('territory',territory);
  const {data,error,count}=await query;if(error)throw new Error('No pudimos consultar las historias.');return {items:(data??[]) as Post[],count:count??0};
}
async function getPostBySlugQuery(slug:string){if(isDemo())return demoPosts.find(p=>p.slug===slug)??null;const {data,error}=await publicClient().from('posts').select('*,cover:media(*)').eq('kind','contenido').eq('slug',slug).eq('status','published').lte('published_at',new Date().toISOString()).maybeSingle();if(error)throw new Error('No pudimos consultar esta historia.');return data as Post|null;}
async function getFeaturedQuery(){if(isDemo())return demoPosts.find(p=>p.featured)??null;const {data,error}=await publicClient().from('posts').select('*,cover:media(*)').eq('kind','contenido').eq('featured',true).eq('status','published').lte('published_at',new Date().toISOString()).order('published_at',{ascending:false}).limit(1).maybeSingle();if(error)throw new Error('No pudimos consultar el destacado.');return data as Post|null;}
async function getPickArchiveQuery(page=1){if(isDemo())return {items:page===1?demoPicks():[],count:2};const {data,error,count}=await publicClient().from('weekly_picks').select('*,cover:media(*)',{count:'exact'}).eq('status','published').lte('published_at',new Date().toISOString()).order('week_start',{ascending:false}).order('kind').range((page-1)*20,page*20-1);if(error)throw new Error('No pudimos consultar el archivo.');return {items:(data??[]) as Pick[],count:count??0};}
async function getCurrentPicksQuery(){const week=isoWeek().week_start;if(isDemo())return demoPicks();const {data,error}=await publicClient().from('weekly_picks').select('*,cover:media(*)').eq('status','published').eq('week_start',week).lte('published_at',new Date().toISOString());if(error)throw new Error('No pudimos consultar la semana.');return (data??[]) as Pick[];}
async function getPickBySlugQuery(slug:string){if(isDemo())return demoPicks().find(p=>p.slug===slug)??null;const {data,error}=await publicClient().from('weekly_picks').select('*,cover:media(*)').eq('slug',slug).eq('status','published').lte('published_at',new Date().toISOString()).maybeSingle();if(error)throw new Error('No pudimos consultar la selección.');return data as Pick|null;}
async function searchContentQuery(input:string){const parsed=searchSchema.safeParse(input);if(!parsed.success||!parsed.data)return {posts:[],picks:[]};const q=parsed.data;
  if(isDemo()){const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const match=(s:string)=>normalize(s).includes(normalize(q));return {posts:demoPosts.filter(p=>match(`${p.title} ${p.excerpt} ${p.body_md}`)).slice(0,20),picks:demoPicks().filter(p=>match(`${p.title} ${p.artist} ${p.note_md}`)).slice(0,20)};}
  const client=publicClient();const [posts,picks]=await Promise.all([client.from('posts').select('*,cover:media(*)').eq('kind','contenido').eq('status','published').lte('published_at',new Date().toISOString()).textSearch('search',q,{type:'websearch',config:'spanish'}).limit(20),client.from('weekly_picks').select('*,cover:media(*)').eq('status','published').lte('published_at',new Date().toISOString()).textSearch('search',q,{type:'websearch',config:'spanish'}).limit(20)]);
  if(posts.error||picks.error)throw new Error('La búsqueda no está disponible.');const rows=(posts.data??[]) as Post[];return {posts:rows,picks:((picks.data??[]) as Pick[]).slice(0,20-rows.length)};
}
export function pageNumber(value?:string){const n=Number(value);return Number.isSafeInteger(n)&&n>0?Math.min(n,10000):1;}
const cachedPosts=unstable_cache(postsQuery,['editorial-posts'],{revalidate:300,tags:['posts']});
export async function getPosts(options:Parameters<typeof postsQuery>[0]={}){return isDemo()?postsQuery(options):cachedPosts(options);}

const getPostBySlugCached=unstable_cache(getPostBySlugQuery,['getPostBySlug'],{revalidate:300,tags:["posts"]});
export async function getPostBySlug(...args:Parameters<typeof getPostBySlugQuery>){return isDemo()?getPostBySlugQuery(...args):getPostBySlugCached(...args);}

const getFeaturedCached=unstable_cache(getFeaturedQuery,['getFeatured'],{revalidate:300,tags:["posts"]});
export async function getFeatured(...args:Parameters<typeof getFeaturedQuery>){return isDemo()?getFeaturedQuery(...args):getFeaturedCached(...args);}

const getPickArchiveCached=unstable_cache(getPickArchiveQuery,['getPickArchive'],{revalidate:300,tags:["picks"]});
export async function getPickArchive(...args:Parameters<typeof getPickArchiveQuery>){return isDemo()?getPickArchiveQuery(...args):getPickArchiveCached(...args);}

const getCurrentPicksCached=unstable_cache(getCurrentPicksQuery,['getCurrentPicks'],{revalidate:300,tags:["picks"]});
export async function getCurrentPicks(...args:Parameters<typeof getCurrentPicksQuery>){return isDemo()?getCurrentPicksQuery(...args):getCurrentPicksCached(...args);}

const getPickBySlugCached=unstable_cache(getPickBySlugQuery,['getPickBySlug'],{revalidate:300,tags:["picks"]});
export async function getPickBySlug(...args:Parameters<typeof getPickBySlugQuery>){return isDemo()?getPickBySlugQuery(...args):getPickBySlugCached(...args);}

const searchContentCached=unstable_cache(searchContentQuery,['searchContent'],{revalidate:300,tags:["posts","picks"]});
export async function searchContent(...args:Parameters<typeof searchContentQuery>){return isDemo()?searchContentQuery(...args):searchContentCached(...args);}
