-- GymTracker core schema
-- Run this in the Supabase SQL editor (or via the Supabase CLI).
-- Phase 1: profiles, nutrition (daily logs + meals), workouts (exercises, sets, presets).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  is_private boolean not null default true,
  avatar_url text,
  calorie_goal integer not null default 2000,
  protein_goal integer not null default 150,
  carbs_goal integer not null default 200,
  fats_goal integer not null default 65,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  created_at timestamptz not null default now()
);

-- Auto-create a profile whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      'user_' || substr(new.id::text, 1, 8)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- daily_logs + meals
-- ---------------------------------------------------------------------------
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table if not exists public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  meal_type text not null default 'snack' check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  calories integer not null default 0,
  protein integer not null default 0,
  carbs integer not null default 0,
  fats integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references public.daily_logs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  meal_type text not null default 'snack' check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  calories integer not null default 0,
  protein integer not null default 0,
  carbs integer not null default 0,
  fats integer not null default 0,
  photo_url text,
  logged_at timestamptz not null default now()
);
create index if not exists meals_daily_log_id_idx on public.meals (daily_log_id);
create index if not exists daily_logs_user_date_idx on public.daily_logs (user_id, log_date);

-- ---------------------------------------------------------------------------
-- exercises (shared library + user-created)
-- ---------------------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text not null default 'other'
    check (muscle_group in ('push', 'pull', 'legs', 'shoulders', 'core', 'arms', 'other')),
  is_default boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- workouts -> workout_exercises -> exercise_sets
-- ---------------------------------------------------------------------------
create table if not exists public.presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.preset_exercises (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid not null references public.presets (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  order_index integer not null default 0,
  target_sets integer not null default 3,
  target_reps integer not null default 10
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  preset_id uuid references public.presets (id) on delete set null,
  name text not null,
  workout_date date not null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists workouts_user_date_idx on public.workouts (user_id, workout_date);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  order_index integer not null default 0
);
create index if not exists workout_exercises_workout_idx on public.workout_exercises (workout_id);

create table if not exists public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_number integer not null default 1,
  reps integer not null default 0,
  weight numeric(6, 2) not null default 0,
  is_dropset boolean not null default false,
  order_index integer not null default 0
);
create index if not exists exercise_sets_we_idx on public.exercise_sets (workout_exercise_id);

-- ---------------------------------------------------------------------------
-- Streak helper: call after logging a meal or workout for the given day.
-- ---------------------------------------------------------------------------
create or replace function public.touch_streak(p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last date;
  v_current integer;
  v_longest integer;
begin
  select last_active_date, current_streak, longest_streak
    into v_last, v_current, v_longest
  from public.profiles
  where id = auth.uid();

  if v_last is null then
    v_current := 1;
  elsif v_last = p_date then
    return; -- already counted today
  elsif v_last = p_date - 1 then
    v_current := v_current + 1;
  else
    v_current := 1;
  end if;

  v_longest := greatest(coalesce(v_longest, 0), v_current);

  update public.profiles
     set current_streak = v_current,
         longest_streak = v_longest,
         last_active_date = p_date
   where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.daily_logs enable row level security;
alter table public.meals enable row level security;
alter table public.saved_meals enable row level security;
alter table public.exercises enable row level security;
alter table public.presets enable row level security;
alter table public.preset_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.exercise_sets enable row level security;

-- profiles: owner has full access; public (non-private) profiles are readable by anyone signed in.
create policy "profiles_select_own_or_public" on public.profiles
  for select using (auth.uid() = id or is_private = false);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- daily_logs / meals / saved_meals: owner only.
create policy "daily_logs_owner" on public.daily_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "meals_owner" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saved_meals_owner" on public.saved_meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- exercises: everyone signed in can read; users manage their own custom ones.
create policy "exercises_select_all" on public.exercises
  for select using (auth.role() = 'authenticated');
create policy "exercises_insert_own" on public.exercises
  for insert with check (auth.uid() = created_by);
create policy "exercises_update_own" on public.exercises
  for update using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "exercises_delete_own" on public.exercises
  for delete using (auth.uid() = created_by);

-- presets / preset_exercises: owner only (preset_exercises scoped through parent preset).
create policy "presets_owner" on public.presets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "preset_exercises_owner" on public.preset_exercises
  for all using (
    exists (select 1 from public.presets p where p.id = preset_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.presets p where p.id = preset_id and p.user_id = auth.uid())
  );

-- workouts / workout_exercises / exercise_sets: owner only (scoped through parents).
create policy "workouts_owner" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_exercises_owner" on public.workout_exercises
  for all using (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  );
create policy "exercise_sets_owner" on public.exercise_sets
  for all using (
    exists (
      select 1
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  );
