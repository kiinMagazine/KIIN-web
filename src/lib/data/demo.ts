import type {Post,Pick,Media} from './types';
import {isoWeek,pickSlug} from '@/lib/week';
const date='2026-09-21T18:00:00.000Z';
export function demoCover(name:string,index:number,square=false):Media{const height=square?640:800;const v={path:`/placeholders/${name}.svg`,width:640,height,bytes:2000};return {id:`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`,path_base:`/placeholders/${name}`,variants:{sm:v,md:v,lg:v},width:640,height,aspect:square?'1:1':'4:5',alt:`Composición editorial de ${name}; imagen de ejemplo ficticio`,credit:'KIIN · Gráfica de demostración',bytes:2000};}
const stories=[
  ['musica','descubrir','Donde empieza una escena','Antes del escenario, hay un cuarto de ensayo. Una historia de ejemplo sobre los espacios donde empieza la música.'],
  ['moda','entender','La ropa también guarda memoria','Una prenda puede contar de dónde venimos. Exploramos esa idea en una pieza editorial ficticia.'],
  ['deportes','documentar','La cancha es un punto de encuentro','El juego termina, la comunidad se queda. Una mirada de demostración a la cultura alrededor de una cancha.'],
  ['eventos','vivir','Escuchar juntos cambia la historia','Una sesión de escucha imaginaria sirve para pensar qué ocurre cuando compartimos una canción.'],
  ['actualidad','entender','Lo que merece nuestra atención','No todo lo que circula deja algo. Esta pieza ficticia propone preguntas para mirar más de cerca.'],
  ['musica','recomendar','Un archivo para volver a descubrir','Guardar una historia también es abrirle espacio al futuro. Una propuesta editorial de demostración.']
] as const;
const fictionalPosts:Post[]=stories.map(([territory,pillar,title,excerpt],i)=>({id:`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,type:i%2?'publicacion':'articulo',title,slug:['donde-empieza-una-escena','la-ropa-tambien-guarda-memoria','la-cancha-es-un-punto-de-encuentro','escuchar-juntos','lo-que-merece-atencion','un-archivo-para-descubrir'][i],excerpt,body_md:`**Ejemplo ficticio.** Esta pieza muestra cómo se leerá una historia en KIIN. No describe artistas, lugares ni acontecimientos reales.\n\n${excerpt}\n\n## Hay más detrás\n\n¿Qué personas hacen posible una escena? ¿Qué significa para quienes la viven? El punto de partida es escuchar, entender el contexto y encontrar una historia que merezca permanecer.\n\nLa versión publicada incorporará investigación, voces de su comunidad y fotografías con autorización.`,territory,pillar,cover_media_id:null,cover:demoCover(i===5?'escena':territory,i+1),status:'published',published_at:date,created_at:date,updated_at:date,featured:false,demo_kind:'fiction',spotify_url:null,youtube_url:null,credit:'Contenido ficticio · Demostración KIIN',score_story:4,score_impact:4,score_discovery:4,score_affinity:5,score_narrative:4}));

// Snapshot for the local preview. References never enter a configured Supabase project.
const referenceDate='2026-10-06T18:00:00.000Z';
type ReferenceStory={source:NonNullable<Post['source']>;slug:string;title:string;excerpt:string;body:string;art:string;territory:'musica'|'eventos';event?:Post['event']};
const references:ReferenceStory[]=[
  {
    slug:'o-tortuga-deriva-santa',title:'O Tortuga: una nueva ruta llamada Deriva Santa',
    excerpt:'El cuarto disco de la banda de CDMX llegará el 23 de octubre. Una nueva parada para seguir explorando su universo independiente.',
    body:'O Tortuga tiene un nuevo álbum en camino. Según Indie Rocks!, **Deriva Santa** estará disponible el **23 de octubre de 2026** y será el cuarto disco del grupo.\n\nEl anuncio también incluye una presentación el 7 de noviembre en FÜCK OFF ROOM, en la Ciudad de México, con Sgt. Papers, Monotonía y Paste Rabioso.\n\n## Una fecha para el radar\n\nEl lanzamiento abre una oportunidad para volver a la discografía de la banda y seguir su siguiente etapa. La información completa del anuncio está en la fuente enlazada.',
    art:'deriva',territory:'musica',source:{name:'Indie Rocks!',url:'https://www.indierocks.mx/musica/noticias/o-tortuga-anuncia-deriva-santa-su-cuarto-disco/',date:'2026-10-06T18:00:00.000Z'},
  },
  {
    slug:'mei-semones-howl',title:'Mei Semones abre la puerta a Howl',
    excerpt:'Un sencillo nuevo, una historia nocturna y un segundo álbum en el horizonte: el siguiente capítulo de Mei Semones ya tiene nombre.',
    body:'**Howl** es el nuevo sencillo de Mei Semones y da título a su segundo álbum. Indie Rocks! sitúa la llegada del disco el **15 de enero de 2027**, a través de Verve e Interscope.\n\nLa canción parte de una noche de fuegos artificiales y perros aullando en Brooklyn. Su video, dirigido por Takuto Shimpo, traslada la historia a Tokio.\n\n## Para seguir escuchando\n\nEl anuncio permite acercarse a una propuesta que cruza jazz, bossa nova y math rock. Por ahora, el punto de entrada es el sencillo; el álbum completo todavía está por llegar.',
    art:'howl',territory:'musica',source:{name:'Indie Rocks!',url:'https://www.indierocks.mx/musica/noticias/mei-semones-presenta-howl-su-nuevo-sencillo-y-album/',date:'2026-10-05T18:00:00.000Z'},
  },
  {
    slug:'jimena-amarillo-he-montado-un-circo',title:'El nuevo giro de Jimena Amarillo',
    excerpt:'HE MONTADO UN CIRCO se suma a la nueva música de la cantautora española, después de ANGÉLIKA.',
    body:'Jimena Amarillo presenta **HE MONTADO UN CIRCO**, un sencillo posterior a su disco **ANGÉLIKA**, publicado en 2025.\n\nDe acuerdo con Indie Rocks!, el tema llega junto a **AEREO**, colaboración con Richard Houghten estrenada el 17 de septiembre.\n\n## Dos canciones para entrar\n\nEsta pareja de lanzamientos ofrece un punto de partida para conocer el momento actual de su proyecto. Puedes consultar los detalles y escuchar desde la publicación original.',
    art:'circo',territory:'musica',source:{name:'Indie Rocks!',url:'https://www.indierocks.mx/musica/noticias/he-montado-un-circo-el-nuevo-sencillo-de-jimena-amarillo/',date:'2026-10-05T18:00:00.000Z'},
  },
  {
    slug:'meme-del-real-metropolitan-octubre-2026',title:'Meme del Real: una noche en el Metropólitan',
    excerpt:'La agenda de octubre tiene una cita con el proyecto solista de Meme del Real en la Ciudad de México.',
    body:'La agenda de Indie Rocks! anuncia a **Meme del Real** el **9 de octubre de 2026** en el **Teatro Metropólitan**, en la Ciudad de México.\n\n## La cita\n\n- **Cuándo:** 9 de octubre de 2026.\n- **Dónde:** Teatro Metropólitan, CDMX.\n\nConsulta la publicación original y al organizador para revisar horarios, disponibilidad y posibles cambios antes de hacer planes.',
    art:'meme',territory:'eventos',event:{date:'2026-10-09',venue:'Teatro Metropólitan',city:'CDMX'},source:{name:'Indie Rocks!',url:'https://www.indierocks.mx/agenda/precios-meme-del-real-iluminara-el-teatro-metropolitan/',date:'2026-06-03T18:00:00.000Z'},
  },
  {
    slug:'pulso-gnp-queretaro-octubre-2026',title:'Querétaro vuelve a encontrarse en Pulso GNP',
    excerpt:'El Autódromo de Querétaro recibirá la edición 2026 el 10 de octubre. Música en vivo para mirar también hacia nuestra ciudad.',
    body:'**Pulso GNP** está anunciado para el **10 de octubre de 2026** en el **Autódromo de Querétaro**, de acuerdo con la agenda de Indie Rocks!.\n\n## La cita\n\n- **Cuándo:** 10 de octubre de 2026.\n- **Dónde:** Autódromo de Querétaro.\n\nEl cartel reportado incluye a Robbie Williams, Caifanes y Travis, entre otros artistas. Consulta la fuente y los canales del festival para conocer horarios, accesos y actualizaciones.',
    art:'pulso',territory:'eventos',event:{date:'2026-10-10',venue:'Autódromo de Querétaro',city:'Querétaro'},source:{name:'Indie Rocks!',url:'https://www.indierocks.mx/agenda/precios-pulso-gnp-2026-anuncia-lineup/',date:'2026-04-13T18:00:00.000Z'},
  },
];
const referencePosts:Post[]=references.map((story,i)=>{
  const cover=demoCover(story.art,20+i);
  cover.alt=`Gráfica tipográfica de muestra para ${story.title}; no es arte oficial`;
  cover.credit='KIIN · Gráfica de muestra, no oficial';
  return {id:`10000000-0000-4000-8000-${String(20+i).padStart(12,'0')}`,type:'publicacion',title:story.title,slug:story.slug,excerpt:story.excerpt,body_md:`${story.body}\n\n---\n\n**Referencia para la maqueta.** Resumen original basado en [${story.source.name}](${story.source.url}), consultado el 6 de octubre de 2026. No es una cobertura propia de KIIN.`,territory:story.territory,pillar:story.territory==='eventos'?'vivir':'descubrir',cover_media_id:null,cover,status:'published',published_at:referenceDate,created_at:referenceDate,updated_at:referenceDate,featured:i===0,demo_kind:'reference',source:story.source,event:story.event,spotify_url:null,youtube_url:null,credit:`Referencia editorial · ${story.source.name}`,score_story:null,score_impact:null,score_discovery:null,score_affinity:null,score_narrative:null};
});
export const demoPosts:Post[]=[...referencePosts,...fictionalPosts];
export function demoPicks():Pick[]{const w=isoWeek();return (['cancion','album'] as const).map((kind,i)=>({id:`20000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,kind,slug:pickSlug(kind,w.year,w.week),year:w.year,iso_week:w.week,week_start:w.week_start,title:i?'Formas de permanecer':'Antes del ruido',artist:'Proyecto ficticio · Demostración',cover_media_id:null,cover:demoCover(kind,i+7,true),note_md:'**Selección ficticia de demostración.**\n\nAquí habrá una recomendación con contexto: qué escuchamos, qué encontramos y por qué vale la pena detenerse. Los enlaces se añadirán al publicar una selección real.',spotify_url:null,youtube_url:null,status:'published',published_at:date,created_at:date,updated_at:date}));}
