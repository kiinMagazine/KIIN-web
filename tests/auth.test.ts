import {describe,it,expect,vi,afterEach} from 'vitest';
import {createHash} from 'node:crypto';
import {checkPassword,checkPasswordLocal,isBreached} from '@/lib/auth/password-policy';
import {hashToken,isTokenShape,newToken,tempPassword,hashTemp,matchesTemp} from '@/lib/auth/crypto';
import {safeNext} from '@/lib/auth/next-path';

afterEach(()=>{vi.unstubAllGlobals();});

describe('Política de contraseñas (NIST 800-63B / ASVS)',()=>{
  it('exige 12 caracteres y acepta frases largas sin reglas de composición',()=>{
    expect(checkPasswordLocal('corta123').ok).toBe(false);
    expect(checkPasswordLocal('once caract').ok).toBe(false);
    expect(checkPasswordLocal('mi perro come tacos al pastor').ok).toBe(true);
    expect(checkPasswordLocal('sólo minúsculas y acentos ñ').ok).toBe(true);
  });
  it('cuenta caracteres Unicode, no bytes',()=>{expect(checkPasswordLocal('ñññññññññññ').ok).toBe(false);});
  it('rechaza más de 128 caracteres',()=>{const r=checkPasswordLocal('a b c d '.repeat(20));expect(r.ok).toBe(false);if(!r.ok)expect(r.code).toBe('TOO_LONG');});
  it('rechaza comunes, del servicio y repetitivas aunque lleven números o símbolos al final',()=>{
    for(const p of ['password1234','Contraseña2024!','kiinmagazine123','qwertyuiop12','aaaaaaaaaaaa','123456789012','abababababab']){const r=checkPasswordLocal(p);expect(r.ok,p).toBe(false);}
  });
  it('rechaza contraseñas armadas solo con el nombre del servicio, aunque se repita o lleve año',()=>{
    for(const p of ['kiinkiinkiin2026','KIIN.KIIN.2026!','kiin-magazine-2026','2026kiinkiinkiin','kiincolab2026!!']){const r=checkPasswordLocal(p);expect(r.ok,p).toBe(false);}
    expect(checkPasswordLocal('mi disco favorito de kiin').ok).toBe(true);
  });
  it('rechaza contraseñas que contienen el correo o el nombre de usuario',()=>{
    const r=checkPasswordLocal('soyrasecfan2026!!',{email:'rasec@example.com'});expect(r.ok).toBe(false);if(!r.ok)expect(r.code).toBe('PERSONAL');
    expect(checkPasswordLocal('el.lector.kiin.99',{username:'lector'}).ok).toBe(false);
  });
  it('consulta filtraciones con k-anonimato: solo envía los 5 primeros caracteres del SHA-1',async()=>{
    const pw='frase segura pero filtrada';const sha=createHash('sha1').update(pw).digest('hex').toUpperCase();
    const fetchMock=vi.fn(async()=>new Response(`${sha.slice(5)}:42\r\n0000000000000000000000000000000000A:0`));
    vi.stubGlobal('fetch',fetchMock);
    expect(await isBreached(pw)).toBe(true);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe(`https://api.pwnedpasswords.com/range/${sha.slice(0,5)}`);
    const r=await checkPassword(pw);expect(r.ok).toBe(false);if(!r.ok)expect(r.code).toBe('BREACHED');
  });
  it('si el servicio de filtraciones no responde, no bloquea (y lo registra)',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('red caída');}));
    const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
    expect(await isBreached('cualquier frase larga')).toBeNull();
    expect((await checkPassword('cualquier frase larga de prueba')).ok).toBe(true);
    expect(warn).toHaveBeenCalled();warn.mockRestore();
  });
});

describe('Tokens de un solo uso y contraseñas temporales',()=>{
  it('genera tokens de 256 bits en base64url y guarda solo su SHA-256',()=>{
    const t=newToken();expect(isTokenShape(t)).toBe(true);expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);expect(hashToken(t)).not.toContain(t);
    expect(new Set(Array.from({length:500},newToken)).size).toBe(500);
    expect(isTokenShape('../../etc/passwd')).toBe(false);expect(isTokenShape(t+'x')).toBe(false);
  });
  it('la temporal cumple la política y su hash bcrypt detecta la reutilización',async()=>{
    const temp=tempPassword();expect(checkPasswordLocal(temp).ok).toBe(true);
    const hash=await hashTemp(temp);expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(await matchesTemp(temp,hash)).toBe(true);expect(await matchesTemp(temp+'x',hash)).toBe(false);
  },20000);
});

describe('Redirección segura tras entrar',()=>{
  it('acepta rutas internas y rechaza externas o ambiguas',()=>{
    expect(safeNext('/admin')).toBe('/admin');expect(safeNext('/p/una-historia?x=1')).toBe('/p/una-historia?x=1');
    for(const bad of ['//evil.com','/\\evil.com','https://evil.com','javascript:alert(1)','',null,'/cuenta/entrar?next=/x'])expect(safeNext(bad)).toBe('/cuenta');
  });
});
