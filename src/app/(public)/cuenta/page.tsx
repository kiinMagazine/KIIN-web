import Link from 'next/link';
import {readerData} from '@/lib/reader';
import {isDemo} from '@/lib/data';
import {PostGrid,PickCard} from '@/components/Editorial';
import ReviewCard from '@/components/ReviewCard';
import ReaderAccount from '@/components/ReaderAccount';
import {metadata} from '@/lib/seo';
export const dynamic='force-dynamic';
export function generateMetadata(){return {...metadata('Mi cuenta','Tus guardados y lo que sigues en KIIN.','/cuenta'),robots:{index:false,follow:false}};}
export default async function Page(){
  if(isDemo())return <div className="wrap"><header className="page-header"><p className="eyebrow">Tu cuenta KIIN</p><h1>Mi cuenta.</h1></header><p className="demo-notice">Las cuentas de lectores se activan al conectar el proyecto con Supabase.</p></div>;
  const data=await readerData();
  const {posts,reviews,picks}=data.saved,total=posts.length+reviews.length+picks.length;
  return <div className="wrap"><header className="page-header"><p className="eyebrow">Tu cuenta KIIN</p><h1>{data.profile.display_name?`Hola, ${data.profile.display_name}.`:'Mi cuenta.'}</h1><p>{data.email}</p></header>
    {!!data.news.length&&<section className="section"><h2>Novedades de lo que sigues</h2><PostGrid posts={data.news}/></section>}
    <section className="section"><h2>Guardados ({total})</h2>
      {!total&&<p>Todavía no guardas nada. Explora <Link href="/">la portada</Link> o <Link href="/resenas">las reseñas</Link> y toca «Guardar en mi cuenta».</p>}
      {!!posts.length&&<PostGrid posts={posts}/>}
      {!!reviews.length&&<div className="week-grid">{reviews.map(r=><ReviewCard key={r.id} review={r}/>)}</div>}
      {!!picks.length&&<div className="week-grid">{picks.map(p=><PickCard key={p.id} pick={p}/>)}</div>}
    </section>
    <ReaderAccount followAll={data.profile.follow_all} followTerritories={data.profile.follow_territories}/>
  </div>;
}
