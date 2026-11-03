'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {addAdmin,resetAdminPassword} from '@/app/admin/team-actions';
import type {ActionResult} from '@/app/admin/actions';
import type {TeamMember} from '@/lib/admin';
export default function Team({members,demo}:{members:TeamMember[];demo:boolean}){
  const [message,setMessage]=useState(''),[temp,setTemp]=useState<{who:string;value:string}|null>(null),[busy,setBusy]=useState(false);
  const router=useRouter();
  async function run(task:()=>Promise<ActionResult>,who:string){setBusy(true);setTemp(null);try{const r=await task();setMessage(r.message);if(r.ok&&r.temp)setTemp({who,value:r.temp});if(r.ok)router.refresh();}catch{setMessage('No pudimos completar la acción. Inténtalo nuevamente.');}finally{setBusy(false);}}
  return <>
    <p role="status">{message}</p>
    {temp&&<section className="account-section temp-box" aria-live="polite"><h2>Contraseña temporal de {temp.who}</h2><code className="temp-code">{temp.value}</code><p>Compártela por un canal privado. Se muestra una sola vez y esa persona deberá cambiarla al entrar.</p><button type="button" onClick={()=>navigator.clipboard?.writeText(temp.value)}>Copiar</button> <button type="button" onClick={()=>setTemp(null)}>Ya la copié</button></section>}
    <section className="account-section"><h2>Equipo ({members.length}/3)</h2><p>Los tres administradores tienen el mismo nivel de permisos. Aquí solo ves si alguien está activo.</p>
      <ul className="team-list">{members.map(m=><li key={m.user_id}><span className={`presence ${m.active?'on':'off'}`} aria-hidden="true"/><strong>{m.display_name||m.email}</strong> <span className="muted">{m.email}</span> · <span>{m.active?'Activo':'Inactivo'}</span>{m.must_change_password&&<em> · pendiente de cambiar contraseña</em>}{m.me&&' (tú)'} <button type="button" disabled={demo||busy} onClick={()=>run(()=>resetAdminPassword(m.user_id),m.display_name||m.email)}>Nueva contraseña temporal</button></li>)}</ul>
    </section>
    {members.length<3&&<section className="account-section"><h2>Agregar administrador</h2>
      <form onSubmit={e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);run(()=>addAdmin({email:f.get('email'),display_name:f.get('display_name')}),String(f.get('display_name')||f.get('email'))).then(()=>form.reset());}}>
        <label>Nombre<input name="display_name" maxLength={60} autoComplete="off"/></label>
        <label>Correo<input name="email" type="email" maxLength={254} required autoComplete="off"/></label>
        <button disabled={demo||busy}>Crear con contraseña temporal</button>
      </form></section>}
  </>;
}
