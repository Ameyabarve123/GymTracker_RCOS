import type { WorkoutWithData } from '../types/database';

/** Exercise, set and volume (reps × weight) totals across one or more workouts. */
export function workoutTotals(workouts: Pick<WorkoutWithData, 'workout_exercises'>[]) {
  let exercises = 0;
  let sets = 0;
  let volume = 0;
  for (const workout of workouts) {
    for (const exercise of workout.workout_exercises) {
      exercises++;
      for (const set of exercise.exercise_sets) {
        sets++;
        volume += Number(set.reps) * Number(set.weight);
      }
    }
  }
  return { exercises, sets, volume: Math.round(volume) };
}

/** First letters of up to two words in a username ("alex_lifts" -> "AL"). */
export function initials(name: string | null | undefined) {
  const words = (name ?? '').split(/[\s._-]+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}
