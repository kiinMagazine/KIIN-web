-- KIIN: esquema de referencia; NO aplicado a Supabase.
-- Requiere 01_schema.sql y 02_policies.sql existentes.
-- Revisar roles del backend, Storage y permisos reales antes de desplegar.
begin;

create schema if not exists kiin_private;
revoke all on schema kiin_private from public, anon, authenticated;

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  brand text not null default 'KIIN' check (brand = 'KIIN'),
  platform text not null check (platform in ('instagram','facebook','tiktok')),
  external_account_id text not null,
  display_name text not null,
  auth_strategy text not null,
  publishing_mode text not null default 'disabled'
    check (publishing_mode in ('direct','approved_provider','manual','disabled')),
  status text not null default 'disconnected'
    check (status in ('connected','reauth_required','disconnected','disabled')),
  capabilities jsonb not null default '{}',
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, external_account_id),
  unique(id, platform)
);

create table kiin_private.social_credentials (
  account_id uuid primary key references public.social_accounts(id) on delete restrict,
  -- Payload cifrado autenticado: access_token, refresh_token y sesiones sensibles.
  -- La clave maestra se guarda FUERA de la BD; key_id permite rotación.
  token_ciphertext bytea not null,
  key_id text not null,
  scopes text[] not null default '{}',
  access_expires_at timestamptz,
  refresh_expires_at timestamptz,
  data_access_expires_at timestamptz,
  version int not null default 1 check (version > 0),
  refresh_lease_token uuid,
  refresh_lease_until timestamptz,
  last_refreshed_at timestamptz,
  last_error_code text,
  updated_at timestamptz not null default now()
);

create table public.social_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'kiin-social-private',
  object_key text not null,
  sha256 text,
  mime_type text,
  bytes bigint check (bytes > 0),
  width int check (width > 0),
  height int check (height > 0),
  duration_ms bigint check (duration_ms >= 0),
  video_codec text,
  audio_codec text,
  fps numeric check (fps > 0),
  validation_status text not null default 'pending'
    check (validation_status in ('pending','valid','invalid')),
  validation_errors jsonb not null default '[]',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(bucket, object_key)
);

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  editorial_post_id uuid references public.posts(id) on delete restrict,
  title text not null check (length(trim(title)) between 1 and 120),
  caption text not null default '',
  territory public.territory,
  pillar public.pillar,
  lifecycle text not null default 'draft'
    check (lifecycle in ('draft','scheduled','active','completed','cancelled')),
  scheduled_at timestamptz,
  calendar_at timestamptz, -- Fecha editorial del borrador; puede ser NULL.
  timezone text not null default 'America/Mexico_City',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  scheduled_by uuid references auth.users(id) on delete set null,
  creator_label text not null, -- Snapshot del nombre/correo verificado.
  version int not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lifecycle <> 'scheduled' or scheduled_at is not null)
);

create table public.social_post_assets (
  post_id uuid not null references public.social_posts(id) on delete restrict,
  asset_id uuid not null references public.social_assets(id) on delete restrict,
  position int not null check (position >= 0),
  primary key(post_id, position),
  unique(post_id, asset_id)
);

create table public.social_deliveries (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete restrict,
  account_id uuid not null,
  platform text not null,
  format text not null,
  caption_override text,
  provider_options jsonb not null default '{}',
  -- Snapshot congelado al programar; no leer un caption mutable al publicar.
  payload_snapshot jsonb not null default '{}',
  status text not null default 'draft' check (status in (
    'draft','scheduled','queued','uploading','processing','ready','publishing',
    'retry_wait','reconciling','published','failed','auth_required',
    'manual_required','cancelled'
  )),
  revision int not null default 1 check (revision > 0),
  workflow_seq int not null default 0 check (workflow_seq >= 0),
  next_step text not null default 'prepare'
    check (next_step in ('prepare','upload','poll','publish','reconcile','manual')),
  scheduled_at timestamptz,
  next_action_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  provider_container_id text,
  provider_publish_id text,
  provider_post_id text,
  published_at timestamptz,
  visibility text,
  permalink text,
  processing_started_at timestamptz,
  processing_deadline_at timestamptz,
  attempts int not null default 0 check (attempts >= 0),
  max_attempts int not null default 5 check (max_attempts > 0),
  last_error_code text,
  last_error_message text,
  requested_by uuid references auth.users(id) on delete set null,
  confirmed_by uuid references auth.users(id) on delete set null,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(account_id, platform) references public.social_accounts(id, platform),
  unique(post_id, account_id, format),
  check (
    (platform = 'instagram' and format in ('reel','story','feed','carousel')) or
    (platform = 'facebook' and format in ('reel','story','feed','video','carousel')) or
    (platform = 'tiktok' and format in ('video','photo'))
  ),
  check (status <> 'published' or published_at is not null)
);

create table public.social_delivery_assets (
  delivery_id uuid not null references public.social_deliveries(id) on delete restrict,
  revision int not null check (revision > 0),
  asset_id uuid not null references public.social_assets(id) on delete restrict,
  position int not null check (position >= 0),
  primary key(delivery_id, revision, position)
);

create index social_deliveries_due on public.social_deliveries(next_action_at)
  where status in ('scheduled','queued','retry_wait','processing','ready','reconciling');
create index social_deliveries_post on public.social_deliveries(post_id);
create index social_posts_calendar on public.social_posts(scheduled_at, calendar_at);
create unique index social_delivery_external_post
  on public.social_deliveries(account_id, provider_post_id)
  where provider_post_id is not null;

create table kiin_private.social_outbox (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.social_deliveries(id) on delete restrict,
  revision int not null check (revision > 0),
  workflow_seq int not null check (workflow_seq >= 0),
  step text not null check (step in ('prepare','upload','poll','publish','reconcile','manual')),
  available_at timestamptz not null default now(),
  state text not null default 'pending'
    check (state in ('pending','dispatched','done','failed','obsolete')),
  dispatch_token uuid,
  dispatch_lease_until timestamptz,
  dispatched_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(delivery_id, revision, workflow_seq)
);
create index social_outbox_pending on kiin_private.social_outbox(available_at)
  where state = 'pending';

create table kiin_private.social_attempts (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references kiin_private.social_outbox(id) on delete restrict,
  request_id uuid not null default gen_random_uuid(),
  operation text not null,
  phase text not null check (phase in ('started','accepted','rejected','unknown')),
  http_status int,
  provider_error_code text,
  provider_request_id text,
  -- Solo metadata saneada; nunca Authorization, tokens ni URL firmadas.
  details jsonb not null default '{}',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.social_audit_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.social_posts(id) on delete restrict,
  delivery_id uuid references public.social_deliveries(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  actor_label text not null,
  actor_kind text not null check (actor_kind in ('admin','worker','webhook')),
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.social_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  delivery_id uuid references public.social_deliveries(id) on delete restrict,
  severity text not null check (severity in ('info','warning','error')),
  code text not null,
  message text not null,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique(recipient_id, dedupe_key)
);

create table kiin_private.social_webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  dedupe_key text not null,
  payload_sanitized jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider, dedupe_key)
);

-- Cliente: lectura administrativa. Las escrituras pasan por API con auditoría.
-- RLS también se activa en lo privado; ningún permiso para anon/authenticated.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'social_accounts','social_assets','social_posts','social_post_assets',
    'social_deliveries','social_delivery_assets','social_audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('revoke all on public.%I from public, anon, authenticated', tbl);
    execute format('grant select on public.%I to authenticated', tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using(public.is_admin())',
      tbl || '_admin_read', tbl
    );
  end loop;
  foreach tbl in array array[
    'social_credentials','social_outbox','social_attempts','social_webhook_receipts'
  ] loop
    execute format('alter table kiin_private.%I enable row level security', tbl);
    execute format('revoke all on kiin_private.%I from public, anon, authenticated', tbl);
  end loop;
end $$;
alter table public.social_notifications enable row level security;
revoke all on public.social_notifications from public, anon, authenticated;
grant select on public.social_notifications to authenticated;
create policy social_notifications_own on public.social_notifications
  for select to authenticated using(public.is_admin() and recipient_id = auth.uid());

-- Configurar aparte el rol dedicado del backend y worker, sus GRANT/policies,
-- y su acceso al esquema privado. No publicar kiin_private vía PostgREST.
-- Auditoría: su rol de ejecución recibe INSERT/SELECT, nunca UPDATE/DELETE.
commit;
