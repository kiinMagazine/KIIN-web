-- 11: búsqueda de cuenta por correo, solo para el servidor (recuperación de contraseña, alta de admins).
-- La API de administración de Supabase no tiene búsqueda directa por correo; listar usuarios no escala.
begin;
create function public.auth_user_by_email(p_email text) returns table(id uuid,email_confirmed boolean)
language sql stable security definer set search_path=public,auth,pg_temp as $$
  select u.id,u.email_confirmed_at is not null from auth.users u where lower(u.email)=lower(trim(p_email)) limit 1;
$$;
revoke all on function public.auth_user_by_email(text) from public,anon,authenticated;
grant execute on function public.auth_user_by_email(text) to service_role;
commit;
