import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePresets } from '@/hooks/use-presets';
import {
  useAddSet,
  useAddWorkoutExercise,
  useCreateWorkout,
  useDeleteSet,
  useDeleteWorkout,
  useDeleteWorkoutExercise,
  useUpdateSet,
  useWorkoutDay,
  type WorkoutExerciseWithData,
  type WorkoutWithData,
} from '@/hooks/use-workouts';
import { formatPretty } from '@/lib/date';
import type { Exercise, ExerciseSet } from '@/types/database';

export default function WorkoutDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const dateKey = date ?? '';

  const day = useWorkoutDay(dateKey);
  const workouts = day.data ?? [];

  return (
    <>
      <Stack.Screen options={{ title: formatPretty(dateKey) }} />
      <Screen refreshing={day.isRefetching} onRefresh={() => day.refetch()}>
        {workouts.length === 0 ? (
          <CreateWorkout dateKey={dateKey} />
        ) : (
          workouts.map((w) => <WorkoutBlock key={w.id} workout={w} dateKey={dateKey} />)
        )}
      </Screen>
    </>
  );
}

function CreateWorkout({ dateKey }: { dateKey: string }) {
  const theme = useTheme();
  const createWorkout = useCreateWorkout(dateKey);
  const presets = usePresets();
  const [name, setName] = useState('');

  async function create(presetId: string | null, fallbackName: string) {
    const workoutName = name.trim() || fallbackName;
    await createWorkout.mutateAsync({ name: workoutName, presetId });
  }

  return (
    <>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>New workout</Text>
      <TextField
        label="Workout name"
        placeholder="e.g. Push Day"
        value={name}
        onChangeText={setName}
      />
      <Button
        title="Start empty workout"
        loading={createWorkout.isPending}
        onPress={() => create(null, 'Workout')}
      />

      {(presets.data ?? []).length > 0 ? (
        <View style={{ gap: Spacing.two }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Start from a preset</Text>
          {(presets.data ?? []).map((preset) => (
            <Pressable key={preset.id} onPress={() => create(preset.id, preset.name)}>
              <Card style={styles.presetRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.presetName, { color: theme.text }]}>{preset.name}</Text>
                  <Text style={[styles.presetMeta, { color: theme.textSecondary }]}>
                    {preset.preset_exercises.length} exercises
                  </Text>
                </View>
                <Ionicons name="play-circle" size={24} color={theme.tint} />
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  );
}

function WorkoutBlock({ workout, dateKey }: { workout: WorkoutWithData; dateKey: string }) {
  const theme = useTheme();
  const addExercise = useAddWorkoutExercise(dateKey);
  const deleteWorkout = useDeleteWorkout(dateKey);
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleSelectExercise(exercise: Exercise) {
    addExercise.mutate({
      workoutId: workout.id,
      exerciseId: exercise.id,
      orderIndex: workout.workout_exercises.length,
    });
  }

  function confirmDeleteWorkout() {
    Alert.alert('Delete workout', `Delete "${workout.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout.mutate(workout.id) },
    ]);
  }

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={styles.workoutHeader}>
        <Text style={[styles.workoutName, { color: theme.text }]}>{workout.name}</Text>
        <Pressable hitSlop={10} onPress={confirmDeleteWorkout}>
          <Ionicons name="trash-outline" size={20} color={theme.danger} />
        </Pressable>
      </View>

      {workout.workout_exercises.length === 0 ? (
        <Card>
          <Text style={{ color: theme.textSecondary }}>
            No exercises yet. Add one to start logging sets.
          </Text>
        </Card>
      ) : (
        workout.workout_exercises.map((we) => (
          <ExerciseBlock key={we.id} workoutExercise={we} dateKey={dateKey} />
        ))
      )}

      <Button
        title="Add Exercise"
        variant="secondary"
        onPress={() => setPickerOpen(true)}
      />

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectExercise}
      />
    </View>
  );
}

function ExerciseBlock({
  workoutExercise,
  dateKey,
}: {
  workoutExercise: WorkoutExerciseWithData;
  dateKey: string;
}) {
  const theme = useTheme();
  const addSet = useAddSet(dateKey);
  const deleteExercise = useDeleteWorkoutExercise(dateKey);

  const sets = workoutExercise.exercise_sets;

  function handleAddSet() {
    const last = sets[sets.length - 1];
    addSet.mutate({
      workoutExerciseId: workoutExercise.id,
      setNumber: sets.length + 1,
      reps: last?.reps ?? 0,
      weight: last?.weight ?? 0,
    });
  }

  return (
    <Card>
      <View style={styles.exerciseHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.exerciseName, { color: theme.text }]}>
            {workoutExercise.exercise?.name ?? 'Exercise'}
          </Text>
          <Text style={[styles.exerciseMeta, { color: theme.textSecondary }]}>
            {workoutExercise.exercise?.muscle_group}
          </Text>
        </View>
        <Pressable hitSlop={10} onPress={() => deleteExercise.mutate(workoutExercise.id)}>
          <Ionicons name="close-circle-outline" size={22} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.setsHeaderRow}>
        <Text style={[styles.setsHeaderCell, styles.setCol, { color: theme.textSecondary }]}>Set</Text>
        <Text style={[styles.setsHeaderCell, styles.inputCol, { color: theme.textSecondary }]}>Reps</Text>
        <Text style={[styles.setsHeaderCell, styles.inputCol, { color: theme.textSecondary }]}>Weight</Text>
        <Text style={[styles.setsHeaderCell, styles.dropCol, { color: theme.textSecondary }]}>Drop</Text>
        <View style={styles.delCol} />
      </View>

      {sets.map((set, i) => (
        <SetRow key={set.id} set={set} index={i} dateKey={dateKey} />
      ))}

      <Pressable style={styles.addSetBtn} onPress={handleAddSet}>
        <Ionicons name="add" size={18} color={theme.tint} />
        <Text style={[styles.addSetText, { color: theme.tint }]}>Add set</Text>
      </Pressable>
    </Card>
  );
}

function SetRow({ set, index, dateKey }: { set: ExerciseSet; index: number; dateKey: string }) {
  const theme = useTheme();
  const updateSet = useUpdateSet(dateKey);
  const deleteSet = useDeleteSet(dateKey);
  const [reps, setReps] = useState(String(set.reps));
  const [weight, setWeight] = useState(String(set.weight));

  const inputStyle = [
    styles.setInput,
    { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
  ];

  return (
    <View style={styles.setRow}>
      <Text style={[styles.setCol, styles.setNumber, { color: theme.text }]}>{index + 1}</Text>
      <View style={styles.inputCol}>
        <TextInput
          style={inputStyle}
          keyboardType="numeric"
          value={reps}
          onChangeText={setReps}
          onEndEditing={() => updateSet.mutate({ id: set.id, patch: { reps: Number(reps) || 0 } })}
        />
      </View>
      <View style={styles.inputCol}>
        <TextInput
          style={inputStyle}
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
          onEndEditing={() =>
            updateSet.mutate({ id: set.id, patch: { weight: Number(weight) || 0 } })
          }
        />
      </View>
      <Pressable
        style={styles.dropCol}
        onPress={() => updateSet.mutate({ id: set.id, patch: { is_dropset: !set.is_dropset } })}>
        <Ionicons
          name={set.is_dropset ? 'checkbox' : 'square-outline'}
          size={20}
          color={set.is_dropset ? theme.fats : theme.textSecondary}
        />
      </Pressable>
      <Pressable style={styles.delCol} hitSlop={8} onPress={() => deleteSet.mutate(set.id)}>
        <Ionicons name="remove-circle-outline" size={20} color={theme.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  presetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  presetName: { fontSize: 16, fontWeight: '700' },
  presetMeta: { fontSize: 13 },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workoutName: { fontSize: 24, fontWeight: '800' },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center' },
  exerciseName: { fontSize: 17, fontWeight: '700' },
  exerciseMeta: { fontSize: 12, textTransform: 'capitalize' },
  setsHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.two },
  setsHeaderCell: { fontSize: 12, fontWeight: '600' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  setCol: { width: 32, textAlign: 'center' },
  setNumber: { fontSize: 15, fontWeight: '700' },
  inputCol: { flex: 1 },
  dropCol: { width: 44, alignItems: 'center' },
  delCol: { width: 32, alignItems: 'center' },
  setInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 15,
    textAlign: 'center',
  },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.two, alignSelf: 'flex-start' },
  addSetText: { fontSize: 14, fontWeight: '700' },
});
