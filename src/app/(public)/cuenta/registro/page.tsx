import ReaderAuth from '@/components/ReaderAuth';
import {metadata} from '@/lib/seo';
export function generateMetadata(){return {...metadata('Crear cuenta','Crea tu cuenta de KIIN para guardar y dar me gusta.','/cuenta/registro'),robots:{index:false,follow:false}};}
export default function Page(){return <div className="wrap auth-page"><header className="page-header"><p className="eyebrow">Tu cuenta KIIN</p><h1>Crear cuenta.</h1><p>Guarda historias, dales me gusta y vuelve a lo que ya leíste.</p></header><ReaderAuth mode="registro"/></div>;}
