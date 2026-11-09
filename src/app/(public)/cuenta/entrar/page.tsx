import ReaderAuth from '@/components/ReaderAuth';
import {metadata} from '@/lib/seo';
export function generateMetadata(){return {...metadata('Entrar','Entra a tu cuenta de KIIN.','/cuenta/entrar'),robots:{index:false,follow:false}};}
// Avisos fijos por clave: el texto nunca sale de la URL.
const AVISOS:Record<string,string>={confirmado:'Tu correo quedó confirmado. Ya puedes entrar.',contrasena:'Listo: tu contraseña cambió y cerramos tus otras sesiones. Entra con la nueva.'};
export default async function Page({searchParams}:{searchParams:Promise<{expirada?:string;mfa?:string;next?:string;aviso?:string}>}){
  const q=await searchParams;
  const notice=q.expirada?'Tu sesión se cerró por inactividad. Entra de nuevo para continuar.':q.mfa?'Completa la verificación en dos pasos para entrar al panel.':(q.aviso&&Object.hasOwn(AVISOS,q.aviso)?AVISOS[q.aviso]:undefined);
  return <div className="wrap auth-page"><header className="page-header"><p className="eyebrow">Tu cuenta KIIN</p><h1>Entrar.</h1><p>Tus me gusta, guardados e historial te esperan.</p></header><ReaderAuth mode="entrar" next={q.next} notice={notice}/></div>;
}
