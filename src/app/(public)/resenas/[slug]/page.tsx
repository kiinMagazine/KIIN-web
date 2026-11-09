import {notFound} from 'next/navigation';
import {getReviewBySlug} from '@/lib/data/reviews';
import {metadata} from '@/lib/seo';
import KiinImage,{mediaUrl} from '@/components/KiinImage';
import Markdown from '@/components/Markdown';
import Music from '@/components/Music';
import Share from '@/components/Share';
import EngagementBar from '@/components/EngagementBar';
import Stars from '@/components/Stars';
import JsonLd from '@/components/JsonLd';
export const revalidate=300;
export function generateStaticParams(){return [];}
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){const r=await getReviewBySlug((await params).slug);return r?metadata(`${r.title} · ${r.artist}`,`Reseña de KIIN: ${r.stars??''} de 5 estrellas.`,`/resenas/${r.slug}`,r.cover?mediaUrl(r.cover.variants.lg.path):undefined):metadata('Reseña no encontrada','Explora las reseñas de KIIN.','/resenas');}
export default async function ReviewPage({params}:Props){
  const r=await getReviewBySlug((await params).slug);if(!r)notFound();
  return <div className="wrap">
    <JsonLd data={{'@context':'https://schema.org','@type':'Review',name:`${r.title} · ${r.artist}`,itemReviewed:{'@type':r.kind==='album'?'MusicAlbum':'MusicRecording',name:r.title,byArtist:{'@type':'MusicGroup',name:r.artist}},reviewRating:r.stars?{'@type':'Rating',ratingValue:r.stars,bestRating:5,worstRating:1}:undefined,author:{'@type':'Organization',name:'KIIN'},...(r.published_at?{datePublished:r.published_at}:{})}}/>
    <header className="page-header"><span className="eyebrow">{r.kind==='album'?'Reseña de álbum':'Reseña de sencillo'}</span><h1>{r.title}</h1><p>{r.artist}</p><Stars value={r.stars} size="lg"/></header>
    <div className="article-grid"><figure><KiinImage media={r.cover} priority square/><figcaption>{r.cover?.credit}</figcaption></figure>
      <div><Markdown text={r.analysis_md}/>{r.sources_md&&<aside className="review-sources"><h2>Cómo lo escuchamos</h2><Markdown text={r.sources_md}/></aside>}<Music spotify={r.spotify_url} youtube={r.youtube_url} embeds/><p className="muted review-note">Opinión editorial fundamentada en la obra. Las estrellas KIIN son el promedio de la valoración independiente de cada integrante del equipo. <a href="/derechos-musica">Criterio editorial y derechos</a>.</p><EngagementBar postId={r.id}/><Share title={`${r.title} · ${r.artist}`}/></div></div></div>;
}
