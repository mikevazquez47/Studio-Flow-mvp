drop policy if exists m3_package_assignments_owner_select on public.m3_package_assignments;
drop policy if exists m3_package_assignments_student_self_select on public.m3_package_assignments;
create policy m3_package_assignments_owner_or_student_select
on public.m3_package_assignments
for select
to authenticated
using (
  private.m3_is_owner(studio_id)
  or private.m3_can_student_read_assignment(studio_id, id, person_id)
);

drop policy if exists m3_package_enrollments_owner_select on public.m3_package_enrollments;
drop policy if exists m3_package_enrollments_student_self_select on public.m3_package_enrollments;
create policy m3_package_enrollments_owner_or_student_select
on public.m3_package_enrollments
for select
to authenticated
using (
  private.m3_is_owner(studio_id)
  or private.m3_can_student_read_enrollment(studio_id, id, person_id)
);

drop policy if exists m3_package_pauses_owner_select on public.m3_package_pauses;
drop policy if exists m3_package_pauses_student_self_select on public.m3_package_pauses;
create policy m3_package_pauses_owner_or_student_select
on public.m3_package_pauses
for select
to authenticated
using (
  private.m3_is_owner(studio_id)
  or private.m3_can_student_read_pause(studio_id, id, assignment_id)
);
