import Link from 'next/link';
import {reviewsAdminData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import ReviewPanel from '@/components/admin/ReviewPanel';
export default async function Page(){const data=await reviewsAdminData();const queue=data.reviews.filter(r=>r.status==='pending'||r.status==='approved'),rest=data.reviews.filter(r=>!queue.includes(r));return <><h1>Reseñas de álbumes y sencillos</h1><Link className="button primary" href="/admin/resenas/new">Crear reseña</Link><section className="account-section"><h2>Por evaluar ({queue.length})</h2>{queue.map(r=><ReviewPanel key={r.id} review={r} names={data.names} demo={isDemo()}/>)}{!queue.length&&<p>No hay reseñas esperando evaluación.</p>}</section><section className="account-section"><h2>Todas</h2>{rest.map(r=><ReviewPanel key={r.id} review={r} names={data.names} demo={isDemo()}/>)}{!rest.length&&<p>Aún no hay reseñas.</p>}</section></>;}
