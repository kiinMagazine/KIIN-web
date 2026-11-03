-- Fase 4: cuentas de lectores (guardar contenido y seguir territorios). Separadas de los administradores.
begin;

create table public.readers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check(char_length(display_name)<=60),
  follow_all boolean not null default false,
  follow_territories text[] not null default '{}' check(follow_territories <@ array['musica','moda','deportes','eventos','actualidad']::text[]),
  seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.saved_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('post','review','pick')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(user_id,kind,item_id)
);
create index saved_items_user on public.saved_items(user_id,created_at desc);

-- Tope por cuenta para evitar abuso de almacenamiento.
create function public.limit_saved_items() returns trigger language plpgsql set search_path=public as $$
begin
  if (select count(*) from public.saved_items where user_id=new.user_id)>=500 then raise exception 'Límite de elementos guardados alcanzado' using errcode='23514'; end if;
  return new;
end;$$;
create trigger saved_items_limit before insert on public.saved_items for each row execute function public.limit_saved_items();

alter table public.readers enable row level security;
alter table public.saved_items enable row level security;
revoke all on public.readers,public.saved_items from anon,authenticated;
grant select,insert,update on public.readers to authenticated;
grant select,insert,delete on public.saved_items to authenticated;

create policy readers_read on public.readers for select to authenticated using(user_id=auth.uid());
create policy readers_insert on public.readers for insert to authenticated with check(user_id=auth.uid());
create policy readers_update on public.readers for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy saved_read on public.saved_items for select to authenticated using(user_id=auth.uid());
create policy saved_insert on public.saved_items for insert to authenticated with check(user_id=auth.uid());
create policy saved_delete on public.saved_items for delete to authenticated using(user_id=auth.uid());

commit;
