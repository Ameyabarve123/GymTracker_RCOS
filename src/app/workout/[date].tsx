import { useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { NewWorkout } from '@/components/new-workout';
import { Button } from '@/components/ui/button';
import { Chip, ChipRow, CircleButton, GradientHeader } from '@/components/ui/gradient-header';
import { Screen } from '@/components/ui/screen';
import { WorkoutEditor } from '@/components/workout-editor';
import { Font, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutDay } from '@/hooks/use-workouts';
import { useAuth } from '@/lib/auth';
import { formatDayMonthYear } from '@/lib/date';
import { fromWorkout, type WorkoutDraft } from '@/lib/workout-draft';

export default function WorkoutDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { userId } = useAuth();
  return <WorkoutDay key={`${userId}:${date}`} dateKey={date ?? ''} signedIn={!!userId} />;
}

function WorkoutDay({ dateKey, signedIn }: { dateKey: string; signedIn: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const day = useWorkoutDay(dateKey);
  const [newDraft, setNewDraft] = useState<WorkoutDraft | null>(null);
  const [statuses, setStatuses] = useState<Record<string, { dirty: boolean; busy: boolean }>>({});
  const [leaving, setLeaving] = useState(false);
  const [savingOnExit, setSavingOnExit] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);
  const saveHandlers = useRef(new Map<string, () => Promise<boolean>>());
  const exitPending = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const dirty = !!newDraft || Object.values(statuses).some((status) => status.dirty);
  const busy = Object.values(statuses).some((status) => status.busy);
  const onStatus = useCallback((key: string, isDirty: boolean, isBusy: boolean) => {
    setStatuses((previous) => {
      if (previous[key]?.dirty === isDirty && previous[key]?.busy === isBusy) return previous;
      const next = { ...previous };
      if (isDirty || isBusy) next[key] = { dirty: isDirty, busy: isBusy };
      else delete next[key];
      return next;
    });
  }, []);
  const registerSave = useCallback((key: string, save: (() => Promise<boolean>) | null) => {
    if (save) saveHandlers.current.set(key, save);
    else saveHandlers.current.delete(key);
  }, []);
  const closeNew = useCallback(() => setNewDraft(null), []);

  usePreventRemove(signedIn && !leaving && (dirty || busy || savingOnExit), ({ repeat }) => {
    if (exitPending.current) return;
    exitPending.current = true;
    setSavingOnExit(true);
    setExitError(null);
    const handlers = [...saveHandlers.current.values()];
    void Promise.all(handlers.map((save) => save())).then((results) => {
      if (handlers.length > 0 && results.every(Boolean)) {
        setLeaving(true);
        repeat();
      } else {
        setExitError('Your changes could not be saved. Check the workout below, then go back to retry.');
      }
    }).catch(() => {
      setExitError('Your changes could not be saved. Please try going back again.');
    }).finally(() => {
      exitPending.current = false;
      setSavingOnExit(false);
    });
  });

  async function refresh() {
    setRefreshing(true);
    try { await day.refetch(); } finally { setRefreshing(false); }
  }

  const count = day.data?.length ?? 0;
  const status = savingOnExit || busy
    ? { label: 'Saving…', tone: theme.textSecondary }
    : dirty ? { label: 'Unsaved', tone: theme.warning } : count > 0 ? { label: 'Saved', tone: theme.success } : null;

  const header = (
    <GradientHeader
      title="Workout Details"
      subtitle={formatDayMonthYear(dateKey)}
      left={<CircleButton icon="arrow-back" accessibilityLabel={dirty ? 'Back (saves changes)' : 'Back'} onPress={() => router.back()} />}
      right={<View />}>
      {count > 0 || status ? (
        <ChipRow>
          {count > 0 ? <Chip>{`${count} workout${count === 1 ? '' : 's'}`}</Chip> : null}
          {status ? <Chip tone={status.tone}>{status.label}</Chip> : null}
        </ChipRow>
      ) : null}
    </GradientHeader>
  );

  return (
    <>
      {/* Keep RefreshControl mounted: removing it remounts Android's scroll subtree. */}
      <Screen header={header} refreshing={refreshing} onRefresh={refresh} refreshEnabled={!dirty && !busy && !savingOnExit}>
        {savingOnExit ? <Text accessibilityLiveRegion="polite" style={[styles.note, { color: theme.text }]}>Saving your workout before leaving…</Text> : null}
        {exitError ? <Text accessibilityRole="alert" style={[styles.note, { color: theme.danger }]}>{exitError}</Text> : null}
        {day.isPending ? <ActivityIndicator accessibilityLabel="Loading workouts" color={theme.text} /> : null}
        {day.isError ? <>
          <Text style={[styles.note, { color: theme.danger }]}>Could not load saved workouts. Your edits have been kept.</Text>
          {!dirty && !busy ? <Button title="Retry" onPress={refresh} /> : null}
        </> : null}
        {(day.data ?? []).map((workout) => (
          <WorkoutEditor key={workout.id} initial={fromWorkout(workout)} workout={workout}
            onStatus={onStatus} onCloseNew={closeNew} onReload={refresh} registerSave={registerSave} savingOnExit={savingOnExit} />
        ))}
        {newDraft ? (
          <WorkoutEditor key={newDraft.key} initial={newDraft} onStatus={onStatus} onCloseNew={closeNew} onReload={refresh}
            registerSave={registerSave} savingOnExit={savingOnExit} />
        ) : day.isSuccess && day.data.length === 0 ? (
          <NewWorkout dateKey={dateKey} onCreate={setNewDraft} />
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: Font.semibold, paddingHorizontal: Spacing.two },
});
