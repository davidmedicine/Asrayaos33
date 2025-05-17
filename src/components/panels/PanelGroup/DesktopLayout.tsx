/* ──────────────────────────────────────────────────────────────
   File: src/components/panels/PanelGroup/DesktopLayout.tsx
   Purpose: Desktop layout – renders all defined panels side-by-side
            using flexbox, passing necessary state like `isActive`
            and `alwaysVisible` down to each panel component.
   Version: 2.1.1 (Confirmed Prop Passing & Inactive Style Cleanup)
   Engineer: Gemini AI
   Changes:
     - Removed opacity styling from FloatingPad for inactive panels.
     - Confirmed `isActive` and `alwaysVisible` props are correctly passed down.
   ---------------------------------------------------------------- */

   'use client';

   import React, { memo, Suspense, useCallback, useRef, CSSProperties } from 'react';
   import { shallow }       from 'zustand/shallow';
   import { cn }            from '@/lib/utils';

   import { useLayoutStore } from '@/lib/state/slices/layoutSlice';
   // import { useInteractionContext }   from '@/hooks/useInteractionContext'; // Not needed here
   import {
        resolvePanelComponent,
        panelComponentRegistry as defaultPanelRegistry
    } from '@/lib/core/panelRegistry';

   import { FloatingPad, PanelLoader, PanelErrorFallback, ErrorBoundary } from './subcomponents';

   import type { PanelLayoutDefinition, PanelInstance } from '@/types/layout';

   /* ------------------------------------------------------------------ */
   /* Helpers                                                            */
   /* ------------------------------------------------------------------ */

   // computeFlexStyle remains the same as provided previously...
   function computeFlexStyle(panel: PanelInstance): CSSProperties {
     const { defaultSize, defaultSizeUnit = '%', minSize, maxSize } = panel;
     const style: CSSProperties = {};
     if (defaultSize != null) {
       switch (defaultSizeUnit) {
         case '%': style.flex = `0 0 ${defaultSize}%`; break;
         case 'px': style.flex = `0 0 ${defaultSize}px`; break;
         case 'fr': style.flex = `${defaultSize} ${defaultSize} 0%`; break;
         default: style.flex = `1 1 0%`;
       }
     } else {
       style.flex = `1 1 0%`;
     }
     // Basic unit handling for min/max (may need refinement for mixed units)
     if (minSize != null) style.minWidth = `${minSize}${defaultSizeUnit === 'px' ? 'px' : '%'}`;
     if (maxSize != null) style.maxWidth = `${maxSize}${defaultSizeUnit === 'px' ? 'px' : '%'}`;
     return style;
   }

   /* ------------------------------------------------------------------ */
   /* Component Definition                                               */
   /* ------------------------------------------------------------------ */

   export interface DesktopLayoutProps {
     instanceId: string;
     className?: string;
     panelLayoutDefinition: PanelLayoutDefinition;
     panels: PanelInstance[];
     desktopAlwaysVisible?: boolean;
   }

   export const DesktopLayout = memo(function DesktopLayout({
     instanceId,
     className = '',
     panelLayoutDefinition,
     panels,
     desktopAlwaysVisible = true, // Default remains true
   }: DesktopLayoutProps) {

     /* ----- Zustand Store Hook ----- */
     const { activePanelId, setActivePanelId } = useLayoutStore(
       state => ({ activePanelId: state.activePanelId, setActivePanelId: state.setActivePanelId }),
       shallow,
     );

     /* ----- Refs ----- */
     const groupRef = useRef<HTMLDivElement>(null);

     /* ----- Callbacks ----- */
     const focusPanel = useCallback((id: string) => {
       if (id !== activePanelId) {
           setActivePanelId(id);
       }
     }, [activePanelId, setActivePanelId]);

     /* ----- Render Logic ----- */
     return (
       <div
         ref={groupRef}
         className={cn(
           'panel-group-desktop',
           'flex h-full w-full',
           'overflow-hidden',
           'gap-[var(--panel-gap,8px)]',
           className,
         )}
         data-panel-mode="desktop"
         data-panel-layout-id={panelLayoutDefinition.id}
       >
         {panels.map((panel) => {
           const PanelComponent = resolvePanelComponent(defaultPanelRegistry, panel.component);
           const panelTitleId   = `panel-title-${instanceId}-${panel.id}`;
           const isActive       = activePanelId === panel.id; // Correct calculation

           return (
             // Wrapper div for sizing
             <div
               key={panel.id}
               className={cn('min-h-0', 'flex flex-col')}
               style={computeFlexStyle(panel)}
             >
               {/* Styling Pad */}
               <FloatingPad
                 data-panel-id={panel.id}
                 className={cn(
                   'panel-container flex flex-col min-h-0 flex-1 w-full',
                   // Apply ring style based on active state
                   // **REMOVED OPACITY**: Ensure full visibility regardless of active state
                   isActive
                     ? 'ring-2 ring-[var(--agent-color-primary)]' // Active ring
                     : 'ring-1 ring-[var(--agent-color-primary)]/30', // Inactive ring (no opacity change)
                 )}
                 role="region"
                 aria-labelledby={panelTitleId}
                 onClick={() => focusPanel(panel.id)}
                 onFocusCapture={() => focusPanel(panel.id)} // Capture focus to set active state
                 tabIndex={-1}
               >
                 <ErrorBoundary
                   fallbackRender={({ error }) => ( <PanelErrorFallback /* ... */ /> )}
                 >
                   {PanelComponent ? (
                     <Suspense fallback={<PanelLoader panelId={panel.id} />}>
                       <PanelComponent
                         // --- Pass required props ---
                         id={panel.id}
                         instanceId={`${instanceId}-${panel.id}`}
                         panelTitleId={panelTitleId}
                         // --- Pass state props ---
                         isActive={isActive} // <<< CONFIRMED: Correctly Passed
                         alwaysVisible={desktopAlwaysVisible} // <<< CONFIRMED: Correctly Passed
                         // --- Other standard props ---
                         isMobile={false}
                         {...(panel.props || {})} // Spread custom props last
                       />
                     </Suspense>
                   ) : (
                     <PanelErrorFallback /* ... Component not found ... */ />
                   )}
                 </ErrorBoundary>
               </FloatingPad>
             </div>
           );
         })}
       </div>
     );
   });

   DesktopLayout.displayName = 'DesktopLayout';
   export default DesktopLayout;