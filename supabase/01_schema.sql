begin;
create type public.post_type as enum ('articulo','publicacion');
create type public.territory as enum ('musica','moda','deportes','eventos','actualidad');
create type public.pillar as enum ('descubrir','entender','documentar','recomendar','vivir');
create type public.content_status as enum ('draft','published','archived');
create type public.pick_kind as enum ('cancion','album');
create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade,email text unique not null,created_at timestamptz not null default now());
create table public.media (
 id uuid primary key default gen_random_uuid(),path_base text not null unique,
 variants jsonb not null check(variants ?& array['sm','md','lg']),
 width int not null check(width>0),height int not null check(height>0),aspect text not null,
 alt text not null check(length(trim(alt)) between 1 and 500),credit text,bytes int not null check(bytes>0),
 created_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table public.posts (
 id uuid primary key default gen_random_uuid(),type public.post_type not null,title text not null check(length(trim(title)) between 1 and 120),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=100),
 excerpt text not null default '' check(length(excerpt)<=220),body_md text not null default '' check(length(body_md)<=20000),
 cover_media_id uuid references public.media(id) on delete restrict,territory public.territory not null,pillar public.pillar not null,
 status public.content_status not null default 'draft',published_at timestamptz,featured boolean not null default false,
 spotify_url text check(spotify_url is null or spotify_url ~ '^https://open\.spotify\.com/(track|album|playlist|artist)/[A-Za-z0-9]{22}$'),
 youtube_url text check(youtube_url is null or youtube_url ~ '^https://www\.youtube\.com/(watch\?v=[A-Za-z0-9_-]{11}|playlist\?list=[A-Za-z0-9_-]{10,100})$'),credit text,
 score_story smallint check(score_story between 1 and 5),score_impact smallint check(score_impact between 1 and 5),score_discovery smallint check(score_discovery between 1 and 5),score_affinity smallint check(score_affinity between 1 and 5),score_narrative smallint check(score_narrative between 1 and 5),
 search tsvector generated always as (to_tsvector('spanish'::regconfig,coalesce(title,'')||' '||coalesce(excerpt,'')||' '||coalesce(body_md,''))) stored,
 created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(status<>'published' or published_at is not null)
);
create table public.weekly_picks (
 id uuid primary key default gen_random_uuid(),kind public.pick_kind not null,slug text not null unique check(slug ~ '^(cancion|album)-[0-9]{4}-s[0-9]{2}$'),
 year smallint not null check(year between 2023 and 2100),iso_week smallint not null check(iso_week between 1 and 53),week_start date not null,
 title text not null check(length(trim(title)) between 1 and 120),artist text not null check(length(trim(artist)) between 1 and 120),cover_media_id uuid references public.media(id) on delete restrict,
 note_md text not null default '' check(length(note_md)<=20000),
 spotify_url text check(spotify_url is null or spotify_url ~ '^https://open\.spotify\.com/(track|album|playlist|artist)/[A-Za-z0-9]{22}$'),
 youtube_url text check(youtube_url is null or youtube_url ~ '^https://www\.youtube\.com/(watch\?v=[A-Za-z0-9_-]{11}|playlist\?list=[A-Za-z0-9_-]{10,100})$'),
 status public.content_status not null default 'draft',published_at timestamptz,
 search tsvector generated always as (to_tsvector('spanish'::regconfig,coalesce(title,'')||' '||coalesce(artist,'')||' '||coalesce(note_md,''))) stored,
 created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(kind,week_start),
 check(extract(isodow from week_start)=1 and extract(isoyear from week_start)=year and extract(week from week_start)=iso_week),
 check(status<>'published' or published_at is not null)
);
create index posts_publication on public.posts(status,published_at desc);
create index posts_territory on public.posts(territory);
create index posts_search on public.posts using gin(search);
create index picks_publication on public.weekly_picks(status,week_start desc);
create index picks_search on public.weekly_picks using gin(search);
create index posts_media on public.posts(cover_media_id);
create index picks_media on public.weekly_picks(cover_media_id);
create function public.touch_updated_at() returns trigger language plpgsql set search_path=public as $$begin new.updated_at=now();return new;end;$$;
create trigger posts_updated before update on public.posts for each row execute function public.touch_updated_at();
create trigger picks_updated before update on public.weekly_picks for each row execute function public.touch_updated_at();
commit;
