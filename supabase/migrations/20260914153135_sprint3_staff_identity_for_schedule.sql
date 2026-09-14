alter table public.studio_members add column if not exists display_name text;

update public.studio_members sm
set display_name = coalesce(
  nullif(btrim(u.raw_user_meta_data->>'full_name'),''),
  nullif(btrim(u.raw_user_meta_data->>'name'),''),
  nullif(btrim(split_part(coalesce(u.email,''),'@',1)),''),
  'Staff'
)
from auth.users u
where u.id=sm.user_id and (sm.display_name is null or btrim(sm.display_name)='');

alter table public.class_sessions add column if not exists instructor_member_id uuid references public.studio_members(id) on delete set null;
create index if not exists class_sessions_instructor_member_starts_idx on public.class_sessions(instructor_member_id, starts_at) where instructor_member_id is not null;

create or replace function private.m4_instructor_can_read_booking(p_studio_id uuid, p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_sessions cs
    join public.studio_members sm on sm.id=cs.instructor_member_id and sm.studio_id=cs.studio_id
    where cs.id=p_session_id
      and cs.studio_id=p_studio_id
      and sm.user_id=(select auth.uid())
      and sm.status='active'
  );
$$;
revoke all on function private.m4_instructor_can_read_booking(uuid,uuid) from public;
grant execute on function private.m4_instructor_can_read_booking(uuid,uuid) to authenticated;

create or replace function private.m4_validate_schedule_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'class_sessions' then
    if not exists (select 1 from public.branches b where b.id=new.branch_id and b.studio_id=new.studio_id) then
      raise exception 'BRANCH_STUDIO_MISMATCH' using errcode='23514';
    end if;
    if new.discipline_id is not null and not exists (select 1 from public.disciplines d where d.id=new.discipline_id and d.studio_id=new.studio_id) then
      raise exception 'DISCIPLINE_STUDIO_MISMATCH' using errcode='23514';
    end if;
    if new.instructor_person_id is not null and not exists (select 1 from public.people p where p.id=new.instructor_person_id and p.studio_id=new.studio_id) then
      raise exception 'INSTRUCTOR_PERSON_STUDIO_MISMATCH' using errcode='23514';
    end if;
    if new.instructor_member_id is not null and not exists (
      select 1 from public.studio_members sm
      where sm.id=new.instructor_member_id and sm.studio_id=new.studio_id and sm.status='active' and sm.role in ('owner','manager','instructor')
    ) then
      raise exception 'INSTRUCTOR_MEMBER_SCOPE_MISMATCH' using errcode='23514';
    end if;
  elsif tg_table_name = 'class_bookings' then
    if not exists (select 1 from public.class_sessions cs where cs.id=new.class_session_id and cs.studio_id=new.studio_id) then
      raise exception 'SESSION_STUDIO_MISMATCH' using errcode='23514';
    end if;
    if not exists (select 1 from public.people p where p.id=new.person_id and p.studio_id=new.studio_id) then
      raise exception 'PERSON_STUDIO_MISMATCH' using errcode='23514';
    end if;
    if new.package_assignment_id is not null and not exists (
      select 1 from public.m3_package_assignments pa where pa.id=new.package_assignment_id and pa.studio_id=new.studio_id and pa.person_id=new.person_id
    ) then
      raise exception 'PACKAGE_ASSIGNMENT_SCOPE_MISMATCH' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.m4_validate_schedule_scope() from public, anon, authenticated;
