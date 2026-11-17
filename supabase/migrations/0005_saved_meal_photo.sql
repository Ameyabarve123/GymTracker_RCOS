-- Saved meals can carry a photo, like logged meals do.
alter table public.saved_meals
  add column if not exists photo_url text;
