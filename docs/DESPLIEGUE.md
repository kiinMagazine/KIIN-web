# KIIN · Guía de despliegue

Pasos para publicar la web con Supabase y Vercel. Nada de esto se ha ejecutado: requiere tus cuentas, tus claves y tus decisiones. Los límites y condiciones de los planes gratuitos cambian; confírmalos en las páginas oficiales antes de depender de ellos.

## 1. Supabase

1. Crea un proyecto (región cercana a México).
2. En **SQL Editor** ejecuta una sola vez, en orden: `supabase/01_schema.sql`, `02_policies.sql`, `03_storage.sql`, `04_seed.sql`, `05_team.sql`, `06_reviews.sql`, `07_readers.sql`.
3. **Authentication → Providers → Email**: activo, con **Confirm email** activado.
4. **Authentication → Sign In / Providers**: deja habilitado el registro de nuevos usuarios (los lectores crean su cuenta). El acceso a `/admin` no depende de eso: solo entra quien esté en la tabla `admins` (máximo 3) y, si activó TOTP, con su segundo factor.
5. **Authentication → Email Templates**: en **Confirm signup** y **Magic Link** incluye el código con `{{ .Token }}` (por ejemplo: «Tu código de KIIN es {{ .Token }}»). La web pide ese código de 6 dígitos para activar cuenta y para recuperar la contraseña. Sin esto los lectores no recibirán el PIN.
6. **Authentication → SMTP Settings**: configura un servicio SMTP propio. El correo integrado de Supabase tiene límites muy bajos y no sirve para un lanzamiento.
7. **Authentication → URL Configuration**: Site URL = la URL pública definitiva; añade la misma a Redirect URLs.
8. **Project Settings → API**: copia la URL, la clave `anon` y la clave `service_role`. La `service_role` es secreta: solo en el servidor.

## 2. Primer administrador

Desde `PaginaWEB`, en PowerShell (la clave de servicio solo vive en ese proceso; no la guardes en `.env.local`):

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL='https://TU-PROYECTO.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY='...'
node scripts/bootstrap-admin.mjs ras3ec@gmail.com "Tu nombre"
```

El script imprime una contraseña temporal aleatoria **una sola vez**. Al entrar en `/admin/login` el sistema te obliga a cambiarla. Después, desde **Equipo**, agrega a los otros dos administradores: la app genera su contraseña temporal y la muestra una vez. En **Cuenta** cada administrador debe activar la verificación en dos pasos (TOTP).

## 3. Vercel

1. Importa el repositorio con **Root Directory = `PaginaWEB`**.
2. Variables de entorno:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL HTTPS pública, sin barra final |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | clave `service_role` (nunca `NEXT_PUBLIC_*`) |
| `CRON_SECRET` | cadena aleatoria larga |

3. Vercel Hobby se describe como **no comercial**. Antes de publicar confirma que KIIN cumple esa condición; con patrocinios, ventas o publicidad habrá que cambiar de plan o de proveedor.
4. El cron de `vercel.json` (keepalive) corre una vez al día. Los avisos de Instagram se generan cuando un administrador abre el panel; para que salgan a la hora exacta con el panel cerrado hace falta un programador (siguiente etapa, con la integración de Meta).

## 4. Contenido e imágenes

- Logos: coloca los archivos en `public/brand/` y escribe sus rutas en `brandAssets` de `src/config/site.ts` (logo, isotipo, isologo y `loaderVideo`).
- Portadas: súbelas desde **Biblioteca** en el panel (Storage de Supabase). Las de `public/covers/` son solo para desarrollo local.
- Sustituye el contenido demo por piezas propias con derechos y créditos.

## 5. Comprobación tras desplegar

- [ ] `/admin/login` con la contraseña temporal fuerza el cambio y luego entra.
- [ ] Un segundo navegador con la misma cuenta cierra la sesión anterior (sesión única).
- [ ] Crear una publicación, programarla en **Parrilla** y verla en la portada a la hora indicada.
- [ ] Crear una reseña, votar con los 3 administradores, publicar y ver las estrellas.
- [ ] Registrar un lector: llega el código, activa la cuenta, guarda una publicación y la ve en **Cuenta**.
- [ ] Recuperar contraseña con el código por correo.
- [ ] La sesión se cierra tras un periodo de inactividad (30 min en el panel, 60 min lectores) y no mientras hay actividad.
- [ ] `/rss.xml` y `/sitemap.xml` responden con la URL real; `/admin` y `/cuenta` no se indexan.
- [ ] `npm run backup` genera el respaldo; planifica una restauración de prueba.
- [ ] Revisión legal de privacidad, términos, cookies y derechos; medir LCP móvil y hacer una auditoría de accesibilidad.
