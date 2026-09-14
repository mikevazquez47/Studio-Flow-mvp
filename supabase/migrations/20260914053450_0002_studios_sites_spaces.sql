create table public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  phone text,
  email text,
  timezone text not null,
  currency char(3) not null,
  language text not null,
  logo_path text,
  primary_color text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index studios_slug_unique_lower on public.studios (lower(slug));
create unique index studios_studio_id_unique on public.studios (id, id);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete restrict,
  name text not null,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country_code char(2),
  timezone_override text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (studio_id, id)
);

create index sites_studio_status_idx on public.sites (studio_id, status);

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null,
  site_id uuid not null,
  name text not null,
  default_capacity integer not null check (default_capacity > 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (studio_id, id),
  constraint spaces_site_tenant_fk foreign key (studio_id, site_id)
    references public.sites(studio_id, id) on delete restrict
);

create index spaces_studio_site_status_idx on public.spaces (studio_id, site_id, status);

create trigger studios_set_updated_at
before update on public.studios
for each row execute function app_private.set_updated_at();

create trigger sites_set_updated_at
before update on public.sites
for each row execute function app_private.set_updated_at();

create trigger spaces_set_updated_at
before update on public.spaces
for each row execute function app_private.set_updated_at();

alter table public.studios enable row level security;
alter table public.sites enable row level security;
alter table public.spaces enable row level security;
