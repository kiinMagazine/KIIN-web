'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import type {Media,Review} from '@/lib/data/types';
import {slugify} from '@/lib/slugify';
import type {ActionResult} from '@/app/admin/actions';
import {saveReview} from '@/app/admin/review-actions';
import Markdown from '@/components/Markdown';
import KiinImage from '@/components/KiinImage';
export default function ReviewEditor({item,media,demo}:{item?:Review;media:Media[];demo:boolean}){
  const [form,setForm]=useState({kind:item?.kind??'album',title:item?.title??'',slug:item?.slug??'',artist:item?.artist??'',cover_media_id:item?.cover_media_id??'',analysis_md:item?.analysis_md??'',sources_md:item?.sources_md??'',spotify_url:item?.spotify_url??'',youtube_url:item?.youtube_url??''});
  const [slugTouched,setSlugTouched]=useState(!!item),[result,setResult]=useState<ActionResult|null>(null),[busy,setBusy]=useState(false);
  const router=useRouter();
  const set=(k:keyof typeof form,v:string)=>setForm(f=>({...f,[k]:v,...(k==='title'&&!slugTouched?{slug:slugify(v)}:{})}));
  const cover=media.find(m=>m.id===form.cover_media_id)??item?.cover??null;
  const locked=item&&['pending','approved','published'].includes(item.status);
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);try{const r=await saveReview(item?.id??null,{...form,cover_media_id:form.cover_media_id||null,spotify_url:form.spotify_url||null,youtube_url:form.youtube_url||null});setResult(r);if(r.ok){router.push(item?`/admin/resenas/${item.id}`:`/admin/resenas/${r.id}`);router.refresh();}}catch{setResult({ok:false,message:'No pudimos guardar. Inténtalo nuevamente.'});}finally{setBusy(false);}}
  const err=(k:string)=>result?.errors?.[k]&&<small role="alert">{result.errors[k]}</small>;
  return <form onSubmit={submit} className="editor-form">
    {locked&&<p className="admin-banner" role="status">Esta reseña ya está en evaluación o publicada. Si cambias título, artista o texto, se reiniciará la votación del equipo y dejará de estar publicada.</p>}
    <label>Tipo<select value={form.kind} onChange={e=>set('kind',e.target.value)}><option value="album">Álbum</option><option value="sencillo">Sencillo</option></select></label>
    <label>Título del {form.kind==='album'?'álbum':'sencillo'}<input value={form.title} onChange={e=>set('title',e.target.value)} maxLength={120} required/>{err('title')}</label>
    <label>Artista<input value={form.artist} onChange={e=>set('artist',e.target.value)} maxLength={120} required/>{err('artist')}</label>
    <label>Slug<input value={form.slug} onChange={e=>{setSlugTouched(true);set('slug',e.target.value);}} maxLength={100} required/>{err('slug')}</label>
    <label>Portada (cuadrada recomendada)<select value={form.cover_media_id} onChange={e=>set('cover_media_id',e.target.value)}><option value="">Sin portada todavía</option>{media.map(m=><option key={m.id} value={m.id}>{m.alt}</option>)}</select></label>
    {cover&&<div style={{maxWidth:230}}><KiinImage media={cover} square/><small>{cover.credit}</small></div>}
    <label>Análisis (Markdown, mínimo 200 caracteres para enviar)<textarea value={form.analysis_md} onChange={e=>set('analysis_md',e.target.value)} rows={14} maxLength={20000}/>{err('analysis_md')}</label>
    <label>Cómo lo escuchamos y fuentes (opcional)<textarea value={form.sources_md} onChange={e=>set('sources_md',e.target.value)} rows={3} maxLength={5000}/></label>
    <label>Enlace de Spotify<input value={form.spotify_url} onChange={e=>set('spotify_url',e.target.value)} inputMode="url"/>{err('spotify_url')}</label>
    <label>Enlace de YouTube<input value={form.youtube_url} onChange={e=>set('youtube_url',e.target.value)} inputMode="url"/>{err('youtube_url')}</label>
    <p className="muted">Criterio editorial: opina con argumentos sobre la obra, sin afirmaciones sobre la vida privada ni hechos no confirmados. <a href="/derechos-musica" target="_blank" rel="noopener noreferrer">Ver criterio</a>.</p>
    <button disabled={demo||busy}>Guardar borrador</button>
    {result&&<p role="status">{result.message}</p>}
    <section className="editor-preview"><h2>Vista previa</h2><Markdown text={form.analysis_md||'_Escribe tu análisis._'}/></section>
  </form>;
}
