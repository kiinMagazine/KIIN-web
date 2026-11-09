'use client';
import {useState} from 'react';
import {useActionLock} from '@/lib/use-action-lock';
import {enrollTotp,verifyTotp,type ActionResult} from '@/app/admin/actions';
/** Segundo factor (TOTP) para el panel. La contraseña y la sesión se gestionan en Mi perfil. */
export default function Account({demo}:{demo:boolean}){
  const [message,setMessage]=useState<ActionResult|null>(null),[factor,setFactor]=useState<ActionResult|null>(null);
  const lock=useActionLock(),{busy,ready}=lock;
  // Un clic = un envío: el candado se toma en el mismo clic (el estado de React llega un render tarde).
  function run(task:()=>Promise<ActionResult>,done?:(r:ActionResult)=>void){return lock.run(async()=>{try{const r=await task();setMessage(r);if(r.ok)done?.(r);}catch{setMessage({ok:false,message:'No pudimos completar el cambio. Inténtalo de nuevo.'});}});}
  return <>{message&&<p className={message.ok?'notice-ok':'notice-error'} role={message.ok?'status':'alert'}>{message.message}</p>}
    <section className="account-section"><h2>Verificación en dos pasos</h2><p>Recomendada para todo el equipo. Usa una aplicación compatible con TOTP (por ejemplo, Google Authenticator o 1Password). Una vez activada, te pediremos su código al entrar.</p>
      {!factor?.secret?<button disabled={demo||!ready||busy} onClick={()=>run(enrollTotp,setFactor)}>Preparar autenticador</button>:<form method="post" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>verifyTotp({factorId:factor.factorId,code:f.get('code')}),()=>setFactor(null));}}><p>Añade esta clave a tu aplicación. No la compartas.</p><code style={{overflowWrap:'anywhere'}}>{factor.secret}</code><label>Código de 6 dígitos<input name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" required/></label><button className="primary" disabled={!ready||busy}>Confirmar y activar</button></form>}
    </section></>;
}
