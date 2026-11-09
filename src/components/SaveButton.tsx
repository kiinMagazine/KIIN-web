'use client';
import {useEffect,useState} from 'react';
import {pickSaveState,setPickSave} from '@/app/engagement-actions';
import {HINT_COOKIE} from '@/lib/session';
import AuthPrompt from './AuthPrompt';
/** Guardar una selección de la semana. Mismo comportamiento que EngagementBar: optimista, idempotente, invitación sin sesión. */
export default function SaveButton({id}:{id:string}){
  const [saved,setSaved]=useState(false),[loggedIn,setLoggedIn]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[prompt,setPrompt]=useState(false);
  useEffect(()=>{if(!document.cookie.split('; ').some(c=>c.startsWith(`${HINT_COOKIE}=`)))return;let alive=true;pickSaveState(id).then(r=>{if(alive){setLoggedIn(r.loggedIn);setSaved(!!r.saved);}});return()=>{alive=false;};},[id]);
  async function click(){
    if(busy)return;if(!loggedIn){setPrompt(true);return;}
    const value=!saved;setBusy(true);setSaved(value);setMessage('');
    try{const r=await setPickSave({pickId:id,value});if(!r.ok){setSaved(!value);if(r.code==='UNAUTHENTICATED'){setLoggedIn(false);setPrompt(true);}else setMessage(r.message);}else setMessage(r.message);}
    catch{setSaved(!value);setMessage('No pudimos conectar. Inténtalo de nuevo.');}finally{setBusy(false);}
  }
  return <div className="engagement"><button type="button" className={`engage-btn save${saved?' on':''}`} aria-pressed={saved} disabled={busy} onClick={click}><span className="engage-icon" aria-hidden="true">{saved?'■':'□'}</span><span>{saved?'Guardada':'Guardar'}</span></button><span className="engage-msg" role="status">{message}</span><AuthPrompt open={prompt} action="save" onClose={()=>setPrompt(false)}/></div>;
}
