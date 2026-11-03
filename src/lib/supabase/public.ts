import {createClient} from '@supabase/supabase-js';
import {credentials} from './config';
export function publicClient(){const {url,key}=credentials();return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,cache:'no-store'})}});}
