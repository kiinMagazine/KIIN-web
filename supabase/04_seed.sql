-- Crear primero el usuario desde Authentication; sustituir TU_CORREO_AQUI y ejecutar manualmente.
-- insert into public.admins(user_id,email) select id,email from auth.users where email='TU_CORREO_AQUI';
insert into public.posts(type,title,slug,excerpt,body_md,territory,pillar,status) values
('articulo','Ejemplo ficticio: escuchar una escena','ejemplo-escuchar-una-escena','Borrador ficticio para explorar el editor.','Contenido de demostración. Sustituir por una historia investigada antes de publicar.','musica','descubrir','draft'),
('publicacion','Ejemplo ficticio: una prenda y su memoria','ejemplo-prenda-memoria','Borrador ficticio para explorar el editor.','Contenido de demostración. No describe personas ni acontecimientos reales.','moda','documentar','draft') on conflict(slug) do nothing;
