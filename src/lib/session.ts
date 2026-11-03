/** Caducidad por inactividad (no por tiempo absoluto): la sesión sigue viva mientras haya actividad. */
export const ACTIVITY_COOKIE='kiin_active';
export const READER_IDLE_MS=60*60*1000;
export const ADMIN_IDLE_MS=30*60*1000;
export const TOUCH_EVERY_MS=5*60*1000;
export function idleLimit(pathname:string){return pathname.startsWith('/admin')?ADMIN_IDLE_MS:READER_IDLE_MS;}
export function isIdle(lastActive:number|null,now:number,limit:number){return lastActive!==null&&Number.isFinite(lastActive)&&now-lastActive>limit;}
export function parseActivity(value?:string){const n=Number(value);return Number.isSafeInteger(n)&&n>0?n:null;}
export const activityCookie={httpOnly:true,sameSite:'lax' as const,secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*30};
