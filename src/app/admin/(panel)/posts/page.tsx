import Link from 'next/link';
import {adminData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import ContentList from '@/components/admin/ContentList';
export default async function Page(){const data=await adminData();return <><h1>Publicaciones</h1><Link className="button primary" href="/admin/posts/new">Crear publicación</Link><ContentList items={data.posts} kind="posts" demo={isDemo()}/></>;}