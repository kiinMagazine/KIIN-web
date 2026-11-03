import {createClient} from '@supabase/supabase-js';
import {credentials} from './config';
/** Cliente con la clave de servicio: SOLO servidor (Server Actions). Nunca importar desde componentes de cliente ni exponer como NEXT_PUBLIC_*. */
export function serviceClient(){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en el servidor para gestionar al equipo.');
  return createClient(credentials().url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
