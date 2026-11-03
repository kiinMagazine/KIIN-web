import {brandAssets} from '@/config/site';
/** Pantalla de carga/transición con la marca. Usa el video del logo si está configurado; si no, una animación SVG/CSS. */
export default function BrandLoader({label='Cargando'}:{label?:string}){
  return <div className="brand-loader" role="status" aria-live="polite" aria-label={label}>
    {brandAssets.loaderVideo
      ?<video className="brand-loader-video" src={brandAssets.loaderVideo} autoPlay muted loop playsInline aria-hidden="true"/>
      :<svg className="brand-loader-mark" viewBox="0 0 200 80" aria-hidden="true"><text x="100" y="62" textAnchor="middle">KIIN</text><circle className="brand-loader-dot" cx="186" cy="60" r="7"/></svg>}
    <span className="brand-loader-text">{label}…</span>
  </div>;
}
