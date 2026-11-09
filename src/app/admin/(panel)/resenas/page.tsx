import Link from 'next/link';
import {reviewsAdminData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import ReviewPanel from '@/components/admin/ReviewPanel';
export default async function Page(){
  const data=await reviewsAdminData();
  const open=(r:(typeof data.reviews)[number])=>r.status!=='published'&&r.status!=='archived';
  const queue=data.reviews.filter(r=>open(r)&&r.review.state!=='draft'),drafts=data.reviews.filter(r=>open(r)&&r.review.state==='draft'),done=data.reviews.filter(r=>!open(r));
  return <><header className="admin-page-head"><h1>Reseñas</h1><Link className="button primary" href="/admin/posts/new?tipo=review">Nueva reseña</Link></header>
    <p className="muted">Una reseña se publica cuando todo el equipo la autoriza. Las estrellas KIIN son el promedio de los votos, redondeado a media estrella.</p>
    <section className="account-section"><h2>En votación ({queue.length})</h2>{queue.map(r=><ReviewPanel key={r.id} review={r} names={data.names} demo={isDemo()}/>)}{!queue.length&&<p className="empty">No hay reseñas esperando tu voto.</p>}</section>
    <section className="account-section"><h2>Borradores ({drafts.length})</h2>{drafts.map(r=><ReviewPanel key={r.id} review={r} names={data.names} demo={isDemo()}/>)}{!drafts.length&&<p className="empty">Sin borradores. Empieza una con «Nueva reseña».</p>}</section>
    <section className="account-section"><h2>Publicadas y archivadas ({done.length})</h2>{done.map(r=><ReviewPanel key={r.id} review={r} names={data.names} demo={isDemo()}/>)}{!done.length&&<p className="empty">Aún no hay reseñas publicadas.</p>}</section></>;
}
