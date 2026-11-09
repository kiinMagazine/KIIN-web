import {redirect} from 'next/navigation';
import {readerData} from '@/lib/reader';
import {AuthError} from '@/lib/account';
import {isDemo} from '@/lib/data';
import {PostGrid} from '@/components/Editorial';
import Profile from '@/components/Profile';
import {metadata} from '@/lib/seo';
export const dynamic='force-dynamic';
export function generateMetadata(){return {...metadata('Mi perfil','Tus me gusta, guardados e historial en KIIN.','/cuenta'),robots:{index:false,follow:false}};}
export default async function Page(){
  if(isDemo())return <div className="wrap"><header className="page-header"><p className="eyebrow">Tu cuenta KIIN</p><h1>Mi perfil.</h1></header><p className="demo-notice">Las cuentas se activan al conectar el proyecto con Supabase.</p></div>;
  let data;
  try{data=await readerData();}
  catch(e){if(e instanceof AuthError){redirect(e.code==='MUST_CHANGE_PASSWORD'?'/cuenta/cambiar-contrasena':'/cuenta/entrar?next=/cuenta');}throw e;}
  return <div className="wrap"><header className="page-header"><p className="eyebrow">Tu cuenta KIIN</p><h1>Hola, {data.profile.display_name||data.profile.username}.</h1><p className="muted">@{data.profile.username}</p></header>
    {!!data.news.length&&<section className="section news"><h2>Novedades de lo que sigues</h2><PostGrid posts={data.news}/></section>}
    <Profile profile={data.profile} email={data.email} role={data.role} likes={data.likes} saves={data.saves} history={data.history} picks={data.picks}/>
  </div>;
}
