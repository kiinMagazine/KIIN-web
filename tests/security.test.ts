import {it,expect,vi,afterEach} from 'vitest';
vi.mock('@/lib/supabase/public',()=>({publicClient:vi.fn(()=>{throw new Error('No debe acceder a la base de datos sin autorización');})}));
import {GET} from '@/app/api/cron/keepalive/route';
afterEach(()=>vi.unstubAllEnvs());
it('cron rechaza cabeceras ausentes e incorrectas',async()=>{vi.stubEnv('CRON_SECRET','secreto-de-prueba');expect((await GET(new Request('https://example.invalid/api/cron/keepalive'))).status).toBe(401);expect((await GET(new Request('https://example.invalid/api/cron/keepalive',{headers:{authorization:'Bearer incorrecto'}}))).status).toBe(401);});
it('cron no queda abierto si falta el secreto',async()=>{vi.stubEnv('CRON_SECRET','');expect((await GET(new Request('https://example.invalid/api/cron/keepalive',{headers:{authorization:'Bearer undefined'}}))).status).toBe(401);});
