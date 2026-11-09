import Link from 'next/link';
import {isDemo} from '@/lib/data';
import Account from '@/components/admin/Account';
export default function Page(){return <><h1>Verificación en dos pasos</h1><p className="muted">Tu contraseña, nombre de usuario y sesión están en <Link href="/cuenta#seguridad">Mi perfil</Link>.</p><Account demo={isDemo()}/></>;}
