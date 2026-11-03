// Verificación local del diseño; no usa red ni credenciales reales.
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const db = new PGlite();
const admin = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const stranger = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let checks = 0;
async function rejects(sql) {
  await assert.rejects(() => db.query(sql));
  checks += 1;
}

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth, public to anon, authenticated;
  `);
  for (const relative of [
    '../../supabase/01_schema.sql',
    '../../supabase/02_policies.sql',
    './reference-schema.sql',
  ]) {
    await db.exec(await readFile(new URL(relative, import.meta.url), 'utf8'));
  }
  checks += 1;
  await db.query('insert into auth.users values ($1,$2),($3,$4)', [
    admin, 'admin@example.invalid', stranger, 'stranger@example.invalid',
  ]);
  await db.query('insert into public.admins(user_id,email) values ($1,$2)', [
    admin, 'admin@example.invalid',
  ]);
  const { rows: [account] } = await db.query(`
    insert into public.social_accounts
      (platform, external_account_id, display_name, auth_strategy)
    values ('instagram','local-fixture','Cuenta de prueba','test') returning id
  `);
  const { rows: [post] } = await db.query(`
    insert into public.social_posts(title, creator_label)
    values ('Pieza de prueba','Administrador ficticio') returning id
  `);
  await db.query(`
    insert into public.social_deliveries
      (post_id, account_id, platform, format, status, scheduled_at, next_action_at)
    values ($1,$2,'instagram','reel','scheduled',now()-interval '1 minute',now())
  `, [post.id, account.id]);
  const scan = `
    WITH due AS (
      SELECT d.id, d.revision, d.workflow_seq, d.next_step
      FROM public.social_deliveries d
      WHERE d.status IN ('scheduled','queued','retry_wait','processing','ready','reconciling')
        AND d.scheduled_at <= now() AND d.next_action_at <= now()
        AND (d.lease_until IS NULL OR d.lease_until < now())
        AND NOT EXISTS (SELECT 1 FROM kiin_private.social_outbox o
          WHERE o.delivery_id=d.id AND o.revision=d.revision AND o.workflow_seq=d.workflow_seq)
      ORDER BY d.next_action_at, d.id LIMIT 100 FOR UPDATE OF d SKIP LOCKED
    )
    INSERT INTO kiin_private.social_outbox(delivery_id,revision,workflow_seq,step)
    SELECT id,revision,workflow_seq,next_step FROM due
    ON CONFLICT(delivery_id,revision,workflow_seq) DO NOTHING
  `;
  await db.exec('begin');
  await db.query(scan);
  await db.exec('commit');
  await db.query(scan);
  assert.equal((await db.query('select count(*)::int as n from kiin_private.social_outbox')).rows[0].n, 1);
  checks += 1;
  await rejects(`insert into public.social_deliveries(post_id,account_id,platform,format)
    values ('${post.id}','${account.id}','facebook','feed')`);
  await rejects(`insert into public.social_deliveries(post_id,account_id,platform,format)
    values ('${post.id}','${account.id}','instagram','photo')`);

  await db.exec('set role anon');
  await rejects('select * from public.social_posts');
  await rejects('select * from kiin_private.social_credentials');
  await db.exec(`reset role; set request.jwt.claim.sub='${stranger}'; set role authenticated`);
  assert.equal((await db.query('select * from public.social_posts')).rows.length, 0);
  checks += 1;
  await rejects('select * from kiin_private.social_credentials');
  await db.exec(`reset role; set request.jwt.claim.sub='${admin}'; set role authenticated`);
  assert.equal((await db.query('select * from public.social_posts')).rows.length, 1);
  checks += 1;
  await rejects('select * from kiin_private.social_credentials');
  await rejects('select * from kiin_private.social_outbox');
  await rejects("update public.social_deliveries set status='published',published_at=now()");
  await rejects("insert into public.social_audit_events(actor_label,actor_kind,action) values ('Falso','admin','publish')");
  process.stdout.write(`Verificación SQL: ${checks} comprobaciones aprobadas. Sin acceso a servicios reales.\n`);
} finally {
  await db.close();
}
