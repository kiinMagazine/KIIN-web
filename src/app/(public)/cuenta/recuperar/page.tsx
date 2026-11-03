import ReaderAuth from '@/components/ReaderAuth';
import {metadata} from '@/lib/seo';
export function generateMetadata(){return {...metadata('Recuperar contraseña','Recupera tu cuenta con un código enviado a tu correo.','/cuenta/recuperar'),robots:{index:false,follow:false}};}
export default function Page(){return <div className="wrap"><header className="page-header"><p className="eyebrow">Sin drama</p><h1>Recuperar contraseña.</h1><p>Te enviaremos un código de verificación a tu correo.</p></header><ReaderAuth mode="recuperar"/></div>;}
