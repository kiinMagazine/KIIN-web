'use client';
import {useState} from 'react';
import {useActionLock} from '@/lib/use-action-lock';
import {useRouter} from 'next/navigation';
import {addAdmin,resetAdminPassword} from '@/app/admin/team-actions';
import type {ActionResult} from '@/app/admin/actions';
import type {TeamMember} from '@/lib/admin';
export default function Team({members,demo}:{members:TeamMember[];demo:boolean}){
  const [message,setMessage]=useState(''),[temp,setTemp]=useState<{who:string;value:string}|null>(null);
  const router=useRouter();
  const lock=useActionLock(),{busy,ready}=lock;
  // Un clic = un envío: el candado se toma en el mismo clic (el estado de React llega un render tarde).
  function run(task:()=>Promise<ActionResult>,who:string){return lock.run(async()=>{setTemp(null);try{const r=await task();setMessage(r.message);if(r.ok&&r.temp)setTemp({who,value:r.temp});if(r.ok)router.refresh();}catch{setMessage('No pudimos completar la acción. Inténtalo nuevamente.');}});}
  return <>
    <p role="status">{message}</p>
    {temp&&<section className="account-section temp-box" aria-live="polite"><h2>Contraseña temporal de {temp.who}</h2><code className="temp-code">{temp.value}</code><p>Compártela por un canal privado. Se muestra una sola vez y esa persona deberá cambiarla al entrar.</p><button type="button" onClick={()=>navigator.clipboard?.writeText(temp.value)}>Copiar</button> <button type="button" onClick={()=>setTemp(null)}>Ya la copié</button></section>}
    <section className="account-section"><h2>Equipo ({members.length}/4)</h2><p>Todos los administradores tienen el mismo nivel de permisos. Aquí solo ves si alguien está activo.</p>
      <ul className="team-list">{members.map(m=><li key={m.user_id}><span className={`presence ${m.active?'on':'off'}`} aria-hidden="true"/><strong>{m.display_name||m.email}</strong> <span className="muted">{m.email}</span> · <span>{m.active?'Activo':'Inactivo'}</span>{m.must_change_password&&<em> · pendiente de cambiar contraseña</em>}{m.me&&' (tú)'} <button type="button" disabled={demo||!ready||busy} onClick={()=>run(()=>resetAdminPassword(m.user_id),m.display_name||m.email)}>Nueva contraseña temporal</button></li>)}</ul>
    </section>
    {members.length>=4&&<p className="notice-card" role="note">El equipo está completo: hay 4 administradores, el máximo permitido.</p>}{members.length<4&&<section className="account-section"><h2>Agregar administrador</h2><p className="muted">La página genera una contraseña temporal segura. Compártela por un canal privado: vence en 72 horas y la persona deberá cambiarla al entrar. Si el correo ya tiene cuenta de lector, se convierte en administrador.</p>
      <form method="post" onSubmit={e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);run(()=>addAdmin({email:f.get('email'),display_name:f.get('display_name')}),String(f.get('display_name')||f.get('email'))).then(()=>form.reset());}}>
        <label>Nombre<input name="display_name" maxLength={60} autoComplete="off"/></label>
        <label>Correo<input name="email" type="email" maxLength={254} required autoComplete="off"/></label>
        <button disabled={demo||!ready||busy}>Crear con contraseña temporal</button>
      </form></section>}
  </>;
}
