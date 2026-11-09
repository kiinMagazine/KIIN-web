'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {whoAmI,type ReaderResult} from '@/app/cuenta-actions';
import {HINT_COOKIE} from '@/lib/session';

/**
 * Enlaces de cuenta en la barra principal. Las páginas públicas son estáticas, así que el rol se pide al servidor
 * (verificado allí, nunca leído de una cookie). "Administrador" solo aparece con rol admin; además /admin está
 * protegido en el proxy y en cada acción del servidor: ocultar el enlace no es la protección.
 */
export default function AccountNav(){
  const [me,setMe]=useState<ReaderResult|null>(null),path=usePathname();
  useEffect(()=>{
    if(!document.cookie.split('; ').some(c=>c.startsWith(`${HINT_COOKIE}=`))){queueMicrotask(()=>setMe({ok:true,message:'',loggedIn:false}));return;}
    let alive=true;whoAmI().then(r=>{if(alive)setMe(r);}).catch(()=>{if(alive)setMe({ok:true,message:'',loggedIn:false});});
    return()=>{alive=false;};
  },[path]);
  const current=(href:string)=>path===href||path.startsWith(`${href}/`)?'page':undefined;
  if(!me)return <span className="account-nav pending" aria-hidden="true"/>;
  if(!me.loggedIn)return <span className="account-nav"><Link href={`/cuenta/entrar${path&&path!=='/'?`?next=${encodeURIComponent(path)}`:''}`} aria-current={current('/cuenta/entrar')}>Entrar</Link></span>;
  return <span className="account-nav">
    {me.role==='admin'&&<Link href="/admin" className="admin-link" aria-current={current('/admin')}>Administrador</Link>}
    <Link href="/cuenta" aria-current={current('/cuenta')} aria-label={`Mi perfil${me.username?` (@${me.username})`:''}`}>Mi perfil</Link>
  </span>;
}
