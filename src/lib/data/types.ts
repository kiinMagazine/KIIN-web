import type {PostInput,PickInput,ReviewInput} from '@/lib/validators';
export type Variant={path:string;width:number;height:number;bytes:number};
export type Media={id:string;path_base:string;variants:Record<'sm'|'md'|'lg',Variant>;width:number;height:number;aspect:string;alt:string;credit:string;bytes:number};
export type Post=PostInput&{id:string;created_at:string;updated_at:string;cover:Media|null;demo_kind?:'reference'|'fiction';source?:{name:string;url:string;date:string};event?:{date:string;venue:string;city:string}};
export type Pick=PickInput&{id:string;created_at:string;updated_at:string;cover:Media|null};
export type Review=ReviewInput&{id:string;created_at:string;updated_at:string;status:'draft'|'pending'|'approved'|'published'|'archived';stars:number|null;published_at:string|null;cover:Media|null};
