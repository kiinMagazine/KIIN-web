import Link from 'next/link';
import KiinImage from './KiinImage';
import Stars from './Stars';
import type {Review} from '@/lib/data/types';
export default function ReviewCard({review,priority=false}:{review:Review;priority?:boolean}){
  return <article className="pick-card review-card"><Link href={`/resenas/${review.slug}`} aria-label={`${review.title}, reseña`}><KiinImage media={review.cover} square priority={priority}/></Link><div><p className="eyebrow">{review.kind==='album'?'Reseña de álbum':'Reseña de sencillo'}</p><h3><Link href={`/resenas/${review.slug}`}>{review.title}</Link></h3><p>{review.artist}</p><Stars value={review.stars}/><Link className="read-more" href={`/resenas/${review.slug}`}>Leer el análisis ↗</Link></div></article>;
}
