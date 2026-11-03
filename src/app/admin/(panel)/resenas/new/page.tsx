import {reviewsAdminData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import ReviewEditor from '@/components/admin/ReviewEditor';
export default async function Page(){const data=await reviewsAdminData();return <><h1>Nueva reseña</h1><ReviewEditor media={data.media} demo={isDemo()}/></>;}
