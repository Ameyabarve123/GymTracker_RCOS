import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import { Button } from '@/components/ui/button';
import { Card, Panel } from '@/components/ui/card';
import { ConfirmDialog, type Confirmation } from '@/components/ui/confirm-dialog';
import { TextField } from '@/components/ui/text-field';
import { Font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutDraft } from '@/hooks/use-workout-draft';
import { useDeleteWorkout, useSaveWorkout } from '@/hooks/use-workouts';
import {
  draftExercise,
  draftKey,
  fromWorkout,
  groupSets,
  serializeDraft,
  type DraftAction,
  type DraftExercise,
  type DraftSet,
  type WorkoutDraft,
} from '@/lib/workout-draft';
import type { Database, WorkoutWithData } from '@/types/database';

type Props = {
  initial: WorkoutDraft;
  workout?: WorkoutWithData;
  onStatus: (key: string, dirty: boolean, busy: boolean) => void;
  onCloseNew: () => void;
  onReload: () => void;
  registerSave: (key: string, save: (() => Promise<boolean>) | null) => void;
  savingOnExit: boolean;
};

export function WorkoutEditor({ initial, workout, onStatus, onCloseNew, onReload, registerSave, savingOnExit }: Props) {
  const theme = useTheme();
  const save = useSaveWorkout(initial.workout_date);
  const remove = useDeleteWorkout(initial.workout_date);
  const busy = save.isPending || remove.isPending || savingOnExit;
  const { draft, dirty, edit, dispatch } = useWorkoutDraft(initial, workout, busy);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const locked = useRef(false);
  const saving = useRef<Promise<boolean> | null>(null);
  const request = useRef<Database['public']['Functions']['save_workout']['Args'] | null>(null);

  useLayoutEffect(() => { onStatus(initial.key, dirty, busy); }, [initial.key, dirty, busy, onStatus]);
  useLayoutEffect(() => () => onStatus(initial.key, false, false), [initial.key, onStatus]);

  const mutateAsync = save.mutateAsync;
  const handleSave = useCallback((): Promise<boolean> => {
    // Back during a manual save waits for that same request.
    if (saving.current) return saving.current;
    if (locked.current) return Promise.resolve(false);
    if (!dirty) return Promise.resolve(true);
    locked.current = true;
    setError(null);
    async function persist() {
      try {
        const payload = serializeDraft(draft);
        if (!request.current || JSON.stringify(request.current.p_workout) !== JSON.stringify(payload)) {
          request.current = { p_workout: payload, p_save_token: draftKey() };
        }
        const saved = await mutateAsync(request.current);
        dispatch({ type: 'accept', draft: fromWorkout(saved) });
        request.current = null;
        if (!initial.id) onCloseNew();
        return true;
      } catch (cause) {
        setError(errorMessage(cause));
        return false;
      }
    }
    saving.current = persist().finally(() => {
      locked.current = false;
      saving.current = null;
    });
    return saving.current;
  }, [dirty, draft, dispatch, initial.id, mutateAsync, onCloseNew]);

  useLayoutEffect(() => {
    registerSave(initial.key, handleSave);
    return () => registerSave(initial.key, null);
  }, [initial.key, handleSave, registerSave]);

  function confirmDiscard() {
    setConfirmation({
      title: 'Discard changes?', message: 'Your unsaved changes will be removed.', confirmLabel: 'Discard changes',
      onConfirm: () => {
        request.current = null;
        setError(null);
        if (!initial.id) {
          onCloseNew();
          // A previous save may have committed even if its response was lost.
          onReload();
        }
        else {
          if (workout) dispatch({ type: 'accept', draft: fromWorkout(workout) });
          else dispatch({ type: 'reset' });
          onReload();
        }
      },
    });
  }

  function confirmDelete() {
    setConfirmation({
      title: 'Delete workout?', message: `Delete "${draft.name}" and all its saved sets?`, confirmLabel: 'Delete workout',
      onConfirm: async () => {
        if (locked.current || !draft.id) return;
        locked.current = true;
        setError(null);
        try { await remove.mutateAsync(draft.id); }
        catch (cause) { setError(errorMessage(cause)); }
        finally { locked.current = false; }
      },
    });
  }

  const summary = summarize(draft);

  return (
    <View style={styles.editor}>
      <Panel>
        <View style={styles.between}>
          <Text accessibilityRole="header" numberOfLines={1} style={[styles.panelTitle, { color: theme.onInverse }]}>
            {draft.name || 'Workout'}
          </Text>
          {draft.id ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete workout"
              hitSlop={8}
              disabled={busy}
              onPress={confirmDelete}
              style={[styles.panelIcon, { backgroundColor: theme.inverseTrack, opacity: busy ? 0.5 : 1 }]}>
              <Ionicons name="trash-outline" size={18} color={theme.onInverse} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.summary}>
          <Stat label="Exercises" value={String(summary.exercises)} />
          <Stat label="Sets" value={String(summary.sets)} />
          <Stat label="Volume" value={summary.volume.toLocaleString()} unit="lb" />
        </View>
      </Panel>
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      <Card>
        <TextField label="Workout name" value={draft.name} editable={!busy} onChangeText={(name) => edit({ type: 'name', name })} />
      </Card>
      {draft.exercises.length === 0 ? (
        <Card><Text style={[styles.muted, { color: theme.textSecondary }]}>No exercises yet. Add one to start logging sets.</Text></Card>
      ) : draft.exercises.map((exercise) => <ExerciseBlock key={exercise.key} exercise={exercise} edit={edit} disabled={busy} />)}
      <Button title="Add exercise" variant="outline" icon="add" disabled={busy} onPress={() => setPickerOpen(true)} />
      {draft.exercises.length > 0 || dirty ? (
        <View style={styles.actions}>
          {dirty ? (
            <View style={styles.discard}>
              <Button title="Discard" variant="secondary" disabled={busy} onPress={confirmDiscard} />
            </View>
          ) : null}
          {draft.exercises.length > 0 ? (
            <View style={styles.save}>
              <Button title="Save Workout" icon="checkmark" disabled={!dirty || busy} loading={save.isPending} onPress={handleSave} />
            </View>
          ) : null}
        </View>
      ) : null}
      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)}
        onSelect={(exercise) => edit({ type: 'add-exercise', exercise: draftExercise(exercise) })}
        onCreateDraft={(name) => edit({ type: 'add-exercise', exercise: draftExercise(name) })} />
      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </View>
  );
}

function summarize(draft: WorkoutDraft) {
  let sets = 0;
  let volume = 0;
  for (const exercise of draft.exercises) {
    for (const set of exercise.sets) {
      sets++;
      const reps = Number(set.reps);
      const weight = Number(set.weight.replace(',', '.'));
      if (Number.isFinite(reps) && Number.isFinite(weight)) volume += reps * weight;
    }
  }
  return { exercises: draft.exercises.length, sets, volume: Math.round(volume) };
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: theme.onInverseSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.onInverse }]}>
        {value}
        {unit ? <Text style={[styles.statUnit, { color: theme.onInverseSecondary }]}>{` ${unit}`}</Text> : null}
      </Text>
    </View>
  );
}

const ExerciseBlock = memo(function ExerciseBlock({ exercise, edit, disabled }: {
  exercise: DraftExercise; edit: (action: DraftAction) => void; disabled: boolean;
}) {
  const theme = useTheme();
  const groups = groupSets(exercise.sets);
  return (
    <Card style={styles.exercise}>
      <View style={styles.between}>
        <Text style={[styles.exerciseName, { color: theme.text }]}>{exercise.name}</Text>
        <View style={styles.exerciseTools}>
          <View style={[styles.muscle, { backgroundColor: theme.lavender }]}>
            <Text style={[styles.muscleText, { color: theme.text }]}>{exercise.muscle_group}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${exercise.name}`} hitSlop={8} disabled={disabled}
            onPress={() => edit({ type: 'remove-exercise', key: exercise.key })}
            style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="close" size={18} color={theme.text} />
          </Pressable>
        </View>
      </View>
      {groups.length > 0 ? (
        <View style={styles.row}>
          <Text style={[styles.colHead, styles.setCol, { color: theme.textSecondary }]}>Set</Text>
          <Text style={[styles.colHead, styles.inputCol, { color: theme.textSecondary }]}>Reps</Text>
          <Text style={[styles.colHead, styles.inputCol, { color: theme.textSecondary }]}>Weight (lb)</Text>
          <Text style={[styles.colHead, styles.buttonCol, { color: theme.textSecondary }]}>Drop</Text>
          <View style={styles.buttonCol} />
        </View>
      ) : null}
      {groups.map((group) => (
        <View key={group.parent.key} style={styles.group}>
          <SetRow set={group.parent} number={group.number} exerciseKey={exercise.key} edit={edit} disabled={disabled} />
          {group.drops.length > 0 ? (
            <View
              style={[styles.drops, { borderLeftColor: theme.lavender }]}
              accessibilityLabel={`Dropsets for set ${group.number}`}>
              {group.drops.map((drop, i) => (
                <DropRow key={drop.key} set={drop} number={group.number} index={i + 1}
                  exerciseKey={exercise.key} edit={edit} disabled={disabled} />
              ))}
            </View>
          ) : null}
        </View>
      ))}
      <View style={styles.addRow}>
        <Button title="Add set" size="sm" icon="add" fullWidth={false} disabled={disabled}
          onPress={() => edit({ type: 'add-set', exerciseKey: exercise.key, key: draftKey() })} />
      </View>
    </Card>
  );
});

/** A top-level set: reps, weight, "add dropset" and remove. */
const SetRow = memo(function SetRow({ set, number, exerciseKey, edit, disabled }: {
  set: DraftSet; number: number; exerciseKey: string; edit: (action: DraftAction) => void; disabled: boolean;
}) {
  const theme = useTheme();
  const input = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];
  return (
    <View style={styles.row}>
      <Text style={[styles.setNumber, styles.setCol, { color: theme.text }]}>{number}</Text>
      <View style={styles.inputCol}>
        <TextInput accessibilityLabel={`Set ${number} reps`} style={input} keyboardType="number-pad" editable={!disabled} value={set.reps}
          onChangeText={(reps) => edit({ type: 'update-set', exerciseKey, key: set.key, patch: { reps } })} />
      </View>
      <View style={styles.inputCol}>
        <TextInput accessibilityLabel={`Set ${number} weight`} style={input} keyboardType="decimal-pad" editable={!disabled} value={set.weight}
          onChangeText={(weight) => edit({ type: 'update-set', exerciseKey, key: set.key, patch: { weight } })} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Add dropset to set ${number}`} disabled={disabled}
        onPress={() => edit({ type: 'add-dropset', exerciseKey, setKey: set.key, key: draftKey() })}
        style={[styles.iconButton, styles.buttonCol, { backgroundColor: theme.lavender }]}>
        <Ionicons name="arrow-down" size={16} color={theme.text} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove set ${number}`} disabled={disabled}
        onPress={() => edit({ type: 'remove-set', exerciseKey, key: set.key })}
        style={[styles.iconButton, styles.buttonCol, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="remove" size={16} color={theme.text} />
      </Pressable>
    </View>
  );
});

/** A dropset nested under its set. It has no "add dropset" button: dropsets only attach to a top-level set. */
const DropRow = memo(function DropRow({ set, number, index, exerciseKey, edit, disabled }: {
  set: DraftSet; number: number; index: number; exerciseKey: string; edit: (action: DraftAction) => void; disabled: boolean;
}) {
  const theme = useTheme();
  const input = [styles.input, { color: theme.text, backgroundColor: theme.dropsetFill }];
  const name = `Set ${number} drop ${index}`;
  return (
    <View style={styles.row}>
      <Text style={[styles.dropLabel, { color: theme.dropset }]} accessibilityLabel={name}>{`DROP\n${number}.${index}`}</Text>
      <View style={styles.inputCol}>
        <TextInput accessibilityLabel={`${name} reps`} style={input} keyboardType="number-pad" editable={!disabled} value={set.reps}
          onChangeText={(reps) => edit({ type: 'update-set', exerciseKey, key: set.key, patch: { reps } })} />
      </View>
      <View style={styles.inputCol}>
        <TextInput accessibilityLabel={`${name} weight`} style={input} keyboardType="decimal-pad" editable={!disabled} value={set.weight}
          onChangeText={(weight) => edit({ type: 'update-set', exerciseKey, key: set.key, patch: { weight } })} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${name.toLowerCase()}`} disabled={disabled}
        onPress={() => edit({ type: 'remove-set', exerciseKey, key: set.key })}
        style={[styles.iconButton, styles.buttonCol, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="remove" size={16} color={theme.text} />
      </Pressable>
    </View>
  );
});

function errorMessage(cause: unknown) {
  if (typeof cause === 'object' && cause && 'message' in cause && typeof cause.message === 'string') return cause.message;
  return 'Could not save changes. Your draft is still here. Please try again.';
}

const styles = StyleSheet.create({
  editor: { gap: Spacing.two },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  panelTitle: { flex: 1, fontSize: 22, fontFamily: Font.medium },
  panelIcon: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row' },
  stat: { flex: 1, gap: 2 },
  statLabel: { fontSize: 13, fontFamily: Font.medium },
  statValue: { fontSize: 22, fontFamily: Font.medium, letterSpacing: -0.5 },
  statUnit: { fontSize: 13, fontFamily: Font.medium, letterSpacing: 0 },
  error: { fontFamily: Font.semibold, paddingHorizontal: Spacing.two },
  muted: { fontFamily: Font.medium },
  exercise: { gap: Spacing.two, padding: 14 },
  exerciseName: { flex: 1, fontSize: 16, fontFamily: Font.bold },
  exerciseTools: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  muscle: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: Radius.pill },
  muscleText: { fontSize: 12, fontFamily: Font.bold, textTransform: 'capitalize' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  group: { gap: 6 },
  colHead: { fontSize: 12, fontFamily: Font.semibold, textAlign: 'center' },
  setCol: { width: 36, textAlign: 'center' },
  setNumber: { fontSize: 15, fontFamily: Font.bold },
  inputCol: { flex: 1 },
  buttonCol: { width: 36 },
  input: {
    minHeight: 44,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    fontSize: 15,
    fontFamily: Font.semibold,
    textAlign: 'center',
  },
  iconButton: { height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  drops: { marginLeft: 17, paddingLeft: 13, borderLeftWidth: 2, gap: 6 },
  dropLabel: { width: 44, fontSize: 11, lineHeight: 13, fontFamily: Font.extrabold, textAlign: 'center' },
  addRow: { flexDirection: 'row', paddingTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  discard: { flex: 1 },
  save: { flex: 2 },
});
