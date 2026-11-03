insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('kiin-media','kiin-media',true,5242880,array['image/webp','image/jpeg','image/png']) on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy kiin_storage_read on storage.objects for select to anon,authenticated using(bucket_id='kiin-media');
create policy kiin_storage_insert on storage.objects for insert to authenticated with check(bucket_id='kiin-media' and public.is_admin());
create policy kiin_storage_update on storage.objects for update to authenticated using(bucket_id='kiin-media' and public.is_admin()) with check(bucket_id='kiin-media' and public.is_admin());
create policy kiin_storage_delete on storage.objects for delete to authenticated using(bucket_id='kiin-media' and public.is_admin());
