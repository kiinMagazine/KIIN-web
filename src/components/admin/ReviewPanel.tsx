'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import type {AdminReview} from '@/lib/admin';
import type {ActionResult} from '@/app/admin/actions';
import {submitReview,voteReview,publishReview,archiveReview,deleteReview} from '@/app/admin/review-actions';
const labels:Record<string,string>={draft:'Borrador',pending:'En evaluación',approved:'Aprobada por todos',published:'Publicada',archived:'Archivada'};
/** Estado, votos del equipo y acciones de una reseña. */
export default function ReviewPanel({review,names,demo,detail=false}:{review:AdminReview;names:Record<string,string>;demo:boolean;detail?:boolean}){
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[stars,setStars]=useState(review.mine?.stars_vote??4),[comment,setComment]=useState(review.mine?.comment??''),[when,setWhen]=useState('');
  const router=useRouter();
  async function run(task:()=>Promise<ActionResult>){setBusy(true);try{const r=await task();setMessage(r.message);if(r.ok)router.refresh();}catch{setMessage('No pudimos completar la acción. Inténtalo nuevamente.');}finally{setBusy(false);}}
  const approvals=review.votes.filter(v=>v.approved).length;
  const evaluating=review.status==='pending'||review.status==='approved';
  return <article className="review-admin">
    <header><strong>{review.title}</strong> · {review.artist} <span className="muted">({review.kind==='album'?'álbum':'sencillo'})</span> — <span className={`status status-${review.status}`}>{labels[review.status]}</span>{review.status==='published'&&review.stars!=null&&<> · {review.stars.toString().replace('.',',')} ★</>}</header>
    {evaluating&&<p>Autorizaciones: <strong>{approvals}/{review.admins}</strong></p>}
    {detail&&review.votes.length>0&&<ul className="vote-list">{review.votes.map(v=><li key={v.admin_id}><strong>{names[v.admin_id]??'Administrador'}</strong>: {v.approved?'autoriza':'no autoriza todavía'} · {v.stars_vote} ★{v.comment&&<> — {v.comment}</>}</li>)}</ul>}
    {!detail&&<Link className="read-more" href={`/admin/resenas/${review.id}`}>Abrir ↗</Link>}
    {detail&&<div className="review-actions">
      {review.status==='draft'&&<button disabled={demo||busy} onClick={()=>run(()=>submitReview(review.id))}>Enviar a evaluación</button>}
      {evaluating&&<fieldset className="vote-form"><legend>Tu evaluación</legend>
        <label>Estrellas KIIN (1 a 5)<input type="number" min={1} max={5} value={stars} onChange={e=>setStars(Number(e.target.value))}/></label>
        <label>Comentario para el equipo<input value={comment} maxLength={500} onChange={e=>setComment(e.target.value)}/></label>
        <button disabled={demo||busy} onClick={()=>run(()=>voteReview({review_id:review.id,approved:true,stars_vote:stars,comment}))}>Autorizar con {stars} ★</button>{' '}
        <button disabled={demo||busy} onClick={()=>run(()=>voteReview({review_id:review.id,approved:false,stars_vote:stars,comment}))}>No autorizar aún</button>
      </fieldset>}
      {review.status==='approved'&&<div><label>Fecha de publicación (opcional, hora de Ciudad de México)<input type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/></label><button disabled={demo||busy} onClick={()=>run(()=>publishReview(review.id,when))}>Publicar con la calificación promedio</button></div>}
      {review.status!=='archived'&&<button disabled={demo||busy} onClick={()=>run(()=>archiveReview(review.id))}>Archivar</button>}{' '}
      <button disabled={demo||busy} onClick={()=>{if(confirm('¿Eliminar esta reseña y sus votos?'))run(()=>deleteReview(review.id));}}>Eliminar</button>
    </div>}
    {message&&<p role="status">{message}</p>}
  </article>;
}
