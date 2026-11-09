'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import type {AdminReview} from '@/lib/admin';
import type {ActionResult} from '@/app/admin/actions';
import {changeContent} from '@/app/admin/actions';
import {submitReview,voteReview,publishReview} from '@/app/admin/review-actions';
import StarInput from './StarInput';

function stage(r:AdminReview){
  if(r.status==='archived')return {key:'archived',label:'Archivada'};
  if(r.status==='published')return {key:'published',label:r.published_at&&new Date(r.published_at)>new Date()?'Programada':'Publicada'};
  return r.review.state==='approved'?{key:'approved',label:'Autorizada por todo el equipo'}:r.review.state==='voting'?{key:'pending',label:'En votación'}:{key:'draft',label:'Borrador'};
}
const fmt=(n:number)=>n.toLocaleString('es-MX',{minimumFractionDigits:1,maximumFractionDigits:1});

/** Estado, votos del equipo y acciones de una reseña. */
export default function ReviewPanel({review,names,demo,detail=false}:{review:AdminReview;names:Record<string,string>;demo:boolean;detail?:boolean}){
  const [message,setMessage]=useState<ActionResult|null>(null),[busy,setBusy]=useState(false),[stars,setStars]=useState(review.mine?.stars_vote??0),[comment,setComment]=useState(review.mine?.comment??''),[when,setWhen]=useState('');
  const router=useRouter();
  async function run(task:()=>Promise<ActionResult>){setBusy(true);try{const r=await task();setMessage(r);if(r.ok)router.refresh();}catch{setMessage({ok:false,message:'No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.'});}finally{setBusy(false);}}
  const st=stage(review),approvals=review.votes.filter(v=>v.approved).length,voting=review.review.state!=='draft'&&review.status!=='published'&&review.status!=='archived';
  const average=review.votes.filter(v=>v.approved).reduce((a,v)=>a+v.stars_vote,0)/(approvals||1);
  return <article className="review-admin">
    <header className="review-admin-head">
      <div><strong>{review.title}</strong> <span className="muted">· {review.artist} · {review.review.subject==='album'?'Álbum':'Sencillo'}</span></div>
      <span className={`status status-${st.key}`}>{st.label}</span>
    </header>
    {voting&&<div className="vote-meter" role="group" aria-label="Avance de la votación">
      <span>Autorizaciones <strong>{approvals}/{review.admins}</strong></span>
      <span className="vote-bar" aria-hidden="true"><span style={{width:`${Math.min(100,approvals/Math.max(1,review.admins)*100)}%`}}/></span>
      {approvals>0&&<span>Promedio provisional <strong>{fmt(Math.round(average*2)/2)} ★</strong></span>}
    </div>}
    {review.status==='published'&&review.review.stars!=null&&<p>Estrellas KIIN: <strong>{fmt(review.review.stars)} ★</strong></p>}
    {detail&&review.votes.length>0&&<ul className="vote-list">{review.votes.map(v=><li key={v.admin_id}><strong>{names[v.admin_id]??'Administrador'}</strong>: {v.approved?'autoriza':'aún no autoriza'} · {v.stars_vote} ★{v.comment&&<> — «{v.comment}»</>}</li>)}</ul>}
    {!detail&&<Link className="read-more" href={`/admin/resenas/${review.id}`}>{voting&&!review.mine?'Votar ↗':'Abrir ↗'}</Link>}
    {detail&&<div className="review-actions">
      {review.review.state==='draft'&&review.status!=='archived'&&<button disabled={demo||busy} onClick={()=>run(()=>submitReview(review.id))}>Enviar a votación</button>}
      {voting&&<fieldset className="vote-form"><legend>Tu voto</legend>
        <StarInput name={`stars-${review.id}`} value={stars} onChange={setStars} label="Tus estrellas KIIN"/>
        <label>Comentario para el equipo (opcional)<input value={comment} maxLength={500} onChange={e=>setComment(e.target.value)}/></label>
        <div className="form-actions"><button className="primary" disabled={demo||busy||!stars} onClick={()=>run(()=>voteReview({review_id:review.id,approved:true,stars_vote:stars,comment}))}>{stars?`Autorizar con ${stars} ★`:'Elige tus estrellas'}</button>
        <button disabled={demo||busy||!stars} onClick={()=>run(()=>voteReview({review_id:review.id,approved:false,stars_vote:stars,comment}))}>Todavía no autorizo</button></div>
      </fieldset>}
      {review.review.state==='approved'&&review.status!=='published'&&<div className="publish-box"><label>Fecha de publicación (opcional · hora de Ciudad de México)<input type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/></label><button className="primary" disabled={demo||busy} onClick={()=>run(()=>publishReview(review.id,when))}>{when?'Programar publicación':'Publicar ahora'}</button></div>}
      {review.status!=='archived'&&<button disabled={demo||busy} onClick={()=>run(()=>changeContent({table:'posts',id:review.id,operation:'archive'}))}>Archivar</button>}
    </div>}
    {message&&<p role={message.ok?'status':'alert'} className={message.ok?'notice-ok':'notice-error'}>{message.message}</p>}
  </article>;
}
