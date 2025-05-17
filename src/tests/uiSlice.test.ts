// === File: tests/uiSlice.test.ts ===

import { describe, it, expect, beforeEach, vi } from 'vitest'; // Or Jest equivalent
import { create, type StoreApi } from 'zustand';
import {
  createUISlice,
  initialUIState,
  isConversationTab, // Import the type guard
  tabConfig, // Import tabConfig to test against
  type UISlice,
} from '@/lib/state/slices/uiSlice';

// Define a minimal store type for testing this slice in isolation
type TestState = UISlice;

// Helper to create a fresh store instance for each test
// Note: We omit middleware (persist, devtools) for simpler unit testing of core logic.
const createTestStore = (): StoreApi<TestState> => {
  return create<TestState>()((...args) => ({
    ...createUISlice(...args),
    // Mock any other slice parts if needed for cross-slice interactions (none here)
  }));
};

let store: StoreApi<TestState>;

beforeEach(() => {
  store = createTestStore();
  // Manually reset state before each test to ensure clean slate
  store.setState(initialUIState, true); // Replace state
  vi.spyOn(console, 'warn').mockImplementation(() => {}); // Suppress console.warn
  vi.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.log
  vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
  vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true); // Mock dispatchEvent
});

afterEach(() => {
    vi.restoreAllMocks(); // Clean up spies
});


describe('uiSlice', () => {
  describe('initialization', () => {
    it('should initialize with the default state', () => {
      expect(store.getState().selectedConversationTab).toBe(
        initialUIState.selectedConversationTab
      );
      expect(store.getState().selectedConversationTab).toBe('active');
    });
  });

  describe('setSelectedConversationTab action', () => {
    it('should set the selected tab correctly for valid tabs from tabConfig', () => {
      const { setSelectedConversationTab } = store.getState();
      const validTabsFromConfig = tabConfig.map(t => t.value);

      validTabsFromConfig.forEach(tabValue => {
        setSelectedConversationTab(tabValue);
        expect(store.getState().selectedConversationTab).toBe(tabValue);
      });
    });

    it('should ignore attempts to set an invalid conversation tab', () => {
      const { setSelectedConversationTab } = store.getState();
      const initialTab = store.getState().selectedConversationTab;
      const invalidTabValue = 'some-random-invalid-tab';

      setSelectedConversationTab(invalidTabValue as any); // Cast to bypass TS

      // State should remain unchanged
      expect(store.getState().selectedConversationTab).toBe(initialTab);
      expect(store.getState().selectedConversationTab).toBe('active');
      // Check if warning was logged
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Attempted to set invalid conversation tab')
      );
    });

     it('should not update state or dispatch event if the new tab is the same as the current one', () => {
        const { setSelectedConversationTab } = store.getState();
        const initialTab = store.getState().selectedConversationTab; // 'active'

        setSelectedConversationTab(initialTab); // Set to the same value

        // State should remain unchanged
        expect(store.getState().selectedConversationTab).toBe(initialTab);
        // dispatchEvent should not have been called
        expect(window.dispatchEvent).not.toHaveBeenCalled();
        // console.warn should not have been called
        expect(console.warn).not.toHaveBeenCalled();
    });

    it('should dispatch a CustomEvent on successful tab change (client-side)', () => {
      const { setSelectedConversationTab } = store.getState();

      // Simulate client environment for this test
      const originalWindow = global.window;
      // @ts-ignore - Allow modification for test
      delete global.window;
      // @ts-ignore
      global.window = { dispatchEvent: vi.fn(() => true) } as any; // Mock window with dispatchEvent


      setSelectedConversationTab('saved'); // Change tab

      expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
      expect(window.dispatchEvent).toHaveBeenCalledWith(
         expect.objectContaining({
          type: 'ui:tab-change',
          detail: { tab: 'saved' }
        })
      );

      // Restore original window if necessary or handle cleanup
      global.window = originalWindow;
    });

     it('should NOT dispatch a CustomEvent when not in a browser environment', () => {
        const { setSelectedConversationTab } = store.getState();

        // Simulate non-browser environment
        const originalWindow = global.window;
        // @ts-ignore
        delete global.window; // Remove window object


        setSelectedConversationTab('saved'); // Change tab

        // Dispatch should not be called
        expect(vi.mocked(window.dispatchEvent)).not.toHaveBeenCalled();

        global.window = originalWindow; // Restore window
    });
  });

  describe('resetUIState action', () => {
    it('should reset the state to the initial values', () => {
      const { setSelectedConversationTab, resetUIState } = store.getState();

      // Change the state first
      setSelectedConversationTab('saved');
      expect(store.getState().selectedConversationTab).toBe('saved');

      // Reset the state
      resetUIState();

      // Check if state is back to initial
      expect(store.getState().selectedConversationTab).toBe(
        initialUIState.selectedConversationTab
      );
       expect(store.getState().selectedConversationTab).toBe('active');
       expect(console.log).toHaveBeenCalledWith(expect.stringContaining('UI state reset to defaults'));
    });
  });

  describe('isConversationTab type guard', () => {
    it('should return true for valid tab values from tabConfig', () => {
       tabConfig.forEach(tab => {
        expect(isConversationTab(tab.value)).toBe(true);
      });
    });

    it('should return false for invalid values', () => {
      expect(isConversationTab('invalid-tab')).toBe(false);
      expect(isConversationTab(null)).toBe(false);
      expect(isConversationTab(undefined)).toBe(false);
      expect(isConversationTab(123)).toBe(false);
      expect(isConversationTab({})).toBe(false);
    });
  });

   // Note: Testing middleware behavior like `persist` (migration, rehydration)
   // often requires more complex setup, potentially mocking storage or using
   // integration tests with tools like @testing-library/react.
   // These tests focus on the core slice logic (actions, guards).
});