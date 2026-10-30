-- Seed a library of common exercises (is_default = true, created_by = null).
-- Idempotent: only inserts a default exercise if one with the same name doesn't exist.

insert into public.exercises (name, muscle_group, is_default)
select v.name, v.muscle_group, true
from (values
  -- push
  ('Bench Press', 'push'),
  ('Incline Bench Press', 'push'),
  ('Dumbbell Press', 'push'),
  ('Chest Fly', 'push'),
  ('Push Up', 'push'),
  ('Tricep Pushdown', 'push'),
  ('Overhead Tricep Extension', 'push'),
  -- pull
  ('Deadlift', 'pull'),
  ('Pull Up', 'pull'),
  ('Lat Pulldown', 'pull'),
  ('Barbell Row', 'pull'),
  ('Seated Cable Row', 'pull'),
  ('Face Pull', 'pull'),
  ('Bicep Curl', 'arms'),
  ('Hammer Curl', 'arms'),
  ('Spider Curl', 'arms'),
  -- legs
  ('Back Squat', 'legs'),
  ('Front Squat', 'legs'),
  ('Leg Press', 'legs'),
  ('Romanian Deadlift', 'legs'),
  ('Leg Extension', 'legs'),
  ('Leg Curl', 'legs'),
  ('Calf Raise', 'legs'),
  ('Walking Lunge', 'legs'),
  -- shoulders
  ('Overhead Press', 'shoulders'),
  ('Lateral Raise', 'shoulders'),
  ('Front Raise', 'shoulders'),
  ('Rear Delt Fly', 'shoulders'),
  ('Arnold Press', 'shoulders'),
  -- core
  ('Plank', 'core'),
  ('Hanging Leg Raise', 'core'),
  ('Cable Crunch', 'core'),
  ('Russian Twist', 'core')
) as v(name, muscle_group)
where not exists (
  select 1 from public.exercises e where e.name = v.name and e.is_default = true
);
