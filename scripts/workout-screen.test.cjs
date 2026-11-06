/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test, beforeEach, afterEach } = require('node:test');
const React = require('react');
const { create, act } = require('react-test-renderer');
const ts = require('typescript');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let renderer;
let day;
let guard;
let writes;
let refreshes;
let navigations;
let persist;
const listeners = new Set();
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = () => day;
const theme = { text: '#000', textSecondary: '#555', tint: '#00f', danger: '#f00', border: '#ccc' };

function canonical(input) {
  return { id: input.id ?? 'new-workout', revision: input.revision + 1, user_id: 'user', name: input.name,
    workout_date: input.workout_date, preset_id: input.preset_id, notes: null, created_at: '2026-11-06',
    workout_exercises: input.exercises.map((e, i) => ({ id: e.id ?? `exercise-${i}`, workout_id: input.id,
      exercise_id: e.exercise_id ?? `custom-${i}`, order_index: i,
      exercise: { id: e.exercise_id, name: 'Bench press', muscle_group: 'push' },
      exercise_sets: e.sets.map((s, j) => ({ ...s, id: s.id ?? `set-${j}`, workout_exercise_id: e.id, set_number: j + 1, order_index: j + 1 })),
    })),
  };
}
function useSaveWorkout() {
  const [isPending, setPending] = React.useState(false);
  const mutateAsync = React.useCallback(async (args) => {
    writes.push(args);
    setPending(true);
    try {
      const saved = await persist(args);
      day = { ...day, data: day.data.some((w) => w.id === saved.id)
        ? day.data.map((w) => w.id === saved.id ? saved : w) : [...day.data, saved] };
      listeners.forEach((notify) => notify());
      return saved;
    } finally { setPending(false); }
  }, []);
  return { isPending, mutateAsync };
}

// Model Android's actual ScrollView topology: RefreshControl wraps NativeScrollView.
// Removing refreshControl therefore remounts every editor below it.
function ScrollView({ refreshControl, children, ...props }) {
  const content = React.createElement('NativeScrollView', props, children);
  return refreshControl ? React.cloneElement(refreshControl, {}, content) : content;
}

const mocks = {
  'react-native': { Text: 'Text', View: 'View', Pressable: 'Pressable', TextInput: 'TextInput',
    ActivityIndicator: 'ActivityIndicator', RefreshControl: 'RefreshControl', ScrollView,
    Modal: ({ visible, children }) => visible ? React.createElement('Modal', {}, children) : null,
    StyleSheet: { create: (styles) => styles },
  },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
  '@expo/vector-icons': { Ionicons: 'Icon' },
  'expo-router': { Stack: { Screen: () => null }, useLocalSearchParams: () => ({ date: '2026-11-06' }),
    usePreventRemove: (enabled, callback) => { React.useLayoutEffect(() => { guard = { enabled, callback }; }); },
  },
  '@/constants/theme': { Spacing: { two: 8, three: 12, four: 16, six: 24 }, MaxContentWidth: 600 },
  '@/hooks/use-theme': { useTheme: () => theme },
  '@/hooks/use-presets': { usePresets: () => ({ data: [] }) },
  '@/lib/auth': { useAuth: () => ({ userId: 'user' }) },
  '@/lib/date': { formatPretty: (date) => date },
  '@/components/exercise-picker': { ExercisePicker: (props) => React.createElement('ExercisePicker', props) },
  '@/hooks/use-workouts': { useWorkoutDay: () => React.useSyncExternalStore(subscribe, snapshot), useSaveWorkout,
    useDeleteWorkout: () => ({ isPending: false, mutateAsync: async () => {} }),
  },
};

// Compile the real route/components/hooks; only native hosts, routing, and I/O are mocked.
const modules = new Map();
function loadSource(path) {
  let filename = resolve(__dirname, '../src', path);
  if (!/\.tsx?$/.test(filename)) {
    try { readFileSync(`${filename}.tsx`); filename += '.tsx'; }
    catch { filename += '.ts'; }
  }
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  const localRequire = (name) => mocks[name] ?? (name.startsWith('@/') ? loadSource(name.slice(2)) : require(name));
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports);
  return module.exports;
}
const WorkoutDayScreen = loadSource('app/workout/[date].tsx').default;
const presses = (title) => renderer.root.findAllByType('Pressable').filter((node) =>
  node.findAllByType('Text').some((text) => text.children.includes(title)));
const input = (label) => renderer.root.findByProps({ accessibilityLabel: label });
async function back() { await act(async () => { guard.callback({ repeat: () => { navigations++; } }); }); }
async function mount() { await act(async () => { renderer = create(React.createElement(WorkoutDayScreen)); }); }

beforeEach(() => {
  writes = []; refreshes = 0; navigations = 0;
  persist = async ({ p_workout }) => canonical(p_workout);
  day = { isPending: false, isError: false, isSuccess: true,
    refetch: async () => { refreshes++; },
    data: [canonical({ id: 'workout', revision: 0, name: 'Push', workout_date: '2026-11-06', preset_id: null,
      exercises: [{ id: 'bench', exercise_id: 'bench-library', sets: [{ id: 'original-set', reps: 8, weight: 40, is_dropset: false }] }],
    })],
  };
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); renderer = null; });

test('repeated Add Set preserves the Android scroll/editor and never saves or refreshes', async () => {
  await mount();
  const scroll = renderer.root.findByType('NativeScrollView');
  await act(async () => input('Set 1 reps').props.onChangeText('12'));
  for (let count = 0; count < 3; count++) await act(async () => presses('Add set')[0].props.onPress());
  assert.equal(renderer.root.findByType('NativeScrollView'), scroll);
  assert.equal(input('Set 1 reps').props.value, '12');
  assert.equal(input('Set 4 reps').props.value, '12');
  assert.equal(writes.length, 0);
  const refresh = renderer.root.findByType('RefreshControl');
  assert.equal(refresh.props.enabled, false);
  await act(async () => refresh.props.onRefresh());
  assert.equal(refreshes, 0);
  assert.equal(guard.enabled, true);
});

test('Back saves current input and added sets, then resumes navigation only after success', async () => {
  await mount();
  await act(async () => presses('Add set')[0].props.onPress());
  await act(async () => input('Set 2 weight').props.onChangeText('52.5'));
  let resolveSave;
  persist = ({ p_workout }) => new Promise((resolve) => { resolveSave = () => resolve(canonical(p_workout)); });
  await back();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].p_workout.exercises[0].sets[1].weight, 52.5);
  assert.equal(navigations, 0);
  assert.equal(input('Set 1 reps').props.editable, false);
  await back();
  assert.equal(writes.length, 1);
  await act(async () => resolveSave());
  assert.equal(navigations, 1);
  assert.equal(guard.enabled, false);
});

test('failed exit save retains edits and allows an idempotent Back retry', async () => {
  await mount();
  await act(async () => presses('Add set')[0].props.onPress());
  persist = async () => { throw new Error('Offline'); };
  await back();
  assert.equal(navigations, 0);
  assert.equal(guard.enabled, true);
  assert.equal(input('Set 2 reps').props.value, '8');
  assert.equal(input('Set 1 reps').props.editable, true);
  persist = async ({ p_workout }) => canonical(p_workout);
  await back();
  assert.equal(navigations, 1);
  assert.equal(writes[0].p_save_token, writes[1].p_save_token);
});

test('invalid input blocks exit without a write and can be corrected and saved', async () => {
  await mount();
  await act(async () => input('Set 1 reps').props.onChangeText(''));
  await back();
  assert.equal(navigations, 0);
  assert.equal(writes.length, 0);
  assert.equal(input('Set 1 reps').props.value, '');
  await act(async () => input('Set 1 reps').props.onChangeText('10'));
  await back();
  assert.equal(writes.length, 1);
  assert.equal(navigations, 1);
});

test('Back during a manual save waits for the existing request', async () => {
  await mount();
  await act(async () => presses('Add set')[0].props.onPress());
  let resolveSave;
  persist = ({ p_workout }) => new Promise((resolve) => { resolveSave = () => resolve(canonical(p_workout)); });
  await act(async () => { void presses('Save Workout')[0].props.onPress(); });
  await back();
  assert.equal(writes.length, 1);
  assert.equal(navigations, 0);
  await act(async () => resolveSave());
  assert.equal(navigations, 1);
});

test('clean workouts do not block navigation or write to the database', async () => {
  await mount();
  assert.equal(guard.enabled, false);
  assert.equal(writes.length, 0);
});

test('a new workout with local sets also saves on Back', async () => {
  day = { ...day, data: [] };
  await mount();
  await act(async () => presses('Start empty workout')[0].props.onPress());
  await act(async () => renderer.root.findByType('ExercisePicker').props.onCreateDraft('New exercise'));
  await act(async () => presses('Add set')[0].props.onPress());
  assert.equal(writes.length, 0);
  await back();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].p_workout.exercises[0].custom_name, 'New exercise');
  assert.equal(navigations, 1);
});
