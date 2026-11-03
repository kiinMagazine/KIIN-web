import Link from 'next/link';
import Wordmark from '@/components/Wordmark';
import LoginForm from '@/components/admin/LoginForm';
import {isDemo} from '@/lib/data';
export default function LoginPage(){return <main id="contenido" className="login"><Wordmark/><h1>Entrar a la mesa editorial.</h1>{isDemo()&&<><p className="admin-banner">Supabase no está configurado: modo demo (solo lectura)</p><Link className="button" href="/admin">Explorar el panel de demostración</Link></>}<LoginForm demo={isDemo()}/><Link href="/">Volver a KIIN ↗</Link></main>;}
