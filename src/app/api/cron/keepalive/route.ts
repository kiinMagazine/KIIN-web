import {timingSafeEqual} from 'node:crypto';
import {publicClient} from '@/lib/supabase/public';
import {isDemo} from '@/lib/supabase/config';
export const dynamic='force-dynamic';
export async function GET(request:Request){const secret=process.env.CRON_SECRET,authorization=request.headers.get('authorization')||'';const expected=`Bearer ${secret}`;if(!secret||Buffer.byteLength(expected)!==Buffer.byteLength(authorization)||!timingSafeEqual(Buffer.from(expected),Buffer.from(authorization)))return Response.json({ok:false},{status:401});if(isDemo())return Response.json({ok:false,message:'Supabase no está configurado.'},{status:503});const {error}=await publicClient().from('posts').select('id').limit(1);return Response.json({ok:!error},{status:error?503:200,headers:{'Cache-Control':'no-store'}});}
