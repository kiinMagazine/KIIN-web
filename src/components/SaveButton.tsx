'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {savedState,toggleSaved} from '@/app/cuenta-actions';
import type {SavedKind} from '@/lib/reader';
/** Guardar en tu cuenta. Las páginas son estáticas: el estado se consulta al cargar, solo si hay sesión. */
export default function SaveButton({kind,id}:{kind:SavedKind;id:string}){
  const [saved,setSaved]=useState(false),[message,setMessage]=useState(''),[needsLogin,setNeedsLogin]=useState(false),[busy,setBusy]=useState(false);
  useEffect(()=>{
    if(!document.cookie.split('; ').some(c=>/^sb-.*-auth-token/.test(c)))return;
    let alive=true;savedState({kind,item_id:id}).then(r=>{if(alive)setSaved(!!r.saved);});
    return()=>{alive=false;};
  },[kind,id]);
  async function click(){setBusy(true);try{const r=await toggleSaved({kind,item_id:id});setMessage(r.message);setNeedsLogin(!!r.needsLogin);if(r.ok)setSaved(!!r.saved);}catch{setMessage('No pudimos guardar. Inténtalo nuevamente.');}finally{setBusy(false);}}
  return <div className="save-box"><button type="button" aria-pressed={saved} disabled={busy} onClick={click}>{saved?'★ Guardado':'☆ Guardar en mi cuenta'}</button>{message&&<span role="status"> {message}</span>}{needsLogin&&<> <Link href="/cuenta/entrar">Entrar</Link> · <Link href="/cuenta/registro">Crear cuenta</Link></>}</div>;
}
