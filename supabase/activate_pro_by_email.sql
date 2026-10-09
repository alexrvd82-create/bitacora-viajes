-- Activa Pro para el usuario cuyo email coincide (lo llama la función kofi-webhook).
-- Ejecutar una sola vez en Supabase > SQL Editor.
create or replace function public.activate_pro_by_email(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_id is null then
    return false;
  end if;

  update public.subscriptions set status = 'active' where user_id = v_id;
  if not found then
    insert into public.subscriptions (user_id, status) values (v_id, 'active');
  end if;

  return true;
end;
$$;

-- Solo la clave de servicio (la función) puede ejecutarla
revoke all on function public.activate_pro_by_email(text) from public, anon, authenticated;
grant execute on function public.activate_pro_by_email(text) to service_role;
