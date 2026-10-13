-- Run once in your Supabase project's SQL Editor. Safe to rerun.
begin;
create table if not exists public.tracker_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.workout_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  data jsonb not null,
  primary key(user_id, log_date)
);
create table if not exists public.exercise_sets (
  user_id uuid not null,
  log_date date not null,
  exercise_index text not null,
  set_index integer not null check(set_index >= 0),
  data jsonb not null,
  primary key(user_id,log_date,exercise_index,set_index),
  foreign key(user_id,log_date) references public.workout_sessions(user_id,log_date) on delete cascade
);
create table if not exists public.nutrition_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  data jsonb not null,
  primary key(user_id,log_date)
);
-- Daily weight and circumference measurements are kept together.
create table if not exists public.body_measurements (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  data jsonb not null,
  primary key(user_id,log_date)
);
do $$
declare t text;
begin
  foreach t in array array['tracker_profiles','workout_sessions','exercise_sets','nutrition_logs','body_measurements'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_records on public.%I', t);
    execute format('create policy own_records on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- One atomic snapshot read avoids mixing records from concurrent saves.
create or replace function public.load_tracker() returns jsonb
language sql stable security invoker set search_path = public
as $$
  select coalesce((
    select jsonb_build_object('revision',p.revision,'snapshot',
      p.settings || jsonb_build_object(
        'workouts',coalesce((select jsonb_object_agg(s.log_date::text,
          s.data || jsonb_build_object('exercises',coalesce(s.data->'exercises','{}'::jsonb) || coalesce((
            select jsonb_object_agg(e.exercise_index,e.sets) from (
              select exercise_index,jsonb_agg(data order by set_index) as sets
              from public.exercise_sets where user_id=p.user_id and log_date=s.log_date group by exercise_index
            ) e
          ),'{}'::jsonb))) from public.workout_sessions s where s.user_id=p.user_id),'{}'::jsonb),
        'nutrition',coalesce((select jsonb_object_agg(log_date::text,data) from public.nutrition_logs where user_id=p.user_id),'{}'::jsonb),
        'measurements',coalesce((select jsonb_object_agg(log_date::text,data) from public.body_measurements where user_id=p.user_id),'{}'::jsonb)
      )) from public.tracker_profiles p where p.user_id=auth.uid()
  ),jsonb_build_object('revision',0,'snapshot',null));
$$;

-- Transactional snapshot save, guarded by revision to detect another device.
create or replace function public.save_tracker(snapshot jsonb,expected_revision bigint) returns bigint
language plpgsql security invoker set search_path = public
as $$
declare uid uuid := auth.uid(); next_revision bigint; d record; ex record; st record;
begin
  if uid is null then raise exception 'Sign in before saving.'; end if;
  if snapshot->>'version' is distinct from '1'
    or jsonb_typeof(snapshot->'targets') is distinct from 'object'
    or jsonb_typeof(snapshot->'workouts') is distinct from 'object'
    or jsonb_typeof(snapshot->'nutrition') is distinct from 'object'
    or jsonb_typeof(snapshot->'measurements') is distinct from 'object'
    or snapshot->>'start' is null then raise exception 'Invalid tracker snapshot.'; end if;
  perform (snapshot->>'start')::date;
  insert into public.tracker_profiles(user_id) values(uid) on conflict do nothing;
  update public.tracker_profiles set
    settings=snapshot - 'workouts' - 'nutrition' - 'measurements',
    revision=revision+1,updated_at=now()
    where user_id=uid and revision=expected_revision returning revision into next_revision;
  if next_revision is null then raise exception 'Data changed on another device. Export your changes, then reload.'; end if;
  delete from public.workout_sessions where user_id=uid;
  delete from public.nutrition_logs where user_id=uid;
  delete from public.body_measurements where user_id=uid;
  for d in select key,value from jsonb_each(snapshot->'workouts') loop
    insert into public.workout_sessions values(uid,d.key::date,(d.value - 'exercises') || jsonb_build_object('exercises',coalesce((select jsonb_object_agg(key,value) from jsonb_each(d.value->'exercises') where value='[]'::jsonb),'{}'::jsonb)));
    for ex in select key,value from jsonb_each(d.value->'exercises') loop
      for st in select value,ordinality from jsonb_array_elements(ex.value) with ordinality loop
        insert into public.exercise_sets values(uid,d.key::date,ex.key,st.ordinality-1,st.value);
      end loop;
    end loop;
  end loop;
  for d in select key,value from jsonb_each(snapshot->'nutrition') loop
    insert into public.nutrition_logs values(uid,d.key::date,d.value);
  end loop;
  for d in select key,value from jsonb_each(snapshot->'measurements') loop
    insert into public.body_measurements values(uid,d.key::date,d.value);
  end loop;
  return next_revision;
end $$;
revoke all on function public.load_tracker() from public,anon;
revoke all on function public.save_tracker(jsonb,bigint) from public,anon;
grant execute on function public.load_tracker() to authenticated;
grant execute on function public.save_tracker(jsonb,bigint) to authenticated;
commit;
