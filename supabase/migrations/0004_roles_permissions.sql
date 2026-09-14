create table public.roles (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete restrict,
  code text not null,
  name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  is_system boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (studio_id, id)
);

create unique index roles_studio_code_unique_lower on public.roles (studio_id, lower(code));

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete restrict,
  permission_id uuid not null references public.permissions(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (role_id, permission_id)
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null,
  studio_membership_id uuid not null,
  role_id uuid not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED')),
  granted_by_user_account_id uuid references public.user_accounts(id) on delete restrict,
  granted_at timestamptz not null default timezone('utc', now()),
  revoked_by_user_account_id uuid references public.user_accounts(id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (studio_id, id),
  constraint user_roles_membership_tenant_fk foreign key (studio_id, studio_membership_id)
    references public.studio_memberships(studio_id, id) on delete restrict,
  constraint user_roles_role_tenant_fk foreign key (studio_id, role_id)
    references public.roles(studio_id, id) on delete restrict,
  constraint user_roles_revocation_consistency check (
    (status = 'ACTIVE' and revoked_at is null and revoked_by_user_account_id is null)
    or
    (status = 'REVOKED' and revoked_at is not null)
  )
);

create unique index user_roles_one_active_role_assignment
  on public.user_roles (studio_membership_id, role_id)
  where status = 'ACTIVE';
create index user_roles_membership_status_idx on public.user_roles (studio_membership_id, status);
create index role_permissions_permission_idx on public.role_permissions (permission_id, role_id);

create trigger roles_set_updated_at
before update on public.roles
for each row execute function app_private.set_updated_at();

create or replace function app_private.has_permission(target_studio_id uuid, permission_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_accounts ua
    join public.studio_memberships sm
      on sm.user_account_id = ua.id
     and sm.studio_id = target_studio_id
     and sm.status = 'ACTIVE'
    join public.user_roles ur
      on ur.studio_membership_id = sm.id
     and ur.studio_id = sm.studio_id
     and ur.status = 'ACTIVE'
    join public.roles r
      on r.id = ur.role_id
     and r.studio_id = ur.studio_id
     and r.status = 'ACTIVE'
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where ua.auth_user_id = auth.uid()
      and ua.status = 'ACTIVE'
      and p.code = permission_code
  );
$$;

revoke all on function app_private.has_permission(uuid, text) from public;
grant execute on function app_private.has_permission(uuid, text) to authenticated;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

create policy roles_select_member_studio
on public.roles
for select
to authenticated
using (app_private.is_active_studio_member(studio_id));

create policy permissions_select_authenticated
on public.permissions
for select
to authenticated
using (true);

create policy role_permissions_select_member_studio
on public.role_permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.roles r
    where r.id = role_permissions.role_id
      and app_private.is_active_studio_member(r.studio_id)
  )
);

create policy user_roles_select_self
on public.user_roles
for select
to authenticated
using (
  exists (
    select 1
    from public.studio_memberships sm
    where sm.id = user_roles.studio_membership_id
      and sm.user_account_id = app_private.current_user_account_id()
  )
);
