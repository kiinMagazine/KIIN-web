import {notFound} from 'next/navigation';
import {getPostBySlug,getPosts} from '@/lib/data';
import {metadata} from '@/lib/seo';
import {territoryNames} from '@/lib/validators';
import {formatDate} from '@/lib/format';
import KiinImage,{mediaUrl} from '@/components/KiinImage';
import Markdown from '@/components/Markdown';
import Music from '@/components/Music';
import Share from '@/components/Share';
import SaveButton from '@/components/SaveButton';
import JsonLd from '@/components/JsonLd';
import {PostGrid,PostReference} from '@/components/Editorial';
import {absolute} from '@/config/site';
export const revalidate=300;
export function generateStaticParams(){return [];}
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){const p=await getPostBySlug((await params).slug);return p?metadata(p.title,p.excerpt,`/p/${p.slug}`,p.cover?mediaUrl(p.cover.variants.lg.path):undefined):metadata('Historia no encontrada','Sigue explorando KIIN.','/');}
export default async function PostPage({params}:Props){const p=await getPostBySlug((await params).slug);if(!p)notFound();const related=(await getPosts({territory:p.territory,limit:4})).items.filter(x=>x.id!==p.id).slice(0,3);return <div className="wrap"><JsonLd data={{'@context':'https://schema.org','@type':'Article',headline:p.title,description:p.excerpt,datePublished:p.published_at,dateModified:p.updated_at,inLanguage:'es-MX',author:{'@type':'Organization',name:'KIIN'},url:absolute(`/p/${p.slug}`),...(p.cover?{image:mediaUrl(p.cover.variants.lg.path).startsWith('/')?absolute(mediaUrl(p.cover.variants.lg.path)):mediaUrl(p.cover.variants.lg.path)}:{})}}/><header className="page-header"><span className="eyebrow">{territoryNames[p.territory]} / {p.pillar}</span><h1>{p.title}</h1><p>{p.excerpt}</p><span className="eyebrow">{p.published_at&&formatDate(p.published_at)}</span>{p.demo_kind&&<aside className="article-reference" aria-label="Sobre esta publicación de muestra"><PostReference post={p}/><p>{p.source?`Resumen de referencia para visualizar futuras publicaciones. Fuente publicada el ${formatDate(p.source.date)}; consultada el 6 de octubre de 2026. No es una cobertura propia de KIIN.`:"Historia ficticia de demostración para mostrar el formato editorial de KIIN."}</p></aside>}</header><div className="article-grid"><figure><KiinImage media={p.cover} priority/><figcaption className="eyebrow">{p.cover?.credit||p.credit}</figcaption></figure><div><Markdown text={p.body_md}/><Music spotify={p.spotify_url} youtube={p.youtube_url} embeds/><SaveButton kind="post" id={p.id}/><Share title={p.title}/></div></div><section className="section"><h2>La escena sigue.</h2><div style={{height:30}}/><PostGrid posts={related}/></section></div>;}

