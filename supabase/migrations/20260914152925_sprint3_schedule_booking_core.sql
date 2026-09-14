create table if not exists public.disciplines (
  id uuid primary key default extensions.gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studio_id, name)
);

create table if not exists public.class_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  discipline_id uuid references public.disciplines(id) on delete set null,
  instructor_person_id uuid references public.people(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_sessions_time_check check (ends_at > starts_at)
);

create table if not exists public.class_bookings (
  id uuid primary key default extensions.gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  class_session_id uuid not null references public.class_sessions(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete restrict,
  package_assignment_id uuid references public.m3_package_assignments(id) on delete set null,
  booking_status text not null default 'booked' check (booking_status in ('booked','waitlisted','cancelled')),
  attendance_status text not null default 'pending' check (attendance_status in ('pending','present','late','no_show')),
  waitlist_position integer check (waitlist_position is null or waitlist_position > 0),
  source text not null default 'admin' check (source in ('admin','student','walk_in','import')),
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz,
  checked_in_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_session_id, person_id),
  constraint class_bookings_cancelled_at_check check ((booking_status = 'cancelled' and cancelled_at is not null) or (booking_status <> 'cancelled'))
);

create index if not exists disciplines_studio_status_idx on public.disciplines(studio_id,status);
create index if not exists class_sessions_studio_starts_idx on public.class_sessions(studio_id, starts_at);
create index if not exists class_sessions_branch_starts_idx on public.class_sessions(branch_id, starts_at);
create index if not exists class_sessions_instructor_starts_idx on public.class_sessions(instructor_person_id, starts_at) where instructor_person_id is not null;
create index if not exists class_bookings_session_status_idx on public.class_bookings(class_session_id, booking_status);
create index if not exists class_bookings_person_status_idx on public.class_bookings(person_id, booking_status);
create index if not exists class_bookings_studio_session_idx on public.class_bookings(studio_id,class_session_id);

alter table public.disciplines enable row level security;
alter table public.class_sessions enable row level security;
alter table public.class_bookings enable row level security;

create or replace function private.m4_has_staff_role(p_studio_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.studio_members sm
    where sm.studio_id = p_studio_id
      and sm.user_id = (select auth.uid())
      and sm.status = 'active'
      and sm.role = any(p_roles)
  );
$$;

create or replace function private.m4_is_self_person(p_studio_id uuid, p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.people p
    where p.id = p_person_id
      and p.studio_id = p_studio_id
      and p.auth_user_id = (select auth.uid())
      and p.status = 'active'
  );
$$;

revoke all on function private.m4_has_staff_role(uuid,text[]) from public;
revoke all on function private.m4_is_self_person(uuid,uuid) from public;
grant execute on function private.m4_has_staff_role(uuid,text[]) to authenticated;
grant execute on function private.m4_is_self_person(uuid,uuid) to authenticated;

revoke all on public.disciplines, public.class_sessions, public.class_bookings from anon;
grant select on public.disciplines, public.class_sessions, public.class_bookings to authenticated;
grant insert, update, delete on public.disciplines, public.class_sessions, public.class_bookings to authenticated;

create policy disciplines_select_member
on public.disciplines for select to authenticated
using (private.m3_is_active_member(studio_id));

create policy disciplines_manage_staff
on public.disciplines for all to authenticated
using ((select private.m4_has_staff_role(studio_id, array['owner','manager']::text[])))
with check ((select private.m4_has_staff_role(studio_id, array['owner','manager']::text[])));

create policy class_sessions_select_member
on public.class_sessions for select to authenticated
using (private.m3_is_active_member(studio_id));

create policy class_sessions_manage_staff
on public.class_sessions for all to authenticated
using ((select private.m4_has_staff_role(studio_id, array['owner','manager','reception']::text[])))
with check ((select private.m4_has_staff_role(studio_id, array['owner','manager','reception']::text[])));

create policy class_bookings_select_staff_or_self
on public.class_bookings for select to authenticated
using (
  (select private.m4_has_staff_role(studio_id, array['owner','manager','reception','instructor']::text[]))
  or (select private.m4_is_self_person(studio_id, person_id))
);

create policy class_bookings_manage_staff
on public.class_bookings for all to authenticated
using ((select private.m4_has_staff_role(studio_id, array['owner','manager','reception']::text[])))
with check ((select private.m4_has_staff_role(studio_id, array['owner','manager','reception']::text[])));
