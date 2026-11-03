'use client';
import {useEffect} from 'react';
import {heartbeat} from '@/app/admin/team-actions';
/** Marca al admin como activo solo si hay actividad reciente: así no mantiene viva una sesión inactiva. */
export default function Heartbeat(){
  useEffect(()=>{
    let last=Date.now();
    const mark=()=>{last=Date.now();};
    const events=['pointerdown','keydown','scroll','touchstart'] as const;
    events.forEach(e=>window.addEventListener(e,mark,{passive:true}));
    const ping=()=>{if(document.visibilityState==='visible'&&Date.now()-last<3*60000)void heartbeat();};
    ping();
    const id=window.setInterval(ping,60000);
    document.addEventListener('visibilitychange',ping);
    return()=>{window.clearInterval(id);events.forEach(e=>window.removeEventListener(e,mark));document.removeEventListener('visibilitychange',ping);};
  },[]);
  return null;
}
