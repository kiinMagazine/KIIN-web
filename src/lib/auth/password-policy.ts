import {createHash} from 'node:crypto';
/**
 * Política de contraseñas (ISO 27001 A.5.17 / A.8.5, guiada por NIST SP 800-63B §3.1.1 y OWASP ASVS V2.1):
 * - 12 a 128 caracteres, cualquier carácter (incluye espacios y Unicode); sin reglas de composición forzadas.
 * - Se rechazan contraseñas comunes, derivadas del servicio o de los datos de la cuenta.
 * - Se rechazan contraseñas presentes en filtraciones conocidas (Have I Been Pwned, k-anonimato: solo salen 5 caracteres del hash).
 * - No se permite reutilizar la contraseña temporal ni la actual (eso lo comprueba quien llama).
 */
export const PASSWORD_MIN=12,PASSWORD_MAX=128;

// Lista corta de contraseñas y bases comunes (inglés y español) + términos del servicio. Se comparan sin dígitos/símbolos finales.
const COMMON=new Set(['password','passw0rd','contrasena','contraseña','qwerty','qwertyuiop','asdfghjkl','abc','abcdef','abcdefg','iloveyou','teamo','admin','administrador','administrator','welcome','bienvenido','letmein','monkey','dragon','football','futbol','baseball','superman','batman','sunshine','princess','princesa','master','shadow','michael','jordan','hola','holamundo','mexico','queretaro','america','chivas','cruzazul','pumas','tigres','password1','changeme','cambiame','secreto','secret','usuario','user','test','prueba','default','login','google','facebook','instagram','tiktok','kiin','kiinmag','kiinmagazine','kiincolab','kiinmx','lacultura','culturakiin','1234567890','123456789','12345678','0123456789','111111111111','000000000000','aaaaaaaaaaaa']);

export type PolicyContext={email?:string|null;username?:string|null};
export type PolicyResult={ok:true}|{ok:false;code:'TOO_SHORT'|'TOO_LONG'|'COMMON'|'PERSONAL'|'BREACHED';message:string};

function normalize(value:string){return value.normalize('NFKC').toLowerCase();}
function base(value:string){return normalize(value).replace(/[\s\d\W_]+$/u,'').replace(/^[\s\d\W_]+/u,'');}
// Términos del servicio: una contraseña hecha solo de ellos (repetidos, con año o separadores) es predecible.
const SERVICE_TERMS=['kiinmagazine','magazine','kiin','colab','revista'];
function onlyServiceTerms(n:string){
  let rest=n;for(const t of SERVICE_TERMS)rest=rest.split(t).join(' ');
  return rest!==n&&rest.replace(/[\s\d\W_]+/gu,'').length<4;
}
function isRepetitive(value:string){return /^(.)\1+$/u.test(value)||/^(?:0123456789|1234567890|abcdefghij)/.test(normalize(value));}

/** Reglas locales (sin red). */
export function checkPasswordLocal(password:string,ctx:PolicyContext={}):PolicyResult{
  const length=[...password].length;
  if(length<PASSWORD_MIN)return {ok:false,code:'TOO_SHORT',message:`Usa al menos ${PASSWORD_MIN} caracteres. Una frase de varias palabras es fácil de recordar y difícil de adivinar.`};
  if(length>PASSWORD_MAX)return {ok:false,code:'TOO_LONG',message:`Usa como máximo ${PASSWORD_MAX} caracteres.`};
  const n=normalize(password),b=base(password);
  if(COMMON.has(n)||COMMON.has(b)||isRepetitive(password)||new Set(n).size<4||onlyServiceTerms(n))return {ok:false,code:'COMMON',message:'Esa contraseña es demasiado común o predecible. Prueba con una frase propia.'};
  const personal=[ctx.email?.split('@')[0],ctx.username].filter((v):v is string=>!!v&&v.length>=4).map(normalize);
  if(personal.some(p=>n.includes(p)))return {ok:false,code:'PERSONAL',message:'No uses tu correo ni tu nombre de usuario dentro de la contraseña.'};
  return {ok:true};
}

/** Consulta de filtraciones (HIBP, k-anonimato). Devuelve null si el servicio no responde: no bloquea, se registra. */
export async function isBreached(password:string,timeoutMs=2500):Promise<boolean|null>{
  const hash=createHash('sha1').update(password,'utf8').digest('hex').toUpperCase();
  const prefix=hash.slice(0,5),suffix=hash.slice(5);
  try{
    const res=await fetch(`https://api.pwnedpasswords.com/range/${prefix}`,{headers:{'Add-Padding':'true','User-Agent':'KIIN-web-password-check'},signal:AbortSignal.timeout(timeoutMs),cache:'no-store'});
    if(!res.ok){console.warn('[auth] HIBP respondió',res.status);return null;}
    const body=await res.text();
    return body.split('\n').some(line=>{const [s,count]=line.trim().split(':');return s===suffix&&Number(count)>0;});
  }catch(error){console.warn('[auth] HIBP no disponible:',error instanceof Error?error.name:'error');return null;}
}

/** Política completa: reglas locales y luego filtraciones. */
export async function checkPassword(password:string,ctx:PolicyContext={}):Promise<PolicyResult>{
  const local=checkPasswordLocal(password,ctx);if(!local.ok)return local;
  if(await isBreached(password))return {ok:false,code:'BREACHED',message:'Esa contraseña aparece en filtraciones públicas de datos. Elige otra que no uses en ningún otro sitio.'};
  return {ok:true};
}
