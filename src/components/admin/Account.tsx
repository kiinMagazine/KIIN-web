'use client';
import {useState} from 'react';
import {enrollTotp,verifyTotp,type ActionResult} from '@/app/admin/actions';
/** Segundo factor (TOTP) para el panel. La contraseña y la sesión se gestionan en Mi perfil. */
export default function Account({demo}:{demo:boolean}){
  const [message,setMessage]=useState<ActionResult|null>(null),[busy,setBusy]=useState(false),[factor,setFactor]=useState<ActionResult|null>(null);
  async function run(task:()=>Promise<ActionResult>,done?:(r:ActionResult)=>void){setBusy(true);try{const r=await task();setMessage(r);if(r.ok)done?.(r);}catch{setMessage({ok:false,message:'No pudimos completar el cambio. Inténtalo de nuevo.'});}finally{setBusy(false);}}
  return <>{message&&<p className={message.ok?'notice-ok':'notice-error'} role={message.ok?'status':'alert'}>{message.message}</p>}
    <section className="account-section"><h2>Verificación en dos pasos</h2><p>Recomendada para todo el equipo. Usa una aplicación compatible con TOTP (por ejemplo, Google Authenticator o 1Password). Una vez activada, te pediremos su código al entrar.</p>
      {!factor?.secret?<button disabled={demo||busy} onClick={()=>run(enrollTotp,setFactor)}>Preparar autenticador</button>:<form method="post" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>verifyTotp({factorId:factor.factorId,code:f.get('code')}),()=>setFactor(null));}}><p>Añade esta clave a tu aplicación. No la compartas.</p><code style={{overflowWrap:'anywhere'}}>{factor.secret}</code><label>Código de 6 dígitos<input name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" required/></label><button className="primary" disabled={busy}>Confirmar y activar</button></form>}
    </section></>;
}
