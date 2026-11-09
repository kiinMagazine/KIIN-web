import {redirect} from 'next/navigation';
import ReaderAuth from '@/components/ReaderAuth';
import {currentAccount} from '@/lib/account';
import {metadata} from '@/lib/seo';
export const dynamic='force-dynamic';
export function generateMetadata(){return {...metadata('Cambiar contraseña','Cambia la contraseña de tu cuenta KIIN.','/cuenta/cambiar-contrasena'),robots:{index:false,follow:false}};}
export default async function Page(){
  const current=await currentAccount();if(!current)redirect('/cuenta/entrar?next=/cuenta/cambiar-contrasena');
  const forced=current.account.mustChange;
  return <div className="wrap auth-page"><header className="page-header"><p className="eyebrow">Seguridad</p><h1>{forced?'Elige tu contraseña.':'Cambiar contraseña.'}</h1>
    {forced?<p className="notice-card" role="alert">Entraste con una contraseña temporal. Antes de seguir, elige una propia: al menos 12 caracteres y distinta a la temporal.</p>:<p>Al cambiarla cerraremos tus otras sesiones abiertas.</p>}</header>
    <ReaderAuth mode="cambiar"/></div>;
}
