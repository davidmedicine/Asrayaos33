/* ──────────────────────────────────────────────────────────────
   File: src/components/panels/PanelGroup/PanelGroupRoot.tsx
   Role: Public root for the PanelGroup feature.
         Decides which concrete layout (desktop / mobile) to render,
         keeps StageProvider & motion-gate logic, and guarantees that
         the rendered layout never forces the document to exceed the
         viewport height by ensuring every flex ancestor has `min-h-0`.
   Dependencies: React 19 • Next.js app-router • GSAP • Zustand.
   Author: Refactor 2025-05-04 (GPT-4o)
   ─────────────────────────────────────────────────────────────*/

   'use client';

   import React, { memo, Suspense } from 'react';
   
   // Providers & context
   import StageProvider from '@/components/stage/StageProvider';
   import { useInteractionContext } from '@/hooks/useInteractionContext';
   
   // Local state selector bundle
   import { usePanelGroupState } from './usePanelGroupState';
   
   // Fallback while the store is hydrating
   import { PanelLoader } from './subcomponents/PanelLoader';
   
   // Concrete layout variants
   import { DesktopLayout } from './DesktopLayout';
   import { MobileLayout }  from './MobileLayout';
   
   // Utility for conditional classes
   import { cn } from '@/lib/utils';
   
   /* ------------------------------------------------------------------ */
   /* Public props                                                       */
   /* ------------------------------------------------------------------ */
   export interface PanelGroupProps {
     /** Unique ID per Compass context (passed down to panels) */
     instanceId: string;
     /** Optional extra classes for the root wrapper */
     className?: string;
     /** Enable/disable resizable handles (desktop only) */
     allowResize?: boolean;
     /** Keep every panel mounted & visible in desktop mode */
     desktopAlwaysVisible?: boolean;
   }
   
   /* ------------------------------------------------------------------ */
   /* Component                                                          */
   /* ------------------------------------------------------------------ */
   export const PanelGroup = memo(function PanelGroupRoot({
     instanceId,
     className,
     allowResize = true,
     desktopAlwaysVisible = true,
   }: PanelGroupProps) {
     /* ── Global device context (mobile / desktop) ─────────────────── */
     const { isMobile } = useInteractionContext();
   
     /* ── Zustand-powered layout slice for this instance ───────────── */
     const {
       ready,
       motionEnabled,
       panelLayoutDefinition,
       panels,
     } = usePanelGroupState(instanceId);
   
     /* ── Loading fallback ─────────────────────────────────────────── */
     if (!ready) return <PanelLoader />;
   
     /* ── Pick the layout implementation ───────────────────────────── */
     const Layout = isMobile ? MobileLayout : DesktopLayout;
   
     /* ── The actual layout node ───────────────────────────────────── */
     const layoutVNode = (
       <Layout
         instanceId={instanceId}
         className="h-full w-full"
         allowResize={allowResize}
         desktopAlwaysVisible={desktopAlwaysVisible}
         panelLayoutDefinition={panelLayoutDefinition}
         panels={panels}
       />
     );
   
     /* ── Root wrapper guarantees `min-h-0` in the flex chain ──────── */
     const wrapped = (
       <div
         className={cn(
           'flex flex-col h-full w-full min-h-0',
           className,
         )}
         data-panel-group-instance={instanceId}
         role="group"
       >
         {layoutVNode}
       </div>
     );
   
     /* ── Inject StageProvider only when motion is enabled ─────────── */
     return motionEnabled ? <StageProvider>{wrapped}</StageProvider> : wrapped;
   });
   
   PanelGroup.displayName = 'PanelGroupRoot';
   
   export default PanelGroup;
   