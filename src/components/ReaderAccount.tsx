'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {updateFollows,markSeen,changeReaderPassword,signOutReader,type ReaderResult} from '@/app/cuenta-actions';
import {territories,territoryNames} from '@/lib/validators';
export default function ReaderAccount({followAll,followTerritories}:{followAll:boolean;followTerritories:string[]}){
  const [all,setAll]=useState(followAll),[picked,setPicked]=useState<string[]>(followTerritories),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const router=useRouter();
  async function run(task:()=>Promise<ReaderResult>,done?:()=>void){setBusy(true);try{const r=await task();setMessage(r.message);if(r.ok)done?.();}catch{setMessage('No pudimos completar la acción. Inténtalo nuevamente.');}finally{setBusy(false);}}
  const toggle=(t:string)=>setPicked(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t]);
  return <>
    <p role="status">{message}</p>
    <section className="account-section"><h2>Lo que sigues</h2>
      <p>Verás aquí las novedades publicadas desde tu última visita.</p>
      <label><input type="checkbox" checked={all} onChange={e=>setAll(e.target.checked)}/> Todo KIIN</label>
      <div className="follow-list">{territories.map(t=><label key={t}><input type="checkbox" disabled={all} checked={all||picked.includes(t)} onChange={()=>toggle(t)}/> {territoryNames[t]}</label>)}</div>
      <button disabled={busy} onClick={()=>run(()=>updateFollows({follow_all:all,follow_territories:picked}),()=>router.refresh())}>Guardar</button>{' '}
      <button disabled={busy} onClick={()=>run(markSeen,()=>router.refresh())}>Marcar novedades como vistas</button>
    </section>
    <section className="account-section"><h2>Cambiar contraseña</h2>
      <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>changeReaderPassword(f.get('password')));}}>
        <label>Nueva contraseña (mínimo 12 caracteres)<input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required/></label>
        <button disabled={busy}>Actualizar contraseña</button>
      </form>
    </section>
    <button disabled={busy} onClick={()=>run(signOutReader,()=>{router.push('/');router.refresh();})}>Cerrar sesión</button>
  </>;
}
