insert into public.permissions (code, description)
values ('students.archive', 'Archivar y reactivar alumnas del estudio')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = 'students.archive'
where r.code in ('OWNER', 'ADMIN')
  and r.status = 'ACTIVE'
on conflict do nothing;

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
  where p.code in ('students.profile_fields.manage', 'students.archive')
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
