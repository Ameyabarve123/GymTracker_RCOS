import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog, type Confirmation } from '@/components/ui/confirm-dialog';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutDraft } from '@/hooks/use-workout-draft';
import { useDeleteWorkout, useSaveWorkout } from '@/hooks/use-workouts';
import { draftExercise, draftKey, fromWorkout, serializeDraft, type DraftAction, type DraftExercise, type DraftSet, type WorkoutDraft } from '@/lib/workout-draft';
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

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{draft.name || 'Workout'}</Text>
        {draft.id ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Delete workout" hitSlop={10} disabled={busy} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={22} color={theme.danger} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text> : null}
      <TextField label="Workout name" value={draft.name} editable={!busy} onChangeText={(name) => edit({ type: 'name', name })} />
      {draft.exercises.length === 0 ? (
        <Card><Text style={{ color: theme.textSecondary }}>No exercises yet. Add one to start logging sets.</Text></Card>
      ) : draft.exercises.map((exercise) => <ExerciseBlock key={exercise.key} exercise={exercise} edit={edit} disabled={busy} />)}
      <Button title="Add Exercise" variant="secondary" disabled={busy} onPress={() => setPickerOpen(true)} />
      {draft.exercises.length > 0 ? <Button title="Save Workout" disabled={!dirty || busy} loading={save.isPending} onPress={handleSave} /> : null}
      {dirty ? <Button title="Discard changes" variant="ghost" disabled={busy} onPress={confirmDiscard} /> : null}
      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)}
        onSelect={(exercise) => edit({ type: 'add-exercise', exercise: draftExercise(exercise) })}
        onCreateDraft={(name) => edit({ type: 'add-exercise', exercise: draftExercise(name) })} />
      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </View>
  );
}

const ExerciseBlock = memo(function ExerciseBlock({ exercise, edit, disabled }: {
  exercise: DraftExercise; edit: (action: DraftAction) => void; disabled: boolean;
}) {
  const theme = useTheme();
  return (
    <Card>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.exerciseName, { color: theme.text }]}>{exercise.name}</Text>
          <Text style={{ color: theme.textSecondary, textTransform: 'capitalize' }}>{exercise.muscle_group}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${exercise.name}`} hitSlop={10} disabled={disabled}
          onPress={() => edit({ type: 'remove-exercise', key: exercise.key })}>
          <Ionicons name="close-circle-outline" size={24} color={theme.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.setsHeader}>
        <Text style={[styles.setCol, { color: theme.textSecondary }]}>Set</Text>
        <Text style={[styles.inputCol, { color: theme.textSecondary, textAlign: 'center' }]}>Reps</Text>
        <Text style={[styles.inputCol, { color: theme.textSecondary, textAlign: 'center' }]}>Weight</Text>
        <Text style={[styles.dropCol, { color: theme.textSecondary }]}>Drop</Text>
        <View style={styles.delCol} />
      </View>
      {exercise.sets.map((set, index) => <SetRow key={set.key} set={set} index={index} exerciseKey={exercise.key} edit={edit} disabled={disabled} />)}
      <Pressable accessibilityRole="button" style={styles.addSet} disabled={disabled}
        onPress={() => edit({ type: 'add-set', exerciseKey: exercise.key, key: draftKey() })}>
        <Ionicons name="add" size={20} color={theme.tint} />
        <Text style={{ color: theme.tint, fontWeight: '700' }}>Add set</Text>
      </Pressable>
    </Card>
  );
});

const SetRow = memo(function SetRow({ set, index, exerciseKey, edit, disabled }: {
  set: DraftSet; index: number; exerciseKey: string; edit: (action: DraftAction) => void; disabled: boolean;
}) {
  const theme = useTheme();
  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }];
  return (
    <View style={styles.row}>
      <Text style={[styles.setCol, { color: theme.text }]}>{index + 1}</Text>
      <View style={styles.inputCol}>
        <TextInput accessibilityLabel={`Set ${index + 1} reps`} style={inputStyle} keyboardType="number-pad" editable={!disabled} value={set.reps}
          onChangeText={(reps) => edit({ type: 'update-set', exerciseKey, key: set.key, patch: { reps } })} />
      </View>
      <View style={styles.inputCol}>
        <TextInput accessibilityLabel={`Set ${index + 1} weight`} style={inputStyle} keyboardType="decimal-pad" editable={!disabled} value={set.weight}
          onChangeText={(weight) => edit({ type: 'update-set', exerciseKey, key: set.key, patch: { weight } })} />
      </View>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={`Set ${index + 1} dropset`} accessibilityState={{ checked: set.is_dropset, disabled }}
        style={styles.dropCol} disabled={disabled} onPress={() => edit({ type: 'update-set', exerciseKey, key: set.key, patch: { is_dropset: !set.is_dropset } })}>
        <Ionicons name={set.is_dropset ? 'checkbox' : 'square-outline'} size={22} color={set.is_dropset ? theme.fats : theme.textSecondary} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove set ${index + 1}`} style={styles.delCol} hitSlop={8} disabled={disabled}
        onPress={() => edit({ type: 'remove-set', exerciseKey, key: set.key })}>
        <Ionicons name="remove-circle-outline" size={22} color={theme.danger} />
      </Pressable>
    </View>
  );
});

function errorMessage(cause: unknown) {
  if (typeof cause === 'object' && cause && 'message' in cause && typeof cause.message === 'string') return cause.message;
  return 'Could not save changes. Your draft is still here. Please try again.';
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  title: { flex: 1, fontSize: 24, fontWeight: '800' },
  exerciseName: { fontSize: 17, fontWeight: '700' },
  setsHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  setCol: { width: 28, textAlign: 'center' },
  inputCol: { flex: 1 },
  dropCol: { width: 38, alignItems: 'center', textAlign: 'center' },
  delCol: { width: 28, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: Spacing.two, paddingVertical: Spacing.two, fontSize: 16, textAlign: 'center', minHeight: 44 },
  addSet: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, marginTop: Spacing.two, alignSelf: 'flex-start' },
});
