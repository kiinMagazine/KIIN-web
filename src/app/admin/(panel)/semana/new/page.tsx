import {adminData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import Editor from '@/components/admin/Editor';
export default async function Page(){const {media}=await adminData();return <><h1>Nueva selección</h1><Editor kind="pick" media={media} demo={isDemo()}/></>;}