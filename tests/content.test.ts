import {describe,it,expect,vi,afterEach} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {demoPosts,demoPicks} from '@/lib/data/demo';
import {postSchema,pickSchema,mediaSchema} from '@/lib/validators';
import {getPosts,getPostBySlug,getFeatured,getCurrentPicks,getPickArchive,searchContent} from '@/lib/data';
import brand from '@/content/brand.json';
import Markdown from '@/components/Markdown';
afterEach(()=>vi.unstubAllEnvs());
describe('Portada por secciones',()=>{
 it('pagina el archivo sin perder ni duplicar publicaciones',async()=>{
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','');vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY','');
  const first=await getPosts({page:1,limit:6}),second=await getPosts({page:2,limit:6});
  expect(first.items).toHaveLength(6);expect(second.items).toHaveLength(5);
  expect(new Set([...first.items,...second.items].map(p=>p.id)).size).toBe(first.count);
  expect((await getPosts({territory:'eventos',limit:3})).items.every(p=>p.territory==='eventos')).toBe(true);
  expect((await searchContent('Mei Semones')).posts.map(p=>p.slug)).toContain('mei-semones-howl');
 });
 it('mantiene referencias válidas, identificadas y con portadas locales',()=>{
  const references=demoPosts.filter(p=>p.demo_kind==='reference');
  expect(references).toHaveLength(5);
  for(const post of demoPosts){expect(postSchema.safeParse(post).success).toBe(true);expect(fs.existsSync(path.join('public',post.cover!.variants.lg.path))).toBe(true);}
  for(const post of references){expect(new URL(post.source!.url).hostname).toBe('www.indierocks.mx');expect(post.body_md).toContain(post.source!.url);expect(post.body_md).toContain('No es una cobertura propia');}
 });
});
describe('Validación editorial',()=>{
 it('publicación y selección completas',()=>{expect(postSchema.safeParse(demoPosts[0]).success).toBe(true);expect(pickSchema.safeParse(demoPicks()[0]).success).toBe(true);});
 it.each([{title:''},{title:'a'.repeat(121)},{excerpt:'a'.repeat(221)},{body_md:'a'.repeat(20001)},{territory:'chisme'},{score_story:6},{spotify_url:'javascript:alert(1)'},{youtube_url:'https://evil.com/watch?v=abcdefghijk'},{status:'published',published_at:null}])('rechaza publicación inválida %j',change=>expect(postSchema.safeParse({...demoPosts[0],...change}).success).toBe(false));
 it.each([{artist:''},{iso_week:54},{year:2022},{week_start:'2026-10-01'},{note_md:'x'.repeat(20001)},{title:'x'.repeat(121)}])('rechaza selección inválida %j',change=>expect(pickSchema.safeParse({...demoPicks()[0],...change}).success).toBe(false));
 it('normaliza enlaces antes de guardar',()=>{const p=postSchema.parse({...demoPosts[0],youtube_url:'https://youtu.be/abcdefghijk?utm_source=prueba'});expect(p.youtube_url).toBe('https://www.youtube.com/watch?v=abcdefghijk');});
 it('rechaza metadatos y rutas de subida falsas',()=>expect(mediaSchema.safeParse({path_base:'../../otro-bucket',alt:''}).success).toBe(false));
});
describe('Datos demo',()=>{it('no necesita variables ni red',async()=>{vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','');vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY','');expect((await getPosts()).count).toBe(11);expect((await getPosts({page:2})).items).toHaveLength(0);expect((await getPosts({territory:'musica'})).count).toBe(5);expect((await getPostBySlug(demoPosts[0].slug))?.title).toBe(demoPosts[0].title);expect(await getPostBySlug('inexistente')).toBeNull();expect(await getFeatured()).toBeTruthy();expect(await getCurrentPicks()).toHaveLength(2);expect((await getPickArchive()).items).toHaveLength(2);expect((await searchContent('cancha')).posts).toHaveLength(1);expect((await searchContent('x'.repeat(81))).posts).toHaveLength(0);});});
describe('Marca y Markdown',()=>{it('conserva los textos literales de la memoria',()=>{const base=path.resolve('../MemoriaKIIN/KIIIN');const dna=fs.readFileSync(path.join(base,'01-adn-de-marca.md'),'utf8'),narrative=fs.readFileSync(path.join(base,'06-manifiesto-narrativa.md'),'utf8');for(const key of ['manifesto','storytelling','beliefs'] as const)expect(narrative).toContain(brand[key]);for(const key of ['mission','vision','values'] as const)expect(dna).toContain(brand[key]);expect(fs.readdirSync(base)).toEqual(expect.arrayContaining(['01-adn-de-marca.md','06-manifiesto-narrativa.md']));});it('elimina HTML, eventos y enlaces de ejecución',()=>{const html=renderToStaticMarkup(createElement(Markdown,{text:'<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[Enlace](javascript:alert(1))\n\n**Historia**'}));expect(html).not.toContain('<script');expect(html).not.toContain('onerror');expect(html).not.toContain('javascript:');expect(html).toContain('<strong>Historia</strong>');});});


