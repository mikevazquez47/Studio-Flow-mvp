revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

alter function public.m3_guard_physical_history()
  set search_path = pg_catalog, public;

create index if not exists audit_events_actor_user_id_idx
  on public.audit_events(actor_user_id);

create index if not exists audit_events_studio_id_idx
  on public.audit_events(studio_id);

create index if not exists m3_command_receipts_actor_user_id_idx
  on public.m3_command_receipts(actor_user_id);

create index if not exists m3_command_receipts_audit_event_id_idx
  on public.m3_command_receipts(audit_event_id);

create index if not exists people_auth_user_id_idx
  on public.people(auth_user_id);

create index if not exists studio_member_branches_branch_studio_idx
  on public.studio_member_branches(branch_id, studio_id);

create index if not exists studio_member_branches_member_studio_idx
  on public.studio_member_branches(studio_member_id, studio_id);

create index if not exists studio_person_custom_values_field_id_idx
  on public.studio_person_custom_values(field_id);

create index if not exists studio_person_custom_values_person_id_idx
  on public.studio_person_custom_values(person_id);
