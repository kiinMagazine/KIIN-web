# KIIN · Diseño de integración de Gestión de Redes Sociales

Fecha: 2026-10-05. Estado: propuesta técnica y código de referencia. No se ha conectado ninguna cuenta, ejecutado migraciones en Supabase, instalado Angular/NestJS/Redis ni publicado contenido.

## 1. Base de datos primero

El [SQL de referencia](reference-schema.sql) amplía PostgreSQL/Supabase sin sustituir `posts`, `media`, `weekly_picks` o `admins`. La lista blanca existente usa `public.admins.user_id → auth.users.id`; no crear otro sistema de usuarios ni almacenar los tokens sociales en los usuarios administradores.

| Tabla | Responsabilidad |
|---|---|
| `social_accounts` | Cuenta oficial KIIN, plataforma, ID externo, modo de publicación, capacidades y conexión. |
| `kiin_private.social_credentials` | Credenciales cifradas, scopes, expiraciones, versión y lease de renovación. |
| `social_posts` | Pieza editorial, caption base, fecha/zona, autor, editor, programador y versión. |
| `social_assets` | Objeto privado, metadatos verificados por servidor y resultado de validación. |
| `social_post_assets` | Biblioteca de medios de la pieza, con orden para carruseles/Photo Mode. |
| `social_deliveries` | Una entrega por pieza + cuenta + formato; estado, snapshot, etapa e IDs remotos. |
| `social_delivery_assets` | Archivos/variantes congelados para cada revisión de una entrega. |
| `kiin_private.social_outbox` | Trabajo durable entre PostgreSQL y Redis. |
| `kiin_private.social_attempts` | Intención de una llamada externa y resultado conocido/desconocido. |
| `social_audit_events` | Registro append-only: quién creó, editó, programó, canceló o reintentó. |
| `social_notifications` | Avisos persistentes para cada administrador; SSE solo transporta actualizaciones. |
| `kiin_private.social_webhook_receipts` | Recepción durable y deduplicada de webhooks verificados. |

**Reglas del modelo:**

- La pieza central puede adaptarse por destino con `caption_override`, variantes y `provider_options`; coherente con «historia central → múltiples adaptaciones naturales» de la memoria.
- La publicación del artículo web y el envío a una red son acciones distintas. `editorial_post_id` es opcional; no activar una publicación web al completar una entrega social.
- Guardar instantes como `timestamptz`; conservar `America/Mexico_City` para edición/presentación. Enviar ISO 8601 con offset desde el cliente, nunca interpretar un `datetime-local` como la zona del servidor.
- El servidor toma `created_by`, `updated_by`, `scheduled_by` y `requested_by` del usuario verificado. Rechazar esos campos si llegan en el DTO. La identidad del worker es «Sistema»; conservar el administrador que solicitó la operación.
- Los FK de auditoría apuntan a Auth con `ON DELETE SET NULL`, y el nombre queda como snapshot. Quitar un admin de la lista blanca no borra su historial.
- `version` del post protege ediciones concurrentes: `UPDATE ... WHERE version = $expectedVersion`; devolver 409 si otro admin ya editó.
- `revision` de entrega invalida trabajos anteriores al reprogramar. `workflow_seq` cambia al avanzar etapa, planificar polling o reintentar.
- Antes de cada efecto remoto, comprobar revisión, consentimiento, assets válidos, cuenta conectada, ventana temporal y lease.
- No editar archivos ya congelados: generar nuevos object keys. No borrar archivos con referencias a entregas activas.
- El estado agregado de la pieza se calcula desde las entregas. «Parcial» indica que una red publicó y otra falló; no usar un único booleano `published`.

Flujo orientativo para Meta:

```text
draft → scheduled → queued → uploading → processing → ready → publishing → published
                          ↘ retry_wait / auth_required / failed / reconciling
```

TikTok Direct Post, si está habilitado por una integración permitida, pasa de procesamiento a publicado automáticamente. No imponerle una etapa artificial de publicación final. El destino manual usa `manual_required` y requiere confirmación explícita, marcada como manual en auditoría.

## 2. Compatibilidad con la arquitectura observada

El proyecto local contiene Next.js App Router + React + Supabase, con panel en `src/app/admin/(panel)`, `authorizedClient()` en `src/lib/admin.ts`, lista blanca `admins` y TOTP. No contiene un panel Angular ni una API NestJS.

Integración recomendada para este checkout:

1. Conservar web, panel, Auth, RLS y biblioteca editorial actuales.
2. Añadir `/admin/redes` y componentes React en el panel existente; su lógica consume el contrato HTTP de este documento.
3. Crear un servicio NestJS adicional solo para redes, junto a un proceso worker persistente y Redis. No mover la web editorial al nuevo servicio.
4. Usar un Route Handler de Next.js como BFF: `authorizedClient()` comprueba sesión y MFA, reenvía la sesión al API social. NestJS verifica el token y la pertenencia a `admins` de nuevo; una cabecera `x-admin-id` no autoriza acciones.
5. Revisar revocación de sesión y MFA con Supabase en servidor; comprobar identidad con Auth y estado de factores, además de la firma/issuer/audience/expiración. No asumir que un JWT firmado prueba por sí solo que el usuario sigue autorizado.
6. API y worker usan roles PostgreSQL dedicados y permisos mínimos para las tablas sociales. El esquema privado queda fuera de los esquemas expuestos por PostgREST. La app web actual sigue sin usar `service_role`.
7. Crear bucket privado `kiin-social-private` con políticas propias; no ampliar el bucket editorial público, que admite imágenes y expone medios de borradores.
8. Activar la navegación mediante feature flag después de comprobar el flujo. Mantener modo demo en solo lectura.

Si existe otro panel Angular/NestJS fuera de este checkout, integrar los módulos siguientes directamente en ese panel. No incrustar Angular en Next.js ni sustituir el panel por esta propuesta.

El requisito histórico de servicios gratuitos sigue vigente. Un worker BullMQ persistente, Redis y videos requieren evaluar disponibilidad, almacenamiento y egress; este diseño no garantiza operación gratuita. No ejecutar un worker permanente dentro de un Route Handler de Vercel. El keepalive existente no es un scheduler social ni un proceso de publicación.

## 3. NestJS: módulos, controladores y servicios

```text
src/social/
  social-api.module.ts
  social-worker.module.ts
  posts/
    social-posts.controller.ts
    social-posts.service.ts
    social-repository.ts
    dto/create-post.dto.ts
    dto/schedule-post.dto.ts
  accounts/
    social-accounts.controller.ts
    social-accounts.service.ts
    social-oauth.service.ts
    token-vault.service.ts
    token-refresh.service.ts
  media/
    social-media.controller.ts
    social-media.service.ts
    media-validation.processor.ts
    storage-stream.service.ts
  providers/
    social-provider.interface.ts
    provider-registry.ts
    instagram.provider.ts
    facebook.provider.ts
    tiktok.provider.ts
    approved-provider.adapter.ts
    manual.provider.ts
  scheduling/
    due-posts.scheduler.ts
    outbox-dispatcher.service.ts
    social-publish.processor.ts
    recovery.service.ts
  webhooks/
    social-webhooks.controller.ts
    webhook-verifier.service.ts
    webhook-processor.ts
  audit/social-audit.service.ts
  notifications/social-notifications.controller.ts
  notifications/social-notifications.service.ts
```

`SocialApiModule` importa Auth/Database existentes y los productores de colas. Exporta servicios HTTP. `SocialWorkerModule` registra consumidores, scanner, dispatcher y recuperación; se inicia en un proceso Nest separado con `NestFactory.createApplicationContext()`. Evita que cada réplica web inicie consumidores inadvertidamente.

Dependencias en el servicio NestJS, según las versiones del proyecto destino: `@nestjs/bullmq`, `bullmq`, `@nestjs/schedule`, `@nestjs/config` y el driver PostgreSQL existente. Para ejemplo de abajo se presupone `pg`; no añadir otro ORM si el backend ya tiene uno. BullMQ necesita Redis y Nest integra productores/consumidores mediante `@nestjs/bullmq`. [Documentación oficial](https://docs.nestjs.com/techniques/queues).

```ts
// Ejemplo: registro del worker. Configurar Redis con secretos del entorno.
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: Number(config.getOrThrow<string>('REDIS_PORT')),
          password: config.get<string>('REDIS_PASSWORD'),
          tls: config.get<boolean>('REDIS_TLS') ? {} : undefined,
        },
      }),
    }),
    BullModule.registerQueue({ name: 'kiin-social' }),
    SocialProvidersModule,
  ],
  providers: [
    DuePostsScheduler, OutboxDispatcher, SocialPublishProcessor, RecoveryService,
  ],
})
export class SocialWorkerModule {}
```

Estos fragmentos son referencias: `DatabaseModule`, `DbService`, repositorios y adaptadores representan contratos por implementar sobre el stack destino. No son un backend listo para desplegar ni se han compilado como NestJS.

Contrato mínimo:

| Método/ruta | Acción |
|---|---|
| `GET /admin/social/calendar?from=&to=&timezone=` | Rango visible, entregas, estados y nombres auditados. |
| `POST /admin/social/posts` | Guardar borrador. |
| `PATCH /admin/social/posts/:id` | Editar con versión esperada. |
| `POST /admin/social/posts/:id/schedule` | Validar y congelar snapshot, registrar actor, programar. |
| `POST /admin/social/posts/:id/publish-now` | Mismo flujo con vencimiento inmediato; devolver 202 + IDs. |
| `POST /admin/social/deliveries/:id/cancel` | Invalidar trabajos aún cancelables; informar si la red ya aceptó el envío. |
| `POST /admin/social/deliveries/:id/retry` | Reintentar únicamente esa entrega después de reconciliar. |
| `POST /admin/social/deliveries/:id/confirm-manual` | Registrar URL/ID y confirmación humana; no presentarlo como verificación API. |
| `GET /admin/social/posts/:id/audit` | Historial paginado. |
| `POST /admin/social/media/upload-session` | Autorizar upload privado limitado. |
| `POST /admin/social/media/:id/complete` | Verificar objeto y encolar validación. |
| `GET /admin/social/accounts` | Estado/scopes/capacidades; nunca tokens. |
| `POST /admin/social/accounts/:id/connect` | Iniciar OAuth de la cuenta oficial. |
| `GET /social/oauth/:provider/callback` | Validar state de un solo uso y guardar conexión. |
| `GET /admin/social/notifications` | Avisos persistentes. |
| `PATCH /admin/social/notifications/:id/read` | Marcar solo los avisos del usuario actual. |
| `GET /admin/social/events` | SSE autenticado; polling de UI como alternativa. |
| `GET/POST /social/webhooks/meta` | Challenge de Meta y recepción con firma. |
| `POST /social/webhooks/tiktok` | Recepción con firma. |

Todos los endpoints administrativos exigen guard de Auth, lista blanca y MFA cuando corresponde, validación estricta y límites de payload. Proteger OAuth con `state` ligado a sesión/cuenta y PKCE cuando lo exija el flujo. El callback valida qué identidad externa se conectó; no vincula cualquier cuenta al ID elegido por el cliente. BFF de cookies requiere protección CSRF/origin. Webhooks usan autenticación del proveedor, no el guard de administrador.

## 4. Scanner cada minuto y outbox

PostgreSQL es la fuente de verdad; BullMQ ejecuta trabajo. Guardar entrega + snapshot + auditoría + outbox en una transacción al pedir «Publicar ahora». Programación futura entra por scanner. No hacer `UPDATE status='queued'` seguido de `queue.add()` como dos acciones sin recuperación.

```ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DuePostsScheduler {
  constructor(
    private readonly db: DbService,
    private readonly dispatcher: OutboxDispatcher,
    private readonly health: SocialHealthService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: 'UTC' })
  async tick(): Promise<void> {
    try {
      // DbService.transaction reserva UNA conexión, BEGIN/COMMIT/ROLLBACK
      // y libera la conexión en finally. Nunca llamadas HTTP en esta tx.
      await this.db.transaction(async tx => {
        await tx.query(`
          WITH due AS (
            SELECT d.id, d.revision, d.workflow_seq, d.next_step
            FROM public.social_deliveries d
            WHERE d.status IN (
              'scheduled','queued','retry_wait','processing','ready','reconciling'
            )
              AND d.scheduled_at <= now()
              AND d.next_action_at <= now()
              AND (d.lease_until IS NULL OR d.lease_until < now())
              AND NOT EXISTS (
                SELECT 1 FROM kiin_private.social_outbox o
                WHERE o.delivery_id = d.id
                  AND o.revision = d.revision
                  AND o.workflow_seq = d.workflow_seq
              )
            ORDER BY d.next_action_at, d.id
            LIMIT 100
            FOR UPDATE OF d SKIP LOCKED
          )
          INSERT INTO kiin_private.social_outbox
            (delivery_id, revision, workflow_seq, step)
          SELECT id, revision, workflow_seq, next_step FROM due
          ON CONFLICT (delivery_id, revision, workflow_seq) DO NOTHING
        `);
      });
      await this.dispatcher.flushBatch();
      await this.health.recordScannerSuccess();
    } catch (error) {
      // Registro saneado y señal de salud; no rechazar silenciosamente.
      // Si la BD está caída, métricas externas; aviso persistente al volver.
      await this.health.recordScannerFailure(error);
    }
  }
}
```

Batch pequeño, índice parcial y `SKIP LOCKED` permiten múltiples scanners. La restricción única impide crear dos tareas para la misma etapa/revisión. Agotar backlog en batches acotados o medirlo para escalar. La precisión del scanner es de hasta aproximadamente 59 s más espera en cola; la visibilidad depende del procesamiento/moderación de la plataforma. Si se requiere comenzar más cerca del instante, crear outbox con `available_at = scheduled_at` al programar y despachar un job delayed; el scanner queda como reconciliador cada minuto.

Dispatcher, contrato de referencia:

```ts
@Injectable()
export class OutboxDispatcher {
  constructor(
    private readonly outbox: OutboxRepository,
    @InjectQueue('kiin-social') private readonly queue: Queue,
  ) {}

  async flushBatch(): Promise<void> {
    // claimPendingBatch: tx corta, FOR UPDATE SKIP LOCKED;
    // guarda dispatch_token + lease de 60 s; mantiene state=pending.
    const batch = await this.outbox.claimPendingBatch(100);
    for (const task of batch) {
      try {
        await this.queue.add('advance-delivery', { outboxId: task.id }, {
          jobId: task.id, // UUID estable; no ':' en IDs de BullMQ.
          delay: Math.max(0, task.availableAt.getTime() - Date.now()),
          attempts: 5, // Fallos de infraestructura; ver regla de dominio abajo.
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 7 * 86400 },
          removeOnFail: false,
        });
        // UPDATE condicionado por token y state=pending.
        // Si el worker ya marcó done, no volverlo a dispatched.
        await this.outbox.markDispatched(task.id, task.dispatchToken);
      } catch (error) {
        // Libera lease por CAS y conserva pending; siguiente barrido retoma.
        await this.outbox.releaseForRetry(task.id, task.dispatchToken, error);
      }
    }
  }
}
```

`claimPendingBatch` usa condiciones `available_at <= now()` y lease nulo/vencido. En la variante delayed puede reclamar futuros dentro de una ventana acotada. `markDispatched` ocurre después de aceptar Redis. Si el proceso muere entre ambos pasos, se encola con el mismo job ID al vencer el lease. El ID en Redis no sustituye la deduplicación en PostgreSQL; Redis puede perderse y los jobs pueden eliminarse.

BullMQ también permite un Job Scheduler con `upsertJobScheduler(..., { every: 60000 }, ...)` en lugar del Cron de Nest. Elegir uno; no activar ambos por defecto. [Job Schedulers oficiales](https://docs.bullmq.io/guide/job-schedulers/).

## 5. Worker y máquina de estados

```ts
import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';

@Processor('kiin-social', { concurrency: 3 })
export class SocialPublishProcessor extends WorkerHost {
  constructor(
    private readonly repo: SocialRepository,
    private readonly tokens: TokenVaultService,
    private readonly providers: ProviderRegistry,
    private readonly failures: SocialFailureService,
  ) { super(); }

  async process(job: Job<{ outboxId: string }>): Promise<void> {
    // Lee outbox/entrega en tx corta. Si done/obsolete, revisión vieja,
    // cancelado o lease activo, no ejecuta otra llamada remota.
    const claim = await this.repo.claimCurrentStep(job.data.outboxId);
    if (!claim) return;

    try {
      // preflight también revalida assets/capabilities/consentimiento.
      await this.repo.preflight(claim);
      const provider = this.providers.forAccount(claim.account);

      if (claim.account.publishingMode === 'manual') {
        await this.repo.finishManualRequired(claim);
        return;
      }

      const result = await this.tokens.withValidToken(
        claim.account.id,
        token => provider.advance(claim, token),
      );

      // UNA transacción por CAS con lease_token + revision + workflow_seq:
      // guarda IDs, cambia estado, incrementa seq, fija next_action_at,
      // marca outbox done y añade auditoría/avisos/outbox siguiente.
      await this.repo.commitStep(claim, result);
    } catch (error) {
      // Persistir resultado de dominio y liberar lease de forma atómica.
      // Si falla la persistencia, throw: BullMQ reintenta infraestructura.
      // Operaciones ambiguas SIEMPRE se reconcilian antes de otro envío.
      await this.failures.handleAndPersist(claim, error);
    }
  }
}
```

Implementar estos contratos, sin ocultar requisitos dentro de los métodos:

- `claimCurrentStep`: CAS sobre entrega usando UUID como fencing token; lease mayor que el límite HTTP, con renovación por job de heartbeat si hay operaciones largas. Un lease vencido permite reconciliación; no autoriza reenviar automáticamente una publicación incierta.
- `advance`: una operación acotada por job. Antes de un efecto remoto, persistir intento `started`. Al recuperar un intento abierto de `init/publish`, consultar estado remoto antes de repetirlo. Guardar `provider_container_id`/`provider_publish_id` apenas se obtengan.
- `commitStep`: rechaza un worker con lease/revisión vieja. Cada transición genera auditoría y, si corresponde, aviso persistente. Polling devuelve `nextStep='poll'` con próxima fecha, termina el job y libera worker.
- `handleAndPersist`: clasifica errores según proveedor/código/operación y certeza del efecto remoto. No convierte todos los 401 en token vencido ni todos los 5xx en permiso para volver a publicar.
- `RecoveryService`: recupera leases vencidos y outbox `dispatched` sin progreso. Jobs agotados/dead-letter deben producir estado/aviso; no dejar una entrega en `uploading` para siempre. Si Redis se pierde, reconstruir jobs de outbox no terminados; antes reconciliar intentos externos abiertos. Si un job terminado o fallido retenido bloquea el mismo ID mientras su outbox sigue pendiente, cerrar esa outbox y crear una nueva secuencia/ID de manera transaccional, solo tras reconciliar. Esto también cubre un consumidor que encontró lease activo y terminó sin avanzar la etapa.
- Cuando falta red entre API y BD después de una publicación aceptada, no hay garantía general de exactly-once. Identificador remoto + reconciliación + intervención manual cuando no exista consulta concluyente reducen duplicados; no inventar una `Idempotency-Key` que la API no soporte.
- Cancelación y reprogramación verifican fase y lease. Durante un envío ya aceptado, mostrar «Envío iniciado; cancelación no garantizada», no afirmar «Cancelado». Reprogramar snapshots solo cuando sea seguro; entregar 409 si una operación irreversible está en curso.

## 6. Flujos reales de cada plataforma

### Instagram

Seleccionar un flujo de login y mantenerlo coherente. Para Instagram + Facebook de KIIN puede utilizarse Facebook Login for Business, página Facebook y cuenta Instagram profesional vinculada. Instagram Login usa otros scopes/host; no mezclar `instagram_business_content_publish` con el flujo de Facebook Login.

Reels: crear contenedor `/{ig-user-id}/media`, guardar ID, subir mediante mecanismo soportado para esa versión o entregar `video_url`; consultar `/{container-id}?fields=status_code`; publicar mediante `/{ig-user-id}/media_publish` al estar `FINISHED`. Las Stories requieren cuenta business según la colección de Meta. La capacidad de cuenta decide si se muestra ese checkbox. [Colección oficial Meta](https://www.postman.com/meta/workspace/instagram/documentation/23987686-9386f468-7714-490f-9bfc-9442db5c8f00).

No crear contenedores para posts programados con semanas de anticipación: preparar cerca de la fecha según vigencia soportada. El estado de aceptación del contenedor no prueba publicación. Stories no reutilizan sin más un caption de feed: mostrar qué texto podrá aplicar el endpoint elegido y ofrecer una variante con texto incorporado si el equipo lo necesita.

### Facebook

Publicar en página, no perfil personal. Separar texto/foto de feed, video y Reels en el adaptador. Para Reels existe flujo de inicio, subida y finalización con `upload_phase=finish`; verificar estado del video y confirmación según versión, persistiendo `video_id`. No enviar `media_publish` de Instagram a Facebook. [Colección oficial Facebook de Meta](https://www.postman.com/meta/facebook/documentation/r56bjfd/facebook-api?entity=request-23987686-0b79260c-96bd-49de-875b-6076213785fc).

Las páginas de documentación directa de Meta devolvieron HTTP 429 durante esta revisión. Se usaron sus colecciones oficiales de Postman como referencia. Los scopes exactos, formatos, límites, ventanas de procesamiento y versión Graph deben validarse en la app/cuentas reales antes de implementar el adaptador; no fijar una versión supuestamente vigente sin comprobarla.

### TikTok

El panel privado de tres administradores para las cuentas del propio equipo **no encaja en el uso permitido de Direct Post** indicado por TikTok. Los clientes sin auditoría además quedan limitados a publicación privada. Para KIIN, comenzar con destino manual o un proveedor con integración aprobada que admita este caso; comprobar capacidades/condiciones antes de contratar. No cambiar artificialmente el producto ni usar automatización de navegador para eludir esta restricción. [Directrices oficiales](https://developers.tiktok.com/docs/en/content-sharing-guidelines).

Mantener `tiktok.provider.ts` detrás de capability flag, para una integración cuyo acceso esté permitido:

- Video: `POST /v2/post/publish/video/init/`; guardar `publish_id`. Tras transferir el medio, TikTok procesa/publica: no existe una llamada final equivalente a `media_publish` de Instagram.
- Photo Mode: `POST /v2/post/publish/content/init/`, `media_type='PHOTO'`, modo y opciones permitidos, con lista ordenada `photo_images`. Es un post de imágenes, no convertirlas en video. [Inicio Direct Post](https://developers.tiktok.com/docs/en/content-posting-api-get-started).
- `POST /v2/post/publish/status/fetch/` y webhooks confirman resultado. `SEND_TO_USER_INBOX` es entrega al buzón, no publicado; `PUBLISH_COMPLETE` confirma publicación. Visibilidad pública/ID pueden esperar moderación. No marcar éxito al obtener `publish_id`. [Estados oficiales](https://developers.tiktok.com/docs/en/content-posting-api-reference-get-video-status).
- Preparar en Storage antes de la hora; iniciar Direct Post al llegar la fecha, porque el envío dispara el proceso de publicación.
- La página de composición debe consultar `creator_info`: mostrar cuenta, privacidad seleccionada por usuario, controles de interacción y consentimiento; conservar opciones aprobadas en snapshot. Reconsultar al ejecutar y bloquear con aviso si cambiaron. Para piezas de streetwear/comerciales, ofrecer las opciones de disclosure relevantes. No elegir privacidad automáticamente ni añadir hashtags/logos automáticos.

No se presupone que la API de Upload esté aprobada para este uso ni que entregue publicación automática. Se habilita solo con acceso verificado y se muestra como flujo que exige terminar en TikTok.

## 7. Medios, streams y validación

Flujo preferido:

```text
Navegador → upload autorizado a Storage privado → validación en worker
          → snapshot de variantes → proveedor obtiene URL autorizada
          o worker transmite stream según endpoint → confirmación remota
```

- No pasar videos completos por un endpoint serverless ni usar Multer `memoryStorage`, `readFile`, `Buffer.concat`, `arrayBuffer()` o blobs completos en el servidor.
- Upload por TUS/resumable o mecanismo soportado de Storage; sesión/ruta aleatoria, vencimiento y tamaño máximo limitados. El servidor verifica que el objeto pertenece al upload del admin y no otra ruta.
- Validar peso real, magic bytes, codec, duración, fps, dimensiones, número/orden de imágenes y relación de aspecto. Metadatos del navegador ayudan al usuario pero no son autoridad.
- Ejecutar ffprobe/transcodificación en procesos separados con límites; argumentos construidos como array sin shell, paths controlados y timeouts. Generar variantes, nunca modificar el original programado.
- Límites por plataforma/formato/version/cuenta mediante `GET /capabilities`, revalidación al programar y al enviar. 9:16 puede ser una recomendación editorial, no una regla universal para todo TikTok. Feed permite otros ratios según endpoint.
- Photo Mode admite múltiples imágenes; la biblioteca editorial WebP no reemplaza automáticamente validación de cada red.
- Las URL de descarga se generan al ejecutar, con vigencia suficiente durante toda la descarga remota. No guardar URLs firmadas como identidad del asset ni en Redis/logs.
- Para TikTok con archivos ya almacenados en servidor, sus directrices exigen `PULL_FROM_URL`; un dominio/prefijo verificado, HTTPS sin redirect y acceso durante la descarga. El flujo transmite bytes desde el almacenamiento sin cargarlos en RAM de NestJS. [Transferencia oficial](https://developers.tiktok.com/docs/en/content-posting-api-media-transfer-guide).
- Si la infraestructura de Storage no permite verificar el prefijo, usar un dominio propio/controlado que sirva el objeto mediante streaming. No inventar que un host de Supabase es verificable sin comprobar el flujo.
- `FILE_UPLOAD` se reserva al supuesto permitido de archivos en dispositivo; si se utiliza, respetar chunking secuencial y ranges. No reemplazarlo por un PUT genérico de todo archivo grande.

Ejemplo genérico de streaming **para un endpoint que admita cuerpo binario**; cada adaptador aporta método/headers/ranges conforme a su protocolo:

```ts
import { Readable } from 'node:stream';

async function streamBinary(
  endpoint: URL,
  input: Readable,
  method: 'POST' | 'PUT',
  headers: Record<string, string>,
): Promise<void> {
  assertTrustedProviderUploadUrl(endpoint); // HTTPS + host/ruta de proveedor.
  try {
    const response = await fetch(endpoint, {
      method,
      headers, // Incluir longitud/range correctos cuando lo exige la API.
      body: Readable.toWeb(input) as ReadableStream<Uint8Array>,
      duplex: 'half',
      redirect: 'error',
      signal: AbortSignal.timeout(120_000),
    } as RequestInit & { duplex: 'half' });
    if (!response.ok) {
      await response.body?.cancel();
      throw new ProviderTransportError(response.status);
    }
    await response.body?.cancel();
  } finally {
    input.destroy();
  }
}
```

Ejemplo solo de transporte: el adaptador interpreta respuesta JSON acotada cuando necesite IDs/offsets y detecta errores semánticos aun con HTTP 200. Nunca usar solo `response.ok` para declarar una entrega publicada. Para chunks, abrir un nuevo range stream por intento; un stream consumido no puede reintentarse. El límite de memoria depende del tamaño del buffer y concurrencia, no del video completo.

## 8. Tokens centralizados y errores

`TokenVaultService` desencripta solo dentro del backend/worker. Usar cifrado autenticado (AES-256-GCM o KMS/envelope), nonce único, `key_id` y claves fuera de BD; no devolver token al panel. Preferir credenciales de activo/organización cuando el flujo soportado lo permita; registrar quién autorizó sin convertir la cuenta KIIN en una cuenta personal de cada admin.

`withValidToken`:

1. Leer credencial/versión y verificar scopes y expiraciones conocidas.
2. Si requiere renovación, adquirir lease por cuenta usando CAS, llamar al proveedor fuera de transacción y guardar credenciales + versión atómicamente. Otro worker espera/reprograma; no renueva simultáneamente.
3. TikTok utiliza OAuth refresh y puede rotar refresh token; conservar el nuevo token y sus fechas. No derivar fechas de constantes. [Gestión oficial](https://developers.tiktok.com/docs/en/oauth-user-access-token-management).
4. Meta se renueva/reautoriza según estrategia concreta de Page/User/Instagram Login. No asumir que un token de página tiene `refresh_token` ni que una fecha nula significa imposible de revocar.
5. Si una operación falla por autenticación conocida **antes de ser aceptada**, renovar/revalidar una vez y reabrir el stream si corresponde. Si el resultado es ambiguo, reconciliar antes de volver a iniciar/publicar.
6. Revocación, refresh vencido o scopes perdidos: cuenta `reauth_required`, entregas afectadas `auth_required`, conservar assets/snapshots y crear avisos a los tres admins. Después de reconectar, confirmar reanudación de contenidos vencidos; evitar publicar todo el backlog de golpe.

| Caso | Acción y resultado en panel |
|---|---|
| Token vencido y renovación válida | Renovar bajo lease, retomar etapa segura, auditar. |
| Consentimiento revocado/refresh vencido | `auth_required`; «Reconecta la cuenta de KIIN». |
| Scope ausente/permiso insuficiente | Error accionable; no tratarlo como refresh infinito. |
| HTTP 429/límite de cuenta | `retry_wait`; respetar Retry-After y límite compartido por cuenta. |
| 5xx/error de red sin efecto ambiguo | Retry acotado con backoff/jitter y presupuesto por entrega. |
| Timeout/5xx al iniciar o publicar con posible aceptación | `reconciling`; consultar ID/intento existente. Si no es verificable, intervención manual. |
| Medio inválido | `failed`; indicar archivo, formato y motivo; corregir variante. |
| Procesamiento remoto pendiente | `processing`; próximo polling durable, sin dormir dentro del worker. |
| Procesamiento excede umbral operativo | Aviso + reconciliación; no asumir que la red canceló ni republicar. |
| Redis caído | Outbox pendiente, indicador de retraso; recuperar al volver. |
| BD caída | Métrica/alerta de servicio; no enviar contenido nuevo sin persistir intención. |
| Una red publica y otra falla | «Publicación parcial» y botón de retry en la entrega fallida. |

Polling y rate limits son por cuenta/plataforma; `concurrency: 3` no garantiza cumplir cuotas. Usar limitador distribuido y backoff de polling configurable. Logs omiten tokens, secretos, cabeceras Authorization, URL firmadas y payloads sensibles. No mostrar stack traces al panel.

Webhooks: verificar firma del cuerpo crudo con secreto del proveedor, comparación segura y timestamp/replay cuando corresponda. Guardar receipt deduplicado, responder tras persistir y procesar asíncronamente; polling cubre eventos ausentes. Las transiciones son monotónicas/condicionadas: un webhook atrasado no vuelve `published` a `processing`.

## 9. Angular: feature integrada, calendario y formulario

Aplicar este apartado al panel Angular si está en otro repositorio. En este checkout, usar los mismos contratos/UX en React y agregar el enlace a `src/app/admin/(panel)/layout.tsx` durante la implementación.

```text
features/social-management/
  social.routes.ts
  pages/social-calendar.page.ts
  pages/social-compose.page.ts
  pages/social-post-detail.page.ts
  components/media-picker.component.ts
  components/destination-selector.component.ts
  components/publish-options.component.ts
  components/audit-timeline.component.ts
  components/account-status.component.ts
  data/social-api.service.ts
  data/social-state.service.ts
```

Montar como ruta hija de `/admin` con el guard existente y carga diferida `loadChildren`/`loadComponent`; evitar un segundo login. [API oficial Angular Router](https://angular.dev/api/router/Route).

```ts
// En las rutas hijas del panel existente:
{
  path: 'redes',
  canActivate: [existingAdminGuard],
  loadChildren: () => import('./features/social-management/social.routes')
    .then(m => m.SOCIAL_ROUTES),
}
```

Para FullCalendar usar conector Angular y vistas estándar `dayGridMonth` y `timeGridWeek`; `datesSet` consulta únicamente `[start,end)` visible. [Integración oficial](https://fullcalendar.io/docs/angular).

- Verde + icono/texto «Publicado»; amarillo «Programado»; rojo «Error»; gris «Borrador»; azul «Procesando»; aviso específico para reconexión/manual/parcial. No comunicar solo por color.
- Evento muestra título, destinos, hora, estado y «Programado por [nombre]». Panel lateral muestra autor, última edición, programador y acciones del sistema.
- Los borradores sin fecha aparecen en bandeja; `calendar_at` ubica los que tengan fecha editorial sin comprometer envío.
- Drag/drop llama a schedule con versión esperada; revalida y revierte visualmente si devuelve 409 o la entrega ya inició.
- Usar `published_at` para historial, `scheduled_at` para próximos envíos y fecha editorial para borradores. Zona visible `America/Mexico_City`.
- Para timeGrid con zona nombrada, configurar plugin timezone compatible o estrategia de conversión explícita. No depender de UTC-coercion por defecto de FullCalendar. Fechas/offsets se prueban con la librería elegida.

Formulario con Reactive Forms:

- Caption base editable y overrides por destino, con contadores/límites provenientes de capabilities.
- Selector múltiple de medios, orden/portada para Photo Mode/carrusel, previews y variantes por ratio; progreso resumable y errores específicos.
- Checkboxes IG Reels, IG Story, IG Feed/carrusel, FB Feed/Reels/Story/video y TikTok video/Photo Mode. Deshabilitar únicamente destinos incompatibles indicando la causa y modo manual cuando aplique.
- Radio «Guardar borrador», «Publicar ahora», «Programar», fecha/hora/zona; bloque de resumen de cuentas/formato/fecha antes de confirmar.
- Al seleccionar TikTok, mostrar ajustes específicos requeridos por el flujo autorizado y consentimiento; guardar snapshot, actor y fecha de consentimiento.
- `publish-now` devuelve 202; pantalla sigue la entrega por SSE o consulta periódica y muestra «Procesando». Desactivar dobles envíos mientras se acepta solicitud; idempotencia propia del endpoint evita duplicar posts ante retry del navegador.

Identidad KIIN: reutilizar tokens crema `#FEE8D0`, naranja `#F25623`, casi negro `#222222`, gris `#A3A3A3`; colores de estado son semánticos complementarios. Mantener naranja como acento, contraste y tipografía del panel. Voz editorial, cercana e informada, sin clickbait. Score y Filtro Editorial siguen como ayuda; este módulo no introduce aprobación editorial obligatoria entre admins.

## 10. Integración por etapas y verificación

1. Aplicar migración adicional revisada en entorno de pruebas; provisionar rol API/worker, permisos mínimos, bucket privado y cifrado. No reejecutar los cuatro SQL iniciales en una BD existente.
2. Integrar borradores/calendario/auditoría y carga validada; ningún destino publica aún. Registrar exactamente los tres UUID autorizados reales mediante la lista blanca existente.
3. Probar una cuenta/destino de Meta con permisos reales; conservar capacidades/scopes retornados y fijar versión Graph soportada.
4. Activar scanner/outbox/worker/polling y notificaciones; comprobar recuperación antes de habilitar «Publicar ahora» y programación.
5. Resolver vía de TikTok permitida y capacidades de proveedor; hasta entonces mantener modo manual claramente identificado.
6. Habilitar enlace en el panel y métricas de backlog, edad de jobs, credenciales, estados ambiguos y consumo de medios. Incluir tablas sociales y binarios privados en respaldo sin exportar tokens descifrados.

Pruebas necesarias para una implementación:

- Un usuario fuera de `admins` y un admin sin MFA requerida no publican; anon/authenticated no pueden leer credenciales/outbox/intentos ni falsificar auditoría.
- Dos scanners y dos workers sobre la misma entrega producen una etapa efectiva; crash antes/después de `queue.add` no pierde trabajos.
- Token vence entre preflight y llamada; renovación concurrente/rotación/revocación se resuelven sin pérdida de credenciales ni bucle de reintentos.
- Timeout después de aceptación remota y caída antes de guardar respuesta producen reconciliación, no doble publicación.
- Reinicio durante procesamiento, pérdida de Redis, dead-letter y webhooks duplicados/desordenados convergen a estado correcto.
- Reprogramación/cancelación invalida jobs viejos; no cancela ficticiamente una publicación aceptada.
- Entrega parcial reintenta solo el destino fallido; assets inválidos impiden envío; ratios/formats y límites se verifican por destino.
- Video grande mantiene memoria acotada; stream aborta, se cierra y reabre en retries seguros; URLs de descarga siguen accesibles durante el procesamiento.
- Calendario mensual/semanal, drafts sin fecha, offsets y ediciones concurrentes muestran información consistente.

Validación realizada para este encargo: revisión del checkout y memoria; consulta de documentación primaria; SQL de referencia ejecutado sobre PostgreSQL embebido con Auth/roles simulados para verificar sintaxis, relaciones y denegación de acceso a credenciales. El script reproducible `node docs/social-management/verify-schema.mjs` aprobó 13 comprobaciones y ESLint sobre ese script terminó sin errores. Esta comprobación no aplica SQL al proyecto real ni prueba llamadas de Meta/TikTok, Redis, frontend o módulos NestJS.
