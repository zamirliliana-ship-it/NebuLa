-- ============================================================
-- Nébula · 001 · Códigos OTP (verificación de correo y recuperación)
-- Ejecutar en Supabase > SQL Editor. Solo el backend (service_role) puede usar esto.
-- ============================================================

create table if not exists public.auth_otps (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  purpose      text not null check (purpose in ('verify_email', 'reset_password')),
  code_hash    text not null,                 -- HMAC del código; nunca el código en claro
  attempts     smallint not null default 0,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists auth_otps_lookup_idx
  on public.auth_otps (email, purpose, created_at desc);

-- RLS activo y SIN políticas: anon y authenticated no pueden leer ni escribir.
alter table public.auth_otps enable row level security;
revoke all on public.auth_otps from anon, authenticated;

-- ---------- Emitir código (cooldown + tope por hora, atómico) ----------
create or replace function public.issue_otp(
  p_email text, p_purpose text, p_code_hash text,
  p_ttl_seconds int, p_cooldown_seconds int, p_max_per_hour int
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_last  timestamptz;
  v_count int;
begin
  perform pg_advisory_xact_lock(hashtext(p_email || ':' || p_purpose));

  select max(created_at) into v_last
    from public.auth_otps where email = p_email and purpose = p_purpose;
  if v_last is not null and v_last > now() - make_interval(secs => p_cooldown_seconds) then
    return false;
  end if;

  select count(*) into v_count
    from public.auth_otps
   where email = p_email and purpose = p_purpose and created_at > now() - interval '1 hour';
  if v_count >= p_max_per_hour then
    return false;
  end if;

  -- Invalida códigos anteriores aún vigentes.
  update public.auth_otps set consumed_at = now()
   where email = p_email and purpose = p_purpose and consumed_at is null;

  insert into public.auth_otps (email, purpose, code_hash, expires_at)
  values (p_email, p_purpose, p_code_hash, now() + make_interval(secs => p_ttl_seconds));
  return true;
end $$;

-- ---------- Verificar código (atómico; máx. 5 intentos; un solo uso) ----------
create or replace function public.verify_otp(
  p_email text, p_purpose text, p_code_hash text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  r public.auth_otps%rowtype;
begin
  select * into r from public.auth_otps
   where email = p_email and purpose = p_purpose and consumed_at is null
   order by created_at desc limit 1
   for update;

  if not found then return 'invalid'; end if;

  if r.expires_at < now() then
    update public.auth_otps set consumed_at = now() where id = r.id;
    return 'invalid';
  end if;

  if r.attempts >= 5 then return 'invalid'; end if;   -- bloqueado

  if r.code_hash = p_code_hash then
    update public.auth_otps set consumed_at = now(), attempts = attempts + 1 where id = r.id;
    return 'ok';
  end if;

  update public.auth_otps set attempts = attempts + 1 where id = r.id;
  return 'invalid';
end $$;

-- ---------- Utilidades sobre auth.users (solo backend) ----------
create or replace function public.get_auth_user_by_email(p_email text)
returns table (id uuid, confirmed boolean)
language sql security definer set search_path = '' as $$
  select u.id, (u.email_confirmed_at is not null)
    from auth.users u
   where lower(u.email) = lower(p_email)
   limit 1;
$$;

create or replace function public.revoke_user_sessions(p_user_id uuid)
returns void
language sql security definer set search_path = '' as $$
  delete from auth.sessions where user_id = p_user_id;
$$;

-- Nadie salvo service_role puede ejecutar estas funciones.
revoke all on function public.issue_otp(text, text, text, int, int, int) from public, anon, authenticated;
revoke all on function public.verify_otp(text, text, text) from public, anon, authenticated;
revoke all on function public.get_auth_user_by_email(text) from public, anon, authenticated;
revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.issue_otp(text, text, text, int, int, int) to service_role;
grant execute on function public.verify_otp(text, text, text) to service_role;
grant execute on function public.get_auth_user_by_email(text) to service_role;
grant execute on function public.revoke_user_sessions(uuid) to service_role;

-- Limpieza opcional (requiere pg_cron):
-- select cron.schedule('purge-otps', '0 * * * *',
--   $$delete from public.auth_otps where created_at < now() - interval '1 day'$$);
