import ReaderAuth from '@/components/ReaderAuth';
import {metadata} from '@/lib/seo';
export function generateMetadata(){return {...metadata('Crear cuenta','Guarda publicaciones y sigue lo que te interesa en KIIN.','/cuenta/registro'),robots:{index:false,follow:false}};}
export default function Page(){return <div className="wrap"><header className="page-header"><p className="eyebrow">Guarda y sigue</p><h1>Crear cuenta.</h1><p>Puedes leer todo KIIN sin cuenta. Con una cuenta guardas publicaciones, reseñas y selecciones, y sigues lo que te interesa.</p></header><ReaderAuth mode="registro"/></div>;}
