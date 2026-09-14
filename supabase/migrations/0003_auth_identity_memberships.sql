create table public.user_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','DISABLED','LOCKED')),
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.persons (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete restrict,
  first_name text not null,
  last_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (studio_id, id)
);

create index persons_studio_name_idx on public.persons (studio_id, lower(first_name), lower(coalesce(last_name, '')));

create table public.person_contacts (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null,
  person_id uuid not null,
  type text not null check (type in ('PHONE','EMAIL')),
  value text not null,
  normalized_value text not null,
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (studio_id, id),
  constraint person_contacts_person_tenant_fk foreign key (studio_id, person_id)
    references public.persons(studio_id, id) on delete restrict
);

create index person_contacts_studio_normalized_idx on public.person_contacts (studio_id, type, normalized_value);
create unique index person_contacts_one_primary_per_type
  on public.person_contacts (studio_id, person_id, type)
  where is_primary;

create table public.studio_memberships (
  id uuid primary key default gen_random_uuid(),
  user_account_id uuid not null references public.user_accounts(id) on delete restrict,
  studio_id uuid not null references public.studios(id) on delete restrict,
  person_id uuid not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (studio_id, id),
  unique (user_account_id, studio_id),
  constraint studio_memberships_person_tenant_fk foreign key (studio_id, person_id)
    references public.persons(studio_id, id) on delete restrict
);

create index studio_memberships_studio_status_idx on public.studio_memberships (studio_id, status);
create index studio_memberships_account_status_idx on public.studio_memberships (user_account_id, status);

create trigger user_accounts_set_updated_at
before update on public.user_accounts
for each row execute function app_private.set_updated_at();

create trigger persons_set_updated_at
before update on public.persons
for each row execute function app_private.set_updated_at();

create trigger person_contacts_set_updated_at
before update on public.person_contacts
for each row execute function app_private.set_updated_at();

create trigger studio_memberships_set_updated_at
before update on public.studio_memberships
for each row execute function app_private.set_updated_at();

create or replace function app_private.current_user_account_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select ua.id
  from public.user_accounts ua
  where ua.auth_user_id = auth.uid()
    and ua.status = 'ACTIVE'
  limit 1;
$$;

create or replace function app_private.is_active_studio_member(target_studio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.studio_memberships sm
    join public.user_accounts ua on ua.id = sm.user_account_id
    where sm.studio_id = target_studio_id
      and sm.status = 'ACTIVE'
      and ua.status = 'ACTIVE'
      and ua.auth_user_id = auth.uid()
  );
$$;

revoke all on function app_private.current_user_account_id() from public;
revoke all on function app_private.is_active_studio_member(uuid) from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.current_user_account_id() to authenticated;
grant execute on function app_private.is_active_studio_member(uuid) to authenticated;

alter table public.user_accounts enable row level security;
alter table public.persons enable row level security;
alter table public.person_contacts enable row level security;
alter table public.studio_memberships enable row level security;

create policy user_accounts_select_self
on public.user_accounts
for select
to authenticated
using (auth_user_id = auth.uid());

create policy studio_memberships_select_self
on public.studio_memberships
for select
to authenticated
using (user_account_id = app_private.current_user_account_id());

create policy persons_select_member_studio
on public.persons
for select
to authenticated
using (app_private.is_active_studio_member(studio_id));

create policy person_contacts_select_member_studio
on public.person_contacts
for select
to authenticated
using (app_private.is_active_studio_member(studio_id));

create policy studios_select_member
on public.studios
for select
to authenticated
using (app_private.is_active_studio_member(id));

create policy sites_select_member
on public.sites
for select
to authenticated
using (app_private.is_active_studio_member(studio_id));

create policy spaces_select_member
on public.spaces
for select
to authenticated
using (app_private.is_active_studio_member(studio_id));
