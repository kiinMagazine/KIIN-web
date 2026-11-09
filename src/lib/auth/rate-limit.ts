import {headers} from 'next/headers';
import {serviceClient} from '@/lib/supabase/service';
import {subjectHash} from './crypto';

/** Límites por acción. Por IP (frena barridos) y por cuenta (frena ataques distribuidos contra una cuenta). */
export const LIMITS={
  login_ip:{limit:20,window:15*60},
  login_account:{limit:8,window:15*60},
  signup_ip:{limit:5,window:60*60},
  reset_request_ip:{limit:10,window:60*60},
  reset_request_account:{limit:3,window:60*60},
  reset_confirm_ip:{limit:15,window:60*60},
  verify_ip:{limit:20,window:60*60},
  password_change_account:{limit:10,window:60*60},
  admin_create_account:{limit:10,window:60*60},
} as const;
export type LimitName=keyof typeof LIMITS;

/** IP del cliente según el proxy de la plataforma (Vercel fija x-forwarded-for). */
export async function clientIp(){
  const h=await headers();
  return (h.get('x-forwarded-for')?.split(',')[0]||h.get('x-real-ip')||'local').trim().slice(0,64);
}

/**
 * Suma un intento. Devuelve true si está permitido. Si la base no responde se niega (cerrado por defecto):
 * sin base tampoco podría completarse el inicio de sesión.
 */
export async function allow(name:LimitName,subject:string){
  const {limit,window}=LIMITS[name];
  try{
    const {data,error}=await serviceClient().rpc('rate_limit_hit',{p_bucket:name,p_subject:subjectHash(subject),p_limit:limit,p_window_seconds:window});
    if(error){console.error('[auth] rate_limit_hit falló',name,error.code);return false;}
    if(data!==true)console.warn('[auth] límite alcanzado',name);
    return data===true;
  }catch(error){console.error('[auth] rate_limit_hit no disponible',name,error instanceof Error?error.message:'');return false;}
}
export const TOO_MANY='Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
