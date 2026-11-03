import {describe,it,expect} from 'vitest';
import {ADMIN_IDLE_MS,READER_IDLE_MS,idleLimit,isIdle,parseActivity} from '@/lib/session';
describe('Caducidad por inactividad',()=>{
  const now=1_800_000_000_000;
  it('usa límites distintos para panel y lectores',()=>{expect(idleLimit('/admin/posts')).toBe(ADMIN_IDLE_MS);expect(idleLimit('/cuenta')).toBe(READER_IDLE_MS);expect(ADMIN_IDLE_MS).toBeLessThan(READER_IDLE_MS);});
  it('solo caduca tras superar el límite de inactividad',()=>{
    expect(isIdle(now-ADMIN_IDLE_MS+1000,now,ADMIN_IDLE_MS)).toBe(false);
    expect(isIdle(now-ADMIN_IDLE_MS-1000,now,ADMIN_IDLE_MS)).toBe(true);
    expect(isIdle(null,now,ADMIN_IDLE_MS)).toBe(false);
  });
  it('ignora valores de cookie manipulados',()=>{expect(parseActivity('abc')).toBeNull();expect(parseActivity('-5')).toBeNull();expect(parseActivity(undefined)).toBeNull();expect(parseActivity(String(now))).toBe(now);});
});
