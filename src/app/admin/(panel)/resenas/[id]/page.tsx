import {notFound} from 'next/navigation';
import {reviewsAdminData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import ReviewEditor from '@/components/admin/ReviewEditor';
import ReviewPanel from '@/components/admin/ReviewPanel';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const data=await reviewsAdminData();const item=data.reviews.find(r=>r.id===id);if(!item)notFound();return <><h1>Reseña: {item.title}</h1><ReviewPanel review={item} names={data.names} demo={isDemo()} detail/><ReviewEditor item={item} media={data.media} demo={isDemo()}/></>;}
