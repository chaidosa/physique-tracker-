import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'

async function checkDatabase(){
 const db=new PGlite(); await db.waitReady
 try {
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated; insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');`)
  const schema=await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8')
  await db.exec(schema);await db.exec(schema)
  await db.exec(`set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';`)
  const initial=await db.query('select public.load_tracker() as result')
  assert.equal(initial.rows[0].result.snapshot,null)
  const snapshot={version:1,start:'2026-10-12',targets:{calories:2350,protein:160,carbs:270,fat:70,steps:6000},workouts:{'2026-10-12':{day:'Push',notes:'PR',exercises:{0:[{weight:'15',reps:'10',done:true}],1:[]}}},nutrition:{'2026-10-12':{foods:[],steps:6000}},measurements:{'2026-10-12':{weight:79}}}
  const saved=await db.query('select public.save_tracker($1::jsonb,0) as revision',[JSON.stringify(snapshot)])
  assert.equal(saved.rows[0].revision,1)
  const loaded=await db.query('select public.load_tracker() as result')
  assert.deepEqual(loaded.rows[0].result.snapshot,snapshot)
  await assert.rejects(db.query('select public.save_tracker($1::jsonb,0)',[JSON.stringify(snapshot)]),/changed on another device/)
  await db.exec(`set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';`)
  assert.equal((await db.query('select public.load_tracker() as result')).rows[0].result.snapshot,null)
  for (const table of ['tracker_profiles','workout_sessions','exercise_sets','nutrition_logs','body_measurements'])assert.equal((await db.query(`select * from public.${table}`)).rows.length,0)
  await assert.rejects(db.query(`insert into public.nutrition_logs values('00000000-0000-0000-0000-000000000001','2026-10-13','{}')`),/row-level security/)
  await db.exec('set role anon')
  await assert.rejects(db.query('select public.load_tracker()'),/permission denied/)
 } finally { await db.close() }
}
await checkDatabase();
console.log("Database checks passed: schema rerun, snapshot round trip, empty set preservation, account isolation, and conflict rejection.");
