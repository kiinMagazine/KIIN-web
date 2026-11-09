import {notFound} from 'next/navigation';
import {getPickBySlug} from '@/lib/data';
import {metadata} from '@/lib/seo';
import KiinImage,{mediaUrl} from '@/components/KiinImage';
import Markdown from '@/components/Markdown';
import Music from '@/components/Music';
import Share from '@/components/Share';
import SaveButton from '@/components/SaveButton';
export const revalidate=300;
export function generateStaticParams(){return [];}
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){const p=await getPickBySlug((await params).slug);return p?metadata(p.title,`${p.artist}. ${p.kind==='cancion'?'Canción':'Álbum'} de la semana en KIIN.`,`/semana/${p.slug}`,p.cover?mediaUrl(p.cover.variants.lg.path):undefined):metadata('Selección no encontrada','Explora el archivo semanal.','/semana');}
export default async function PickPage({params}:Props){const p=await getPickBySlug((await params).slug);if(!p)notFound();return <div className="wrap"><header className="page-header"><span className="eyebrow">{p.kind==='cancion'?'Canción':'Álbum'} de la semana / SEMANA {String(p.iso_week).padStart(2,'0')} / {p.year}</span><h1>{p.title}</h1><p>{p.artist}</p></header><div className="article-grid"><figure><KiinImage media={p.cover} priority square/><figcaption>{p.cover?.credit}</figcaption></figure><div><Markdown text={p.note_md}/><Music spotify={p.spotify_url} youtube={p.youtube_url} embeds/><SaveButton id={p.id}/><Share title={`${p.title} · ${p.artist}`}/></div></div></div>;}
