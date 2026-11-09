import 'server-only';
import {sessionClient} from './supabase/server';
import {serviceClient} from './supabase/service';
import {isDemo} from './supabase/config';

export type Role='admin'|'usuario';
export type Account={id:string;email:string;role:Role;mustChange:boolean};

/** Error de autorización con código estable; las acciones lo traducen a un mensaje para la persona. */
export class AuthError extends Error{constructor(public code:'DEMO'|'UNAUTHENTICATED'|'MUST_CHANGE_PASSWORD'|'FORBIDDEN'|'MFA_REQUIRED',message:string){super(message);}}

/**
 * Identidad y rol actuales, verificados en el servidor en cada llamada:
 * getUser() valida el JWT contra Supabase Auth (no se confía en lo que diga la cookie) y el rol sale de la tabla admins.
 */
export async function currentAccount(){
  if(isDemo())return null;
  const client=await sessionClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return null;
  const service=serviceClient();
  const [{data:admin},{data:secret}]=await Promise.all([
    service.from('admins').select('must_change_password').eq('user_id',user.id).maybeSingle(),
    service.from('account_secrets').select('user_id').eq('user_id',user.id).maybeSingle(),
  ]);
  const account:Account={id:user.id,email:user.email??'',role:admin?'admin':'usuario',mustChange:!!admin?.must_change_password||!!secret};
  return {client,user,account};
}

/** Sesión válida y contraseña definitiva. Para like, guardar, historial y perfil. */
export async function requireUser(options:{allowTemporary?:boolean}={}){
  if(isDemo())throw new AuthError('DEMO','Las cuentas estarán disponibles al conectar el proyecto.');
  const current=await currentAccount();
  if(!current)throw new AuthError('UNAUTHENTICATED','Inicia sesión para continuar.');
  if(current.account.mustChange&&!options.allowTemporary)throw new AuthError('MUST_CHANGE_PASSWORD','Cambia tu contraseña temporal para continuar.');
  return current;
}

/** Rol administrador (y segundo factor si lo tiene activado). Para el panel y sus acciones. */
export async function requireAdmin(options:{allowTemporary?:boolean}={}){
  const current=await requireUser(options);
  if(current.account.role!=='admin')throw new AuthError('FORBIDDEN','No tienes permiso para esta sección.');
  const {data:aal,error}=await current.client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(error||(aal?.nextLevel==='aal2'&&aal.currentLevel!=='aal2'))throw new AuthError('MFA_REQUIRED','Completa la verificación en dos pasos.');
  return current;
}

export {safeNext} from './auth/next-path';
