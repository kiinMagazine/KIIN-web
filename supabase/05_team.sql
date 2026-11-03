-- Fase 2: equipo (máx. 3 admins del mismo nivel), parrilla, notificaciones internas y presencia.
begin;

-- Admins: contraseña temporal, nombre visible y presencia.
alter table public.admins
  add column display_name text not null default '',
  add column must_change_password boolean not null default false,
  add column last_seen_at timestamptz;

create function public.limit_admins() returns trigger language plpgsql set search_path=public as $$
begin
  if (select count(*) from public.admins)>=3 then raise exception 'Solo puede haber 3 administradores' using errcode='23514'; end if;
  return new;
end;$$;
create trigger admins_limit before insert on public.admins for each row execute function public.limit_admins();

-- Presencia y cambio de contraseña: únicas escrituras permitidas sobre la propia fila.
create function public.touch_presence() returns void language sql security definer set search_path=public,pg_temp as $$
  update public.admins set last_seen_at=now() where user_id=(select auth.uid());
$$;
create function public.password_changed() returns void language sql security definer set search_path=public,pg_temp as $$
  update public.admins set must_change_password=false where user_id=(select auth.uid());
$$;
revoke all on function public.touch_presence(),public.password_changed() from public;
grant execute on function public.touch_presence(),public.password_changed() to authenticated;

-- Artista asociado a una publicación (búsqueda por nombre).
alter table public.posts add column artist text not null default '' check(char_length(artist)<=120);
drop index public.posts_search;
alter table public.posts drop column search;
alter table public.posts add column search tsvector generated always as (to_tsvector('spanish'::regconfig,coalesce(title,'')||' '||coalesce(artist,'')||' '||coalesce(excerpt,'')||' '||coalesce(body_md,''))) stored;
create index posts_search on public.posts using gin(search);

-- Parrilla de publicaciones.
create table public.grid_items (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts(id) on delete cascade,
  web_publish_at timestamptz,
  instagram boolean not null default false,
  instagram_at timestamptz,
  instagram_notified_at timestamptz,
  note text not null default '' check(char_length(note)<=500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(not instagram or instagram_at is not null)
);
create trigger grid_items_touch before update on public.grid_items for each row execute function public.touch_updated_at();
create index grid_items_web on public.grid_items(web_publish_at);

-- Me gusta entre administradores: retroalimentación, nunca bloquea publicar.
create table public.grid_likes (
  item_id uuid not null references public.grid_items(id) on delete cascade,
  user_id uuid not null references public.admins(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(item_id,user_id)
);

-- Notificaciones internas (no es un chat). Cada admin borra solo las suyas.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.admins(user_id) on delete cascade,
  code text not null check(char_length(code)<=40),
  message text not null check(char_length(message) between 1 and 300),
  dedupe_key text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(recipient_id,dedupe_key)
);
create index notifications_recipient on public.notifications(recipient_id,created_at desc);

alter table public.grid_items enable row level security;
alter table public.grid_likes enable row level security;
alter table public.notifications enable row level security;
revoke all on public.grid_items,public.grid_likes,public.notifications from anon,authenticated;
grant select,insert,update,delete on public.grid_items to authenticated;
grant select,insert,delete on public.grid_likes to authenticated;
grant select,update(read_at),delete on public.notifications to authenticated;

create policy grid_items_read on public.grid_items for select to authenticated using(public.is_admin());
create policy grid_items_insert on public.grid_items for insert to authenticated with check(public.is_admin() and created_by=auth.uid());
create policy grid_items_update on public.grid_items for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy grid_items_delete on public.grid_items for delete to authenticated using(public.is_admin());
create policy grid_likes_read on public.grid_likes for select to authenticated using(public.is_admin());
create policy grid_likes_insert on public.grid_likes for insert to authenticated with check(public.is_admin() and user_id=auth.uid());
create policy grid_likes_delete on public.grid_likes for delete to authenticated using(user_id=auth.uid());
create policy notifications_read on public.notifications for select to authenticated using(recipient_id=auth.uid());
create policy notifications_mark on public.notifications for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated using(recipient_id=auth.uid());

-- Emite una notificación a los 3 admins. Solo la llama un admin autenticado (o el programador con privilegios).
create function public.notify_admins(p_code text,p_message text,p_dedupe text default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'No autorizado' using errcode='42501'; end if;
  insert into public.notifications(recipient_id,code,message,dedupe_key)
    select user_id,p_code,p_message,p_dedupe from public.admins
    on conflict(recipient_id,dedupe_key) do nothing;
end;$$;
revoke all on function public.notify_admins(text,text,text) from public;
grant execute on function public.notify_admins(text,text,text) to authenticated;

-- Recordatorios de Instagram vencidos (idempotente). Etapa 1 sin API: avisa a los 3 admins.
create function public.deliver_instagram_reminders() returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare r record;n integer:=0;
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'No autorizado' using errcode='42501'; end if;
  for r in update public.grid_items set instagram_notified_at=now()
    where instagram and instagram_at<=now() and instagram_notified_at is null
    returning id,post_id loop
    insert into public.notifications(recipient_id,code,message,dedupe_key)
      select a.user_id,'instagram','Toca publicar en Instagram: '||coalesce((select title from public.posts where id=r.post_id),'publicación'),'ig-'||r.id from public.admins a
      on conflict(recipient_id,dedupe_key) do nothing;
    n:=n+1;
  end loop;
  return n;
end;$$;
revoke all on function public.deliver_instagram_reminders() from public;
grant execute on function public.deliver_instagram_reminders() to authenticated;

commit;
