import type {MetadataRoute} from 'next';
import {getPosts,getPickArchive} from '@/lib/data';
import {getReviews} from '@/lib/data/reviews';
import {site} from '@/config/site';
import {territories} from '@/lib/validators';
export const revalidate=300;
export default async function sitemap():Promise<MetadataRoute.Sitemap>{if(!site.url)return [];const routes=['','/semana','/resenas','/nosotros','/manifiesto','/privacidad',...territories.map(t=>`/territorio/${t}`)].map(p=>({url:site.url+p}));const rows:MetadataRoute.Sitemap=[...routes];let page=1;while(true){const {items,count}=await getPosts({page,limit:500});rows.push(...items.map(p=>({url:`${site.url}/p/${p.slug}`,lastModified:p.updated_at})));if(page*500>=count)break;page++;}page=1;while(true){const {items,count}=await getPickArchive(page);rows.push(...items.map(p=>({url:`${site.url}/semana/${p.slug}`,lastModified:p.updated_at})));if(page*20>=count)break;page++;}page=1;while(true){const {items,count}=await getReviews({page,limit:500});rows.push(...items.map(r=>({url:`${site.url}/resenas/${r.slug}`,lastModified:r.updated_at})));if(page*500>=count)break;page++;}return rows;}
