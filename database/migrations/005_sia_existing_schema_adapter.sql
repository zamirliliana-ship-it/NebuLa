-- Nébula: adaptación aditiva al esquema existente de SIA.
-- Aplicada en el proyecto SIA. No crea tablas paralelas ni altera filas existentes.
begin;
alter table public.relationships
  add column if not exists authority_basis text not null default 'subject_consent',
  add column if not exists relationship_label text,
  add column if not exists authority_verified_at timestamptz,
  add column if not exists authority_verified_by uuid references auth.users(id);
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.relationships'::regclass and conname='relationships_authority_basis_check') then
    alter table public.relationships add constraint relationships_authority_basis_check
      check (authority_basis in ('subject_consent','legal_representation'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.relationships'::regclass and conname='relationships_label_check') then
    alter table public.relationships add constraint relationships_label_check
      check (relationship_label is null or relationship_label in ('parent','mother','father','legal_guardian','caregiver'));
  end if;
end $$;
create index if not exists relationships_subject_status_created_idx
  on public.relationships(joven_id,status,created_at desc);
drop policy if exists observations_read_scoped on public.daily_observations;
create policy observations_read_scoped on public.daily_observations for select to authenticated
using (
  author_id = (select auth.uid())
  or (select private.is_sia_admin())
  or (select private.has_relationship_consent(joven_id,'observations'))
  or (visibility = 'authorized_team' and (select private.has_teacher_access(joven_id,'observations')))
);
commit;
