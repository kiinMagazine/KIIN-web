import ReaderAuth from '@/components/ReaderAuth';
import {metadata} from '@/lib/seo';
export function generateMetadata(){return {...metadata('Entrar','Accede a tu cuenta de KIIN.','/cuenta/entrar'),robots:{index:false,follow:false}};}
export default async function Page({searchParams}:{searchParams:Promise<{expirada?:string}>}){const expired=!!(await searchParams).expirada;return <div className="wrap"><header className="page-header"><p className="eyebrow">Tu cuenta KIIN</p><h1>Entrar.</h1></header><ReaderAuth mode="entrar" expired={expired}/></div>;}
