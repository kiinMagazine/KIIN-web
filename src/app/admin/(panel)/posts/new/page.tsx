import {adminData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import Editor from '@/components/admin/Editor';
export default async function Page({searchParams}:{searchParams:Promise<{tipo?:string}>}){const {media}=await adminData();const tipo=(await searchParams).tipo==='review'?'review':'contenido';return <><h1>Nueva publicación</h1><p className="muted">Elige el tipo: contenido editorial o reseña de un álbum o sencillo.</p><Editor kind="post" media={media} demo={isDemo()} initialKind={tipo}/></>;}
