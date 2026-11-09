import {describe,it,expect} from 'vitest';
import {tempPassword} from '@/lib/auth/crypto';
import {passwordSchema} from '@/lib/validators';
describe('Contraseña temporal',()=>{
  it('cumple la política de contraseñas y no se repite',()=>{
    const values=new Set(Array.from({length:200},()=>tempPassword()));
    expect(values.size).toBe(200);
    for(const value of values)expect(passwordSchema.safeParse(value).success).toBe(true);
  });
  it('no usa caracteres ambiguos',()=>{expect(tempPassword(500)).not.toMatch(/[0O1lI]/);});
});
