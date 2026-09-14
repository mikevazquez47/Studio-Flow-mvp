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
    join public.people p on p.id = cs.instructor_person_id and p.studio_id = cs.studio_id
    where cs.id = p_session_id
      and cs.studio_id = p_studio_id
      and p.auth_user_id = (select auth.uid())
      and p.status = 'active'
  );
$$;
revoke all on function private.m4_instructor_can_read_booking(uuid,uuid) from public;
grant execute on function private.m4_instructor_can_read_booking(uuid,uuid) to authenticated;

drop policy if exists class_bookings_select_staff_or_self on public.class_bookings;
create policy class_bookings_select_staff_or_self
on public.class_bookings for select to authenticated
using (
  (select private.m4_has_staff_role(studio_id, array['owner','manager','reception']::text[]))
  or (select private.m4_instructor_can_read_booking(studio_id, class_session_id))
  or (select private.m4_is_self_person(studio_id, person_id))
);

create or replace function private.m4_validate_schedule_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'class_sessions' then
    if not exists (select 1 from public.branches b where b.id = new.branch_id and b.studio_id = new.studio_id) then
      raise exception 'BRANCH_STUDIO_MISMATCH' using errcode='23514';
    end if;
    if new.discipline_id is not null and not exists (select 1 from public.disciplines d where d.id = new.discipline_id and d.studio_id = new.studio_id) then
      raise exception 'DISCIPLINE_STUDIO_MISMATCH' using errcode='23514';
    end if;
    if new.instructor_person_id is not null and not exists (select 1 from public.people p where p.id = new.instructor_person_id and p.studio_id = new.studio_id) then
      raise exception 'INSTRUCTOR_STUDIO_MISMATCH' using errcode='23514';
    end if;
  elsif tg_table_name = 'class_bookings' then
    if not exists (select 1 from public.class_sessions cs where cs.id = new.class_session_id and cs.studio_id = new.studio_id) then
      raise exception 'SESSION_STUDIO_MISMATCH' using errcode='23514';
    end if;
    if not exists (select 1 from public.people p where p.id = new.person_id and p.studio_id = new.studio_id) then
      raise exception 'PERSON_STUDIO_MISMATCH' using errcode='23514';
    end if;
    if new.package_assignment_id is not null and not exists (
      select 1 from public.m3_package_assignments pa
      where pa.id = new.package_assignment_id and pa.studio_id = new.studio_id and pa.person_id = new.person_id
    ) then
      raise exception 'PACKAGE_ASSIGNMENT_SCOPE_MISMATCH' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.m4_validate_schedule_scope() from public, anon, authenticated;

drop trigger if exists m4_validate_class_session_scope on public.class_sessions;
create trigger m4_validate_class_session_scope
before insert or update on public.class_sessions
for each row execute function private.m4_validate_schedule_scope();

drop trigger if exists m4_validate_class_booking_scope on public.class_bookings;
create trigger m4_validate_class_booking_scope
before insert or update on public.class_bookings
for each row execute function private.m4_validate_schedule_scope();

create or replace function private.m4_touch_updated_at()
returns trigger language plpgsql set search_path='' as $$ begin new.updated_at = now(); return new; end $$;
revoke all on function private.m4_touch_updated_at() from public, anon, authenticated;

create trigger m4_touch_disciplines before update on public.disciplines for each row execute function private.m4_touch_updated_at();
create trigger m4_touch_class_sessions before update on public.class_sessions for each row execute function private.m4_touch_updated_at();
create trigger m4_touch_class_bookings before update on public.class_bookings for each row execute function private.m4_touch_updated_at();
