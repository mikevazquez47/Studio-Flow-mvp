insert into public.permissions (code, description)
values
  ('instructors.read', 'Ver instructores del estudio'),
  ('instructors.write', 'Crear y editar instructores del estudio')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('instructors.read', 'instructors.write')
where r.code in ('OWNER', 'ADMIN')
  and r.status = 'ACTIVE'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = 'instructors.read'
where r.code = 'RECEPTION'
  and r.status = 'ACTIVE'
on conflict do nothing;

create table public.instructors (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null,
  person_id uuid not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (studio_id, id),
  unique (studio_id, person_id),
  constraint instructors_person_tenant_fk foreign key (studio_id, person_id)
    references public.persons(studio_id, id) on delete restrict
);

create index instructors_studio_status_idx on public.instructors (studio_id, status);

create trigger instructors_set_updated_at
before update on public.instructors
for each row execute function app_private.set_updated_at();

alter table public.instructors enable row level security;

grant select, insert, update on public.instructors to authenticated;

create policy instructors_select_authorized
on public.instructors
for select
to authenticated
using (app_private.has_permission(studio_id, 'instructors.read'));

create policy instructors_insert_authorized
on public.instructors
for insert
to authenticated
with check (app_private.has_permission(studio_id, 'instructors.write'));

create policy instructors_update_authorized
on public.instructors
for update
to authenticated
using (app_private.has_permission(studio_id, 'instructors.write'))
with check (app_private.has_permission(studio_id, 'instructors.write'));

create policy persons_insert_instructors_authorized
on public.persons
for insert
to authenticated
with check (app_private.has_permission(studio_id, 'instructors.write'));

create policy persons_update_instructors_authorized
on public.persons
for update
to authenticated
using (app_private.has_permission(studio_id, 'instructors.write'))
with check (app_private.has_permission(studio_id, 'instructors.write'));

create policy person_contacts_insert_instructors_authorized
on public.person_contacts
for insert
to authenticated
with check (app_private.has_permission(studio_id, 'instructors.write'));

create policy person_contacts_update_instructors_authorized
on public.person_contacts
for update
to authenticated
using (app_private.has_permission(studio_id, 'instructors.write'))
with check (app_private.has_permission(studio_id, 'instructors.write'));

create or replace function public.create_instructor_quick(
  target_studio_id uuid,
  first_name_input text,
  last_name_input text,
  phone_input text,
  normalized_phone_input text,
  email_input text default null,
  normalized_email_input text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_person_id uuid;
  created_instructor_id uuid;
begin
  if not app_private.has_permission(target_studio_id, 'instructors.write') then
    raise exception 'PERMISSION_DENIED';
  end if;

  if nullif(btrim(first_name_input), '') is null then
    raise exception 'FIRST_NAME_REQUIRED';
  end if;

  insert into public.persons (studio_id, first_name, last_name)
  values (
    target_studio_id,
    btrim(first_name_input),
    nullif(btrim(last_name_input), '')
  )
  returning id into created_person_id;

  if nullif(btrim(phone_input), '') is not null then
    insert into public.person_contacts (
      studio_id, person_id, type, value, normalized_value, is_primary
    ) values (
      target_studio_id,
      created_person_id,
      'PHONE',
      btrim(phone_input),
      btrim(normalized_phone_input),
      true
    );
  end if;

  if nullif(btrim(email_input), '') is not null then
    insert into public.person_contacts (
      studio_id, person_id, type, value, normalized_value, is_primary
    ) values (
      target_studio_id,
      created_person_id,
      'EMAIL',
      lower(btrim(email_input)),
      lower(btrim(normalized_email_input)),
      true
    );
  end if;

  insert into public.instructors (studio_id, person_id)
  values (target_studio_id, created_person_id)
  returning id into created_instructor_id;

  return created_instructor_id;
end;
$$;

revoke all on function public.create_instructor_quick(uuid, text, text, text, text, text, text) from public;
grant execute on function public.create_instructor_quick(uuid, text, text, text, text, text, text) to authenticated;
