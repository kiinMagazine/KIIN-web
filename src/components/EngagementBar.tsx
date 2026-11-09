'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {engagementState,recordView,setLike,setSave,type EngagementResult} from '@/app/engagement-actions';
import {HINT_COOKIE} from '@/lib/session';
import AuthPrompt from './AuthPrompt';

const hasSession=()=>typeof document!=='undefined'&&document.cookie.split('; ').some(c=>c.startsWith(`${HINT_COOKIE}=`));
const fmt=(n:number)=>n.toLocaleString('es-MX');

/**
 * Me gusta y guardar para una publicación. Las páginas son estáticas: el estado se pide al cargar.
 * Reglas: actualización optimista; el botón queda ocupado mientras viaja la petición (un doble clic no envía dos);
 * el servidor fija el estado pedido (idempotente); si falla, se revierte y se avisa.
 * Sin sesión: abre la invitación a crear cuenta o entrar. Con sesión: registra la apertura en tu historial.
 */
export default function EngagementBar({postId}:{postId:string}){
  const [state,setState]=useState<{loggedIn:boolean;liked:boolean;saved:boolean;likes:number}|null>(null);
  // Ocupado por botón: un doble clic no envía dos, pero dar me gusta no bloquea guardar.
  const [busy,setBusy]=useState<{like:boolean;save:boolean}>({like:false,save:false}),[message,setMessage]=useState<{ok:boolean;text:string}|null>(null),[prompt,setPrompt]=useState<'like'|'save'|null>(null);
  const router=useRouter(),viewed=useRef(false),inflight=useRef({like:false,save:false});
  useEffect(()=>{let alive=true;
    engagementState(postId).then(r=>{if(!alive)return;setState({loggedIn:r.loggedIn,liked:!!r.liked,saved:!!r.saved,likes:r.likes??0});
      if(r.loggedIn&&!viewed.current){viewed.current=true;void recordView(postId);}}).catch(()=>{if(alive)setState({loggedIn:hasSession(),liked:false,saved:false,likes:0});});
    return()=>{alive=false;};},[postId]);

  async function act(kind:'like'|'save'){
    if(inflight.current[kind]||!state)return;
    if(!state.loggedIn){setPrompt(kind);return;}
    inflight.current[kind]=true;
    const field=kind==='like'?'liked':'saved',value=!state[field];
    // Revierte solo el campo de esta acción (la otra puede estar en curso).
    const revert=()=>setState(s=>s&&(kind==='like'?{...s,liked:!value,likes:Math.max(0,s.likes+(value?-1:1))}:{...s,saved:!value}));
    setBusy(b=>({...b,[kind]:true}));setMessage(null);
    setState(s=>s&&(kind==='like'?{...s,liked:value,likes:Math.max(0,s.likes+(value?1:-1))}:{...s,saved:value}));
    try{
      const r:EngagementResult=await (kind==='like'?setLike:setSave)({postId,value});
      if(r.ok){if(kind==='like')setState(s=>s&&{...s,likes:r.likes??s.likes});else setMessage({ok:true,text:r.message});}
      else{revert();
        if(r.code==='UNAUTHENTICATED'){setState(s=>s&&{...s,loggedIn:false});setPrompt(kind);}
        else if(r.code==='MUST_CHANGE_PASSWORD')router.push('/cuenta/cambiar-contrasena');
        else setMessage({ok:false,text:r.message});}
    }catch{revert();setMessage({ok:false,text:'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'});}
    finally{inflight.current[kind]=false;setBusy(b=>({...b,[kind]:false}));}
  }
  const loading=!state;
  return <div className="engagement" aria-busy={loading}>
    <button type="button" className={`engage-btn like${state?.liked?' on':''}`} aria-pressed={!!state?.liked} disabled={loading||busy.like} onClick={()=>act('like')}>
      <span className="engage-icon" aria-hidden="true">{state?.liked?'♥':'♡'}</span>
      <span>{state?.liked?'Te gusta':'Me gusta'}</span>
      {!!state?.likes&&<span className="engage-count" aria-label={`${fmt(state.likes)} ${state.likes===1?'me gusta':'me gusta en total'}`}>{fmt(state.likes)}</span>}
    </button>
    <button type="button" className={`engage-btn save${state?.saved?' on':''}`} aria-pressed={!!state?.saved} disabled={loading||busy.save} onClick={()=>act('save')}>
      <span className="engage-icon" aria-hidden="true">{state?.saved?'■':'□'}</span><span>{state?.saved?'Guardada':'Guardar'}</span>
    </button>
    <span className={`engage-msg${message&&!message.ok?' error':''}`} role={message&&!message.ok?'alert':'status'}>{message?.text}</span>
    <AuthPrompt open={!!prompt} action={prompt??'like'} onClose={()=>setPrompt(null)}/>
  </div>;
}
