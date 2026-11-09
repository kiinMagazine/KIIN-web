import {z} from 'zod';
import {parseSpotifyUrl,parseYoutubeUrl} from './embeds';
import {isoWeek} from './week';
z.config(z.locales.es());
export const territories=['musica','moda','deportes','eventos','actualidad'] as const;
export const territoryNames:Record<string,string>={musica:'Música',moda:'Moda',deportes:'Deportes',eventos:'Eventos / Festivales',actualidad:'Actualidad'};
export const pillars=['descubrir','entender','documentar','recomendar','vivir'] as const;
const music=(parser:typeof parseYoutubeUrl)=>z.string().trim().max(300).nullable().transform(v=>v||null).refine(v=>!v||!!parser(v),'Usa un enlace HTTPS válido del servicio indicado.').transform(v=>v?parser(v)!.url:null);
const date=z.string().datetime({offset:true}).nullable();
const slug=z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/,'El slug admite letras sin acentos, números y guiones.');
const common={title:z.string().trim().min(1,'Escribe un título.').max(120),slug,cover_media_id:z.uuid().nullable(),spotify_url:music(parseSpotifyUrl),youtube_url:music(parseYoutubeUrl),status:z.enum(['draft','published','archived']),published_at:date};
const rating=z.number().int().min(1).max(5).nullable();
/** Datos de reseña dentro de una publicación tipo review. my_stars es el voto (estrellas KIIN) de quien la escribe. */
export const postReviewSchema=z.object({subject:z.enum(['album','sencillo']),sources_md:z.string().max(5000),my_stars:z.number().int().min(1,'Elige de 1 a 5 estrellas.').max(5).nullable(),submit:z.boolean()});
export const postSchema=z.object({...common,kind:z.enum(['contenido','review']).default('contenido'),review:postReviewSchema.nullable().default(null),type:z.enum(['articulo','publicacion']),excerpt:z.string().trim().max(220),artist:z.string().trim().max(120).optional(),body_md:z.string().max(20000),territory:z.enum(territories),pillar:z.enum(pillars),featured:z.boolean(),credit:z.string().max(500),score_story:rating,score_impact:rating,score_discovery:rating,score_affinity:rating,score_narrative:rating}).superRefine((v,ctx)=>{
  if(v.status==='published'&&!v.published_at)ctx.addIssue({code:'custom',message:'Indica cuándo se publica.',path:['published_at']});
  if(v.kind==='review'){
    if(!v.review)ctx.addIssue({code:'custom',message:'Completa los datos de la reseña.',path:['review']});
    if(!v.artist?.trim())ctx.addIssue({code:'custom',message:'Escribe el artista.',path:['artist']});
    if(v.status==='published')ctx.addIssue({code:'custom',message:'Una reseña se publica desde Reseñas, cuando todo el equipo la autoriza.',path:['status']});
    if(v.review?.submit&&v.body_md.trim().length<200)ctx.addIssue({code:'custom',message:'Escribe al menos 200 caracteres antes de enviarla a votación.',path:['body_md']});
    if(v.review?.submit&&!v.review.my_stars)ctx.addIssue({code:'custom',message:'Pon tus estrellas KIIN para enviarla a votación.',path:['review']});
  }
});
export const pickSchema=z.object({...common,kind:z.enum(['cancion','album']),year:z.number().int().min(2023).max(2100),iso_week:z.number().int().min(1).max(53),week_start:z.iso.date(),artist:z.string().trim().min(1).max(120),note_md:z.string().max(20000)}).superRefine((v,ctx)=>{const w=isoWeek(v.week_start);if(w.week_start!==v.week_start||w.year!==v.year||w.week!==v.iso_week)ctx.addIssue({code:'custom',message:'Selecciona el lunes y la semana ISO correspondiente.',path:['week_start']});if(v.status==='published'&&!v.published_at)ctx.addIssue({code:'custom',message:'Indica cuándo se publica.',path:['published_at']});});
export const mediaPath=/^\d{4}\/(0[1-9]|1[0-2])\/[0-9a-f-]{36}$/;
const variant=z.object({path:z.string(),width:z.number().int().positive().max(1600),height:z.number().int().positive().max(16000),bytes:z.number().int().positive().max(5*1024*1024)});
export const mediaSchema=z.object({path_base:z.string().regex(mediaPath),variants:z.object({sm:variant,md:variant,lg:variant}),width:z.number().int().positive().max(1600),height:z.number().int().positive().max(16000),aspect:z.enum(['1:1','4:5','libre']),alt:z.string().trim().min(1,'Describe la imagen.').max(500),credit:z.string().max(500),bytes:z.number().int().positive().max(15*1024*1024)}).superRefine((v,ctx)=>{for(const k of ['sm','md','lg'] as const)if(v.variants[k].path!==`${v.path_base}/${k}.webp`)ctx.addIssue({code:'custom',message:'Ruta de archivo inválida.',path:['variants',k]});});
export const searchSchema=z.string().trim().max(80);
export const loginSchema=z.object({email:z.email().max(254),password:z.string().min(1).max(200)});
export const passwordSchema=z.string().min(12,'Usa al menos 12 caracteres.').max(128);
export type PostReviewInput=z.infer<typeof postReviewSchema>;
export type PostInput=z.infer<typeof postSchema>;
export type PickInput=z.infer<typeof pickSchema>;
export const reviewSchema=z.object({kind:z.enum(['album','sencillo']),slug,title:z.string().trim().min(1,'Escribe un título.').max(120),artist:z.string().trim().min(1,'Escribe el artista.').max(120),cover_media_id:z.uuid().nullable(),analysis_md:z.string().max(20000),sources_md:z.string().max(5000),spotify_url:music(parseSpotifyUrl),youtube_url:music(parseYoutubeUrl)});
export const voteSchema=z.object({review_id:z.uuid(),approved:z.boolean(),stars_vote:z.number().int().min(1,'Elige de 1 a 5 estrellas.').max(5),comment:z.string().trim().max(500)});
export type ReviewInput=z.infer<typeof reviewSchema>;
