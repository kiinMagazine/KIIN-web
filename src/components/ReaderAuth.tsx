'use client';
import {useId,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useActionLock} from '@/lib/use-action-lock';
import {signIn,signUp,requestPasswordReset,resetPassword,verifyEmail,changePassword,type ReaderResult} from '@/app/cuenta-actions';

export type AuthMode='entrar'|'registro'|'recuperar'|'restablecer'|'verificar'|'cambiar';

/** Campo de contraseña con mostrar/ocultar y guía de longitud en vivo (sin reglas de composición: frase larga > símbolos). */
function PasswordField({name,label,autoComplete,error,hint=false}:{name:string;label:string;autoComplete:string;error?:string;hint?:boolean}){
  const id=useId(),[show,setShow]=useState(false),[length,setLength]=useState(0);
  const help=hint?`${id}-help`:undefined,err=error?`${id}-err`:undefined;
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <div className="password-row"><input id={id} name={name} type={show?'text':'password'} autoComplete={autoComplete} required minLength={hint?12:1} maxLength={128} aria-invalid={!!error} aria-describedby={[help,err].filter(Boolean).join(' ')||undefined} onChange={e=>setLength([...e.target.value].length)}/>
      <button type="button" className="link-button" aria-pressed={show} aria-controls={id} onClick={()=>setShow(s=>!s)}>{show?'Ocultar':'Mostrar'}</button></div>
    {hint&&<small id={help} className={length>=12?'hint ok':'hint'}>{length>=12?'Longitud suficiente.':`Mínimo 12 caracteres (llevas ${length}).`} Una frase de varias palabras funciona bien; evita contraseñas que uses en otros sitios.</small>}
    {error&&<small id={err} className="field-error" role="alert">{error}</small>}
  </div>;
}
function TextField({name,label,type='text',autoComplete,error,help,...rest}:{name:string;label:string;type?:string;autoComplete?:string;error?:string;help?:string}&React.InputHTMLAttributes<HTMLInputElement>){
  const id=useId();
  return <div className="field"><label htmlFor={id}>{label}</label><input id={id} name={name} type={type} autoComplete={autoComplete} aria-invalid={!!error} aria-describedby={[help&&`${id}-help`,error&&`${id}-err`].filter(Boolean).join(' ')||undefined} {...rest}/>
    {help&&<small id={`${id}-help`} className="hint">{help}</small>}{error&&<small id={`${id}-err`} className="field-error" role="alert">{error}</small>}</div>;
}

/** Formularios de acceso. Mensajes genéricos donde importa (no revelan si un correo tiene cuenta). */
export default function ReaderAuth({mode,token,next,notice}:{mode:AuthMode;token?:string;next?:string;notice?:string}){
  const [result,setResult]=useState<ReaderResult|null>(notice?{ok:false,message:notice}:null),[otp,setOtp]=useState(false),[sent,setSent]=useState(false);
  const router=useRouter(),lock=useActionLock(),{busy,ready}=lock;
  // Un clic = un envío. Tras un éxito con redirección el botón sigue ocupado hasta que cambie la página.
  function run(task:()=>Promise<ReaderResult>){
    return lock.run(async()=>{
      try{const r=await task();setResult(r);if(r.needsOtp)setOtp(true);
        if(r.ok&&r.code==='CHECK_EMAIL')setSent(true);
        else if(r.ok&&r.next){router.push(r.next);router.refresh();return true;}}
      catch{setResult({ok:false,message:'No pudimos conectar con KIIN. Revisa tu conexión e inténtalo de nuevo.'});}
      return false;
    },navigating=>navigating);
  }
  const data=(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();return Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>;};
  const err=(k:string)=>result?.errors?.[k];
  const banner=result&&<p className={result.ok?'notice-ok':'notice-error'} role={result.ok?'status':'alert'}>{result.message}</p>;

  if(sent)return <div className="reader-auth"><div className="notice-card" role="status"><h2>Revisa tu correo</h2><p>{result?.message}</p><p className="muted">¿No llega? Revisa la carpeta de spam o espera un par de minutos antes de pedir otro.</p></div>
    <p><Link href="/cuenta/entrar">Volver a entrar</Link></p></div>;

  return <div className="reader-auth">
    {banner}
    {mode==='entrar'&&<form method="post" onSubmit={e=>{const f=data(e);run(()=>signIn({...f,next}));}} noValidate={false}>
      <TextField name="email" label="Correo" type="email" autoComplete="username" required maxLength={254}/>
      <PasswordField name="password" label="Contraseña" autoComplete="current-password"/>
      {otp&&<TextField name="otp" label="Código de verificación (6 dígitos)" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" required autoFocus help="Ábrelo en tu aplicación de autenticación."/>}
      <button className="primary" disabled={!ready||busy}>{busy?'Entrando…':'Entrar'}</button>
      <p className="form-links"><Link href="/cuenta/recuperar">Olvidé mi contraseña</Link><span aria-hidden="true"> · </span><Link href={`/cuenta/registro${next?`?next=${encodeURIComponent(next)}`:''}`}>Crear cuenta</Link></p>
    </form>}
    {mode==='registro'&&<form method="post" onSubmit={e=>{const f=data(e);run(()=>signUp(f));}}>
      <TextField name="username" label="Nombre de usuario" autoComplete="username" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.]{3,30}" help="De 3 a 30 caracteres: letras sin acentos, números, punto o guion bajo." error={err('username')}/>
      <TextField name="email" label="Correo" type="email" autoComplete="email" required maxLength={254} error={err('email')}/>
      <PasswordField name="password" label="Contraseña" autoComplete="new-password" hint error={err('password')}/>
      <p className="muted">Al crear tu cuenta aceptas los <Link href="/terminos">Términos</Link> y el <Link href="/privacidad">Aviso de privacidad</Link>.</p>
      <button className="primary" disabled={!ready||busy}>{busy?'Creando cuenta…':'Crear cuenta'}</button>
      <p className="form-links">¿Ya tienes cuenta? <Link href="/cuenta/entrar">Entra</Link></p>
    </form>}
    {mode==='recuperar'&&<form method="post" onSubmit={e=>{const f=data(e);run(()=>requestPasswordReset(f));}}>
      <p>Escribe el correo de tu cuenta. Te enviaremos un enlace para elegir una contraseña nueva.</p>
      <TextField name="email" label="Correo" type="email" autoComplete="username" required maxLength={254} error={err('email')}/>
      <button className="primary" disabled={!ready||busy}>{busy?'Enviando…':'Enviarme el enlace'}</button>
      <p className="form-links"><Link href="/cuenta/entrar">Volver a entrar</Link></p>
    </form>}
    {mode==='restablecer'&&<form method="post" onSubmit={e=>{const f=data(e);run(()=>resetPassword({token,password:f.password}));}}>
      <PasswordField name="password" label="Contraseña nueva" autoComplete="new-password" hint error={err('password')}/>
      <button className="primary" disabled={!ready||busy||!token}>{busy?'Guardando…':'Guardar contraseña nueva'}</button>
      {result?.code==='TOKEN_INVALID'&&<p><Link className="button" href="/cuenta/recuperar">Pedir otro enlace</Link></p>}
    </form>}
    {mode==='verificar'&&<form method="post" onSubmit={e=>{e.preventDefault();run(()=>verifyEmail(token));}}>
      <p>Confirma tu correo para activar tu cuenta.</p>
      <button className="primary" disabled={!ready||busy||!token}>{busy?'Confirmando…':'Confirmar mi correo'}</button>
    </form>}
    {mode==='cambiar'&&<form method="post" onSubmit={e=>{const f=data(e);run(()=>changePassword(f)).then(()=>{});}}>
      <PasswordField name="current" label="Contraseña actual (la temporal, si acabas de entrar con una)" autoComplete="current-password" error={err('current')}/>
      <PasswordField name="password" label="Contraseña nueva" autoComplete="new-password" hint error={err('password')}/>
      <button className="primary" disabled={!ready||busy}>{busy?'Guardando…':'Cambiar contraseña'}</button>
    </form>}
  </div>;
}
