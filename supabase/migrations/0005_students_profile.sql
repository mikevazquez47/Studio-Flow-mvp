insert into public.permissions (code, description)
values
  ('students.read', 'Ver alumnas del estudio'),
  ('students.write', 'Crear y editar alumnas del estudio'),
  ('students.profile_fields.manage', 'Configurar campos del perfil de alumnas')
on conflict (code) do update set description = excluded.description;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null,
  person_id uuid not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  profile_status text not null default 'INCOMPLETE' check (profile_status in ('COMPLETE','INCOMPLETE')),
  joined_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (studio_id, id),
  unique (studio_id, person_id),
  constraint students_person_tenant_fk foreign key (studio_id, person_id)
    references public.persons(studio_id, id) on delete restrict,
  constraint students_archive_consistency check (
    (status = 'ARCHIVED' and archived_at is not null)
    or
    (status <> 'ARCHIVED' and archived_at is null)
  )
);

create index students_studio_status_idx on public.students (studio_id, status, joined_at desc);

create table public.student_profile_fields (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete restrict,
  key text not null,
  label text not null,
  field_type text not null check (field_type in ('SHORT_TEXT','LONG_TEXT','NUMBER','DATE','BOOLEAN','SINGLE_SELECT','MULTI_SELECT')),
  category text not null default 'OTHER' check (category in ('BASIC','CONTACT','PERSONAL','OPERATIONAL','SENSITIVE','OTHER')),
  storage_source text not null default 'CUSTOM_VALUE' check (storage_source in ('PERSON_FIRST_NAME','PERSON_LAST_NAME','PRIMARY_PHONE','PRIMARY_EMAIL','CUSTOM_VALUE')),
  is_system boolean not null default false,
  is_active boolean not null default true,
  is_required_for_profile boolean not null default false,
  blocks_booking_if_missing boolean not null default false,
  visible_to_student boolean not null default true,
  editable_by_student boolean not null default true,
  visible_to_instructor boolean not null default false,
  editable_by_reception boolean not null default true,
  visible_to_admin boolean not null default true,
  editable_by_admin boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (studio_id, id)
);

create unique index student_profile_fields_studio_key_unique_lower
  on public.student_profile_fields (studio_id, lower(key));
create index student_profile_fields_studio_active_order_idx
  on public.student_profile_fields (studio_id, is_active, display_order, label);

create table public.student_profile_field_options (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null,
  field_id uuid not null,
  value text not null,
  label text not null,
  display_order integer not null default 0,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (studio_id, id),
  unique (field_id, value),
  constraint profile_field_options_field_tenant_fk foreign key (studio_id, field_id)
    references public.student_profile_fields(studio_id, id) on delete restrict
);

create table public.student_profile_values (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null,
  student_id uuid not null,
  field_id uuid not null,
  value_text text,
  value_number numeric,
  value_date date,
  value_boolean boolean,
  value_json jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (studio_id, id),
  unique (student_id, field_id),
  constraint profile_values_student_tenant_fk foreign key (studio_id, student_id)
    references public.students(studio_id, id) on delete restrict,
  constraint profile_values_field_tenant_fk foreign key (studio_id, field_id)
    references public.student_profile_fields(studio_id, id) on delete restrict
);

create trigger students_set_updated_at
before update on public.students
for each row execute function app_private.set_updated_at();

create trigger student_profile_fields_set_updated_at
before update on public.student_profile_fields
for each row execute function app_private.set_updated_at();

create trigger student_profile_field_options_set_updated_at
before update on public.student_profile_field_options
for each row execute function app_private.set_updated_at();

create trigger student_profile_values_set_updated_at
before update on public.student_profile_values
for each row execute function app_private.set_updated_at();

create or replace function app_private.seed_studio_student_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_role_id uuid;
  admin_role_id uuid;
  reception_role_id uuid;
  instructor_role_id uuid;
  student_role_id uuid;
begin
  insert into public.roles (studio_id, code, name, is_system)
  values
    (new.id, 'OWNER', 'Propietario', true),
    (new.id, 'ADMIN', 'Administración', true),
    (new.id, 'RECEPTION', 'Recepción', true),
    (new.id, 'INSTRUCTOR', 'Instructor', true),
    (new.id, 'STUDENT', 'Alumna', true)
  on conflict do nothing;

  select id into owner_role_id from public.roles where studio_id = new.id and code = 'OWNER';
  select id into admin_role_id from public.roles where studio_id = new.id and code = 'ADMIN';
  select id into reception_role_id from public.roles where studio_id = new.id and code = 'RECEPTION';
  select id into instructor_role_id from public.roles where studio_id = new.id and code = 'INSTRUCTOR';
  select id into student_role_id from public.roles where studio_id = new.id and code = 'STUDENT';

  insert into public.role_permissions (role_id, permission_id)
  select role_id, p.id
  from unnest(array[owner_role_id, admin_role_id, reception_role_id]) role_id
  cross join public.permissions p
  where p.code in ('students.read','students.write')
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select role_id, p.id
  from unnest(array[owner_role_id, admin_role_id]) role_id
  cross join public.permissions p
  where p.code = 'students.profile_fields.manage'
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select instructor_role_id, p.id
  from public.permissions p
  where p.code = 'students.read'
  on conflict do nothing;

  insert into public.student_profile_fields (
    studio_id, key, label, field_type, category, storage_source, is_system,
    is_required_for_profile, blocks_booking_if_missing, visible_to_student,
    editable_by_student, visible_to_instructor, display_order
  )
  values
    (new.id, 'first_name', 'Nombre', 'SHORT_TEXT', 'BASIC', 'PERSON_FIRST_NAME', true, true, false, true, true, true, 10),
    (new.id, 'phone', 'Teléfono', 'SHORT_TEXT', 'CONTACT', 'PRIMARY_PHONE', true, true, false, true, false, false, 20)
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function app_private.seed_studio_student_defaults() from public;

create trigger studios_seed_student_defaults
after insert on public.studios
for each row execute function app_private.seed_studio_student_defaults();

alter table public.students enable row level security;
alter table public.student_profile_fields enable row level security;
alter table public.student_profile_field_options enable row level security;
alter table public.student_profile_values enable row level security;

revoke all on public.students from anon;
revoke all on public.student_profile_fields from anon;
revoke all on public.student_profile_field_options from anon;
revoke all on public.student_profile_values from anon;

grant select, insert, update on public.students to authenticated;
grant select on public.student_profile_fields to authenticated;
grant select on public.student_profile_field_options to authenticated;
grant select, insert, update on public.student_profile_values to authenticated;
grant insert, update on public.persons to authenticated;
grant insert, update on public.person_contacts to authenticated;

create policy students_select_authorized
on public.students
for select
to authenticated
using (app_private.has_permission(studio_id, 'students.read'));

create policy students_insert_authorized
on public.students
for insert
to authenticated
with check (app_private.has_permission(studio_id, 'students.write'));

create policy students_update_authorized
on public.students
for update
to authenticated
using (app_private.has_permission(studio_id, 'students.write'))
with check (app_private.has_permission(studio_id, 'students.write'));

create policy persons_insert_students_authorized
on public.persons
for insert
to authenticated
with check (app_private.has_permission(studio_id, 'students.write'));

create policy persons_update_students_authorized
on public.persons
for update
to authenticated
using (app_private.has_permission(studio_id, 'students.write'))
with check (app_private.has_permission(studio_id, 'students.write'));

create policy person_contacts_insert_students_authorized
on public.person_contacts
for insert
to authenticated
with check (app_private.has_permission(studio_id, 'students.write'));

create policy person_contacts_update_students_authorized
on public.person_contacts
for update
to authenticated
using (app_private.has_permission(studio_id, 'students.write'))
with check (app_private.has_permission(studio_id, 'students.write'));

create policy student_profile_fields_select_authorized
on public.student_profile_fields
for select
to authenticated
using (
  app_private.has_permission(studio_id, 'students.read')
  or app_private.has_permission(studio_id, 'students.profile_fields.manage')
);

create policy student_profile_field_options_select_authorized
on public.student_profile_field_options
for select
to authenticated
using (
  app_private.has_permission(studio_id, 'students.read')
  or app_private.has_permission(studio_id, 'students.profile_fields.manage')
);

create policy student_profile_values_select_authorized
on public.student_profile_values
for select
to authenticated
using (app_private.has_permission(studio_id, 'students.read'));

create policy student_profile_values_insert_authorized
on public.student_profile_values
for insert
to authenticated
with check (app_private.has_permission(studio_id, 'students.write'));

create policy student_profile_values_update_authorized
on public.student_profile_values
for update
to authenticated
using (app_private.has_permission(studio_id, 'students.write'))
with check (app_private.has_permission(studio_id, 'students.write'));

create or replace function public.create_student_quick(
  target_studio_id uuid,
  first_name_input text,
  last_name_input text,
  phone_input text,
  normalized_phone_input text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_person_id uuid;
  created_student_id uuid;
begin
  if nullif(trim(first_name_input), '') is null then
    raise exception 'FIRST_NAME_REQUIRED';
  end if;

  if nullif(trim(phone_input), '') is null or nullif(trim(normalized_phone_input), '') is null then
    raise exception 'PHONE_REQUIRED';
  end if;

  insert into public.persons (studio_id, first_name, last_name)
  values (target_studio_id, trim(first_name_input), nullif(trim(last_name_input), ''))
  returning id into created_person_id;

  insert into public.person_contacts (
    studio_id, person_id, type, value, normalized_value, is_primary
  )
  values (
    target_studio_id, created_person_id, 'PHONE', trim(phone_input), trim(normalized_phone_input), true
  );

  insert into public.students (studio_id, person_id, profile_status)
  values (target_studio_id, created_person_id, 'COMPLETE')
  returning id into created_student_id;

  return created_student_id;
end;
$$;

revoke all on function public.create_student_quick(uuid, text, text, text, text) from public;
grant execute on function public.create_student_quick(uuid, text, text, text, text) to authenticated;
