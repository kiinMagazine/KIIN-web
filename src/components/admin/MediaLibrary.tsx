'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useActionLock} from '@/lib/use-action-lock';
import {deleteMedia,updateMedia} from '@/app/admin/actions';
import type {Media} from '@/lib/data/types';
import KiinImage from '@/components/KiinImage';
export default function MediaLibrary({media,demo}:{media:Media[];demo:boolean}){const [message,setMessage]=useState(''),lock=useActionLock(),{busy,ready}=lock;const router=useRouter();return <><p role="status">{message}</p><div className="media-grid">{media.map(m=><article key={m.id}><KiinImage media={m}/><form method="post" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void lock.run(async()=>{try{const r=await updateMedia({id:m.id,alt:f.get('alt'),credit:f.get('credit')});setMessage(r.message);if(r.ok)router.refresh();}catch{setMessage('No pudimos guardar la descripción.');}});}}><label>Texto alternativo<input name="alt" defaultValue={m.alt} required maxLength={500}/></label><label>Crédito<input name="credit" defaultValue={m.credit||''} maxLength={500}/></label><div className="admin-tools"><button disabled={demo||!ready||busy}>Guardar</button><button type="button" disabled={demo||!ready||busy} onClick={()=>{if(lock.busy||!confirm('¿Eliminar la imagen y sus variantes? Solo se permite si no está en uso.'))return;void lock.run(async()=>{try{const r=await deleteMedia(m.id);setMessage(r.message);router.refresh();}catch{setMessage('No pudimos eliminar la imagen.');}});}}>Eliminar</button></div></form></article>)}</div></>;}
