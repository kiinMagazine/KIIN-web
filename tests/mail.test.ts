import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
// Resend es un servicio externo: se sustituye su cliente y se prueba nuestra lógica (remitente, errores y registros).
vi.mock('server-only',()=>({}));
const send=vi.fn();
vi.mock('resend',()=>({Resend:vi.fn(function(this:{emails:unknown}){this.emails={send};})}));
import {sendMail,resetMailClientForTests,resetMail,maskEmail,DEFAULT_FROM,DEFAULT_REPLY_TO} from '@/lib/auth/mail';

const LINK='https://kiinmagazine.com/cuenta/restablecer?token=AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde';
const mail=resetMail('lectora@example.com',LINK,30);
let logs:string[]=[];
beforeEach(()=>{
  send.mockReset();resetMailClientForTests();logs=[];
  for(const m of ['info','warn','error','log'] as const)vi.spyOn(console,m).mockImplementation((...a:unknown[])=>{logs.push(a.map(String).join(' '));});
  vi.stubEnv('RESEND_API_KEY','re_prueba_123');vi.stubEnv('MAIL_FROM','');vi.stubEnv('MAIL_REPLY_TO','');
});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();vi.useRealTimers();});
const noSecrets=()=>{const all=logs.join('\n');expect(all).not.toContain('token=');expect(all).not.toContain(LINK);expect(all).not.toContain('lectora@example.com');expect(all).not.toContain('re_prueba_123');};

describe('sendMail con Resend',()=>{
  it('envía desde KIIN <contacto@kiinmagazine.com> con respuestas a contacto@',async()=>{
    send.mockResolvedValue({data:{id:'x'},error:null});
    expect(await sendMail(mail)).toBe(true);
    const payload=send.mock.calls[0][0];
    expect(payload.from).toBe(DEFAULT_FROM);expect(DEFAULT_FROM).toBe('KIIN <contacto@kiinmagazine.com>');
    expect(payload.replyTo).toBe(DEFAULT_REPLY_TO);expect(DEFAULT_REPLY_TO).toBe('contacto@kiinmagazine.com');
    expect(payload.to).toEqual(['lectora@example.com']);
    expect(payload.text).toContain(LINK);
  });
  it('un rechazo de Resend devuelve false y registra solo el código, sin enlaces ni correo completo',async()=>{
    send.mockResolvedValue({data:null,error:{name:'daily_quota_exceeded',message:`fallo con ${LINK}`,statusCode:429}});
    expect(await sendMail(mail)).toBe(false);
    expect(logs.join('\n')).toContain('daily_quota_exceeded');
    noSecrets();
  });
  it('un error de red no lanza: devuelve false y no filtra datos',async()=>{
    send.mockRejectedValue(new Error(`ECONNRESET ${LINK}`));
    expect(await sendMail(mail)).toBe(false);
    noSecrets();
  });
  it('corta a los 10 s si Resend no responde',async()=>{
    vi.useFakeTimers();send.mockReturnValue(new Promise(()=>{}));
    const p=sendMail(mail);await vi.advanceTimersByTimeAsync(10_001);
    expect(await p).toBe(false);
    expect(logs.join('\n')).toContain('tiempo de espera');
  });
  it('sin RESEND_API_KEY no envía, no lanza y no imprime el cuerpo (desarrollo y producción)',async()=>{
    vi.stubEnv('RESEND_API_KEY','');
    for(const env of ['development','production']){vi.stubEnv('NODE_ENV',env);expect(await sendMail(mail)).toBe(false);}
    expect(send).not.toHaveBeenCalled();
    noSecrets();
  });
  it('maskEmail deja ver solo la inicial y el dominio',()=>{expect(maskEmail('lectora@example.com')).toBe('l***@example.com');});
});
