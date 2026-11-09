-- 12: regla de publicación de reseñas = UNANIMIDAD DE LOS ADMINS ACTIVOS (decisión del dueño, 2026-11-08).
-- "Activo" = fila vigente en public.admins (máximo 4). Antes el estado solo se recalculaba al cambiar un voto;
-- ahora también cuando entra o sale un administrador:
--   * baja de un admin: las reseñas en votación que ya tienen la autorización de todos los restantes pasan a 'approved';
--   * alta de un admin: las reseñas aprobadas y aún NO publicadas vuelven a 'voting' (falta su voto).
--     Las ya publicadas no se tocan (se publicaron con la unanimidad vigente en su momento).
-- Solo funciones y triggers: sin cambios de tablas, sin bloqueos largos. Idempotente (create or replace / drop if exists).
-- Reversión: drop trigger admins_review_quorum on public.admins; drop function public.admins_review_quorum();
--            y volver a crear review_votes_recompute con el cuerpo de 09_publications.sql (equivalente en comportamiento).
begin;

-- Una sola definición de la regla: aprobada cuando todos los admins activos autorizaron.
create or replace function public.review_quorum_state(pid uuid) returns text language sql stable security definer set search_path=public,pg_temp as $$
  select case when t.total>0 and t.ok>=t.total then 'approved' else 'voting' end
  from (select (select count(*) from public.admins) total,
               (select count(*) from public.review_votes v join public.admins a on a.user_id=v.admin_id where v.post_id=pid and v.approved) ok) t;
$$;
revoke all on function public.review_quorum_state(uuid) from public,anon,authenticated;

-- Tras cada voto (igual que en 09, ahora usando la regla compartida).
create or replace function public.review_votes_recompute() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare pid uuid:=coalesce(new.post_id,old.post_id);next_state text;changed int;
begin
  next_state:=public.review_quorum_state(pid);
  update public.post_reviews set state=next_state,stars=case when next_state='approved' then stars end
    where post_id=pid and state in ('voting','approved') and state<>next_state;
  get diagnostics changed=row_count;
  -- Solo si realmente pasó de aprobada a votación (no cuando el reinicio ya la dejó en votación).
  if changed>0 and next_state='voting' then update public.posts set status='draft',published_at=null where id=pid and status='published'; end if;
  return null;
end;$$;

-- Alta o baja de administradores: recalcula las reseñas pendientes de publicar.
create or replace function public.admins_review_quorum() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare r record;next_state text;
begin
  for r in select pr.post_id from public.post_reviews pr join public.posts p on p.id=pr.post_id
           where pr.state in ('voting','approved') and p.status<>'published' loop
    next_state:=public.review_quorum_state(r.post_id);
    update public.post_reviews set state=next_state,stars=case when next_state='approved' then stars end
      where post_id=r.post_id and state<>next_state;
  end loop;
  return null;
end;$$;
revoke all on function public.admins_review_quorum() from public,anon,authenticated;

drop trigger if exists admins_review_quorum on public.admins;
create trigger admins_review_quorum after insert or delete on public.admins for each statement execute function public.admins_review_quorum();

commit;
