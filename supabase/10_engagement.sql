-- 10: me gusta, guardados e historial de publicaciones abiertas, por cuenta.
-- Claves foráneas reales a posts (no asociaciones polimórficas). La clave primaria (user_id, post_id)
-- hace que dar me gusta o guardar dos veces no duplique filas (idempotencia en la base).
begin;

create table public.post_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,post_id)
);
create index post_likes_post on public.post_likes(post_id);
create index post_likes_user_recent on public.post_likes(user_id,created_at desc);

create table public.post_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,post_id)
);
create index post_saves_post on public.post_saves(post_id);
create index post_saves_user_recent on public.post_saves(user_id,created_at desc);

-- Historial: una fila por cuenta y publicación (acotado), con la última apertura y el número de aperturas.
create table public.post_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  view_count integer not null default 1 check(view_count>=1),
  primary key(user_id,post_id),
  check(last_viewed_at>=first_viewed_at)
);
create index post_views_post on public.post_views(post_id);
create index post_views_user_recent on public.post_views(user_id,last_viewed_at desc);

-- Guardados anteriores de publicaciones y reseñas (las reseñas conservaron su id en 09).
insert into public.post_saves(user_id,post_id,created_at)
  select s.user_id,s.item_id,s.created_at from public.saved_items s join public.posts p on p.id=s.item_id
  where s.kind in ('post','review')
  on conflict do nothing;

-- Solo se puede dar me gusta, guardar o abrir lo que está publicado.
create function public.is_published_post(p_post uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.posts where id=p_post and status='published' and published_at<=now());
$$;
revoke all on function public.is_published_post(uuid) from public;
grant execute on function public.is_published_post(uuid) to anon,authenticated;

-- Registra una apertura (idempotente por publicación: actualiza la fila existente).
create function public.record_post_view(p_post uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión' using errcode='42501'; end if;
  if not public.is_published_post(p_post) then return; end if;
  insert into public.post_views(user_id,post_id) values(auth.uid(),p_post)
    on conflict(user_id,post_id) do update set last_viewed_at=now(),view_count=public.post_views.view_count+1;
end;$$;
revoke all on function public.record_post_view(uuid) from public;
grant execute on function public.record_post_view(uuid) to authenticated;

-- Conteo público de me gusta de una publicación publicada (sin exponer quién).
create function public.post_like_count(p_post uuid) returns integer language sql stable security definer set search_path=public,pg_temp as $$
  select case when public.is_published_post(p_post) then (select count(*)::int from public.post_likes where post_id=p_post) else 0 end;
$$;
revoke all on function public.post_like_count(uuid) from public;
grant execute on function public.post_like_count(uuid) to anon,authenticated;

alter table public.post_likes enable row level security;
alter table public.post_saves enable row level security;
alter table public.post_views enable row level security;
revoke all on public.post_likes,public.post_saves,public.post_views from anon,authenticated;
grant select,insert,delete on public.post_likes,public.post_saves to authenticated;
grant select,delete on public.post_views to authenticated;

create policy post_likes_read on public.post_likes for select to authenticated using(user_id=auth.uid());
create policy post_likes_insert on public.post_likes for insert to authenticated with check(user_id=auth.uid() and public.is_published_post(post_id));
create policy post_likes_delete on public.post_likes for delete to authenticated using(user_id=auth.uid());
create policy post_saves_read on public.post_saves for select to authenticated using(user_id=auth.uid());
create policy post_saves_insert on public.post_saves for insert to authenticated with check(user_id=auth.uid() and public.is_published_post(post_id));
create policy post_saves_delete on public.post_saves for delete to authenticated using(user_id=auth.uid());
create policy post_views_read on public.post_views for select to authenticated using(user_id=auth.uid());
create policy post_views_delete on public.post_views for delete to authenticated using(user_id=auth.uid());

commit;
