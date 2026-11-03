// Crea el primer administrador con una contraseña temporal aleatoria (se imprime una sola vez).
// Uso (PowerShell, desde PaginaWEB):
//   $env:NEXT_PUBLIC_SUPABASE_URL='https://TU-PROYECTO.supabase.co'; $env:SUPABASE_SERVICE_ROLE_KEY='...'; node scripts/bootstrap-admin.mjs correo@ejemplo.com "Nombre"
// La clave de servicio solo vive en ese proceso: no la guardes en .env.local ni en el repositorio.
import {createClient} from '@supabase/supabase-js';
import {randomInt} from 'node:crypto';
const [email,name=''] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !url || !key) { console.error('Faltan correo, NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.'); process.exit(1); }
const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const temp = Array.from({length: 16}, () => alphabet[randomInt(alphabet.length)]).join('');
const supabase = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
const {data, error} = await supabase.auth.admin.createUser({email, password: temp, email_confirm: true});
if (error || !data.user) { console.error('No se pudo crear el usuario:', error?.message ?? 'sin datos'); process.exit(1); }
const {error: insertError} = await supabase.from('admins').insert({user_id: data.user.id, email, display_name: name, must_change_password: true});
if (insertError) { await supabase.auth.admin.deleteUser(data.user.id); console.error('No se pudo registrar al administrador:', insertError.message); process.exit(1); }
console.log(`Administrador creado: ${email}`);
console.log(`Contraseña temporal (se muestra solo ahora): ${temp}`);
console.log('Deberá cambiarla en su primer ingreso.');
