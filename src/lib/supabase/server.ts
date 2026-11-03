import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {credentials} from './config';
export async function sessionClient(){
  const store=await cookies();
  const {url,key}=credentials();
  return createServerClient(url,key,{
    cookies:{
      getAll:()=>store.getAll(),
      setAll:items=>{
        try{items.forEach(({name,value,options})=>store.set(name,value,options));}
        catch{/* Las cookies se renuevan en proxy o Server Actions. */}
      }
    }
  });
}
