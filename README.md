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
   - `0004_workout_drafts.sql` - atomic workout saves, retry protection, and revision checks (**required before running the updated workout screen**)

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

## Workout editing and verification

Workouts, preset copies, custom exercises, and sets are edited in a local draft. Reps,
weight, dropsets, additions, and removals stay local while editing. Going back from the
workout screen automatically saves changes before navigating away. **Save Workout**
also lets you save without leaving. Saving writes the entire workout in one transaction
and updates the query cache with the response. Failed saves keep you on the screen
with your draft intact; correct any invalid fields or restore the connection, then go
back again to retry. Pull-to-refresh stays mounted but is disabled while editing so
Android does not remount the editor and lose its state.
Deleting a previously saved workout is a separate, confirmed action.

Drafts currently live in memory while the screen is open. They do not survive a forced
app close or browser reload. Persistent draft recovery is a future enhancement.
Save requires a network connection. A stale revision is rejected; use **Discard changes**
to reload the saved version before editing again.

Apply `0004_workout_drafts.sql` to an existing Supabase project using its SQL editor
before deploying the app update. The migration retains existing workout data. The app
does not fall back to partial writes if the function is missing.

Run verification (Node.js 22.18+ or 24+, for built-in TypeScript stripping in tests):

```bash
npm run test:workouts
npx tsc --noEmit
npx expo lint
```

The workout tests exercise Add Set and save-on-back with a simulated Android scroll
hierarchy, and run the migration and existing ownership policies in an isolated
in-memory PostgreSQL engine (PGlite); they never connect to the configured Supabase
project. On devices, check adding/removing exercises and sets without a refresh,
saving on Back with the keyboard still open, failed-save retry, discard/back navigation,
and preset/custom-exercise creation on Android, iOS, and web.
