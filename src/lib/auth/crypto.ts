import {createHash,createHmac,randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import bcrypt from 'bcryptjs';

/** Token de un solo uso: 32 bytes aleatorios en base64url. En la base solo se guarda su SHA-256. */
export function newToken(){return randomBytes(32).toString('base64url');}
export function hashToken(token:string){return createHash('sha256').update(token,'utf8').digest('hex');}
export function isTokenShape(token:unknown):token is string{return typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token);}

/** Identificador opaco para límites de intentos (IP o correo): HMAC, nunca el dato en claro. */
export function subjectHash(value:string){
  const key=process.env.RATE_LIMIT_SECRET||'';
  if(!key)throw new Error('Falta RATE_LIMIT_SECRET en el servidor.');
  return createHmac('sha256',key).update(value.trim().toLowerCase(),'utf8').digest('hex');
}

/** Contraseña temporal aleatoria de 16 caracteres sin símbolos ambiguos (≈ 92 bits). */
const alphabet='ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
export function tempPassword(length=16){return Array.from({length},()=>alphabet[randomInt(alphabet.length)]).join('');}

/** Hash bcrypt de la contraseña temporal, para impedir que se reutilice como definitiva. */
export const TEMP_PASSWORD_TTL_HOURS=Number(process.env.TEMP_PASSWORD_TTL_HOURS)||72;
export function hashTemp(password:string){return bcrypt.hash(password,12);}
export function matchesTemp(password:string,hash:string){return bcrypt.compare(password,hash);}

export function safeEqual(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
