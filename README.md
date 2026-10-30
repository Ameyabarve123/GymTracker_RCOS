# GymTracker

A cross-platform (Android + iOS) fitness app built with **Expo + Expo Router + TypeScript** and backed by **Supabase** (Postgres, Auth, Storage).

Track your lifts, log meals and macros, keep streaks, and build reusable workout presets.

## Features (Phase 1)

- **Auth** - email/password signup and login (Supabase Auth).
- **Home** - current + longest streak, today's calories and macros (protein / carbs / fats), quick actions.
- **Nutrition** - daily calorie/macro totals vs. goals, add meals manually, attach a photo, quick-add from recent & saved meals.
- **Workouts** - month calendar with training-day markers, per-day workouts with exercises, sets (reps / weight / dropset), and reusable presets (e.g. Push / Pull / Legs).
- **Profile** - editable username, privacy toggle, daily macro goals, today's stats, sign out.

Deferred for a later phase: social features (friends, groups, public profiles) and OCR photo scanning. The database schema already includes the social tables.

## Prerequisites

- Node.js 20+
- A Supabase project (free tier works)
- The Expo Go app on your phone, or an Android/iOS emulator

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project, then run the SQL migrations (in order) from `supabase/migrations/` in the Supabase SQL editor:
   - `0001_core.sql` - core tables, RLS, streak function, profile trigger
   - `0002_social.sql` - social tables (not used by the UI yet)
   - `0003_seed_exercises.sql` - a library of common exercises

3. Configure environment variables. Copy `.env.example` to `.env` and fill in your project values (Supabase dashboard -> Project Settings -> API):

   ```bash
   cp .env.example .env
   ```

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

4. Start the dev server:

   ```bash
   npx expo start -c
   ```

   Scan the QR code with Expo Go (Android) or the Camera app (iOS). Use `-c` to clear the cache after changing `.env`.

> If Supabase isn't configured, the app shows a setup screen instead of crashing.

## Project structure

```
src/
  app/                     # Expo Router routes
    (auth)/                # login, signup
    (tabs)/                # Home, Nutrition, Workouts, Profile
    add-meal.tsx           # modal: log a meal
    workout/[date].tsx     # a day's workout + sets
    presets.tsx            # create/manage workout presets
  components/              # UI primitives (Button, Card, Screen, TextField, ...)
  hooks/                   # React Query data hooks
  lib/                     # supabase client, auth provider, query client, helpers
  types/database.ts        # TypeScript shapes mirroring the SQL schema
supabase/migrations/       # SQL you run in Supabase
```

## Notes

- Data access uses `@tanstack/react-query` for caching and refetching.
- Streaks are updated server-side via the `touch_streak` RPC whenever you log a meal or create a workout.
- Row Level Security is enabled on every table so users only see their own data.
