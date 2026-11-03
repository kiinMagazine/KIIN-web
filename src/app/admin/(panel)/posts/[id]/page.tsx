import {notFound} from 'next/navigation';
import {adminData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import Editor from '@/components/admin/Editor';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const data=await adminData();const item=data.posts.find(p=>p.id===id);if(!item)notFound();return <><h1>Editar publicación</h1><Editor kind="post" item={item} media={data.media} demo={isDemo()}/></>;}