import type { Exercise, SaveWorkoutInput, WorkoutWithData } from '../types/database';

export type DraftSet = { key: string; id: string | null; reps: string; weight: string; is_dropset: boolean };
export type DraftExercise = {
  key: string;
  id: string | null;
  exercise_id: string | null;
  name: string;
  muscle_group: string;
  sets: DraftSet[];
};
export type WorkoutDraft = {
  key: string;
  id: string | null;
  revision: number;
  name: string;
  workout_date: string;
  preset_id: string | null;
  exercises: DraftExercise[];
};

// These are UI/request identities, not authentication tokens or database UUIDs.
let sequence = 0;
export function draftKey() {
  return `draft-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function fromWorkout(workout: WorkoutWithData): WorkoutDraft {
  return {
    key: workout.id, id: workout.id, revision: workout.revision,
    name: workout.name, workout_date: workout.workout_date, preset_id: workout.preset_id,
    exercises: workout.workout_exercises.map((exercise) => ({
      key: exercise.id, id: exercise.id, exercise_id: exercise.exercise_id,
      name: exercise.exercise?.name ?? 'Exercise', muscle_group: exercise.exercise?.muscle_group ?? 'other',
      sets: exercise.exercise_sets.map((set) => ({
        key: set.id, id: set.id, reps: String(set.reps), weight: String(set.weight), is_dropset: set.is_dropset,
      })),
    })),
  };
}

export function newWorkout(date: string, name: string, presetId: string | null = null): WorkoutDraft {
  return { key: draftKey(), id: null, revision: 0, name, workout_date: date, preset_id: presetId, exercises: [] };
}

export function draftExercise(exercise: Pick<Exercise, 'id' | 'name' | 'muscle_group'> | string): DraftExercise {
  return {
    key: draftKey(), id: null, exercise_id: typeof exercise === 'string' ? null : exercise.id,
    name: typeof exercise === 'string' ? exercise : exercise.name,
    muscle_group: typeof exercise === 'string' ? 'other' : exercise.muscle_group, sets: [],
  };
}

export type DraftAction =
  | { type: 'name'; name: string }
  | { type: 'add-exercise'; exercise: DraftExercise }
  | { type: 'remove-exercise'; key: string }
  | { type: 'add-set'; exerciseKey: string; key: string }
  /** Adds a dropset under the top-level set that owns `setKey` (a dropset never nests under a dropset). */
  | { type: 'add-dropset'; exerciseKey: string; setKey: string; key: string }
  | { type: 'remove-set'; exerciseKey: string; key: string }
  | { type: 'update-set'; exerciseKey: string; key: string; patch: Partial<Pick<DraftSet, 'reps' | 'weight' | 'is_dropset'>> };

/**
 * A top-level set with the dropsets nested beneath it. Sets are stored as one ordered list;
 * every dropset belongs to the nearest non-dropset set before it.
 */
export type SetGroup = { parent: DraftSet; number: number; drops: DraftSet[] };

export function groupSets(sets: DraftSet[]): SetGroup[] {
  const groups: SetGroup[] = [];
  for (const set of sets) {
    const owner = groups[groups.length - 1];
    // A leading dropset has no parent, so it is shown as its own top-level set.
    if (set.is_dropset && owner) owner.drops.push(set);
    else groups.push({ parent: set, number: groups.length + 1, drops: [] });
  }
  return groups;
}

/** Index just past the group (parent plus its dropsets) that contains `index`. */
function groupEnd(sets: DraftSet[], index: number) {
  let end = index + 1;
  while (end < sets.length && sets[end].is_dropset) end++;
  return end;
}

/** Index of the top-level set that owns `index`. */
function groupStart(sets: DraftSet[], index: number) {
  let start = index;
  while (start > 0 && sets[start].is_dropset) start--;
  return start;
}

export function editDraft(draft: WorkoutDraft, action: DraftAction): WorkoutDraft {
  if (action.type === 'name') return { ...draft, name: action.name };
  if (action.type === 'add-exercise') return { ...draft, exercises: [...draft.exercises, action.exercise] };
  if (action.type === 'remove-exercise') return { ...draft, exercises: draft.exercises.filter((e) => e.key !== action.key) };
  return {
    ...draft,
    exercises: draft.exercises.map((exercise) => {
      if (exercise.key !== action.exerciseKey) return exercise;
      let sets = exercise.sets;
      if (action.type === 'add-set') {
        // Copy the last top-level set so a new set doesn't inherit a dropset's lighter weight.
        const last = [...sets].reverse().find((set) => !set.is_dropset) ?? sets[sets.length - 1];
        sets = [...sets, { key: action.key, id: null, reps: last?.reps ?? '0', weight: last?.weight ?? '0', is_dropset: false }];
      } else if (action.type === 'add-dropset') {
        const index = sets.findIndex((set) => set.key === action.setKey);
        if (index === -1) return exercise;
        const end = groupEnd(sets, groupStart(sets, index));
        const previous = sets[end - 1];
        const drop: DraftSet = { key: action.key, id: null, reps: previous.reps, weight: previous.weight, is_dropset: true };
        sets = [...sets.slice(0, end), drop, ...sets.slice(end)];
      } else if (action.type === 'remove-set') {
        const index = sets.findIndex((set) => set.key === action.key);
        if (index === -1) return exercise;
        // Removing a top-level set also removes its dropsets, so they never re-attach to another set.
        const isParent = groupStart(sets, index) === index;
        const end = isParent ? groupEnd(sets, index) : index + 1;
        sets = [...sets.slice(0, index), ...sets.slice(end)];
      } else {
        sets = sets.map((set) => set.key === action.key ? { ...set, ...action.patch } : set);
      }
      return { ...exercise, sets };
    }),
  };
}

export function serializeDraft(draft: WorkoutDraft): SaveWorkoutInput {
  if (!draft.name.trim()) throw new Error('Give your workout a name.');
  return {
    id: draft.id, draft_key: draft.key, revision: draft.revision, name: draft.name.trim(),
    workout_date: draft.workout_date, preset_id: draft.preset_id,
    exercises: draft.exercises.map((exercise) => {
      // Name sets the way the screen shows them: "set 2" or "set 2, drop 1".
      const labels = new Map<string, string>();
      for (const group of groupSets(exercise.sets)) {
        labels.set(group.parent.key, `set ${group.number}`);
        group.drops.forEach((drop, i) => labels.set(drop.key, `set ${group.number}, drop ${i + 1}`));
      }
      return {
      id: exercise.id, exercise_id: exercise.exercise_id,
      custom_name: exercise.exercise_id ? null : exercise.name.trim(),
      sets: exercise.sets.map((set) => {
        const reps = Number(set.reps);
        const weight = Number(set.weight.replace(',', '.'));
        const label = `${exercise.name}, ${labels.get(set.key)}`;
        if (!/^\d+$/.test(set.reps.trim()) || !Number.isInteger(reps) || reps > 2147483647) {
          throw new Error(`${label}: enter a whole number of reps (0 or more).`);
        }
        if (!/^(?:\d+(?:[.,]\d{0,2})?|[.,]\d{1,2})$/.test(set.weight.trim()) || !Number.isFinite(weight) || weight > 9999.99) {
          throw new Error(`${label}: enter a weight from 0 to 9999.99, with at most two decimal places.`);
        }
        return { id: set.id, reps, weight, is_dropset: set.is_dropset };
      }),
      };
    }),
  };
}

export function draftIsDirty(draft: WorkoutDraft, baseline: WorkoutDraft) {
  return !draft.id || JSON.stringify(draft) !== JSON.stringify(baseline);
}
