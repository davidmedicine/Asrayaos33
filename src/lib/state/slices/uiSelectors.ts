// === File: src/lib/state/slices/uiSelectors.ts ===

/**
 * Selectors for the UI slice (`UISlice`).
 * These hooks encapsulate state access and selection logic, promoting
 * component decoupling and enabling optimizations like `shallow` comparison.
 * They rely on the central `useStore` hook exported from the main store setup.
 */

import { shallow } from 'zustand/shallow';
// Assuming your central store composits slices and exports `useStore` like this
import { useStore } from '@/lib/state/store';
// Import the type from the shared types file
import type { ConversationTabType } from '@/types/chat';
// Import actions type for selector hook return type safety
import type { UISliceActions } from './uiSlice';

/**
 * Hook to select the currently active conversation tab.
 * @returns {ConversationTabType} The current value of selectedConversationTab.
 */
export const useConversationTab = (): ConversationTabType => {
  // Direct selection, Zustand handles memoization based on selector result change
  return useStore((state) => state.selectedConversationTab);
};

/**
 * Hook to check if the 'saved' tab is currently selected.
 * Uses `shallow` comparison primarily as a demonstration; it's unnecessary
 * here because the selector returns a primitive boolean. However, this pattern
 * is crucial for selectors returning objects or arrays to prevent unnecessary
 * re-renders when the reference changes but shallow content remains the same.
 * @returns {boolean} True if the selected tab is 'saved', false otherwise.
 */
export const useIsSavedTab = (): boolean => {
  return useStore((state) => state.selectedConversationTab === 'saved', shallow);
};

/**
 * Hook to get the action for setting the conversation tab.
 * Useful for components that only need to dispatch this action, not read state.
 * @returns {UISliceActions['setSelectedConversationTab']} The action function.
 */
export const useSetConversationTab = (): UISliceActions['setSelectedConversationTab'] => {
  // Selecting an action function; reference is stable, memoization is inherent.
  return useStore((state) => state.setSelectedConversationTab);
};

/**
 * Hook to get the action for resetting the UI state.
 * @returns {UISliceActions['resetUIState']} The action function.
 */
export const useResetUIState = (): UISliceActions['resetUIState'] => {
  return useStore((state) => state.resetUIState);
};

// Add other selector hooks here as needed