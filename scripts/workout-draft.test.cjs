const assert = require('node:assert/strict');
const { test } = require('node:test');
const { draftExercise, newWorkout, editDraft, fromWorkout, serializeDraft, draftIsDirty, groupSets } = require('../src/lib/workout-draft.ts');

function draftWithSet() {
  let draft = newWorkout('2026-11-06', 'Push');
  const exercise = draftExercise({ id: 'bench', name: 'Bench press', muscle_group: 'push' });
  draft = editDraft(draft, { type: 'add-exercise', exercise });
  draft = editDraft(draft, { type: 'add-set', exerciseKey: exercise.key, key: 'set-one' });
  return draft;
}

test('edits capture current text without blur and leave the baseline unchanged', () => {
  const baseline = draftWithSet();
  const edited = editDraft(baseline, { type: 'update-set', exerciseKey: baseline.exercises[0].key, key: 'set-one', patch: { reps: '12', weight: '42.5', is_dropset: true } });
  assert.equal(baseline.exercises[0].sets[0].reps, '0');
  assert.deepEqual(serializeDraft(edited).exercises[0].sets[0], { id: null, reps: 12, weight: 42.5, is_dropset: true });
});

test('new sets copy the current last set; removal preserves sibling identities', () => {
  let draft = draftWithSet();
  const exerciseKey = draft.exercises[0].key;
  draft = editDraft(draft, { type: 'update-set', exerciseKey, key: 'set-one', patch: { reps: '10', weight: '45' } });
  draft = editDraft(draft, { type: 'add-set', exerciseKey, key: 'set-two' });
  assert.equal(draft.exercises[0].sets[1].weight, '45');
  draft = editDraft(draft, { type: 'remove-set', exerciseKey, key: 'set-one' });
  assert.equal(draft.exercises[0].sets[0].key, 'set-two');
  assert.equal(serializeDraft(draft).exercises[0].sets.length, 1);
});

test('invalid and incomplete numeric input remains editable but cannot be saved', () => {
  const baseline = draftWithSet();
  for (const patch of [{ reps: '' }, { reps: '-1' }, { reps: '1.5' }, { reps: '1e2' }, { reps: '2147483648' }, { weight: '' }, { weight: '-1' }, { weight: '10000' }, { weight: '2.345' }, { weight: 'Infinity' }]) {
    const draft = editDraft(baseline, { type: 'update-set', exerciseKey: baseline.exercises[0].key, key: 'set-one', patch });
    assert.throws(() => serializeDraft(draft));
    assert.equal(draft.exercises[0].sets[0][Object.keys(patch)[0]], Object.values(patch)[0]);
  }
});

test('zero and locale decimal commas are valid', () => {
  const baseline = draftWithSet();
  const draft = editDraft(baseline, { type: 'update-set', exerciseKey: baseline.exercises[0].key, key: 'set-one', patch: { reps: '0', weight: '12,50' } });
  assert.equal(serializeDraft(draft).exercises[0].sets[0].weight, 12.5);
});

test('custom exercises stay local and removed new exercises never enter the payload', () => {
  let draft = newWorkout('2026-11-06', 'Custom');
  const exercise = draftExercise('Cable row');
  draft = editDraft(draft, { type: 'add-exercise', exercise });
  assert.equal(serializeDraft(draft).exercises[0].exercise_id, null);
  assert.equal(serializeDraft(draft).exercises[0].custom_name, 'Cable row');
  draft = editDraft(draft, { type: 'remove-exercise', key: exercise.key });
  assert.deepEqual(serializeDraft(draft).exercises, []);
});

test('dirty tracking clears when edits are undone and preserves saved IDs/revision', () => {
  const baseline = fromWorkout({ id: 'saved', revision: 3, name: 'Legs', workout_date: '2026-11-06', preset_id: null, workout_exercises: [] });
  assert.equal(draftIsDirty(baseline, baseline), false);
  const changed = editDraft(baseline, { type: 'name', name: 'Other' });
  assert.equal(draftIsDirty(changed, baseline), true);
  const restored = editDraft(changed, { type: 'name', name: 'Legs' });
  assert.equal(draftIsDirty(restored, baseline), false);
  assert.equal(serializeDraft(restored).revision, 3);
  const fresh = newWorkout('2026-11-06', 'Legs');
  assert.equal(draftIsDirty(fresh, fresh), true);
});

test('editing one exercise preserves other object references for memoized rows', () => {
  let draft = draftWithSet();
  draft = editDraft(draft, { type: 'add-exercise', exercise: draftExercise('Squat') });
  const untouched = draft.exercises[1];
  const changed = editDraft(draft, { type: 'update-set', exerciseKey: draft.exercises[0].key, key: 'set-one', patch: { reps: '8' } });
  assert.equal(changed.exercises[1], untouched);
});

function shape(draft) {
  return groupSets(draft.exercises[0].sets).map((g) => [g.parent.key, ...g.drops.map((d) => d.key)]);
}

test('dropsets nest under the top-level set, even when added from a dropset', () => {
  let draft = draftWithSet();
  const exerciseKey = draft.exercises[0].key;
  draft = editDraft(draft, { type: 'update-set', exerciseKey, key: 'set-one', patch: { reps: '8', weight: '100' } });
  draft = editDraft(draft, { type: 'add-set', exerciseKey, key: 'set-two' });
  draft = editDraft(draft, { type: 'add-dropset', exerciseKey, setKey: 'set-one', key: 'drop-a' });
  // Asking a dropset for a dropset still attaches the new one to the parent set, after its siblings.
  draft = editDraft(draft, { type: 'add-dropset', exerciseKey, setKey: 'drop-a', key: 'drop-b' });
  assert.deepEqual(shape(draft), [['set-one', 'drop-a', 'drop-b'], ['set-two']]);
  assert.deepEqual(draft.exercises[0].sets.map((s) => s.is_dropset), [false, true, true, false]);
  assert.equal(draft.exercises[0].sets[1].weight, '100');
});

test('new top-level sets copy the last top-level set, not a lighter dropset', () => {
  let draft = draftWithSet();
  const exerciseKey = draft.exercises[0].key;
  draft = editDraft(draft, { type: 'update-set', exerciseKey, key: 'set-one', patch: { weight: '100' } });
  draft = editDraft(draft, { type: 'add-dropset', exerciseKey, setKey: 'set-one', key: 'drop-a' });
  draft = editDraft(draft, { type: 'update-set', exerciseKey, key: 'drop-a', patch: { weight: '60' } });
  draft = editDraft(draft, { type: 'add-set', exerciseKey, key: 'set-two' });
  assert.equal(draft.exercises[0].sets[2].weight, '100');
  assert.equal(draft.exercises[0].sets[2].is_dropset, false);
});

test('removing a set removes its dropsets; removing a dropset keeps its set', () => {
  let draft = draftWithSet();
  const exerciseKey = draft.exercises[0].key;
  draft = editDraft(draft, { type: 'add-dropset', exerciseKey, setKey: 'set-one', key: 'drop-a' });
  draft = editDraft(draft, { type: 'add-set', exerciseKey, key: 'set-two' });
  draft = editDraft(draft, { type: 'add-dropset', exerciseKey, setKey: 'set-two', key: 'drop-b' });
  draft = editDraft(draft, { type: 'remove-set', exerciseKey, key: 'drop-b' });
  assert.deepEqual(shape(draft), [['set-one', 'drop-a'], ['set-two']]);
  draft = editDraft(draft, { type: 'remove-set', exerciseKey, key: 'set-one' });
  assert.deepEqual(shape(draft), [['set-two']]);
});

test('validation errors name dropsets the way the screen does', () => {
  let draft = draftWithSet();
  const exerciseKey = draft.exercises[0].key;
  draft = editDraft(draft, { type: 'add-dropset', exerciseKey, setKey: 'set-one', key: 'drop-a' });
  draft = editDraft(draft, { type: 'update-set', exerciseKey, key: 'drop-a', patch: { reps: '' } });
  assert.throws(() => serializeDraft(draft), /Bench press, set 1, drop 1:/);
});
