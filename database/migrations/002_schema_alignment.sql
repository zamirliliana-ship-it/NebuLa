-- Nébula - Fase 2: alineación del esquema y protección de roles
-- Proyecto objetivo: SIA
-- Migración aditiva/segura: no elimina tablas ni registros.

begin;

-- 1) La visibilidad acordada para perfiles de comunidad es 'community'.
--    Conservamos 'private' como valor predeterminado para proteger la privacidad.
alter table public.profiles
  drop constraint if exists profiles_visibility_check;

update public.profiles
   set visibility = 'community'
 where visibility = 'public';

alter table public.profiles
  add constraint profiles_visibility_check
  check (visibility = any (array['community'::text, 'private'::text]));

alter table public.profiles
  alter column visibility set default 'private';

-- 2) La tarjeta de perfil solo es visible en la comunidad si el titular
--    ha elegido explícitamente la visibilidad 'community'.
drop policy if exists public_profile_cards_read_opted_in
  on public.public_profile_cards;

create policy public_profile_cards_read_opted_in
  on public.public_profile_cards
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_sia_admin())
    or exists (
      select 1
        from public.profiles p
       where p.id = public_profile_cards.user_id
         and p.visibility = 'community'
    )
  );

-- 3) Impide que un usuario se cambie su propio rol mediante UPDATE directo.
--    Solo el propietario registrado en private.platform_control puede cambiarlo.
create or replace function private.sia_prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.role is distinct from old.role
     and not (select private.is_sia_owner()) then
    raise exception 'role_change_not_authorized'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

drop trigger if exists profiles_prevent_role_change
  on public.profiles;

create trigger profiles_prevent_role_change
before update of role on public.profiles
for each row
execute function private.sia_prevent_profile_role_change();

commit;
