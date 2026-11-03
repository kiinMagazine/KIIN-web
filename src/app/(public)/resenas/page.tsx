import Link from 'next/link';
import {getReviews} from '@/lib/data/reviews';
import {pageNumber} from '@/lib/data';
import {Pagination} from '@/components/Editorial';
import ReviewCard from '@/components/ReviewCard';
import {metadata} from '@/lib/seo';
export const revalidate=300;
export function generateMetadata(){return metadata('Reseñas','Análisis de álbumes y sencillos con la calificación de las estrellas KIIN.','/resenas');}
export default async function Reviews({searchParams}:{searchParams:Promise<{pagina?:string;tipo?:string}>}){
  const sp=await searchParams,page=pageNumber(sp.pagina),kind=sp.tipo==='album'||sp.tipo==='sencillo'?sp.tipo:undefined;
  const {items,count}=await getReviews({page,limit:12,kind});
  return <div className="wrap"><header className="page-header"><p className="eyebrow">Escuchar con atención</p><h1>Reseñas.</h1><p>Análisis de álbumes y sencillos, con argumentos y la calificación de las estrellas KIIN.</p></header>
    <nav className="hero-territories" aria-label="Tipo de reseña"><Link href="/resenas" aria-current={!kind}>Todas</Link><Link href="/resenas?tipo=album" aria-current={kind==='album'}>Álbumes</Link><Link href="/resenas?tipo=sencillo" aria-current={kind==='sencillo'}>Sencillos</Link></nav>
    <section className="section"><div className="week-grid">{items.map((r,i)=><ReviewCard key={r.id} review={r} priority={i<2}/>)}</div>{!items.length&&<p>Pronto habrá nuevas reseñas.</p>}<Pagination page={page} limit={12} count={count} path={kind?`/resenas?tipo=${kind}`:'/resenas'}/></section></div>;
}
