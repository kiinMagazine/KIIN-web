'use client';
import {useEffect,useRef} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
/**
 * Invitación a crear cuenta o entrar, cuando un visitante intenta dar me gusta o guardar.
 * <dialog> nativo: atrapa el foco, Esc lo cierra y devuelve el foco al botón que lo abrió.
 */
export default function AuthPrompt({open,onClose,action}:{open:boolean;onClose:()=>void;action:'like'|'save'}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=ref.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close();},[open]);
  const next=usePathname()||'/';
  return <dialog ref={ref} className="auth-prompt" aria-labelledby="auth-prompt-title" onClose={onClose} onClick={e=>{if(e.target===ref.current)onClose();}}>
    <p className="eyebrow">Tu cuenta KIIN</p>
    <h2 id="auth-prompt-title">{action==='like'?'Dale me gusta con tu cuenta':'Guarda esta historia para después'}</h2>
    <p>Con una cuenta gratuita das me gusta, guardas publicaciones y recuperas lo que ya leíste, desde cualquier dispositivo.</p>
    <div className="auth-prompt-actions">
      <Link className="button primary" href={`/cuenta/registro?next=${encodeURIComponent(next)}`}>Crear cuenta</Link>
      <Link className="button" href={`/cuenta/entrar?next=${encodeURIComponent(next)}`}>Ya tengo cuenta</Link>
    </div>
    <button type="button" className="link-button" onClick={onClose}>Seguir leyendo sin cuenta</button>
  </dialog>;
}
