-- Deploy before the app version that calls save_workout.
begin;

alter table public.workouts add column revision integer not null default 0;
alter table public.workouts add column draft_key text;
alter table public.workouts add column last_save_token text;
create unique index workouts_user_draft_key_idx on public.workouts (user_id, draft_key);

-- One RPC is one transaction. RLS still applies to every read and write.
create or replace function public.save_workout(p_workout jsonb, p_save_token text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workout public.workouts%rowtype;
  v_id uuid := (p_workout->>'id')::uuid;
  v_preset uuid := (p_workout->>'preset_id')::uuid;
  v_exercise jsonb;
  v_set jsonb;
  v_we_id uuid;
  v_exercise_id uuid;
  v_set_id uuid;
  v_kept_exercises uuid[] := '{}';
  v_kept_sets uuid[];
  v_exercise_index integer := 0;
  v_set_index integer;
  v_reps numeric;
  v_weight numeric;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to save your workout.'; end if;
  if jsonb_typeof(p_workout) is distinct from 'object'
    or coalesce(length(btrim(p_workout->>'name')), 0) = 0
    or coalesce(length(p_save_token), 0) = 0
    or coalesce(length(p_workout->>'draft_key'), 0) = 0
    or (p_workout->>'revision') is null
    or (p_workout->>'workout_date') is null
    or jsonb_typeof(p_workout->'exercises') is distinct from 'array'
  then raise exception 'Invalid workout payload.'; end if;

  if v_preset is not null and not exists (
    select 1 from public.presets where id = v_preset and user_id = auth.uid()
  ) then raise exception 'Preset is no longer available.'; end if;

  if v_id is null then
    -- The stable draft key makes a retry after a lost response safe.
    insert into public.workouts (user_id, name, workout_date, preset_id, draft_key)
    values (auth.uid(), btrim(p_workout->>'name'), (p_workout->>'workout_date')::date,
      v_preset, p_workout->>'draft_key')
    on conflict (user_id, draft_key) do nothing;
    select * into v_workout from public.workouts
      where user_id = auth.uid() and draft_key = p_workout->>'draft_key' for update;
  else
    select * into v_workout from public.workouts
      where id = v_id and user_id = auth.uid() for update;
  end if;
  if v_workout.id is null then raise exception 'Workout is no longer available.'; end if;

  -- Repeating the same save returns the committed snapshot without duplicating rows.
  if v_workout.last_save_token is distinct from p_save_token then
    if v_workout.revision <> (p_workout->>'revision')::integer then
      raise exception 'This workout changed elsewhere. Your draft is still here. Reload the saved workout before editing again.'
        using errcode = '40001';
    end if;
    if v_workout.workout_date <> (p_workout->>'workout_date')::date then
      raise exception 'A workout cannot be moved to another date by this save.';
    end if;

    for v_exercise in select value from jsonb_array_elements(p_workout->'exercises') loop
      if jsonb_typeof(v_exercise) is distinct from 'object'
        or jsonb_typeof(v_exercise->'sets') is distinct from 'array'
      then raise exception 'Invalid exercise payload.'; end if;
      v_exercise_id := (v_exercise->>'exercise_id')::uuid;
      if v_exercise_id is null then
        if coalesce(length(btrim(v_exercise->>'custom_name')), 0) = 0 then
          raise exception 'Give each custom exercise a name.';
        end if;
        select id into v_exercise_id from public.exercises
          where created_by = auth.uid() and lower(name) = lower(btrim(v_exercise->>'custom_name'))
          order by created_at limit 1;
        if v_exercise_id is null then
          insert into public.exercises (name, muscle_group, created_by)
            values (btrim(v_exercise->>'custom_name'), 'other', auth.uid()) returning id into v_exercise_id;
        end if;
      elsif not exists (select 1 from public.exercises where id = v_exercise_id) then
        raise exception 'An exercise is no longer available.';
      end if;

      v_we_id := (v_exercise->>'id')::uuid;
      if v_we_id is null then
        insert into public.workout_exercises (workout_id, exercise_id, order_index)
          values (v_workout.id, v_exercise_id, v_exercise_index) returning id into v_we_id;
      else
        if v_we_id = any(v_kept_exercises) then raise exception 'Duplicate workout exercise ID.'; end if;
        update public.workout_exercises set exercise_id = v_exercise_id, order_index = v_exercise_index
          where id = v_we_id and workout_id = v_workout.id;
        if not found then raise exception 'Exercise does not belong to this workout.'; end if;
      end if;
      v_kept_exercises := array_append(v_kept_exercises, v_we_id);
      v_exercise_index := v_exercise_index + 1;
      v_kept_sets := '{}';
      v_set_index := 1;

      for v_set in select value from jsonb_array_elements(v_exercise->'sets') loop
        if jsonb_typeof(v_set->'reps') is distinct from 'number'
          or jsonb_typeof(v_set->'weight') is distinct from 'number'
          or jsonb_typeof(v_set->'is_dropset') is distinct from 'boolean'
        then raise exception 'Invalid set values.'; end if;
        v_reps := (v_set->>'reps')::numeric;
        v_weight := (v_set->>'weight')::numeric;
        if v_reps < 0 or v_reps > 2147483647 or trunc(v_reps) <> v_reps
          or v_weight < 0 or v_weight > 9999.99 or round(v_weight, 2) <> v_weight
        then raise exception 'Reps must be whole and nonnegative; weight must be 0 to 9999.99 with up to two decimals.'; end if;
        v_set_id := (v_set->>'id')::uuid;
        if v_set_id is null then
          insert into public.exercise_sets (workout_exercise_id, set_number, reps, weight, is_dropset, order_index)
            values (v_we_id, v_set_index, v_reps::integer, v_weight, (v_set->>'is_dropset')::boolean, v_set_index)
            returning id into v_set_id;
        else
          if v_set_id = any(v_kept_sets) then raise exception 'Duplicate set ID.'; end if;
          update public.exercise_sets set set_number = v_set_index, order_index = v_set_index,
            reps = v_reps::integer, weight = v_weight, is_dropset = (v_set->>'is_dropset')::boolean
            where id = v_set_id and workout_exercise_id = v_we_id;
          if not found then raise exception 'Set does not belong to this exercise.'; end if;
        end if;
        v_kept_sets := array_append(v_kept_sets, v_set_id);
        v_set_index := v_set_index + 1;
      end loop;
      delete from public.exercise_sets where workout_exercise_id = v_we_id and not (id = any(v_kept_sets));
    end loop;
    delete from public.workout_exercises where workout_id = v_workout.id and not (id = any(v_kept_exercises));

    update public.workouts set name = btrim(p_workout->>'name'),
      revision = revision + 1, last_save_token = p_save_token where id = v_workout.id;
    if v_id is null then perform public.touch_streak(v_workout.workout_date); end if;
  end if;

  select (to_jsonb(w) - 'draft_key' - 'last_save_token') || jsonb_build_object(
    'workout_exercises', coalesce((
      select jsonb_agg(to_jsonb(we) || jsonb_build_object(
        'exercise', (select jsonb_build_object('id', e.id, 'name', e.name, 'muscle_group', e.muscle_group)
          from public.exercises e where e.id = we.exercise_id),
        'exercise_sets', coalesce((select jsonb_agg(to_jsonb(s) order by s.order_index)
          from public.exercise_sets s where s.workout_exercise_id = we.id), '[]'::jsonb)
      ) order by we.order_index) from public.workout_exercises we where we.workout_id = w.id
    ), '[]'::jsonb)
  ) into v_result from public.workouts w where w.id = v_workout.id;
  return v_result;
end;
$$;

revoke all on function public.save_workout(jsonb, text) from public, anon;
grant execute on function public.save_workout(jsonb, text) to authenticated;

commit;
