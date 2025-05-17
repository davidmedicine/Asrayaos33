// ⬅️  src/lib/state/actions/layout.ts  (new file)
import { useLayoutStore } from '@/lib/state/slices/layoutSlice';

/**
 * Bridge for legacy code that still calls `setActiveContextKey`.
 * Prefer calling the store action directly in new code.
 */
export const setActiveContextKey = (key: string | null) =>
  useLayoutStore.getState().setActiveContext(key);
