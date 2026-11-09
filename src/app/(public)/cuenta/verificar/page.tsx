import ReaderAuth from '@/components/ReaderAuth';
import {metadata} from '@/lib/seo';
export const dynamic='force-dynamic';
export function generateMetadata(){return {...metadata('Confirmar correo','Confirma el correo de tu cuenta KIIN.','/cuenta/verificar'),robots:{index:false,follow:false},referrer:'no-referrer' as const};}
export default async function Page({searchParams}:{searchParams:Promise<{token?:string}>}){const {token}=await searchParams;return <div className="wrap auth-page"><header className="page-header"><p className="eyebrow">Tu cuenta KIIN</p><h1>Confirma tu correo.</h1></header><ReaderAuth mode="verificar" token={token} notice={token?undefined:'Este enlace está incompleto. Ábrelo desde el correo.'}/></div>;}
