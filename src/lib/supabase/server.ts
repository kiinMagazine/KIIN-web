import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {credentials} from './config';
import {hardenAuthCookie} from '@/lib/session';
/**
 * Cliente con la sesión del usuario. El access token (JWT, 1 h) y el refresh token (rotativo) viajan en cookies
 * httpOnly + SameSite=Lax (+ Secure en producción): el navegador no puede leerlos. Toda la autenticación ocurre en el servidor.
 */
export async function sessionClient(){
  const store=await cookies();
  const {url,key}=credentials();
  return createServerClient(url,key,{
    cookieOptions:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'},
    cookies:{
      getAll:()=>store.getAll(),
      setAll:items=>{
        try{items.forEach(({name,value,options})=>store.set(name,value,hardenAuthCookie(options)));}
        catch{/* En Server Components no se pueden escribir cookies; se renuevan en el proxy o en Server Actions. */}
      }
    }
  });
}
