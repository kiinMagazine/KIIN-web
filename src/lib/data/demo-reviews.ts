import {demoCover} from './demo';
import type {Review} from './types';
const base='2026-10-0';
const rows:[Review['kind'],string,string,string,number,string,string][]=[
  ['album','Formas de permanecer','Proyecto ficticio','album',4.5,'Una obra de demostración que muestra cómo se leerá un análisis de álbum en KIIN: contexto, escucha atenta y una valoración argumentada.','Escucha completa del disco ficticio; sin fuentes externas.'],
  ['sencillo','Antes del ruido','Proyecto ficticio','cancion',4,'Un sencillo de demostración. El análisis explica de dónde viene la canción, qué propone y por qué importa, sin juicios sobre la vida privada de nadie.','Escucha del sencillo ficticio.'],
  ['album','Mapa de ecos','Colectivo ficticio','deriva',3.5,'Álbum ficticio para ilustrar una reseña con calificación intermedia: se reconocen aciertos y se señalan límites con argumentos.','Escucha completa; comparación con obras ficticias.'],
  ['sencillo','Noche en construcción','Artista ficticio','escena',5,'Sencillo ficticio con la máxima calificación KIIN, para mostrar el formato de reseña de una sola canción.','Escucha del sencillo ficticio.'],
];
export const demoReviews:Review[]=rows.map(([kind,title,artist,art,stars,analysis,sources],i)=>({
  id:`30000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,kind,slug:title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
  title,artist,cover_media_id:null,cover:demoCover(art,40+i,true),
  analysis_md:`**Reseña ficticia de demostración.**\n\n${analysis}\n\nEste texto no describe obras ni personas reales.`,sources_md:sources,spotify_url:null,youtube_url:null,
  status:'published',stars,published_at:`${base}${i+1}T12:00:00-06:00`,created_at:`${base}${i+1}T12:00:00-06:00`,updated_at:`${base}${i+1}T12:00:00-06:00`,
}));
