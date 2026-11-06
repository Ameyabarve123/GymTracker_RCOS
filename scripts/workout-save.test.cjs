/* global __dirname */
// Runs the real migrations/RLS in an isolated in-memory PostgreSQL instance.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { before, after, test } = require('node:test');
const { PGlite } = require('@electric-sql/pglite');
const { fromWorkout, serializeDraft } = require('../src/lib/workout-draft.ts');

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
let db;
let sequence = 0;
const migration = (name) => readFileSync(join(__dirname, '../supabase/migrations', name), 'utf8');
const payload = () => ({ id: null, draft_key: `test-${++sequence}`, revision: 0, name: 'Test workout', workout_date: '2026-11-06', preset_id: null,
  exercises: [{ id: null, exercise_id: null, custom_name: `Custom ${sequence}`, sets: [
    { id: null, reps: 8, weight: 42.5, is_dropset: false },
    { id: null, reps: 6, weight: 35, is_dropset: true },
  ] }],
});
async function save(input, token = `save-${++sequence}`) {
  const result = await db.query('select public.save_workout($1::jsonb, $2::text) as workout', [JSON.stringify(input), token]);
  return result.rows[0].workout;
}
async function user(id) { await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]); }

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_user::text $$;
    grant usage on schema auth to authenticated, anon;
  `);
  // gen_random_uuid is built into modern Postgres; PGlite does not need pgcrypto.
  await db.exec(migration('0001_core.sql').replace('create extension if not exists "pgcrypto";', ''));
  await db.exec(migration('0004_workout_drafts.sql'));
  await db.exec(`grant usage on schema public to authenticated, anon;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    insert into auth.users (id) values ('${alice}'), ('${bob}');
    set role authenticated;`);
  await user(alice);
});
after(async () => { if (db) await db.close(); });

test('atomic creation returns ordered sets, canonical IDs and updates the streak', async () => {
  const workout = await save(payload());
  assert.equal(workout.revision, 1);
  assert.equal(workout.user_id, alice);
  assert.deepEqual(workout.workout_exercises[0].exercise_sets.map((set) => set.set_number), [1, 2]);
  assert.equal(workout.workout_exercises[0].exercise_sets[1].is_dropset, true);
  assert.equal((await db.query('select current_streak from public.profiles where id = $1', [alice])).rows[0].current_streak, 1);
});

test('retrying creation or update after a lost response never duplicates rows', async () => {
  const input = payload();
  const token = `retry-${++sequence}`;
  const first = await save(input, token);
  assert.deepEqual(await save(input, token), first);
  const update = serializeDraft(fromWorkout(first));
  update.exercises[0].sets.push({ id: null, reps: 5, weight: 30, is_dropset: false });
  const updated = await save(update, `${token}-update`);
  assert.deepEqual(await save(update, `${token}-update`), updated);
  assert.equal(updated.workout_exercises[0].exercise_sets.length, 3);
});

test('a failed late set write rolls back workout, custom exercise, and earlier sets', async () => {
  const input = payload();
  input.exercises[0].sets[1].weight = -1;
  await assert.rejects(save(input), /weight must be/);
  assert.equal((await db.query('select id from public.workouts where draft_key = $1', [input.draft_key])).rows.length, 0);
  assert.equal((await db.query('select id from public.exercises where name = $1', [input.exercises[0].custom_name])).rows.length, 0);
});

test('updates preserve IDs, remove omitted rows, and renumber sets', async () => {
  const saved = await save(payload());
  const input = serializeDraft(fromWorkout(saved));
  const retained = input.exercises[0].sets[1].id;
  const removed = input.exercises[0].sets.shift().id;
  input.exercises[0].sets[0].reps = 10;
  const updated = await save(input);
  assert.equal(updated.workout_exercises[0].id, saved.workout_exercises[0].id);
  assert.equal(updated.workout_exercises[0].exercise_sets[0].id, retained);
  assert.equal(updated.workout_exercises[0].exercise_sets[0].set_number, 1);
  assert.equal((await db.query('select id from public.exercise_sets where id = $1', [removed])).rows.length, 0);
  const clear = serializeDraft(fromWorkout(updated));
  clear.exercises = [];
  assert.deepEqual((await save(clear)).workout_exercises, []);
  assert.equal((await db.query('select id from public.exercise_sets where id = $1', [retained])).rows.length, 0);
});

test('stale saves are rejected without overwriting a newer workout', async () => {
  const saved = await save(payload());
  const input = serializeDraft(fromWorkout(saved));
  input.name = 'New name';
  await save(input);
  input.name = 'Stale name';
  await assert.rejects(save(input), /changed elsewhere/);
  assert.equal((await db.query('select name from public.workouts where id = $1', [saved.id])).rows[0].name, 'New name');
});

test('another user cannot save a workout, even with a known idempotency token', async () => {
  const input = payload();
  const saved = await save(input, 'owner-token');
  await user(bob);
  try { await assert.rejects(save(serializeDraft(fromWorkout(saved)), 'owner-token'), /no longer available/); }
  finally { await user(alice); }
});

test('child IDs from a different workout cannot be moved or modified', async () => {
  const first = await save(payload());
  const second = await save(payload());
  const input = serializeDraft(fromWorkout(first));
  input.exercises[0].sets[0].id = second.workout_exercises[0].exercise_sets[0].id;
  await assert.rejects(save(input), /Set does not belong/);
  input.exercises[0].id = second.workout_exercises[0].id;
  await assert.rejects(save(input), /Exercise does not belong/);
  assert.equal((await db.query('select revision from public.workouts where id = $1', [first.id])).rows[0].revision, 1);
});

test('missing arrays and duplicate child IDs fail without deleting saved data', async () => {
  const saved = await save(payload());
  const input = serializeDraft(fromWorkout(saved));
  const malformed = { ...input };
  delete malformed.exercises;
  await assert.rejects(save(malformed), /Invalid workout payload/);
  input.exercises[0].sets.push(input.exercises[0].sets[0]);
  await assert.rejects(save(input), /Duplicate set ID/);
  assert.equal((await db.query('select count(*)::int as count from public.exercise_sets where workout_exercise_id = $1', [input.exercises[0].id])).rows[0].count, 2);
});

test('anonymous callers cannot execute the save function', async () => {
  await db.exec('reset role; set role anon;');
  try { await assert.rejects(save(payload()), /permission denied for function save_workout/); }
  finally { await db.exec('reset role; set role authenticated;'); await user(alice); }
});
