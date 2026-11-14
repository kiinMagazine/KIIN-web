/* eslint-disable @next/next/no-img-element -- SVG de marca estáticos. */
import {brandAssets} from '@/config/site';
/**
 * Animación de marca (entrada de sesión). Recrea en CSS/SVG la animación del video de KIIN
 * (logotipo → giro 3D al isotipo → sticker con contorno blanco → regreso al logotipo → globo de líneas que se dibuja),
 * más ligera que el MP4, nítida a cualquier tamaño y con versión por tema. Con prefers-reduced-motion se muestra estática.
 */
export function KiinFlip({once=false}:{once?:boolean}){
  return <div className={`kiin-flip${once?' once':''}`} aria-hidden="true">
    <div className="kf-stage">
      <span className="kf-logo"><img className="logo-papel" src={brandAssets.logo??'/brand/logotipo.svg'} alt="" width={314} height={120}/><img className="logo-noche" src={brandAssets.logoClaro??'/brand/logotipo-claro.svg'} alt="" width={314} height={120}/></span>
      <img className="kf-iso" src={brandAssets.isotipo??'/brand/isotipo.svg'} alt="" width={120} height={120}/>
      <svg className="kf-globe" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="100" cy="100" r="92" pathLength={1}/>
        <ellipse cx="100" cy="100" rx="46" ry="92" pathLength={1}/><ellipse cx="100" cy="100" rx="78" ry="92" pathLength={1}/><path d="M100 8v184" pathLength={1}/>
        <path d="M8 100h184M20 54h160M20 146h160M45 24h110M45 176h110" pathLength={1}/>
      </svg>
      <span className="kf-shadow"/>
    </div>
  </div>;
}
