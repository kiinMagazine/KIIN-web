import {adminData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import MediaUploader from '@/components/admin/MediaUploader';
import MediaLibrary from '@/components/admin/MediaLibrary';
export default async function Page(){const {media}=await adminData();return <><h1>Biblioteca de imágenes</h1><MediaUploader demo={isDemo()}/><h2>El archivo visual</h2><MediaLibrary media={media} demo={isDemo()}/></>;}