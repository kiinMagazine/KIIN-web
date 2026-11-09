/** Caducidad por inactividad (deslizante) y por tiempo absoluto desde el inicio de sesión. */
export const ACTIVITY_COOKIE='kiin_active';
/** Momento del inicio de sesión (tope absoluto). httpOnly. */
export const SINCE_COOKIE='kiin_since';
/** Indicador NO sensible para la interfaz: "hay sesión" (evita consultas al servidor de visitantes sin cuenta). Legible por JS. */
export const HINT_COOKIE='kiin_auth';
/** La cuenta entró con contraseña temporal: debe cambiarla antes de usar la página. httpOnly. La verdad está en la base. */
export const MUST_CHANGE_COOKIE='kiin_mcp';
export const CHANGE_PASSWORD_PATH='/cuenta/cambiar-contrasena';

export const READER_IDLE_MS=60*60*1000;
export const ADMIN_IDLE_MS=30*60*1000;
export const READER_ABSOLUTE_MS=30*24*60*60*1000;
export const ADMIN_ABSOLUTE_MS=12*60*60*1000;
export const TOUCH_EVERY_MS=5*60*1000;
export function idleLimit(pathname:string){return pathname.startsWith('/admin')?ADMIN_IDLE_MS:READER_IDLE_MS;}
export function absoluteLimit(pathname:string){return pathname.startsWith('/admin')?ADMIN_ABSOLUTE_MS:READER_ABSOLUTE_MS;}
export function isIdle(lastActive:number|null,now:number,limit:number){return lastActive!==null&&Number.isFinite(lastActive)&&now-lastActive>limit;}
export function parseActivity(value?:string){const n=Number(value);return Number.isSafeInteger(n)&&n>0?n:null;}

const secure=process.env.NODE_ENV==='production';
export const activityCookie={httpOnly:true,sameSite:'lax' as const,secure,path:'/',maxAge:60*60*24*30};
export const hintCookie={httpOnly:false,sameSite:'lax' as const,secure,path:'/',maxAge:60*60*24*30};
export const privateCookie=activityCookie;
/** Opciones forzadas para las cookies de sesión de Supabase (access + refresh token): nunca accesibles desde JavaScript. */
export function hardenAuthCookie<T extends Record<string,unknown>>(options:T|undefined){return {...(options??{}),httpOnly:true,secure,sameSite:'lax' as const,path:'/'};}
