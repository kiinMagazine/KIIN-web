# KIIN · Página web

**Estado para retomar el lanzamiento:** [docs/proxima-sesion.md](docs/proxima-sesion.md) resume el backend preparado, el flujo de imágenes para publicaciones de redes y lo que falta para conectar Supabase y desplegar.

Sitio editorial en español de México con Next.js App Router, Supabase y una mesa editorial propia. La fuente de marca es [MemoriaKIIN](../MemoriaKIIN/KIIIN/README.md). Los textos del manifiesto, misión, visión, valores, storytelling y creencias se conservan literalmente en `src/content/brand.json`.

## Ejecutar y verificar

Para probar en esta laptop, abre PowerShell y ejecuta:

```powershell
cd C:\Users\cesar\KIIN\PaginaWEB
npm run dev
```

Abre http://localhost:3000. Mantén la terminal abierta; `Ctrl+C` detiene el servidor. Los cambios se recargan automáticamente. Si faltan las dependencias, ejecuta `npm install` primero. El servidor escucha solo en esta laptop. Si Turbopack falla al crear un proceso de estilos en Windows, usa `npm run dev -- --webpack`. Para la vista previa de esta revisión se utilizó `npm run dev -- --port 3001 --webpack`.

`.env.local` configura la URL local y deja Supabase vacío para usar los datos de demostración sin credenciales. `/admin` se puede explorar en solo lectura; guardar contenido, autenticar usuarios y subir medios requieren Supabase. Este archivo está excluido de Git y sus valores son únicamente para pruebas locales. Si usas otro puerto, ajusta `NEXT_PUBLIC_SITE_URL` y arranca con `npm run dev -- --port 3001`.

Usa Node 22 o posterior. Desde esta carpeta, en PowerShell o WSL:

```text
npm install
npm run lint
npm run typecheck
npm run test
npm run build
npm run security
```

Los comandos anteriores verifican el código y la compilación. `npm run dev` permite probar la interfaz en el navegador antes del despliegue. Las fuentes Anton, Newsreader e Inter se instalan con npm y se empaquetan con `next/font/local`; no se descargan fuentes durante la compilación. Para cambiar familias, modifica `src/app/layout.tsx`; los componentes usan sus variables CSS.

Sin ambas variables de Supabase se activa una demostración: cinco referencias musicales de Indie Rocks! consultadas el 6 de octubre de 2026, seis historias ficticias, una canción y un álbum ficticios, trece gráficas SVG locales y administración en solo lectura. Las referencias tienen resumen original, fuente enlazada, fecha y etiqueta visible de demostración; las imágenes son composiciones de muestra, no arte oficial. Las selecciones semanales siguen siendo ficticias. La portada se divide en Lo último (seis publicaciones por página), Música, Esta semana, Agenda y Cultura, con accesos a todos los territorios. Los ejemplos se mantienen en los datos locales y no se insertan en Supabase. No se sustituye un error de conexión a una base configurada con datos ficticios.

## Preparar Supabase

1. Crea un proyecto en tu cuenta de Supabase. Revisa las condiciones y cuotas vigentes del plan elegido antes de depender de él. No se ha creado ni desplegado ningún servicio en este encargo.
2. En SQL Editor ejecuta **una vez**, en este orden: `supabase/01_schema.sql`, `02_policies.sql`, `03_storage.sql`, `04_seed.sql`, `05_team.sql` (equipo, parrilla y notificaciones), `06_reviews.sql` (reseñas con estrellas KIIN), `07_readers.sql` (cuentas de lectores). Los dos borradores de ejemplo no dependen de archivos de Storage. En un proyecto existente revisa conflictos antes de aplicar las migraciones.
3. En Authentication deja habilitado el registro: los lectores crean su cuenta con correo y un código de 6 dígitos. El acceso a `/admin` lo limita la tabla `admins` (máximo 3). Configura SMTP y las plantillas con `{{ .Token }}` según [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md), que contiene la guía completa.
4. Crea el usuario del equipo desde el panel de Authentication y establece una contraseña segura. Sustituye `TU_CORREO_AQUI` en el ejemplo comentado del cuarto SQL y ejecútalo para añadir su `user_id` a `public.admins`. Esa lista no se modifica desde la API.
5. Guarda la URL del proyecto y la clave pública anónima en las variables de entorno de tu entorno de ejecución. La aplicación usa exclusivamente esa clave y la sesión del usuario. Nunca utiliza una clave administrativa privilegiada.
6. Entra a `/admin/login`. La cuenta debe existir en `admins`. En `/admin/cuenta`, pulsa **Preparar autenticador**, añade la clave TOTP a tu aplicación de autenticación e introduce un código para activarlo. Las siguientes sesiones requerirán el segundo factor; proxy y Server Actions comprueban el nivel de sesión cuando está configurado. El equipo debe completar este paso para cada administrador. La pertenencia y las escrituras también están protegidas por RLS. Para recuperaciones de TOTP, usa el panel de Supabase y verifica la identidad del titular; no hay recuperación pública en la web.
7. Revisa la configuración de límites de autenticación de Supabase. Opcionalmente añade una regla WAF de Vercel para limitar peticiones a `/admin/login`, según las capacidades de tu plan. Los mensajes de inicio de sesión no revelan si un correo está autorizado.

## Variables y despliegue posterior

`.env.example` contiene únicamente nombres y valores vacíos. `.env.local` contiene la configuración de prueba de esta laptop. Configura las variables de producción en Vercel cuando el equipo decida desplegar:

| Variable | Valor a aportar |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL HTTPS pública real, sin barra final |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto creado por el equipo |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anónima del proyecto |
| `CRON_SECRET` | Cadena aleatoria larga generada por el equipo |

No hay un dominio, correo ni redes inventadas. `src/config/site.ts` mantiene las redes vacías. Mientras no se configure la URL pública, se omiten los canonical y las URL absolutas de metadatos, el sitemap permanece vacío y RSS responde 503 con una indicación explícita. Al configurarla, los feeds y metadatos utilizan esa dirección.

Vercel debe usar `PaginaWEB` como directorio raíz. Antes de desplegar, revisa las condiciones actuales de uso: el documento recibido describe Hobby como **no comercial**; la ausencia de ingresos no prueba por sí sola que el proyecto sea elegible. No habilites patrocinios, publicidad, venta de entradas o merch sin confirmar el plan adecuado. La estrategia y las cifras históricas del encargo se conservan, sin validación comercial, en [11-decisiones-tecnicas-web.md](../MemoriaKIIN/11-decisiones-tecnicas-web.md). Cuando haya ingresos, evalúa el cambio a un plan comercial o proveedor compatible. No se activan planes de pago automáticamente.

El cron de `vercel.json` solicita `/api/cron/keepalive` una vez al día. Exige `Authorization: Bearer CRON_SECRET`; sin secreto o con cabecera incorrecta devuelve 401. Vercel puede añadir esa cabecera al configurar la variable. La ruta consulta un ID sin usar caché. Es una comprobación de actividad, no garantiza disponibilidad ni evita por contrato las pausas del proveedor.

## Publicar y mantener el archivo

- `/admin/posts`: crea, busca, filtra, edita, archiva y elimina publicaciones. El slug es editable y tiene restricción única en Postgres. Score KIIN y Filtro Editorial orientan sin bloquear. La vista previa usa el mismo renderizador Markdown sanitizado del sitio.
- Un contenido con estado Publicado y fecha futura permanece privado hasta esa fecha. La programación usa Ciudad de México; para fechas editoriales desde 2023 se convierte con UTC−6. La lectura pública aplica filtros explícitos y RLS, con caché etiquetada de 300 segundos. Guardar invalida etiquetas y rutas. Los listados con parámetros de búsqueda/paginación se renderizan en servidor y reutilizan esa caché de datos; las fichas admiten ISR. No se necesita un proceso permanente de publicación.
- `/admin/semana`: una canción y un álbum por lunes ISO. El formulario normaliza la fecha al lunes y genera `cancion-AAAA-sNN` o `album-AAAA-sNN`. Los cambios de año usan el año ISO. La portada de una selección debe ser 1:1; el servidor vuelve a comprobarlo.
- `/admin/media`: sube JPG, PNG o WebP de hasta 15 MB. Se generan variantes WebP de 480, 960 y 1600 px sin ampliar imágenes pequeñas, con calidad 0.82. Cada variante admite hasta 5 MB y se avisa al superar 800 KB. El recorte cuadrado es opcional. La sesión del administrador sube directamente a Storage; la Server Action comprueba rutas, existencia, tipo y tamaño antes de registrar. Las dimensiones se calculan en el navegador. Los archivos de la biblioteca son públicos, incluso si están asociados a borradores.
- El borrado de medios intenta primero eliminar la fila; las claves foráneas lo impiden si está en uso, incluso ante otra edición concurrente. Después elimina los binarios. Si falla Storage, informa de archivos huérfanos que deben limpiarse en su panel. No existe una transacción compartida entre Postgres y Storage.
- Las fotos y portadas reales deben contar con permiso de uso y crédito. Las referencias de actualidad mencionan artistas reales y enlazan su fuente; las demás historias y selecciones están identificadas como ficticias. No se aloja audio.

## Seguridad y privacidad

La protección incluye proxy, comprobación del usuario en servidor en cada escritura, políticas RLS y validación Zod. Los enlaces musicales solo admiten HTTPS y hosts exactos permitidos; los iframes se insertan bajo demanda. Markdown no acepta HTML ni carga imágenes externas. La única inserción de HTML es JSON-LD con `<` escapado.

La CSP limita recursos, conexiones y frames. Se permite `script-src 'self' 'unsafe-inline'` para el arranque de Next.js y JSON-LD en las respuestas de ISR. Un nonce por petición forzaría renderizado dinámico y no se puede reutilizar en páginas cacheadas. En producción no se utiliza `unsafe-eval`. En desarrollo se permite únicamente para la depuración de Next.js, junto con los WebSocket de localhost; HSTS y la actualización forzada a HTTPS se reservan para producción. Este compromiso reduce la protección frente a inyección inline y está registrado en la memoria; una política por hashes o nonce requiere una revisión futura de la estrategia de caché. Los estilos inline se permiten para estilos generados por React/Next. `/admin` envía `no-store` y `noindex`.

La página de privacidad es una base pendiente de datos del responsable y revisión legal; no se presenta como documento definitivo. No se activa analítica ni se recopilan registros de visitantes desde la aplicación. Los proveedores de infraestructura pueden tratar datos técnicos de conexión. Se guarda únicamente la preferencia de tema en el navegador y las cookies necesarias para la sesión administrativa.

## Respaldo semanal

```text
npm run backup
```

Ejecuta ese comando semanalmente desde un entorno seguro (manual o programador de tareas del equipo), proporcionando `NEXT_PUBLIC_SUPABASE_URL` y **`SUPABASE_SERVICE_ROLE_KEY` únicamente al proceso local**. Esta última no forma parte de `.env.example`, del frontend ni de la app. No la compartas ni la configures como `NEXT_PUBLIC_*`.

Se exportan todas las filas, paginadas, de `posts`, `weekly_picks`, `media` y `admins` a JSON dentro de `backups/<fecha>/`, más el inventario de rutas de Storage. La carpeta está excluida de Git. Este export no descarga binarios, usuarios de Auth ni el esquema; conserva también las imágenes originales y los SQL, y planifica una prueba de restauración. No hay una automatización externa activada. El script falla sin variables y no imprime secretos.

## Verificación y límites conocidos

Vitest prueba URLs maliciosas, fechas y semanas ISO, slugs y unicidad, Score, contraste, esquemas, datos demo, fidelidad de marca, sanitización, autenticación del cron y las cuatro migraciones SQL sobre PostgreSQL embebido (PGlite). Las pruebas de RLS ejercitan visitantes, usuario sin autorización, administrador, programación, unicidad, medios en uso y políticas de Storage.

No se han usado credenciales reales ni desplegado servicios: quedan por verificar sobre un proyecto del equipo la autenticación real, entrega de correo, TOTP, subida y borrado reales de Storage, cron de Vercel y restauración. La portada y las publicaciones se revisaron en navegador local, incluida una vista móvil de 390 px, navegación por secciones, paginación, filtro de música y búsqueda. No se ha medido LCP ni realizado una auditoría WCAG completa. El objetivo LCP <2.5 s y el comportamiento en dispositivos deben medirse antes de lanzar. Las pruebas de contraste no sustituyen una revisión de accesibilidad completa. Los secretos y decisiones pendientes están en [12-decisiones-y-pendientes.md](../MemoriaKIIN/12-decisiones-y-pendientes.md).


