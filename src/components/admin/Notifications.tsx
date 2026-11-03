'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {sendNotice,markNotificationsRead,clearNotifications} from '@/app/admin/team-actions';
import type {ActionResult} from '@/app/admin/actions';
import type {NotificationRow} from '@/lib/admin';
const fmt=(iso:string)=>new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',dateStyle:'short',timeStyle:'short'}).format(new Date(iso));
export default function Notifications({items,demo}:{items:NotificationRow[];demo:boolean}){
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const router=useRouter();
  async function run(task:()=>Promise<ActionResult>){setBusy(true);try{const r=await task();setMessage(r.message);if(r.ok)router.refresh();}catch{setMessage('No pudimos completar la acción. Inténtalo nuevamente.');}finally{setBusy(false);}}
  return <>
    <p role="status">{message}</p>
    <section className="account-section"><h2>Avisar al equipo</h2><div className="notice-actions">
      <button disabled={demo||busy} onClick={()=>run(()=>sendNotice('publicacion_lista'))}>Publicación lista</button>
      <button disabled={demo||busy} onClick={()=>run(()=>sendNotice('parrilla'))}>Parrilla actualizada</button>
      <button disabled={demo||busy} onClick={()=>run(()=>sendNotice('reunion'))}>Hay que hacer una reunión</button>
    </div></section>
    <section className="account-section"><h2>Tus avisos</h2>
      {!items.length?<p>No tienes avisos.</p>:<ul className="notice-list">{items.map(n=><li key={n.id} className={n.read_at?'':'unread'}><span>{n.message}</span> <time dateTime={n.created_at}>{fmt(n.created_at)}</time></li>)}</ul>}
      <button disabled={demo||busy||!items.some(n=>!n.read_at)} onClick={()=>run(markNotificationsRead)}>Marcar como leídos</button>{' '}
      <button disabled={demo||busy||!items.length} onClick={()=>{if(confirm('¿Borrar tu historial de avisos? El de tus compañeros no cambia.'))run(clearNotifications);}}>Borrar mi historial</button>
    </section>
  </>;
}
