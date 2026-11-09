import ReaderAuth from '@/components/ReaderAuth';
import {metadata} from '@/lib/seo';
export function generateMetadata(){return {...metadata('Recuperar contraseña','Restablece la contraseña de tu cuenta KIIN.','/cuenta/recuperar'),robots:{index:false,follow:false}};}
export default function Page(){return <div className="wrap auth-page"><header className="page-header"><p className="eyebrow">Tu cuenta KIIN</p><h1>Recuperar contraseña.</h1></header><ReaderAuth mode="recuperar"/></div>;}
