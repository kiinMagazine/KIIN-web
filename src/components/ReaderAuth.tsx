'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {signUpReader,verifySignup,signInReader,requestReset,resetPassword,type ReaderResult} from '@/app/cuenta-actions';
type Mode='entrar'|'registro'|'recuperar';
/** Formularios de acceso de lectores: entrar, crear cuenta con código por correo y recuperar contraseña con código. */
export default function ReaderAuth({mode,expired=false}:{mode:Mode;expired?:boolean}){
  const [result,setResult]=useState<ReaderResult|null>(expired?{ok:false,message:'Tu sesión se cerró por inactividad. Vuelve a entrar.'}:null),[busy,setBusy]=useState(false),[email,setEmail]=useState(''),[step,setStep]=useState<'form'|'code'>('form');
  const router=useRouter();
  async function run(task:()=>Promise<ReaderResult>,onDone?:(r:ReaderResult)=>void){setBusy(true);try{const r=await task();setResult(r);if(r.needsCode)setStep('code');if(r.ok)onDone?.(r);}catch{setResult({ok:false,message:'No se pudo conectar. Inténtalo nuevamente.'});}finally{setBusy(false);}}
  const enter=()=>{router.push('/cuenta');router.refresh();};
  const err=(k:string)=>result?.errors?.[k]&&<small role="alert">{result.errors[k]}</small>;
  const form=(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();return Object.fromEntries(new FormData(e.currentTarget));};
  return <div className="reader-auth">
    {result&&<p role={result.ok?'status':'alert'}>{result.message}</p>}
    {mode==='entrar'&&<form onSubmit={e=>{const f=form(e);run(()=>signInReader(f),enter);}}>
      <label>Correo<input name="email" type="email" autoComplete="username" required maxLength={254}/></label>
      <label>Contraseña<input name="password" type="password" autoComplete="current-password" required maxLength={200}/></label>
      <button disabled={busy}>Entrar</button>
      <p><Link href="/cuenta/recuperar">Olvidé mi contraseña</Link> · <Link href="/cuenta/registro">Crear cuenta</Link></p>
    </form>}
    {mode==='registro'&&step==='form'&&<form onSubmit={e=>{const f=form(e);setEmail(String(f.email));run(()=>signUpReader(f));}}>
      <label>Nombre (opcional)<input name="display_name" maxLength={60} autoComplete="name"/></label>
      <label>Correo<input name="email" type="email" autoComplete="username" required maxLength={254}/>{err('email')}</label>
      <label>Contraseña (mínimo 12 caracteres)<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/>{err('password')}</label>
      <p className="muted">Al crear tu cuenta aceptas los <Link href="/terminos">Términos</Link> y la <Link href="/privacidad">Privacidad</Link>.</p>
      <button disabled={busy}>Crear cuenta</button>
    </form>}
    {mode==='registro'&&step==='code'&&<form onSubmit={e=>{const f=form(e);run(()=>verifySignup({email,code:f.code}),enter);}}>
      <label>Código de verificación<input name="code" inputMode="numeric" pattern="[0-9]{6,8}" autoComplete="one-time-code" required/>{err('code')}</label>
      <button disabled={busy}>Activar cuenta</button>
    </form>}
    {mode==='recuperar'&&step==='form'&&<form onSubmit={e=>{const f=form(e);setEmail(String(f.email));run(()=>requestReset(f));}}>
      <label>Correo de tu cuenta<input name="email" type="email" autoComplete="username" required maxLength={254}/></label>
      <button disabled={busy}>Enviarme un código</button>
    </form>}
    {mode==='recuperar'&&step==='code'&&<form onSubmit={e=>{const f=form(e);run(()=>resetPassword({email,code:f.code,password:f.password}),enter);}}>
      <label>Código recibido por correo<input name="code" inputMode="numeric" pattern="[0-9]{6,8}" autoComplete="one-time-code" required/>{err('code')}</label>
      <label>Nueva contraseña (mínimo 12 caracteres)<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/>{err('password')}</label>
      <button disabled={busy}>Cambiar contraseña</button>
    </form>}
  </div>;
}
