-- Fase 3: reseñas de álbumes y sencillos con estrellas KIIN y autorización de todo el equipo.
begin;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('album','sencillo')),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug)<=100),
  title text not null check(char_length(title) between 1 and 120),
  artist text not null check(char_length(artist) between 1 and 120),
  cover_media_id uuid references public.media(id) on delete restrict,
  analysis_md text not null default '' check(char_length(analysis_md)<=20000),
  sources_md text not null default '' check(char_length(sources_md)<=5000),
  spotify_url text check(spotify_url is null or spotify_url ~ '^https://(open\.spotify\.com|spotify\.link)/'),
  youtube_url text check(youtube_url is null or youtube_url ~ '^https://((www\.)?youtube\.com|youtu\.be)/'),
  status text not null default 'draft' check(status in ('draft','pending','approved','published','archived')),
  stars numeric(2,1) check(stars is null or (stars between 1 and 5 and (stars*2)=round(stars*2))),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (to_tsvector('spanish'::regconfig,coalesce(title,'')||' '||coalesce(artist,'')||' '||coalesce(analysis_md,''))) stored,
  check(status<>'published' or (published_at is not null and stars is not null))
);
create index reviews_status on public.reviews(status,published_at desc);
create index reviews_search on public.reviews using gin(search);
create index reviews_cover on public.reviews(cover_media_id);
create trigger reviews_touch before update on public.reviews for each row execute function public.touch_updated_at();

-- Cada admin evalúa (estrellas propias) y autoriza o no.
create table public.review_approvals (
  review_id uuid not null references public.reviews(id) on delete cascade,
  admin_id uuid not null references public.admins(user_id) on delete cascade,
  approved boolean not null,
  stars_vote smallint not null check(stars_vote between 1 and 5),
  comment text not null default '' check(char_length(comment)<=500),
  updated_at timestamptz not null default now(),
  primary key(review_id,admin_id)
);

-- Antes de actualizar una reseña: si cambia el contenido evaluado, se reinician las aprobaciones;
-- y para publicar exige que el equipo completo haya autorizado, con calificación = promedio de votos.
create function public.review_guard() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare avg_votes numeric;
begin
  if (old.title,old.artist,old.analysis_md,old.sources_md) is distinct from (new.title,new.artist,new.analysis_md,new.sources_md)
     and old.status in ('pending','approved','published') then
    delete from public.review_approvals where review_id=old.id;
    if new.status<>'archived' then new.status:='pending'; new.published_at:=null; new.stars:=null; end if;
  end if;
  -- 'approved' solo lo asigna el recuento de votos (nivel de trigger anidado), nunca una escritura directa.
  if new.status='approved' and old.status<>'approved' and pg_trigger_depth()<2 then raise exception 'El estado aprobada depende de los votos del equipo' using errcode='23514'; end if;
  if new.status='published' and old.status<>'published' then
    if old.status<>'approved' then raise exception 'La reseña necesita la autorización de todo el equipo' using errcode='23514'; end if;
    select avg(stars_vote) into avg_votes from public.review_approvals where review_id=old.id and approved;
    new.stars:=round(avg_votes*2)/2;
    if new.published_at is null then new.published_at:=now(); end if;
  end if;
  return new;
end;$$;
create trigger reviews_guard before update on public.reviews for each row execute function public.review_guard();

-- Tras cada voto: la reseña pasa a 'approved' cuando todos los admins autorizaron, o vuelve a 'pending'.
create function public.review_recompute() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare rid uuid:=coalesce(new.review_id,old.review_id);total int;ok int;
begin
  if pg_trigger_depth()>1 then return null; end if;
  select count(*) into total from public.admins;
  select count(*) into ok from public.review_approvals where review_id=rid and approved;
  update public.reviews set status=case when total>0 and ok>=total then 'approved' else 'pending' end where id=rid and status in ('pending','approved');
  return null;
end;$$;
create trigger review_approvals_recompute after insert or update or delete on public.review_approvals for each row execute function public.review_recompute();

alter table public.reviews enable row level security;
alter table public.review_approvals enable row level security;
revoke all on public.reviews,public.review_approvals from anon,authenticated;
grant select on public.reviews to anon,authenticated;
grant insert,update,delete on public.reviews to authenticated;
grant select,insert,update,delete on public.review_approvals to authenticated;

create policy reviews_read on public.reviews for select to anon,authenticated using(status='published' and published_at<=now());
create policy reviews_admin_read on public.reviews for select to authenticated using(public.is_admin());
create policy reviews_insert on public.reviews for insert to authenticated with check(public.is_admin() and created_by=auth.uid() and status='draft');
create policy reviews_update on public.reviews for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy reviews_delete on public.reviews for delete to authenticated using(public.is_admin());
create policy approvals_read on public.review_approvals for select to authenticated using(public.is_admin());
create policy approvals_insert on public.review_approvals for insert to authenticated with check(public.is_admin() and admin_id=auth.uid());
create policy approvals_update on public.review_approvals for update to authenticated using(admin_id=auth.uid()) with check(admin_id=auth.uid());
create policy approvals_delete on public.review_approvals for delete to authenticated using(admin_id=auth.uid());

commit;
