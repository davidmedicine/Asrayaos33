// src/lib/state/selectors/layout.ts

import { shallow } from 'zustand/shallow';
import { useStore } from '@/lib/state/store'; // Assuming this is the correct path to your store hook
import type { PanelLayoutDefinition } from '@/lib/components/panels/panel-config-types'; // Assuming type path

// Define expected state structure for clarity (replace with actual import if available)
// interface LayoutSlice {
//   activeContextKey: string | null;
//   panelLayoutDefinition: PanelLayoutDefinition | null;
//   isSidebarOpen: boolean;
//   isLoadingLayoutState: boolean;
//   error: Error | null;
//   cycleSidebarState: () => void;
//   loadLayoutState: () => Promise<void>; // Or appropriate signature
//   setActiveContextKey: (key: string | null) => void;
//   setSidebarOpen: (isOpen: boolean) => void;
// }

// --- State Selectors ---

/**
 * Selects the active context key from the layout state.
 * Returns `null` or the key string. Can be `undefined` briefly before hydration,
 * components should handle this if needed (though typically state values are less
 * problematic than calling undefined actions).
 */
export const useActiveContextKey = () => useStore((s) => s.activeContextKey);

/**
 * Selects the loading status of the layout state.
 */
export const useIsLoading = () => useStore((s) => s.isLoadingLayoutState);

/**
 * Selects whether the sidebar is currently open.
 */
export const useIsSidebarOpen = () => useStore((s) => s.isSidebarOpen);

/**
 * Selects any error associated with the layout state.
 * Uses shallow comparison for memoization as Error objects can be complex.
 */
export const useLayoutError = () => useStore((s) => s.error, shallow);

/**
 * Selects the panel layout definition.
 * Uses shallow comparison for memoization as the definition is likely an object/array.
 */
export const usePanelLayoutDefinition = () =>
	useStore((s) => s.panelLayoutDefinition, shallow);


// --- Action Selectors ---
// These hooks ensure a stable function reference is always returned,
// providing a no-op function before Zustand hydration completes.
// We explicitly avoid `shallow` comparison for action selectors to ensure
// function identity stability based on the actual action function reference.

/**
 * Selects the action to cycle the sidebar state (open/closed).
 * Always returns a function (either the real action or a no-op).
 */
export const useCycleSidebarState = () =>
	useStore(s => s.cycleSidebarState ?? (() => { /* no-op */ }));

/**
 * Selects the action to load the layout state (e.g., from storage or API).
 * Always returns a function (either the real action or a no-op returning a resolved promise).
 */
export const useLoadLayoutState = () =>
	useStore(s => s.loadLayoutState ?? (() => Promise.resolve()));

/**
 * Selects the action to set the active context key.
 * Always returns a function (either the real action or a no-op).
 */
export const useSetActiveContextKey = () =>
	useStore(s => s.setActiveContextKey ?? ((_key: string | null) => { /* no-op */ }));

/**
 * Selects the action to explicitly set the sidebar open state.
 * Always returns a function (either the real action or a no-op).
 */
export const useSetSidebarOpen = () =>
	useStore(s => s.setSidebarOpen ?? ((_isOpen: boolean) => { /* no-op */ }));