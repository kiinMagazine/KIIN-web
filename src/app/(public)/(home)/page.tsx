import Link from 'next/link';
import {getPosts,getFeatured,getCurrentPicks,isDemo,pageNumber} from '@/lib/data';
import {Filters,PostGrid,Pagination,PickCard,PostReference,AgendaCard} from '@/components/Editorial';
import KiinImage from '@/components/KiinImage';
import JsonLd from '@/components/JsonLd';
import {metadata} from '@/lib/seo';
import {site} from '@/config/site';
import {isoWeek} from '@/lib/week';
import brand from '@/content/brand.json';
import Wordmark from '@/components/Wordmark';
import HeroCarousel,{type Slide} from '@/components/HeroCarousel';
import {mediaUrl} from '@/components/KiinImage';
import {getReviews} from '@/lib/data/reviews';
import ReviewCard from '@/components/ReviewCard';

const values=brand.values.split('\n').map((line,index)=>{
  const [name,...description]=line.replace(/^-\s*/, '').split(':');
  return {number:String(index+1).padStart(2,'0'),name,description:description.join(':').trim()};
});

export const revalidate=300;
export function generateMetadata(){return metadata('La cultura no es noticia.','Historias, escenas y personas que están construyendo la cultura. Desde Querétaro.','/');}

export default async function Home({searchParams}:{searchParams:Promise<{pagina?:string;acceso?:string}>}){
  const q=await searchParams;const page=pageNumber(q.pagina);
  const [posts,featured,picks,reviews,music,events,...culture]=await Promise.all([
    getPosts({page,limit:6}),getFeatured(),getCurrentPicks(),getReviews({limit:3}),
    getPosts({territory:'musica',limit:3}),getPosts({territory:'eventos',limit:3}),
    getPosts({territory:'moda',limit:1}),getPosts({territory:'deportes',limit:1}),getPosts({territory:'actualidad',limit:1}),
  ]);
  const culturePosts=culture.flatMap(group=>group.items);
  const slides:Slide[]=[
    ...[featured,...posts.items].filter((p,i,a):p is NonNullable<typeof p>=>!!p&&!!p.cover&&a.findIndex(x=>x?.id===p.id)===i).map(p=>({href:`/p/${p.slug}`,title:p.title,kicker:'Publicación',src:mediaUrl(p.cover!.variants.lg.path)})),
    ...reviews.items.filter(r=>r.cover).map(r=>({href:`/resenas/${r.slug}`,title:`${r.title} — ${r.artist}`,kicker:`Reseña · ${r.stars?.toString().replace('.',',')} ★`,src:mediaUrl(r.cover!.variants.lg.path)})),
    ...picks.filter(p=>p.cover).map(p=>({href:`/semana/${p.slug}`,title:`${p.title} — ${p.artist}`,kicker:p.kind==='album'?'Álbum de la semana':'Canción de la semana',src:mediaUrl(p.cover!.variants.lg.path)})),
  ].slice(0,8);
  return <>
    {q.acceso==='denegado'&&<p className="wrap message" role="alert">Tu cuenta no tiene acceso al panel de administración.</p>}
    <JsonLd data={{'@context':'https://schema.org','@type':'WebSite',name:'KIIN',...(site.url?{url:site.url}:{}),inLanguage:'es-MX'}}/>
    <div className="home-stage"><section className="hero editorial-hero wrap" aria-labelledby="portada-title">
      <div className="hero-top eyebrow"><span>Medio y plataforma cultural</span><span>Querétaro, México ↗</span></div>
      <div className="hero-layout">
        <div className="hero-intro"><p className="eyebrow hero-kicker"><span className="signal-dot"/> Desde Querétaro, México</p><h1 id="portada-title">La cultura<br/><span>no es noticia.</span></h1><p className="hero-description">Historias, artistas y escenas que definen lo que escuchamos, vestimos y vivimos.</p><div className="hero-actions"><Link className="hero-button" href="#historias">Explorar historias <span aria-hidden="true">↗</span></Link><Link className="hero-secondary" href="/manifiesto">Conoce KIIN ↗</Link></div><div className="hero-territories" aria-label="Territorios"><Link href="/territorio/musica">Música</Link><Link href="/territorio/moda">Moda</Link><Link href="/territorio/deportes">Deportes</Link><Link href="/territorio/eventos">Eventos</Link></div></div>
        {featured?<article className="cover-story"><div className="cover-story-brand"><Wordmark/><span>Medio y plataforma cultural<br/>Querétaro · México</span></div><Link className="cover-story-art" href={`/p/${featured.slug}`} aria-label={featured.title}><KiinImage media={featured.cover} priority/><span className="cover-story-label">En portada ↗</span></Link><div className="cover-story-copy"><PostReference post={featured}/><h2><Link href={`/p/${featured.slug}`}>{featured.title}</Link></h2><Link className="read-more" href={`/p/${featured.slug}`}>Leer la historia ↗</Link></div></article>:<div className="hero-sign">Hay más detrás. ↗</div>}
      </div>
    </section><div className="home-ticker" aria-label="El universo KIIN"><div className="wrap"><span>La cultura no es noticia</span><b aria-hidden="true">✦</b><span>Música, moda y arte contemporáneo</span><b aria-hidden="true">✦</b><span>Historias que dejan huella</span><b aria-hidden="true">✦</b><span>Desde Querétaro para el mundo</span></div></div></div>
    <HeroCarousel slides={slides}/>
    <nav className="section-nav" aria-label="Secciones de la portada"><div className="wrap"><span className="eyebrow">Explora KIIN</span><Link href="#historias">01 / Lo último</Link><Link href="#musica">02 / Música</Link><Link href="#semana">03 / Esta semana</Link><Link href="#agenda">04 / Agenda</Link><Link href="#cultura">05 / Cultura</Link><Link href="#valores">06 / Valores</Link></div></nav>
    <div className="wrap">{isDemo()&&<p className="demo-notice edition-notice"><strong>Edición de muestra</strong><span>Referencias musicales consultadas el 6 oct 2026 y piezas ficticias, identificadas en cada publicación.</span></p>}</div>
    <section id="historias" className="section wrap editorial-section" aria-labelledby="latest-title"><div className="section-head"><div><p className="eyebrow section-index">01 / En el radar</p><h2 id="latest-title">Lo último.</h2></div><Link href="/buscar">Buscar en el archivo ↗</Link></div><Filters/><PostGrid posts={posts.items}/><Pagination page={page} count={posts.count} limit={6} path="/" anchor="historias"/></section>
    <section id="musica" className="music-section" aria-labelledby="music-title"><div className="wrap section"><div className="section-head"><div><p className="eyebrow section-index">02 / Sube el volumen</p><h2 id="music-title">Música para mirar de cerca.</h2></div><Link href="/territorio/musica">Todo en música ↗</Link></div><p className="section-description">Nuevos sonidos, historias detrás de las canciones y escenas que merecen ser escuchadas.</p><PostGrid posts={music.items}/></div></section>
    {!!reviews.items.length&&<section id="resenas" className="section wrap editorial-section" aria-labelledby="reviews-title"><div className="section-head"><div><p className="eyebrow section-index">Con las estrellas KIIN</p><h2 id="reviews-title">Reseñas.</h2></div><Link href="/resenas">Todas las reseñas ↗</Link></div><p className="section-description">Álbumes y sencillos escuchados con atención, con argumentos y una calificación.</p><div className="week-grid">{reviews.items.map(r=><ReviewCard key={r.id} review={r}/>)}</div></section>}
    <section id="semana" className="section wrap editorial-section" aria-labelledby="week-title"><div className="section-head"><div><p className="eyebrow section-index">03 / Escuchar con intención</p><h2 id="week-title">Esta semana.</h2></div><span className="week-stamp">SEMANA {String(isoWeek().week).padStart(2,'0')}</span></div><p className="section-description">Una canción. Un álbum. Dos razones para ponerle pausa a todo lo demás.</p>{isDemo()&&<p className="eyebrow muted weekly-demo">Selecciones ficticias · Ejemplo del formato semanal</p>}<div className="week-grid">{picks.map(p=><PickCard key={p.id} pick={p}/>)}</div>{!picks.length&&<p>La siguiente selección se está escuchando. Explora el archivo.</p>}<Link className="read-more" href="/semana">Explorar el archivo semanal ↗</Link></section>
    <section id="agenda" className="section wrap editorial-section" aria-labelledby="agenda-title"><div className="section-head"><div><p className="eyebrow section-index">04 / Nos vemos afuera</p><h2 id="agenda-title">La música se vive.</h2></div><Link href="/territorio/eventos">Eventos y festivales ↗</Link></div><p className="section-description">Encuentros, escenarios y planes para salir de los audífonos.</p><div className="agenda-list">{events.items.map(post=><AgendaCard key={post.id} post={post}/>)}</div>{!events.items.length&&<p>Pronto habrá nuevos encuentros en esta sección.</p>}</section>
    <section id="cultura" className="section wrap editorial-section" aria-labelledby="culture-title"><div className="section-head"><div><p className="eyebrow section-index">05 / Más allá de la música</p><h2 id="culture-title">Todo está conectado.</h2></div><Link href="/nosotros">Conoce KIIN ↗</Link></div><div className="territory-directory"><Link href="/territorio/moda"><span>Estilo e identidad</span><strong>Moda</strong><span aria-hidden="true">↗</span></Link><Link href="/territorio/deportes"><span>Juego y comunidad</span><strong>Deportes</strong><span aria-hidden="true">↗</span></Link><Link href="/territorio/actualidad"><span>Contexto y conversación</span><strong>Actualidad</strong><span aria-hidden="true">↗</span></Link></div><PostGrid posts={culturePosts}/></section>
    <section id="valores" className="values-section" aria-labelledby="values-title"><div className="wrap"><p className="eyebrow values-kicker">06 / Filosofía</p><div className="values-heading"><div><h2 id="values-title">Nuestros valores.</h2><p>Los principios que guían cada historia, encuentro y colaboración.</p></div><Link href="/nosotros">Más sobre KIIN ↗</Link></div><div className="values-grid">{values.map(value=><article className="value-card" key={value.number}><span className="value-number">{value.number}</span><h3>{value.name}</h3><p>{value.description}</p></article>)}</div></div></section>
    <aside className="manifesto-strip"><div className="wrap"><p>Hay más detrás.<br/><span>Y queremos contarlo.</span></p><Link className="button" href="/manifiesto">Lee nuestro manifiesto ↗</Link></div></aside>
  </>;
}
