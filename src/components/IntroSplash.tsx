'use client';
import {useEffect,useState} from 'react';
import {KiinFlip} from './BrandLoader';
/**
 * Entrada de marca: una sola vez por sesión, breve (≈2 s), se salta con clic o Esc y nunca con movimiento reducido.
 * El contenido ya está renderizado debajo (no bloquea la carga ni a los lectores de pantalla).
 * La decisión (mostrar o no) y los temporizadores van en efectos separados: así un efecto que se ejecuta dos veces
 * (StrictMode) no deja la pantalla de entrada fija.
 */
export default function IntroSplash(){
  const [phase,setPhase]=useState<'off'|'on'|'out'>('off');
  useEffect(()=>{
    let seen=true;try{seen=sessionStorage.getItem('kiin-intro')==='1';sessionStorage.setItem('kiin-intro','1');}catch{}
    if(!seen&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)queueMicrotask(()=>setPhase('on'));
  },[]);
  useEffect(()=>{
    if(phase!=='on')return;
    const t1=window.setTimeout(()=>setPhase('out'),2000);
    const skip=(e:KeyboardEvent)=>{if(e.key==='Escape')setPhase('off');};
    window.addEventListener('keydown',skip);
    return()=>{window.clearTimeout(t1);window.removeEventListener('keydown',skip);};
  },[phase]);
  // Fase de salida en su propio efecto: al cambiar de 'on' a 'out' la limpieza anterior ya no cancela el desmontaje.
  useEffect(()=>{
    if(phase!=='out')return;
    const t2=window.setTimeout(()=>setPhase('off'),450);
    return()=>window.clearTimeout(t2);
  },[phase]);
  if(phase==='off')return null;
  return <div className={`intro-splash${phase==='out'?' out':''}`} aria-hidden="true" onClick={()=>setPhase('off')}><KiinFlip once/></div>;
}
