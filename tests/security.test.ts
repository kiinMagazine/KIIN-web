import {describe,it,expect,vi,afterEach} from 'vitest';
vi.mock('@/lib/supabase/public',()=>({publicClient:vi.fn(()=>{throw new Error('No debe acceder a la base de datos sin autorización');})}));
import {GET} from '@/app/api/cron/keepalive/route';
afterEach(()=>vi.unstubAllEnvs());
it('cron rechaza cabeceras ausentes e incorrectas',async()=>{vi.stubEnv('CRON_SECRET','secreto-de-prueba');expect((await GET(new Request('https://example.invalid/api/cron/keepalive'))).status).toBe(401);expect((await GET(new Request('https://example.invalid/api/cron/keepalive',{headers:{authorization:'Bearer incorrecto'}}))).status).toBe(401);});
it('cron no queda abierto si falta el secreto',async()=>{vi.stubEnv('CRON_SECRET','');expect((await GET(new Request('https://example.invalid/api/cron/keepalive',{headers:{authorization:'Bearer undefined'}}))).status).toBe(401);});

describe('formularios',()=>{
  it('todo <form> declara method (sin él, un envío antes de hidratar manda contraseñas por GET en la URL)',async()=>{
    const fs=await import('node:fs'),path=await import('node:path');
    const walk=(d:string):string[]=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.name.endsWith('.tsx')?[path.join(d,e.name)]:[]);
    const missing=walk('src').flatMap(f=>[...fs.readFileSync(f,'utf8').matchAll(/<form\b(?:=>|[^>])*>/g)].filter(m=>!/method=/.test(m[0])&&!/role="search"/.test(m[0])).map(()=>f));
    expect(missing).toEqual([]);
  });
});
