import {gridData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import Grid from '@/components/admin/Grid';
export default async function Page(){const data=await gridData();return <><h1>Parrilla de publicaciones</h1><Grid rows={data.rows} posts={data.posts} admins={data.admins} demo={isDemo()}/></>;}
