-- 08: cuentas y seguridad. Roles (usuario / admin), máximo 4 administradores, nombre de usuario,
-- contraseñas temporales con caducidad, tokens de un solo uso y límite de intentos.
-- Aditiva: no borra columnas ni tablas. Tablas pequeñas: los bloqueos son despreciables.
begin;

-- Rol: la pertenencia a public.admins es la única fuente de verdad (la usan todas las políticas RLS).
-- my_role() la expone como 'admin' | 'usuario' para la app.
create function public.my_role() returns text language sql stable security definer set search_path=public,pg_temp as $$
  select case when auth.uid() is null then null when exists(select 1 from public.admins where user_id=auth.uid()) then 'admin' else 'usuario' end;
$$;
revoke all on function public.my_role() from public;
grant execute on function public.my_role() to authenticated;

-- Máximo 4 administradores. El candado serializa altas simultáneas (sin él, dos altas a la vez podrían dejar 5).
create or replace function public.limit_admins() returns trigger language plpgsql set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtext('public.admins.limit'));
  if (select count(*) from public.admins)>=4 then
    raise exception 'Ya hay 4 administradores, el máximo permitido' using errcode='23514';
  end if;
  return new;
end;$$;

-- El indicador "debe cambiar contraseña" solo lo limpia el servidor tras un cambio real de contraseña.
-- Antes cualquier admin podía llamarlo por la API sin cambiarla.
revoke execute on function public.password_changed() from authenticated;

-- Perfil de toda cuenta (lectores y administradores): nombre de usuario único.
alter table public.readers add column username text;
update public.readers set username='lector_'||substr(md5(user_id::text),1,8) where username is null;
alter table public.readers alter column username set not null;
alter table public.readers add constraint readers_username_format check(username ~ '^[a-z0-9_.]{3,30}$');
create unique index readers_username_unique on public.readers(lower(username));
-- Los administradores también tienen perfil (likes, guardados, historial).
insert into public.readers(user_id,username,display_name)
  select a.user_id,'admin_'||substr(md5(a.user_id::text),1,8),a.display_name from public.admins a
  on conflict(user_id) do nothing;

-- Secretos de cuenta: hash de la contraseña temporal (para impedir reutilizarla) y su caducidad.
-- Sin permisos para anon/authenticated: solo el servidor (service_role) la lee y escribe.
create table public.account_secrets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  temp_password_hash text not null check(char_length(temp_password_hash) between 50 and 100),
  temp_password_expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Tokens de un solo uso (recuperación de contraseña y verificación de correo).
-- Se guarda el SHA-256 del token, nunca el token.
create table public.auth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check(purpose in ('password_reset','email_verify')),
  token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  check(expires_at>created_at),
  check(used_at is null or used_at>=created_at)
);
create index auth_tokens_user_open on public.auth_tokens(user_id,purpose) where used_at is null;
create index auth_tokens_expires on public.auth_tokens(expires_at);

-- Límite de intentos por ventana fija. subject es un SHA-256 (IP o correo), nunca el dato en claro.
create table public.rate_limits (
  bucket text not null check(char_length(bucket) between 1 and 40),
  subject text not null check(subject ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  hits integer not null check(hits>=1),
  primary key(bucket,subject,window_start)
);
create index rate_limits_window on public.rate_limits(window_start);

-- Suma un intento y devuelve true si sigue dentro del límite. Atómico (upsert).
create function public.rate_limit_hit(p_bucket text,p_subject text,p_limit integer,p_window_seconds integer) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare w timestamptz;n integer;
begin
  if p_limit<1 or p_window_seconds<1 then raise exception 'Parámetros inválidos' using errcode='22023'; end if;
  w:=to_timestamp(floor(extract(epoch from now())/p_window_seconds)*p_window_seconds);
  insert into public.rate_limits(bucket,subject,window_start,hits) values(p_bucket,p_subject,w,1)
    on conflict(bucket,subject,window_start) do update set hits=public.rate_limits.hits+1
    returning hits into n;
  -- Limpieza ocasional de ventanas viejas, sin trabajo programado.
  if random()<0.02 then delete from public.rate_limits where window_start<now()-interval '2 days'; end if;
  return n<=p_limit;
end;$$;
revoke all on function public.rate_limit_hit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.rate_limit_hit(text,text,integer,integer) to service_role;

alter table public.account_secrets enable row level security;
alter table public.auth_tokens enable row level security;
alter table public.rate_limits enable row level security;
revoke all on public.account_secrets,public.auth_tokens,public.rate_limits from anon,authenticated;

commit;
