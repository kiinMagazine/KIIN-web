import {notFound} from 'next/navigation';
import {getPosts,pageNumber} from '@/lib/data';
import {territories,territoryNames} from '@/lib/validators';
import {Filters,PostGrid,Pagination} from '@/components/Editorial';
import {metadata} from '@/lib/seo';
export const revalidate=300;
type Props={params:Promise<{slug:string}>;searchParams:Promise<{pagina?:string}>};
export async function generateMetadata({params}:Props){const {slug}=await params;return metadata(territoryNames[slug]||'Territorio','Historias para entender la cultura desde dentro.',`/territorio/${slug}`);}
export default async function Territory({params,searchParams}:Props){const {slug}=await params;if(!territories.some(t=>t===slug))notFound();const page=pageNumber((await searchParams).pagina),posts=await getPosts({page,territory:slug});return <div className="wrap"><header className="page-header"><p className="eyebrow">Un territorio, muchas historias</p><h1>{territoryNames[slug]}</h1></header><Filters current={slug}/><section className="section"><PostGrid posts={posts.items}/><Pagination page={page} count={posts.count} path={`/territorio/${slug}`}/></section></div>;}
