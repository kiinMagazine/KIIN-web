/* eslint-disable @next/next/no-img-element -- Logo estático de public/brand (SVG); no requiere optimización. */
import {brandAssets} from '@/config/site';
/** Logotipo KIIN (isotipo + letras). Dos versiones: letras casi negras (tema Papel) y crema (tema Noche); el CSS muestra una. */
export default function Wordmark({iso=false}:{iso?:boolean}){
  if(iso&&brandAssets.isotipo)return <img className="wordmark-iso" src={brandAssets.isotipo} alt="KIIN" width={48} height={48}/>;
  if(brandAssets.logo)return <span className="wordmark-logo"><img className="wordmark-img logo-papel" src={brandAssets.logo} alt="KIIN" width={157} height={60}/><img className="wordmark-img logo-noche" src={brandAssets.logoClaro??brandAssets.logo} alt="" aria-hidden="true" width={157} height={60}/></span>;
  return <span className="wordmark">KIIN<span className="wordmark-dot" aria-hidden="true">.</span></span>;
}
