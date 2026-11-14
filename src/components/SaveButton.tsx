'use client';
import {useEffect,useState} from 'react';
import {pickSaveState,setPickSave} from '@/app/engagement-actions';
import {HINT_COOKIE} from '@/lib/session';
import AuthPrompt from './AuthPrompt';
import {useActionLock} from '@/lib/use-action-lock';
/** Guardar una selección de la semana. Mismo comportamiento que EngagementBar: optimista, idempotente, invitación sin sesión. */
export default function SaveButton({id}:{id:string}){
  const [saved,setSaved]=useState(false),[loggedIn,setLoggedIn]=useState(false),[message,setMessage]=useState(''),[prompt,setPrompt]=useState(false),[loading,setLoading]=useState(false);
  useEffect(()=>{if(!document.cookie.split('; ').some(c=>c.startsWith(`${HINT_COOKIE}=`)))return;let alive=true;queueMicrotask(()=>{if(alive)setLoading(true);});pickSaveState(id).then(r=>{if(alive){setLoggedIn(r.loggedIn);setSaved(!!r.saved);}}).catch(()=>{}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[id]);
  const lock=useActionLock(),{busy}=lock;
  function click(){
    if(!loggedIn){setPrompt(true);return;}
    // Un clic = un envío: el candado se toma en el mismo clic.
    void lock.run(async()=>{const value=!saved;setSaved(value);setMessage('');
    try{const r=await setPickSave({pickId:id,value});if(!r.ok){setSaved(!value);if(r.code==='UNAUTHENTICATED'){setLoggedIn(false);setPrompt(true);}else setMessage(r.message);}else setMessage(r.message);}
    catch{setSaved(!value);setMessage('No pudimos conectar. Inténtalo de nuevo.');}});
  }
  return <div className="engagement" aria-busy={loading}><button type="button" className={`engage-btn save${saved?' on':''}`} aria-pressed={saved} disabled={busy||loading} onClick={click}><span className="engage-icon" aria-hidden="true">{saved?'■':'□'}</span><span>{saved?'Guardada':'Guardar'}</span></button><span className="engage-msg" role="status">{message}</span><AuthPrompt open={prompt} action="save" onClose={()=>setPrompt(false)}/></div>;
}
