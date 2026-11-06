import { useCallback, useEffect, useReducer } from 'react';

import { draftIsDirty, editDraft, fromWorkout, type DraftAction, type WorkoutDraft } from '@/lib/workout-draft';
import type { WorkoutWithData } from '@/types/database';

type State = { draft: WorkoutDraft; baseline: WorkoutDraft };
type Action = DraftAction | { type: 'accept'; draft: WorkoutDraft } | { type: 'reset' };
function reducer(state: State, action: Action): State {
  if (action.type === 'accept') return { draft: action.draft, baseline: action.draft };
  if (action.type === 'reset') return { ...state, draft: state.baseline };
  return { ...state, draft: editDraft(state.draft, action) };
}

export function useWorkoutDraft(initial: WorkoutDraft, server: WorkoutWithData | undefined, busy: boolean) {
  const [state, dispatch] = useReducer(reducer, { draft: initial, baseline: initial });
  const dirty = draftIsDirty(state.draft, state.baseline);

  // Background query changes may replace a clean draft, never a user's edits.
  useEffect(() => {
    if (server && !dirty && !busy) dispatch({ type: 'accept', draft: fromWorkout(server) });
  }, [server, dirty, busy]);

  const edit = useCallback((action: DraftAction) => dispatch(action), []);
  return { draft: state.draft, dirty, edit, dispatch };
}
