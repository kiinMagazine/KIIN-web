'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {saveGridItem,removeGridItem,toggleLike} from '@/app/admin/team-actions';
import type {ActionResult} from '@/app/admin/actions';
import type {GridRow} from '@/lib/admin';
const fmt=(iso:string|null)=>iso?new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',dateStyle:'medium',timeStyle:'short'}).format(new Date(iso)):'Sin fecha';
export default function Grid({rows,posts,admins,demo}:{rows:GridRow[];posts:{id:string;title:string}[];admins:number;demo:boolean}){
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[ig,setIg]=useState(false);
  const router=useRouter();
  async function run(task:()=>Promise<ActionResult>){setBusy(true);try{const r=await task();setMessage(r.message);if(r.ok)router.refresh();}catch{setMessage('No pudimos completar la acción. Inténtalo nuevamente.');}finally{setBusy(false);}}
  return <>
    <p role="status">{message}</p>
    <section className="account-section"><h2>Programar</h2>
      <form method="post" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>saveGridItem({post_id:f.get('post_id'),web_publish_at:String(f.get('web')||'')||null,instagram:ig,instagram_at:ig?String(f.get('ig_at')||'')||null:null,note:String(f.get('note')||'')}));}}>
        <label>Publicación<select name="post_id" required defaultValue=""><option value="" disabled>Elige una publicación</option>{posts.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <label>Salida en la página (hora de Ciudad de México)<input name="web" type="datetime-local"/></label>
        <label><input type="checkbox" checked={ig} onChange={e=>setIg(e.target.checked)}/> También publicar en Instagram</label>
        {ig&&<label>Hora para Instagram<input name="ig_at" type="datetime-local" required/></label>}
        <label>Nota para el equipo<input name="note" maxLength={500}/></label>
        <button disabled={demo||busy}>Guardar en la parrilla</button>
      </form>
      <p className="muted">Etapa 1: a la hora de Instagram los tres administradores reciben un aviso para publicar. La publicación automática llegará con la integración de Meta.</p>
    </section>
    <section className="account-section"><h2>Parrilla</h2>
      {!rows.length?<p>Todavía no hay publicaciones en la parrilla.</p>:<ul className="grid-list">{rows.map(r=><li key={r.id}>
        <strong>{r.title}</strong>
        <span>Web: {fmt(r.web_publish_at)}</span>
        <span>{r.instagram?`Instagram: ${fmt(r.instagram_at)}`:'Sin Instagram'}</span>
        {r.note&&<span className="muted">{r.note}</span>}
        <button type="button" aria-pressed={r.liked} disabled={demo||busy} onClick={()=>run(()=>toggleLike(r.id))}>{r.liked?'♥':'♡'} Me gusta · {r.likes}/{admins}</button>
        {r.likes>=admins&&<em> Aprobada por los {admins}</em>}
        <button type="button" disabled={demo||busy} onClick={()=>run(()=>removeGridItem(r.id))}>Quitar</button>
      </li>)}</ul>}
    </section>
  </>;
}
