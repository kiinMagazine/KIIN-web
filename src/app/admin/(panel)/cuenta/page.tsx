import {isDemo} from '@/lib/data';
import Account from '@/components/admin/Account';
export default async function Page({searchParams}:{searchParams:Promise<{cambiar?:string}>}){const forced=!!(await searchParams).cambiar;return <><h1>Tu cuenta</h1>{forced&&<p className="admin-banner" role="alert">Entraste con una contraseña temporal. Elige tu propia contraseña para continuar.</p>}<Account demo={isDemo()}/></>;}
