/** Redirección interna segura después de entrar: solo rutas propias (evita redirecciones abiertas como //evil.com). */
export function safeNext(value:unknown,fallback='/cuenta'){
  return typeof value==='string'&&/^\/(?![/\\])[\w\-./?=&%]*$/.test(value)&&value.length<=200&&!value.startsWith('/cuenta/entrar')?value:fallback;
}
