// src/components/panels/PanelGroup/subcomponents/index.ts
/**
 * Exports all the subcomponents used by the PanelGroup layouts.
 * This allows importing from a single place:
 * import { FloatingPad, PanelLoader } from './subcomponents';
 */

export { default as FloatingPad } from './FloatingPad';
export { default as PanelLoader } from './PanelLoader';
export { default as PanelErrorFallback } from './PanelErrorFallback';
export { default as MobileNavButtons } from './MobileNavButtons';
export { default as ErrorBoundary } from './ErrorBoundary';

// External components used by PanelGroup that we re-export for convenience
export { ResizeHandle } from '@/components/ui/ResizeHandle';