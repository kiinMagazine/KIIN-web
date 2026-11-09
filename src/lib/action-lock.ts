/**
 * Candado síncrono para botones de acción: un clic = un envío.
 * `useState(busy)` no basta: el estado se aplica en el siguiente render, así que un doble clic rápido
 * alcanza a lanzar la acción dos veces (p. ej. crear dos publicaciones). El candado se toma en el mismo clic.
 */
export type ActionLock={tryAcquire():boolean;release():void;readonly held:boolean};
/** Tiempo máximo que el botón sigue ocupado esperando una navegación tras un éxito. */
export const KEEP_LOCK_MS=10_000;

export function createActionLock(onChange?:(busy:boolean)=>void):ActionLock{
  let held=false;
  return {
    get held(){return held;},
    tryAcquire(){if(held)return false;held=true;onChange?.(true);return true;},
    release(){if(!held)return;held=false;onChange?.(false);}
  };
}

/**
 * Ejecuta `task` si no hay otra acción en curso; si la hay, no hace nada y devuelve undefined.
 * `keepWhile(resultado)` = true mantiene el botón ocupado (hay una navegación en camino); se suelta solo
 * a los KEEP_LOCK_MS por si la navegación no llega. Los errores se propagan y el candado se suelta igual.
 */
export async function runLocked<T>(lock:ActionLock,task:()=>Promise<T>,keepWhile?:(result:T)=>boolean):Promise<T|undefined>{
  if(!lock.tryAcquire())return undefined;
  let keep=false;
  try{const result=await task();keep=!!keepWhile?.(result);return result;}
  finally{if(keep)setTimeout(()=>lock.release(),KEEP_LOCK_MS);else lock.release();}
}
