import type {Metadata} from 'next';
import {absolute} from '@/config/site';
export function metadata(title:string,description:string,path:string,image?:string):Metadata{const cover=image?.startsWith('/')?absolute(image):image;return {title,description,alternates:{canonical:absolute(path)},openGraph:{title,description,url:absolute(path),type:'website',locale:'es_MX',siteName:'KIIN',...(cover?{images:[cover]}:{})},twitter:{card:'summary_large_image',title,description,...(cover?{images:[cover]}:{})}};}
