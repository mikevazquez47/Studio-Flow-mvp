drop policy if exists m3_06_definitions_select_owner_student on public.studio_custom_field_definitions;
create policy m3_06_definitions_select_owner_student
on public.studio_custom_field_definitions
for select
to authenticated
using (
  private.m3_can_read_audit(studio_id)
  or (
    status = 'active'
    and visible_to_student
    and private.m3_is_active_member(studio_id)
    and exists (
      select 1
      from public.people p
      where p.studio_id = studio_custom_field_definitions.studio_id
        and p.auth_user_id = (select auth.uid())
        and private.m3_can_read_person(
          studio_custom_field_definitions.studio_id,
          p.id,
          p.auth_user_id
        )
    )
  )
);

drop policy if exists m3_06_values_select_owner_student on public.studio_person_custom_values;
create policy m3_06_values_select_owner_student
on public.studio_person_custom_values
for select
to authenticated
using (
  private.m3_can_read_audit(studio_id)
  or (
    private.m3_is_active_member(studio_id)
    and exists (
      select 1
      from public.people p
      where p.studio_id = studio_person_custom_values.studio_id
        and p.id = studio_person_custom_values.person_id
        and p.auth_user_id = (select auth.uid())
        and private.m3_can_read_person(
          studio_person_custom_values.studio_id,
          p.id,
          p.auth_user_id
        )
    )
    and exists (
      select 1
      from public.studio_custom_field_definitions d
      where d.id = studio_person_custom_values.field_id
        and d.studio_id = studio_person_custom_values.studio_id
        and d.status = 'active'
        and d.visible_to_student
    )
  )
);
