-- Nébula · 003 · Base común de perfiles, vinculaciones y seguimiento
-- ADITIVA: no elimina ni modifica registros existentes.
-- Revisar en un entorno de desarrollo antes de aplicar en SIA/producción.

begin;

create extension if not exists pgcrypto;

-- Datos complementarios específicos por tipo de cuenta.
create table if not exists public.autistic_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  communication_preferences text,
  interests text[] not null default '{}',
  strengths text[] not null default '{}',
  support_preferences text,
  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guardian_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  preferred_contact_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  professional_title text,
  institution_name text,
  institution_email text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una vinculación no concede acceso hasta que se verifica el consentimiento
-- de la persona adulta o la representación legal correspondiente.
create table if not exists public.profile_relationships (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references auth.users(id) on delete cascade,
  related_user_id uuid not null references auth.users(id) on delete cascade,
  relationship_type text not null
    check (relationship_type in ('parent', 'mother', 'father', 'legal_guardian', 'caregiver', 'teacher')),
  authority_basis text not null
    check (authority_basis in ('subject_consent', 'legal_representation')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'revoked')),
  access_scope text not null default 'full_followup'
    check (access_scope in ('full_followup')),
  consent_verified_at timestamptz,
  consent_verified_by uuid references auth.users(id) on delete set null,
  authority_verified_at timestamptz,
  authority_verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_relationship_not_self check (subject_user_id <> related_user_id),
  constraint profile_relationship_active_is_verified check (
    status <> 'active' or consent_verified_at is not null or authority_verified_at is not null
  ),
  constraint profile_relationship_unique unique (subject_user_id, related_user_id, relationship_type)
);

create index if not exists profile_relationships_subject_idx
  on public.profile_relationships(subject_user_id, status);
create index if not exists profile_relationships_related_idx
  on public.profile_relationships(related_user_id, status);

-- Registro cronológico de seguimiento. El autor siempre queda identificado.
create table if not exists public.followup_entries (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references auth.users(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  entry_type text not null
    check (entry_type in ('activity', 'achievement', 'observation', 'goal', 'wellbeing', 'report')),
  title text not null check (char_length(title) between 1 and 160),
  content text not null check (char_length(content) between 1 and 10000),
  occurred_at timestamptz not null default now(),
  visibility text not null default 'followup'
    check (visibility in ('followup')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists followup_entries_subject_date_idx
  on public.followup_entries(subject_user_id, occurred_at desc);
create index if not exists followup_entries_author_idx
  on public.followup_entries(author_user_id, created_at desc);

-- updated_at uniforme.
create or replace function public.nebula_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

 drop trigger if exists autistic_profiles_set_updated_at on public.autistic_profiles;
create trigger autistic_profiles_set_updated_at before update on public.autistic_profiles
for each row execute function public.nebula_set_updated_at();
drop trigger if exists guardian_profiles_set_updated_at on public.guardian_profiles;
create trigger guardian_profiles_set_updated_at before update on public.guardian_profiles
for each row execute function public.nebula_set_updated_at();
drop trigger if exists teacher_profiles_set_updated_at on public.teacher_profiles;
create trigger teacher_profiles_set_updated_at before update on public.teacher_profiles
for each row execute function public.nebula_set_updated_at();
drop trigger if exists profile_relationships_set_updated_at on public.profile_relationships;
create trigger profile_relationships_set_updated_at before update on public.profile_relationships
for each row execute function public.nebula_set_updated_at();
drop trigger if exists followup_entries_set_updated_at on public.followup_entries;
create trigger followup_entries_set_updated_at before update on public.followup_entries
for each row execute function public.nebula_set_updated_at();

-- RLS: todas las tablas nuevas quedan protegidas.
alter table public.autistic_profiles enable row level security;
alter table public.guardian_profiles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.profile_relationships enable row level security;
alter table public.followup_entries enable row level security;

-- Perfiles específicos: cada usuario gestiona exclusivamente su propio registro.
drop policy if exists autistic_profiles_select_self on public.autistic_profiles;
create policy autistic_profiles_select_self on public.autistic_profiles
for select to authenticated using (user_id = (select auth.uid()) or (select private.is_sia_admin()));
drop policy if exists autistic_profiles_insert_self on public.autistic_profiles;
create policy autistic_profiles_insert_self on public.autistic_profiles
for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists autistic_profiles_update_self on public.autistic_profiles;
create policy autistic_profiles_update_self on public.autistic_profiles
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists guardian_profiles_select_self on public.guardian_profiles;
create policy guardian_profiles_select_self on public.guardian_profiles
for select to authenticated using (user_id = (select auth.uid()) or (select private.is_sia_admin()));
drop policy if exists guardian_profiles_insert_self on public.guardian_profiles;
create policy guardian_profiles_insert_self on public.guardian_profiles
for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists guardian_profiles_update_self on public.guardian_profiles;
create policy guardian_profiles_update_self on public.guardian_profiles
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists teacher_profiles_select_self_or_admin on public.teacher_profiles;
create policy teacher_profiles_select_self_or_admin on public.teacher_profiles
for select to authenticated using (user_id = (select auth.uid()) or (select private.is_sia_admin()));
drop policy if exists teacher_profiles_insert_self on public.teacher_profiles;
create policy teacher_profiles_insert_self on public.teacher_profiles
for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists teacher_profiles_update_self on public.teacher_profiles;
create policy teacher_profiles_update_self on public.teacher_profiles
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Solicitudes: la parte relacionada puede crear una solicitud pendiente.
-- Solo la persona titular puede confirmar consentimiento; la verificación
-- de representación legal debe realizarla un administrador por backend.
drop policy if exists relationships_read_participants on public.profile_relationships;
create policy relationships_read_participants on public.profile_relationships
for select to authenticated using (
  subject_user_id = (select auth.uid())
  or related_user_id = (select auth.uid())
  or (select private.is_sia_admin())
);
drop policy if exists relationships_create_pending_related on public.profile_relationships;
create policy relationships_create_pending_related on public.profile_relationships
for insert to authenticated with check (
  related_user_id = (select auth.uid())
  and status = 'pending'
  and consent_verified_at is null
  and consent_verified_by is null
  and authority_verified_at is null
  and authority_verified_by is null
);
drop policy if exists relationships_subject_consent on public.profile_relationships;
create policy relationships_subject_consent on public.profile_relationships
for update to authenticated using (subject_user_id = (select auth.uid()))
with check (
  subject_user_id = (select auth.uid())
  and authority_basis = 'subject_consent'
  and (consent_verified_at is null or consent_verified_by = (select auth.uid()))
  and authority_verified_at is null
  and authority_verified_by is null
);

-- El titular consulta todo su seguimiento; un familiar vinculado activo y
-- verificado puede consultar el historial completo del titular.
drop policy if exists followup_read_subject_guardian_admin on public.followup_entries;
create policy followup_read_subject_guardian_admin on public.followup_entries
for select to authenticated using (
  subject_user_id = (select auth.uid())
  or (select private.is_sia_admin())
  or exists (
    select 1 from public.profile_relationships r
    where r.subject_user_id = followup_entries.subject_user_id
      and r.related_user_id = (select auth.uid())
      and r.status = 'active'
      and r.access_scope = 'full_followup'
      and (r.consent_verified_at is not null or r.authority_verified_at is not null)
      and r.relationship_type in ('parent', 'mother', 'father', 'legal_guardian')
  )
);

-- Por ahora, solo la persona titular crea o modifica su propio seguimiento.
-- La escritura docente se habilitará al implementar las autorizaciones educativas.
drop policy if exists followup_insert_subject_only on public.followup_entries;
create policy followup_insert_subject_only on public.followup_entries
for insert to authenticated with check (
  subject_user_id = (select auth.uid()) and author_user_id = (select auth.uid())
);
drop policy if exists followup_update_subject_only on public.followup_entries;
create policy followup_update_subject_only on public.followup_entries
for update to authenticated using (
  subject_user_id = (select auth.uid()) and author_user_id = (select auth.uid())
) with check (
  subject_user_id = (select auth.uid()) and author_user_id = (select auth.uid())
);
drop policy if exists followup_delete_subject_only on public.followup_entries;
create policy followup_delete_subject_only on public.followup_entries
for delete to authenticated using (
  subject_user_id = (select auth.uid()) and author_user_id = (select auth.uid())
);

-- Sin acceso anónimo a las tablas nuevas.
revoke all on public.autistic_profiles, public.guardian_profiles, public.teacher_profiles,
  public.profile_relationships, public.followup_entries from anon;
grant select, insert, update on public.autistic_profiles, public.guardian_profiles,
  public.teacher_profiles to authenticated;
grant select, insert on public.profile_relationships to authenticated;
revoke update on public.profile_relationships from authenticated;
grant update (status, consent_verified_at, consent_verified_by)
  on public.profile_relationships to authenticated;
grant select, insert, update, delete on public.followup_entries to authenticated;

commit;
