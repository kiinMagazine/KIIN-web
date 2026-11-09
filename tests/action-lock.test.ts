import {describe,expect,it,vi} from 'vitest';
import {createActionLock,runLocked,KEEP_LOCK_MS} from '@/lib/action-lock';

const deferred=<T>()=>{let resolve!:(v:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};};

describe('candado de acciones (un clic = un envío)',()=>{
  it('un doble clic síncrono ejecuta la tarea una sola vez',async()=>{
    const lock=createActionLock(),d=deferred<string>(),task=vi.fn(()=>d.promise);
    const first=runLocked(lock,task),second=runLocked(lock,task);
    expect(task).toHaveBeenCalledTimes(1);
    expect(await second).toBeUndefined();
    d.resolve('ok');
    expect(await first).toBe('ok');
  });
  it('se libera al terminar y permite la siguiente acción',async()=>{
    const lock=createActionLock(),task=vi.fn(async()=>1);
    await runLocked(lock,task);await runLocked(lock,task);
    expect(task).toHaveBeenCalledTimes(2);
    expect(lock.held).toBe(false);
  });
  it('se libera aunque la tarea falle',async()=>{
    const lock=createActionLock();
    await expect(runLocked(lock,async()=>{throw new Error('red');})).rejects.toThrow('red');
    expect(lock.held).toBe(false);
  });
  it('avisa el estado ocupado para pintar el botón',async()=>{
    const states:boolean[]=[],lock=createActionLock(b=>states.push(b));
    await runLocked(lock,async()=>null);
    expect(states).toEqual([true,false]);
  });
  it('se mantiene ocupado mientras navega tras un éxito y se suelta solo si la navegación no llega',async()=>{
    vi.useFakeTimers();
    try{
      const lock=createActionLock(),task=vi.fn(async()=>({ok:true}));
      await runLocked(lock,task,r=>r.ok);
      expect(lock.held).toBe(true);
      expect(await runLocked(lock,task)).toBeUndefined();
      vi.advanceTimersByTime(KEEP_LOCK_MS);
      expect(lock.held).toBe(false);
    }finally{vi.useRealTimers();}
  });
  it('sin éxito no retiene el botón',async()=>{
    const lock=createActionLock();
    await runLocked(lock,async()=>({ok:false}),r=>r.ok);
    expect(lock.held).toBe(false);
  });
});
