'use client';
import {useCallback,useState,useSyncExternalStore} from 'react';
import {createActionLock,runLocked} from './action-lock';

const subscribe=()=>()=>{};
/**
 * Botones de acción sin envíos dobles.
 * - `busy`: hay una acción en curso (o una navegación tras un éxito).
 * - `ready`: la página ya respondió (hidratada). Antes de eso un clic no haría nada útil, así que el botón se muestra deshabilitado.
 * - `run(tarea, keepWhile?)`: ejecuta la tarea una sola vez aunque se hagan varios clics.
 */
export function useActionLock(){
  const [busy,setBusy]=useState(false);
  const [lock]=useState(()=>createActionLock(setBusy));
  const ready=useSyncExternalStore(subscribe,()=>true,()=>false);
  const run=useCallback(<T,>(task:()=>Promise<T>,keepWhile?:(result:T)=>boolean)=>runLocked(lock,task,keepWhile),[lock]);
  return {busy,ready,run};
}
