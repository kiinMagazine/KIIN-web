import {adminData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import Editor from '@/components/admin/Editor';
export default async function Page(){const {media}=await adminData();return <><h1>Nueva publicación</h1><Editor kind="post" media={media} demo={isDemo()}/></>;}