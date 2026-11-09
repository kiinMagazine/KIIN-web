// Alta inicial de administradores. Correos y contraseñas iniciales SOLO desde variables de entorno (.env.local, ignorado por Git).
// Uso (desde PaginaWEB):  npm run seed:admins            → crea los que falten; no toca los existentes.
//                         npm run seed:admins -- --reset  → además emite contraseña temporal nueva a los existentes.
// Variables: ADMIN1_EMAIL, ADMIN1_NAME, ADMIN1_INITIAL_PASSWORD, ADMIN2_EMAIL, ADMIN2_NAME, ADMIN2_INITIAL_PASSWORD (opcional:
// si falta, se genera una temporal segura y se imprime una sola vez). Todas las contraseñas iniciales son temporales:
// la persona debe cambiarlas al entrar y no puede reutilizarlas.
import {createClient} from '@supabase/supabase-js';
import {randomInt} from 'node:crypto';
import bcrypt from 'bcryptjs';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');process.exit(1);}
const reset=process.argv.includes('--reset');
const TTL_HOURS=Number(process.env.SEED_TEMP_PASSWORD_TTL_HOURS)||168;
const alphabet='ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const generate=()=>Array.from({length:16},()=>alphabet[randomInt(alphabet.length)]).join('');
const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

const admins=[1,2,3,4].map(n=>({n,email:process.env[`ADMIN${n}_EMAIL`]?.trim().toLowerCase(),name:process.env[`ADMIN${n}_NAME`]?.trim()??'',password:process.env[`ADMIN${n}_INITIAL_PASSWORD`]})).filter(a=>a.email);
if(!admins.length){console.error('No hay ADMINn_EMAIL definidos.');process.exit(1);}

let failed=false;
for(const a of admins){
  try{
    if(a.password!==undefined&&a.password!==''&&[...a.password].length<12)throw new Error(`ADMIN${a.n}_INITIAL_PASSWORD debe tener al menos 12 caracteres.`);
    const {data:found,error:findError}=await supabase.rpc('auth_user_by_email',{p_email:a.email});
    if(findError)throw new Error(`búsqueda: ${findError.message}`);
    let userId=found?.[0]?.id;
    const {data:isAdmin}=userId?await supabase.from('admins').select('user_id').eq('user_id',userId).maybeSingle():{data:null};
    if(isAdmin&&!reset){console.log(`= ${a.email}: ya es administrador (sin cambios).`);continue;}
    const temp=a.password||generate();
    if(userId){const {error}=await supabase.auth.admin.updateUserById(userId,{password:temp,email_confirm:true});if(error)throw new Error(error.message);}
    else{const {data,error}=await supabase.auth.admin.createUser({email:a.email,password:temp,email_confirm:true});if(error||!data.user)throw new Error(error?.message??'sin usuario');userId=data.user.id;}
    if(isAdmin){const {error}=await supabase.from('admins').update({must_change_password:true}).eq('user_id',userId);if(error)throw new Error(error.message);}
    else{const {error}=await supabase.from('admins').insert({user_id:userId,email:a.email,display_name:a.name,must_change_password:true});if(error)throw new Error(error.code==='23514'?'ya hay 4 administradores':error.message);}
    const {error:secretError}=await supabase.from('account_secrets').upsert({user_id:userId,temp_password_hash:await bcrypt.hash(temp,12),temp_password_expires_at:new Date(Date.now()+TTL_HOURS*3600*1000).toISOString()});
    if(secretError)throw new Error(secretError.message);
    const {data:profile}=await supabase.from('readers').select('user_id').eq('user_id',userId).maybeSingle();
    if(!profile){const {error}=await supabase.from('readers').insert({user_id:userId,username:`admin_${userId.replace(/-/g,'').slice(0,8)}`,display_name:a.name});if(error)throw new Error(error.message);}
    console.log(`+ ${a.email}: administrador listo. Debe cambiar la contraseña al entrar (temporal válida ${TTL_HOURS} h).`);
    if(!a.password)console.log(`  Contraseña temporal generada (se muestra solo ahora): ${temp}`);
  }catch(e){failed=true;console.error(`! ${a.email}: ${e instanceof Error?e.message:e}`);}
}
process.exit(failed?1:0);
