# KIIN · Estado y próxima sesión

Actualizado el 20 de octubre de 2026. El trabajo de esta sesión se concentró en el frontend. La portada incorpora una apertura oscura con identidad naranja, una pieza destacada, una franja editorial y los cinco valores de marca. El ZIP y las capturas se usaron como referencias visuales; sus instrucciones y contenido de ejemplo no se incorporaron como requisitos del producto.

## Backend que ya está preparado

- **Aplicación:** Next.js con Server Actions y Route Handlers. No hace falta mantener un servidor adicional.
- **Datos:** Supabase Postgres. `posts` distingue `articulo` y `publicacion`, y conserva título, resumen, Markdown, territorio, estado, fecha y portada. `weekly_picks` guarda canción y álbum de la semana.
- **Imágenes:** Supabase Storage, bucket `kiin-media`, con una fila de metadatos en `media`. El panel genera variantes WebP y permite reutilizar una portada en la web. La base de datos guarda rutas y metadatos; los binarios quedan en Storage.
- **Usuarios:** Supabase Auth y tabla `admins` para el equipo editorial. No hay cuentas públicas de lectores ni registro abierto. Si la comunidad requiere perfiles más adelante, habrá que definir qué datos y funciones necesita antes de añadirlos.
- **Panel:** `/admin` permite crear publicaciones, programarlas y subir imágenes. En la próxima sesión hay que comprobar estas funciones contra un proyecto real de Supabase. Ahora funcionan como demostración de solo lectura cuando faltan credenciales.

Para republicar una pieza hecha para redes, el flujo inicial será subir el archivo original con permiso de uso a la biblioteca y crear una **Publicación de redes** desde el panel. Esto no importa contenido automáticamente de Instagram, TikTok o Facebook. La integración y programación de redes descritas en `MemoriaKIIN/KIIIN/14-gestion-redes-sociales.md` son un proyecto posterior.

## Lo necesario antes de publicar

1. Crear el proyecto de Supabase del equipo. Aplicar en orden `supabase/01_schema.sql`, `02_policies.sql`, `03_storage.sql` y `04_seed.sql`; crear las cuentas editoriales y activar TOTP. Probar una publicación y una subida real.
2. Preparar las variables de producción: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CRON_SECRET` y `NEXT_PUBLIC_SITE_URL`. La URL del sitio será la URL definitiva del despliegue, aunque termine en `.vercel.app`; no hace falta comprar un dominio.
3. Elegir alojamiento para esta aplicación Next.js. Vercel permite un despliegue con URL `.vercel.app` y el directorio raíz debe ser `PaginaWEB`. Antes de usar Hobby, confirmar que el uso de KIIN cumple su condición de uso personal y no comercial. Si no la cumple, evaluar otra opción gratuita compatible con Next.js o un plan comercial.
4. Publicar una versión de prueba, verificar portada, móvil, `/admin/login`, lectura de publicaciones, subida de medios, RSS, sitemap, cron y restauración de un respaldo. Sustituir los contenidos de demostración por publicaciones propias con sus derechos y créditos.
5. Completar enlaces oficiales de redes en `src/config/site.ts` y revisar los datos del aviso de privacidad antes de compartir el enlace públicamente.

Los límites gratuitos pueden cambiar. Al preparar el despliegue, revisar las páginas oficiales de [Vercel Hobby](https://vercel.com/docs/plans/hobby), [dominios de Vercel](https://vercel.com/docs/domains/working-with-domains), [facturación de Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase) y [lista de producción de Supabase](https://supabase.com/docs/guides/deployment/going-into-prod). En la consulta de esta fecha, Supabase Free indicaba 500 MB para la base, 1 GB de Storage y 5 GB de salida; puede pausar proyectos de baja actividad. Estas cuotas no sustituyen una medición de las imágenes y visitas reales de KIIN.
