import {PGlite} from '@electric-sql/pglite';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import fs from 'node:fs';
// Migraciones 01-10 sobre PostgreSQL embebido: roles, límite de 4 admins, reseñas en posts, me gusta, guardados e historial.
let db:PGlite;
const ids=['a1','a2','a3','a4','a5'].map((_,i)=>`aaaaaaa${i}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`);
const [admin1,admin2,admin3,admin4,admin5]=ids;
const reader='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const legacyReview='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
async function as(role:'anon'|'authenticated'|'postgres'|'service_role',uid=''){await db.exec(`reset role;set request.jwt.claim.sub='${uid}';set role ${role};`);}
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant all on storage.objects to anon,authenticated;`);
  for(const file of ['01_schema.sql','02_policies.sql','03_storage.sql','04_seed.sql','05_team.sql','06_reviews.sql','07_readers.sql'])await db.exec(fs.readFileSync(`supabase/${file}`,'utf8'));
  // Estado previo realista: un admin, un lector con perfil y guardado, y una reseña con el esquema anterior.
  await db.exec(`insert into auth.users values ${[...ids,reader].map(id=>`('${id}','${id}@example.invalid')`).join(',')};
    insert into admins(user_id,email) values('${admin1}','a1@example.invalid');
    insert into readers(user_id,display_name) values('${reader}','Lectora');
    insert into reviews(id,kind,slug,title,artist,analysis_md,status,created_by) values('${legacyReview}','album','disco-viejo','Disco viejo','Artista','Texto','draft','${admin1}');
    insert into saved_items(user_id,kind,item_id) values('${reader}','review','${legacyReview}');`);
  for(const file of ['08_accounts.sql','09_publications.sql','10_engagement.sql','12_review_quorum.sql'])await db.exec(fs.readFileSync(`supabase/${file}`,'utf8'));
  await db.exec(`grant all on all tables in schema public to service_role;`);
},60000);
afterAll(async()=>{await db?.close();});

describe('08 cuentas y seguridad',()=>{
  it('da nombre de usuario a perfiles existentes y crea perfil a los admins',async()=>{
    await as('postgres');
    const {rows}=await db.query<{user_id:string;username:string}>('select user_id,username from readers order by username');
    expect(rows.map(r=>r.user_id).sort()).toEqual([admin1,reader].sort());
    for(const r of rows)expect(r.username).toMatch(/^[a-z0-9_.]{3,30}$/);
  });
  it('el nombre de usuario es único sin distinguir mayúsculas y con formato válido',async()=>{
    await as('postgres');
    await db.exec(`update readers set username='kiin.fan' where user_id='${reader}'`);
    await expect(db.exec(`update readers set username='KIIN.fan' where user_id='${admin1}'`)).rejects.toThrow();
    await expect(db.exec(`update readers set username='no vale!' where user_id='${admin1}'`)).rejects.toThrow();
  });
  it('my_role distingue admin y usuario',async()=>{
    await as('authenticated',admin1);expect((await db.query<{r:string}>('select public.my_role() r')).rows[0].r).toBe('admin');
    await as('authenticated',reader);expect((await db.query<{r:string}>('select public.my_role() r')).rows[0].r).toBe('usuario');
  });
  it('permite hasta 4 administradores y bloquea el quinto en la base',async()=>{
    await as('postgres');
    await db.exec(`insert into admins(user_id,email) values('${admin2}','a2@example.invalid'),('${admin3}','a3@example.invalid'),('${admin4}','a4@example.invalid')`);
    await expect(db.exec(`insert into admins(user_id,email) values('${admin5}','a5@example.invalid')`)).rejects.toThrow(/4 administradores/);
    expect((await db.query<{n:number}>('select count(*)::int n from admins')).rows[0].n).toBe(4);
  });
  it('un admin ya no puede quitarse la bandera de contraseña temporal por la API',async()=>{
    await as('authenticated',admin1);
    await expect(db.exec('select public.password_changed()')).rejects.toThrow();
  });
  it('secretos, tokens y límites no son accesibles para clientes',async()=>{
    for(const t of ['account_secrets','auth_tokens','rate_limits']){
      await as('authenticated',admin1);await expect(db.query(`select * from ${t}`)).rejects.toThrow();
      await as('anon');await expect(db.query(`select * from ${t}`)).rejects.toThrow();
    }
    await as('anon');await expect(db.query(`select public.rate_limit_hit('login','${'0'.repeat(64)}',5,60)`)).rejects.toThrow();
  });
  it('rate_limit_hit cuenta intentos por ventana',async()=>{
    await as('service_role');
    const subject='a'.repeat(64);const results=[];
    for(let i=0;i<4;i++)results.push((await db.query<{ok:boolean}>(`select public.rate_limit_hit('login','${subject}',3,600) ok`)).rows[0].ok);
    expect(results).toEqual([true,true,true,false]);
  });
  it('los tokens exigen hash SHA-256 y caducidad posterior a la creación',async()=>{
    await as('postgres');
    await expect(db.exec(`insert into auth_tokens(user_id,purpose,token_hash,expires_at) values('${reader}','password_reset','corto',now()+interval '30 min')`)).rejects.toThrow();
    await expect(db.exec(`insert into auth_tokens(user_id,purpose,token_hash,expires_at) values('${reader}','password_reset','${'f'.repeat(64)}',now()-interval '1 min')`)).rejects.toThrow();
    await db.exec(`insert into auth_tokens(user_id,purpose,token_hash,expires_at) values('${reader}','password_reset','${'e'.repeat(64)}',now()+interval '30 min')`);
    // Consumo de un solo uso: el segundo intento no encuentra token abierto.
    const consume=`update auth_tokens set used_at=now() where token_hash='${'e'.repeat(64)}' and used_at is null and expires_at>now() returning user_id`;
    expect((await db.query(consume)).rows).toHaveLength(1);
    expect((await db.query(consume)).rows).toHaveLength(0);
  });
});

describe('09 publicaciones contenido / review',()=>{
  it('copió la reseña anterior a posts con el mismo id y la dejó en borrador',async()=>{
    await as('postgres');
    const {rows}=await db.query<{kind:string;status:string;state:string;subject:string}>(`select p.kind,p.status,r.state,r.subject from posts p join post_reviews r on r.post_id=p.id where p.id='${legacyReview}'`);
    expect(rows).toEqual([{kind:'review',status:'draft',state:'draft',subject:'album'}]);
  });
  it('las tablas anteriores de reseñas quedan sin escritura',async()=>{
    await as('authenticated',admin1);
    await expect(db.exec(`update reviews set title='x' where id='${legacyReview}'`)).rejects.toThrow();
  });
  it('una reseña no nace publicada y el tipo no cambia',async()=>{
    await as('authenticated',admin1);
    await expect(db.exec(`insert into posts(kind,type,title,slug,territory,pillar,status,published_at,created_by) values('review','articulo','X','x-pub','musica','recomendar','published',now(),'${admin1}')`)).rejects.toThrow();
    await expect(db.exec(`update posts set kind='contenido' where id='${legacyReview}'`)).rejects.toThrow();
  });
  it('solo publica con la autorización de los 4 admins y fija las estrellas KIIN',async()=>{
    await as('authenticated',admin1);
    await db.exec(`update post_reviews set state='voting' where post_id='${legacyReview}'`);
    await expect(db.exec(`update post_reviews set state='approved' where post_id='${legacyReview}'`)).rejects.toThrow();
    const votes:[string,number][]=[[admin1,5],[admin2,4],[admin3,4],[admin4,3]];
    for(const [id,stars] of votes.slice(0,3)){await as('authenticated',id);await db.exec(`insert into review_votes(post_id,admin_id,approved,stars_vote) values('${legacyReview}','${id}',true,${stars})`);}
    await as('authenticated',admin1);
    await expect(db.exec(`update posts set status='published',published_at=now() where id='${legacyReview}'`)).rejects.toThrow(/todo el equipo/);
    await as('authenticated',admin4);await db.exec(`insert into review_votes(post_id,admin_id,approved,stars_vote) values('${legacyReview}','${admin4}',true,3)`);
    await as('authenticated',admin1);
    await db.exec(`update posts set status='published',published_at=now() where id='${legacyReview}'`);
    const {rows}=await db.query<{stars:string;state:string}>(`select stars::text,state from post_reviews where post_id='${legacyReview}'`);
    expect(rows[0]).toEqual({stars:'4.0',state:'approved'});
    await as('anon');
    expect((await db.query(`select stars from post_reviews where post_id='${legacyReview}'`)).rows).toHaveLength(1);
  });
  it('un admin no puede votar en nombre de otro',async()=>{
    await as('authenticated',admin1);
    await expect(db.exec(`update review_votes set approved=false where post_id='${legacyReview}' and admin_id='${admin2}'`)).resolves.toBeDefined();
    await as('postgres');
    expect((await db.query<{approved:boolean}>(`select approved from review_votes where post_id='${legacyReview}' and admin_id='${admin2}'`)).rows[0].approved).toBe(true);
  });
  it('editar el texto de una reseña publicada reinicia la votación y la despublica',async()=>{
    await as('authenticated',admin1);
    await db.exec(`update posts set body_md='Texto corregido' where id='${legacyReview}'`);
    await as('postgres');
    const {rows}=await db.query<{status:string;state:string;stars:string|null;votes:number}>(`select p.status,r.state,r.stars::text,(select count(*)::int from review_votes v where v.post_id=p.id) votes from posts p join post_reviews r on r.post_id=p.id where p.id='${legacyReview}'`);
    expect(rows[0]).toEqual({status:'draft',state:'voting',stars:null,votes:0});
  });
  it('cambiar las fuentes de una reseña aprobada también reinicia la votación',async()=>{
    for(const id of [admin1,admin2,admin3,admin4]){await as('authenticated',id);await db.exec(`insert into review_votes(post_id,admin_id,approved,stars_vote) values('${legacyReview}','${id}',true,5)`);}
    await as('authenticated',admin1);
    await db.exec(`update posts set status='published',published_at=now() where id='${legacyReview}'`);
    await db.exec(`update post_reviews set sources_md='Escuchado en vinil' where post_id='${legacyReview}'`);
    await as('postgres');
    const {rows}=await db.query<{status:string;state:string;votes:number}>(`select p.status,r.state,(select count(*)::int from review_votes v where v.post_id=p.id) votes from posts p join post_reviews r on r.post_id=p.id where p.id='${legacyReview}'`);
    expect(rows[0]).toEqual({status:'draft',state:'voting',votes:0});
  });
  it('retirar una autorización despublica la reseña',async()=>{
    for(const id of [admin1,admin2,admin3,admin4]){await as('authenticated',id);await db.exec(`insert into review_votes(post_id,admin_id,approved,stars_vote) values('${legacyReview}','${id}',true,4)`);}
    await as('authenticated',admin1);await db.exec(`update posts set status='published',published_at=now() where id='${legacyReview}'`);
    await as('authenticated',admin2);await db.exec(`update review_votes set approved=false where post_id='${legacyReview}' and admin_id='${admin2}'`);
    await as('postgres');
    expect((await db.query<{status:string}>(`select status from posts where id='${legacyReview}'`)).rows[0].status).toBe('draft');
  });
  it('post_reviews solo existe para publicaciones tipo review',async()=>{
    await as('authenticated',admin1);
    await db.exec(`insert into posts(id,type,title,slug,territory,pillar,status,published_at,created_by) values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','articulo','Historia','historia','musica','entender','published','2020-01-01','${admin1}')`);
    await expect(db.exec(`insert into post_reviews(post_id,subject) values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','album')`)).rejects.toThrow();
  });
});

describe('12 unanimidad de los admins activos',()=>{
  const r1='f1111111-ffff-4fff-8fff-ffffffffffff',r2='f2222222-ffff-4fff-8fff-ffffffffffff';
  async function newReview(id:string,slug:string){
    await as('authenticated',admin1);
    await db.exec(`insert into posts(id,kind,type,title,slug,territory,pillar,status,created_by) values('${id}','review','articulo','R ${slug}','${slug}','musica','recomendar','draft','${admin1}');insert into post_reviews(post_id,subject,state) values('${id}','album','voting');`);
  }
  const state=async(id:string)=>{await as('postgres');return (await db.query<{state:string;status:string}>(`select r.state,p.status from post_reviews r join posts p on p.id=r.post_id where r.post_id='${id}'`)).rows[0];};
  it('la baja de un admin que no votó aprueba la reseña si los demás ya autorizaron',async()=>{
    await newReview(r1,'quorum-uno');
    for(const id of [admin1,admin2,admin3]){await as('authenticated',id);await db.exec(`insert into review_votes(post_id,admin_id,approved,stars_vote) values('${r1}','${id}',true,4)`);}
    expect((await state(r1)).state).toBe('voting');
    await db.exec(`delete from admins where user_id='${admin4}'`);
    expect((await state(r1)).state).toBe('approved');
    await as('authenticated',admin1);await db.exec(`update posts set status='published',published_at=now() where id='${r1}'`);
    expect(await state(r1)).toEqual({state:'approved',status:'published'});
  });
  it('el alta de un admin devuelve a votación lo aprobado sin publicar, pero no despublica',async()=>{
    await newReview(r2,'quorum-dos');
    for(const id of [admin1,admin2,admin3]){await as('authenticated',id);await db.exec(`insert into review_votes(post_id,admin_id,approved,stars_vote) values('${r2}','${id}',true,5)`);}
    expect((await state(r2)).state).toBe('approved');
    await as('postgres');await db.exec(`insert into admins(user_id,email) values('${admin4}','a4@example.invalid') on conflict do nothing`);
    expect((await state(r2)).state).toBe('voting');
    expect(await state(r1)).toEqual({state:'approved',status:'published'});
    await as('authenticated',admin1);
    await expect(db.exec(`update posts set status='published',published_at=now() where id='${r2}'`)).rejects.toThrow(/todo el equipo/);
    await as('authenticated',admin4);await db.exec(`insert into review_votes(post_id,admin_id,approved,stars_vote) values('${r2}','${admin4}',true,4)`);
    expect((await state(r2)).state).toBe('approved');
  });
});

describe('10 me gusta, guardados e historial',()=>{
  const post='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  it('migró el guardado de la reseña anterior',async()=>{
    await as('postgres');
    expect((await db.query(`select 1 from post_saves where user_id='${reader}' and post_id='${legacyReview}'`)).rows).toHaveLength(1);
  });
  it('me gusta es idempotente: repetir no duplica',async()=>{
    await as('authenticated',reader);
    await db.exec(`insert into post_likes(user_id,post_id) values('${reader}','${post}') on conflict do nothing`);
    await db.exec(`insert into post_likes(user_id,post_id) values('${reader}','${post}') on conflict do nothing`);
    expect((await db.query<{n:number}>(`select public.post_like_count('${post}') n`)).rows[0].n).toBe(1);
    await as('anon');
    expect((await db.query<{n:number}>(`select public.post_like_count('${post}') n`)).rows[0].n).toBe(1);
  });
  it('no se puede dar me gusta ni guardar en nombre de otro, ni sin sesión, ni en borradores',async()=>{
    await as('authenticated',reader);
    await expect(db.exec(`insert into post_likes(user_id,post_id) values('${admin1}','${post}')`)).rejects.toThrow();
    await expect(db.exec(`insert into post_saves(user_id,post_id) values('${reader}','${legacyReview}')`)).rejects.toThrow();
    await as('anon');
    await expect(db.exec(`insert into post_saves(user_id,post_id) values('${reader}','${post}')`)).rejects.toThrow();
  });
  it('cada cuenta solo ve sus propios me gusta',async()=>{
    await as('authenticated',admin1);
    expect((await db.query('select * from post_likes')).rows).toHaveLength(0);
  });
  it('el historial guarda una fila por publicación y cuenta las aperturas',async()=>{
    await as('authenticated',reader);
    await db.exec(`select public.record_post_view('${post}');select public.record_post_view('${post}');select public.record_post_view('${legacyReview}');`);
    const {rows}=await db.query<{post_id:string;view_count:number}>('select post_id,view_count from post_views');
    expect(rows).toEqual([{post_id:post,view_count:2}]);
    await as('anon');
    await expect(db.exec(`select public.record_post_view('${post}')`)).rejects.toThrow();
  });
  it('borrar la publicación borra sus me gusta, guardados e historial',async()=>{
    await as('postgres');
    await db.exec(`delete from posts where id='${post}'`);
    for(const t of ['post_likes','post_saves','post_views'])expect((await db.query(`select 1 from ${t} where post_id='${post}'`)).rows).toHaveLength(0);
  });
});
