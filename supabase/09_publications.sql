-- 09: una sola tabla de publicaciones con tipo 'contenido' o 'review'.
-- Las reseñas viven en posts (kind='review') + post_reviews (datos de la reseña y estrellas KIIN)
-- + review_votes (votación del equipo). Se copian las filas de las tablas anteriores conservando sus ids.
-- Las tablas reviews / review_approvals quedan sin escritura (obsoletas) y se eliminarán en una migración
-- posterior, después de verificar la copia en producción. Reversión: borrar posts con kind='review' y las tablas nuevas.
begin;

create type public.post_kind as enum ('contenido','review');
alter table public.posts add column kind public.post_kind not null default 'contenido';
create index posts_kind_publication on public.posts(kind,status,published_at desc);

-- Datos propios de una reseña. state: draft (borrador) -> voting (en votación) -> approved (todo el equipo autorizó).
create table public.post_reviews (
  post_id uuid primary key references public.posts(id) on delete cascade,
  subject text not null check(subject in ('album','sencillo')),
  sources_md text not null default '' check(char_length(sources_md)<=5000),
  state text not null default 'draft' check(state in ('draft','voting','approved')),
  -- Estrellas KIIN: promedio de los votos aprobatorios redondeado a media estrella. Solo lo escribe la base.
  stars numeric(2,1) check(stars is null or (stars between 1 and 5 and stars*2=round(stars*2))),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(stars is null or state='approved')
);
create trigger post_reviews_touch before update on public.post_reviews for each row execute function public.touch_updated_at();

-- Voto de cada administrador: sus estrellas (1-5) y si autoriza publicar.
create table public.review_votes (
  post_id uuid not null references public.post_reviews(post_id) on delete cascade,
  admin_id uuid not null references public.admins(user_id) on delete cascade,
  approved boolean not null,
  stars_vote smallint not null check(stars_vote between 1 and 5),
  comment text not null default '' check(char_length(comment)<=500),
  updated_at timestamptz not null default now(),
  primary key(post_id,admin_id)
);
create index review_votes_admin on public.review_votes(admin_id);

-- Copia de las reseñas existentes (mismo id). Los enlaces que no cumplen el formato estricto de posts se descartan.
insert into public.posts(id,kind,type,title,slug,excerpt,body_md,cover_media_id,territory,pillar,status,published_at,artist,spotify_url,youtube_url,created_by,created_at)
select r.id,'review','articulo',r.title,
  case when exists(select 1 from public.posts p where p.slug=r.slug) then left(r.slug,92)||'-resena' else r.slug end,
  '',r.analysis_md,r.cover_media_id,'musica','recomendar',
  (case r.status when 'published' then 'published' when 'archived' then 'archived' else 'draft' end)::public.content_status,
  case when r.status='published' then r.published_at end,
  r.artist,
  case when r.spotify_url ~ '^https://open\.spotify\.com/(track|album|playlist|artist)/[A-Za-z0-9]{22}$' then r.spotify_url end,
  case when r.youtube_url ~ '^https://www\.youtube\.com/(watch\?v=[A-Za-z0-9_-]{11}|playlist\?list=[A-Za-z0-9_-]{10,100})$' then r.youtube_url end,
  r.created_by,r.created_at
from public.reviews r
on conflict(id) do nothing;
insert into public.post_reviews(post_id,subject,sources_md,state,stars)
select r.id,r.kind,r.sources_md,
  case when r.status='pending' then 'voting' when r.status in ('approved','published') then 'approved' when r.status='archived' and r.stars is not null then 'approved' else 'draft' end,
  case when r.status in ('approved','published','archived') then r.stars end
from public.reviews r join public.posts p on p.id=r.id and p.kind='review'
on conflict(post_id) do nothing;
insert into public.review_votes(post_id,admin_id,approved,stars_vote,comment,updated_at)
select a.review_id,a.admin_id,a.approved,a.stars_vote,a.comment,a.updated_at
from public.review_approvals a join public.post_reviews r on r.post_id=a.review_id
on conflict do nothing;

-- Las tablas anteriores quedan de solo lectura hasta eliminarlas.
revoke insert,update,delete on public.reviews,public.review_approvals from authenticated;

-- El tipo de una publicación no cambia después de crearla.
create function public.posts_kind_immutable() returns trigger language plpgsql set search_path=public as $$
begin
  if new.kind<>old.kind then raise exception 'El tipo de publicación no se puede cambiar' using errcode='23514'; end if;
  return new;
end;$$;
create trigger posts_kind_immutable before update of kind on public.posts for each row execute function public.posts_kind_immutable();

-- Reglas de reseñas sobre posts:
--  * una reseña no nace publicada;
--  * cambiar título, artista, resumen o texto reinicia la votación y la despublica;
--  * publicar exige estado 'approved' y fija las estrellas KIIN con el promedio de votos aprobatorios.
create function public.posts_review_guard() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare st text;avg_votes numeric;
begin
  if new.kind<>'review' then return new; end if;
  if tg_op='INSERT' then
    if new.status='published' then raise exception 'La reseña necesita la autorización de todo el equipo' using errcode='23514'; end if;
    return new;
  end if;
  select state into st from public.post_reviews where post_id=new.id;
  if (old.title,old.artist,old.excerpt,old.body_md) is distinct from (new.title,new.artist,new.excerpt,new.body_md)
     and st in ('voting','approved') and new.status<>'archived' then
    -- Primero el estado y luego los votos: así el recálculo no intenta despublicar esta misma fila.
    update public.post_reviews set state='voting',stars=null where post_id=new.id;
    delete from public.review_votes where post_id=new.id;
    st:='voting';new.status:='draft';new.published_at:=null;
  end if;
  if new.status='published' and old.status<>'published' then
    if st is distinct from 'approved' then raise exception 'La reseña necesita la autorización de todo el equipo' using errcode='23514'; end if;
    select avg(stars_vote) into avg_votes from public.review_votes where post_id=new.id and approved;
    if avg_votes is null then raise exception 'La reseña no tiene votos aprobatorios' using errcode='23514'; end if;
    update public.post_reviews set stars=round(avg_votes*2)/2 where post_id=new.id;
    if new.published_at is null then new.published_at:=now(); end if;
  end if;
  return new;
end;$$;
create trigger posts_review_guard before insert or update on public.posts for each row execute function public.posts_review_guard();

-- Reglas sobre post_reviews: solo para publicaciones tipo review; 'approved' y las estrellas los fija la base;
-- cambiar el tipo de obra o las fuentes reinicia la votación.
create function public.post_reviews_guard() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then
    if not exists(select 1 from public.posts where id=new.post_id and kind='review') then
      raise exception 'Solo las publicaciones tipo review tienen datos de reseña' using errcode='23514';
    end if;
    if pg_trigger_depth()<2 and (new.state='approved' or new.stars is not null) then
      raise exception 'El estado aprobada depende de los votos del equipo' using errcode='23514';
    end if;
    return new;
  end if;
  if pg_trigger_depth()<2 and ((new.state='approved' and old.state<>'approved') or new.stars is distinct from old.stars) then
    raise exception 'El estado aprobada y las estrellas dependen de los votos del equipo' using errcode='23514';
  end if;
  return new;
end;$$;
create trigger post_reviews_guard before insert or update on public.post_reviews for each row execute function public.post_reviews_guard();

-- Cambiar el tipo de obra o las fuentes reinicia la votación (AFTER: evita modificar la fila en curso).
create function public.post_reviews_reset() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if (old.subject,old.sources_md) is distinct from (new.subject,new.sources_md) and old.state in ('voting','approved') then
    update public.post_reviews set state='voting',stars=null where post_id=new.post_id;
    delete from public.review_votes where post_id=new.post_id;
    update public.posts set status='draft',published_at=null where id=new.post_id and status='published';
  end if;
  return null;
end;$$;
create trigger post_reviews_reset after update on public.post_reviews for each row execute function public.post_reviews_reset();

-- Tras cada voto: 'approved' cuando todos los admins autorizaron; si deja de estarlo, vuelve a 'voting' y se despublica.
create function public.review_votes_recompute() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare pid uuid:=coalesce(new.post_id,old.post_id);total int;ok int;next_state text;changed int;
begin
  select count(*) into total from public.admins;
  select count(*) into ok from public.review_votes where post_id=pid and approved;
  next_state:=case when total>0 and ok>=total then 'approved' else 'voting' end;
  update public.post_reviews set state=next_state,stars=case when next_state='approved' then stars end
    where post_id=pid and state in ('voting','approved') and state<>next_state;
  get diagnostics changed=row_count;
  -- Solo si realmente pasó de aprobada a votación (no cuando el reinicio ya la dejó en votación).
  if changed>0 and next_state='voting' then update public.posts set status='draft',published_at=null where id=pid and status='published'; end if;
  return null;
end;$$;
create trigger review_votes_recompute after insert or update or delete on public.review_votes for each row execute function public.review_votes_recompute();

alter table public.post_reviews enable row level security;
alter table public.review_votes enable row level security;
revoke all on public.post_reviews,public.review_votes from anon,authenticated;
grant select on public.post_reviews to anon,authenticated;
grant insert,update,delete on public.post_reviews to authenticated;
grant select,insert,update,delete on public.review_votes to authenticated;

create policy post_reviews_read on public.post_reviews for select to anon,authenticated
  using(exists(select 1 from public.posts p where p.id=post_id and p.status='published' and p.published_at<=now()));
create policy post_reviews_admin_read on public.post_reviews for select to authenticated using(public.is_admin());
create policy post_reviews_insert on public.post_reviews for insert to authenticated with check(public.is_admin());
create policy post_reviews_update on public.post_reviews for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy post_reviews_delete on public.post_reviews for delete to authenticated using(public.is_admin());
create policy review_votes_read on public.review_votes for select to authenticated using(public.is_admin());
create policy review_votes_insert on public.review_votes for insert to authenticated
  with check(public.is_admin() and admin_id=auth.uid() and exists(select 1 from public.post_reviews r where r.post_id=review_votes.post_id and r.state in ('voting','approved')));
create policy review_votes_update on public.review_votes for update to authenticated
  using(admin_id=auth.uid()) with check(admin_id=auth.uid() and exists(select 1 from public.post_reviews r where r.post_id=review_votes.post_id and r.state in ('voting','approved')));
create policy review_votes_delete on public.review_votes for delete to authenticated using(admin_id=auth.uid());

commit;
