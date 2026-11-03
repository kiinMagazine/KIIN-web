'use client';
import {useEffect} from 'react';
import {idleLogout,touchActivity} from '@/app/cuenta-actions';
import {ADMIN_IDLE_MS,READER_IDLE_MS,TOUCH_EVERY_MS} from '@/lib/session';
const hasSession=()=>document.cookie.split('; ').some(c=>/^sb-.*-auth-token/.test(c));
/** Cierra la sesión solo tras un periodo de inactividad real y registra la actividad mientras navegas. */
export default function IdleGuard(){
  useEffect(()=>{
    let last=Date.now(),touched=0,done=false;
    const mark=()=>{last=Date.now();};
    const events=['pointerdown','keydown','scroll','touchstart'] as const;
    events.forEach(e=>window.addEventListener(e,mark,{passive:true}));
    const tick=async()=>{
      if(done||!hasSession())return;
      const now=Date.now(),admin=location.pathname.startsWith('/admin'),limit=admin?ADMIN_IDLE_MS:READER_IDLE_MS;
      if(now-last>limit){done=true;await idleLogout();location.assign(admin?'/admin/login?expirada=1':'/cuenta/entrar?expirada=1');return;}
      if(now-last<TOUCH_EVERY_MS&&now-touched>TOUCH_EVERY_MS){touched=now;void touchActivity();}
    };
    const id=window.setInterval(tick,60000);
    void tick();
    return()=>{window.clearInterval(id);events.forEach(e=>window.removeEventListener(e,mark));};
  },[]);
  return null;
}
