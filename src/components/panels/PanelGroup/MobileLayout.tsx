/* ──────────────────────────────────────────────────────────────
   File: src/components/panels/PanelGroup/MobileLayout.tsx
   Role: Mobile-only flavour of PanelGroup – one panel visible at
         a time, swipe navigation with GSAP Observer, inert
         handling for off-screen panels, and minimal persisted
         state (no resizable logic).
   ──────────────────────────────────────────────────────────── */

   'use client';

   import React, {
     memo,
     Suspense,
     useCallback,
     useEffect,
     useMemo,
     useRef,
   } from 'react';
   import { shallow } from 'zustand/shallow';
   import { gsap, Observer } from '@/lib/gsapSetup';
   
   import { useInteractionContext } from '@/hooks/useInteractionContext';
   import { useLayoutStore } from '@/lib/state/slices/layoutSlice';
   
   import {
     resolvePanelComponent,
     panelComponentRegistry as defaultPanelRegistry,
   } from '@/lib/core/panelRegistry';
   
   // Import all UI components through subcomponents barrel file
   import { 
     FloatingPad, 
     PanelLoader,
     PanelErrorFallback,
     MobileNavButtons,
     ErrorBoundary
   } from './subcomponents';
   
   import type {
     PanelInstance,
     PanelLayoutDefinition,
   } from '@/types/layout';
   
   import { cn } from '@/lib/utils';
   
   /* -------------------------------------------------------------
    * Component props – provided by PanelGroupRoot
    * ----------------------------------------------------------- */
   export interface MobileLayoutProps {
     instanceId: string;
     className?: string;
     allowResize?: boolean; // Ignored on mobile
     panelLayoutDefinition: PanelLayoutDefinition;
     panels: PanelInstance[];
   }
   
   /* -------------------------------------------------------------
    * MobileLayout component
    * ----------------------------------------------------------- */
   export const MobileLayout = memo(function MobileLayout({
     instanceId,
     className = '',
     panelLayoutDefinition,
     panels,
   }: MobileLayoutProps) {
     /* ========= context & store ========= */
     const { isMobile } = useInteractionContext(); // should be true
     const wrapperRef = useRef<HTMLDivElement>(null);
     const isMountedRef = useRef(false);
     const swipeLockRef = useRef(false);
   
     const {
       activeContextKey,
       activePanelId,
       setActivePanelId,
     } = useLayoutStore(
       (s) => ({
         activeContextKey: s.activeContextKey,
         activePanelId: s.activePanelId,
         setActivePanelId: s.setActivePanelId,
       }),
       shallow,
     );
   
     /* ========= derived values ========= */
     /** Which panel index is currently focused? */
     const currentIndex = useMemo(() => {
       if (!panels.length) return -1;
       const explicit = panels.findIndex((p) => p.id === activePanelId);
       if (explicit !== -1) return explicit;
   
       const defaultIdx = panelLayoutDefinition?.defaultPanelFocus
         ? panels.findIndex((p) => p.id === panelLayoutDefinition.defaultPanelFocus)
         : -1;
   
       return defaultIdx !== -1 ? defaultIdx : 0;
     }, [panels, activePanelId, panelLayoutDefinition?.defaultPanelFocus]);
   
     const visiblePanel = panels[currentIndex] ?? null;
   
     /* Convenience for resolving components */
     const registry = defaultPanelRegistry;
   
     /* ========= swipe handlers ========= */
     const goNext = useCallback(() => {
       if (!panels.length) return;
       const next = (currentIndex + 1) % panels.length;
       setActivePanelId(panels[next].id);
     }, [currentIndex, panels, setActivePanelId]);
   
     const goPrev = useCallback(() => {
       if (!panels.length) return;
       const prev = (currentIndex - 1 + panels.length) % panels.length;
       setActivePanelId(panels[prev].id);
     }, [currentIndex, panels, setActivePanelId]);
   
     /* ========= GSAP Observer setup ========= */
     useEffect(() => {
       isMountedRef.current = true;
       return () => {
         isMountedRef.current = false;
       };
     }, []);
   
     useEffect(() => {
       const target = wrapperRef.current;
       if (!target || panels.length <= 1) return;
   
       const obs = Observer.create({
         target,
         type: 'touch,pointer',
         tolerance: 20,
         lockAxis: true,
         axis: 'x',
         dragMinimum: 50,
         eventPassThrough: 'vertical',
         onLeft: (self) => {
           if (self.isScrolling() || swipeLockRef.current) return;
           swipeLockRef.current = true;
           requestAnimationFrame(() => {
             goNext();
             swipeLockRef.current = false;
           });
         },
         onRight: (self) => {
           if (self.isScrolling() || swipeLockRef.current) return;
           swipeLockRef.current = true;
           requestAnimationFrame(() => {
             goPrev();
             swipeLockRef.current = false;
           });
         },
       });
   
       return () => obs.kill();
     }, [goNext, goPrev, panels.length]);
   
     /* ========= inert attribute maintenance ========= */
     useEffect(() => {
       if (!wrapperRef.current) return;
       const els = wrapperRef.current.querySelectorAll<HTMLDivElement>(
         '.panel-container[data-panel-id]',
       );
       els.forEach((el) => {
         const id = el.dataset.panelId!;
         const isVisible = id === visiblePanel?.id;
         if (isVisible) {
           el.removeAttribute('inert');
           el.removeAttribute('aria-hidden');
         } else {
           el.setAttribute('inert', 'true');
           el.setAttribute('aria-hidden', 'true');
         }
       });
     }, [visiblePanel?.id]);
   
     /* ========= render ========= */
     if (!panels.length) {
       return (
         <div className="flex h-full w-full items-center justify-center">
           <PanelLoader />
         </div>
       );
     }
   
     return (
       <div
         ref={wrapperRef}
         className={cn(
           'relative flex h-full w-full flex-col overflow-hidden',
           className,
         )}
         data-panel-mode="mobile"
         data-panel-layout-id={panelLayoutDefinition.id}
       >
         {/* All panels rendered; only one visible at a time */}
         {panels.map((panel, idx) => {
           const PanelComponent = resolvePanelComponent(registry, panel.component);
           const isVisible = idx === currentIndex;
           const panelTitleId = `panel-title-${instanceId}-${panel.id}`;
   
           const setRef = (el: HTMLDivElement | null) => {
             // nothing special yet, but keeps parity with desktop pattern
           };
   
           return (
             <FloatingPad
               key={panel.id}
               ref={setRef}
               className={cn(
                 'absolute inset-0 transition-opacity duration-fast',
                 isVisible ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none',
               )}
               data-panel-id={panel.id}
               role="region"
               aria-labelledby={panelTitleId}
               aria-hidden={!isVisible ? 'true' : undefined}
             >
               <ErrorBoundary
                 fallbackRender={({ error }) => (
                   <PanelErrorFallback 
                     error={error} 
                     panelId={panel.id} 
                     panelComponent={panel.component} 
                   />
                 )}
               >
                 {PanelComponent ? (
                   <Suspense
                     fallback={
                       <PanelLoader
                         key={`loader-${panel.id}`}
                         panelId={panel.id}
                       />
                     }
                   >
                     <div className="panel-content-wrapper h-full w-full overflow-y-auto custom-scrollbar">
                       <PanelComponent
                         id={panel.id}
                         instanceId={`${instanceId}-${panel.id}`}
                         panelId={panel.id}
                         panelTitleId={panelTitleId}
                         isActive={isVisible}
                         isMobile={true}
                         {...(panel.props || {})}
                         className="h-full"
                       />
                     </div>
                   </Suspense>
                 ) : (
                   <PanelErrorFallback
                     error={new Error(`Component '${panel.component}' not found`)}
                     panelId={panel.id}
                     panelComponent={panel.component}
                   />
                 )}
               </ErrorBoundary>
             </FloatingPad>
           );
         })}
   
         {/* Navigation buttons */}
         <MobileNavButtons
           onPrev={goPrev}
           onNext={goNext}
           panelCount={panels.length}
           currentPanelIndex={currentIndex}
         />
       </div>
     );
   });
   
   MobileLayout.displayName = 'MobileLayout';
   export default MobileLayout;
   