/* eslint-disable @next/next/no-img-element -- Logo estático de public/brand; no requiere optimización. */
import {brandAssets} from '@/config/site';
export default function Wordmark(){
  if(brandAssets.logo)return <img className="wordmark-img" src={brandAssets.logo} alt="KIIN"/>;
  return <span className="wordmark">KIIN<span className="wordmark-dot" aria-hidden="true">.</span></span>;
}
