import { shallow } from 'zustand/shallow';
import { useLayoutStore } from '@/lib/state/store';

/* — value-only selectors — */
export const useActiveContextKey      = () => useLayoutStore(s => s.activeContextKey);
export const useIsSidebarOpen         = () => useLayoutStore(s => s.isSidebarOpen);
export const useIsLoading             = () => useLayoutStore(s => s.isLoadingLayoutState);
export const useLayoutError           = () => useLayoutStore(s => s.error);
export const usePanelLayoutDefinition = () =>
  useLayoutStore(s => s.panelLayoutDefinition, shallow);
export const useShowWorldScene        = () => useLayoutStore(s => s.currentWorld !== 'center');

/* — actions — */
export const useCycleSidebarState = () => useLayoutStore(s => s.cycleSidebarState);
export const useLoadLayoutState   = () => useLayoutStore(s => s.loadLayoutState);

/* —*setter convenience*—  (needed in layout.tsx effect) */
export const setActiveContextKey = (key: string | null) =>
  useLayoutStore.getState().setActiveContext(key);
