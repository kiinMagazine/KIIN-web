/* eslint-disable @next/next/no-img-element -- Las variantes WebP se generan al subir; no consumen optimización de Vercel. */
import type {Media} from '@/lib/data/types';
export function mediaUrl(path:string){return path.startsWith('/')?path:`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/kiin-media/${path}`;}
export default function KiinImage({media,priority=false,square=false}:{media:Media|null;priority?:boolean;square?:boolean}){
  if(!media)return <div className={`image-empty ${square?'square':''}`} role="img" aria-label="Portada pendiente"><span>KIIN</span><small>Hay más detrás.</small></div>;
  const variants=Object.values(media.variants).filter((v,i,a)=>a.findIndex(x=>x.width===v.width)===i);
  return <img className={`cover ${square?'square':''}`} src={mediaUrl(media.variants.lg.path)} srcSet={variants.map(v=>`${mediaUrl(v.path)} ${v.width}w`).join(', ')} sizes="(max-width: 650px) 100vw, (max-width: 1000px) 50vw, 33vw" width={media.width} height={media.height} alt={media.alt} loading={priority?'eager':'lazy'} decoding="async" fetchPriority={priority?'high':'auto'}/>;
}
