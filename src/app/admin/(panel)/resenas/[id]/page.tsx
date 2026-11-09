import Link from 'next/link';
import {notFound} from 'next/navigation';
import {reviewsAdminData,adminData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import ReviewPanel from '@/components/admin/ReviewPanel';
import Editor from '@/components/admin/Editor';
export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const [data,{media}]=await Promise.all([reviewsAdminData(),adminData()]);
  const item=data.reviews.find(r=>r.id===id);if(!item)notFound();
  return <><p><Link href="/admin/resenas">← Reseñas</Link></p><h1>Reseña: {item.title}</h1><ReviewPanel review={item} names={data.names} demo={isDemo()} detail/><h2>Editar texto y datos</h2><Editor kind="post" item={item} media={media} demo={isDemo()}/></>;
}
