import {randomInt} from 'node:crypto';
const alphabet='ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
/** Contraseña temporal aleatoria de 16 caracteres sin símbolos ambiguos; cumple el mínimo de 12. */
export function tempPassword(length=16){return Array.from({length},()=>alphabet[randomInt(alphabet.length)]).join('');}
