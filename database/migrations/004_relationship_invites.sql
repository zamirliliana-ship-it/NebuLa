-- Nébula · 004 · Invitaciones de vinculación por código temporal
-- Aditiva: no modifica ni elimina datos existentes. Aplicar primero en desarrollo.
begin;

create table if not exists public.relationship_invites (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists relationship_invites_subject_idx
  on public.relationship_invites(subject_user_id, created_at desc);
create index if not exists relationship_invites_expiry_idx
  on public.relationship_invites(expires_at) where consumed_at is null;

alter table public.relationship_invites enable row level security;
revoke all on public.relationship_invites from anon, authenticated;
-- El backend utiliza service_role después de validar JWT, rol y participante.

commit;
