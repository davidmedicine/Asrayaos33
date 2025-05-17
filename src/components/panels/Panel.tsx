/* ────────────────────────────────────────────────────────────────
   File: src/components/panels/Panel.tsx              v8.1 (2025-05-04)
   Purpose: Base panel structure. Renders content consistently.
            Layout components (Desktop/Mobile) determine visibility logic.
   Engineer: Gemini AI
   Changes:
     - v8.1: Fixed React warning by passing boolean `true` instead of string `'true'` to the 'inert' attribute.
     - Removed conditional rendering based on 'alwaysVisible'. Panel always renders its core structure.
     - Visibility/mounting logic is now fully delegated to parent layout components.
     - Kept inert handling which correctly applies only when not 'alwaysVisible' (mobile).
     - Simplified return statement.
   ------------------------------------------------------------------ */

   'use client';

   import React, {
     forwardRef, memo, ReactNode, useCallback, useEffect, useRef
   } from 'react';
   import { motion, type MotionProps } from 'framer-motion'; // AnimatePresence removed
   import { cn } from '@/lib/utils';
   import { useInteractionContext } from '@/hooks/useInteractionContext';

   /* ------------------------------------------------------------------ */
   /* Types                                                               */
   /* ------------------------------------------------------------------ */
   export interface PanelProps {
     id: string;
     title?: string;
     children: ReactNode;
     /** Indicates if the panel should manage its own mounting (mobile=false) vs. always being mounted (desktop=true) */
     alwaysVisible?: boolean;
     /** Explicit active state provided by the layout (primarily for Mobile) */
     isActive?: boolean;
     /** Extra classes for outer container */
     className?: string;
     /** aria-labelledby target (Layout supplies this) */
     panelTitleId?: string;
     /** Forwarded onFocus handler (rarely needed) */
     onFocus?: () => void;
   }

   /* ------------------------------------------------------------------ */
   /* Component                                                           */
   /* ------------------------------------------------------------------ */
   export const Panel = memo(forwardRef<HTMLDivElement, PanelProps>(
     ({
       id,
       title,
       children,
       alwaysVisible = false, // Keep prop for potential use (e.g., inert)
       isActive: propIsActive,
       className = '',
       panelTitleId,
       onFocus
     }, ref) => {

       /* ── Determine active state ── */
       const { activePanelId } = useInteractionContext();
       // Use explicit prop if provided, otherwise fallback to context comparison
       const isActive = propIsActive ?? (activePanelId === id);

       /* ── Inert Handling (Correctly applies only when !alwaysVisible) ── */
       // If alwaysVisible (Desktop), inertProps = {}.
       // If !alwaysVisible (Mobile), applies inert/aria-hidden when !isActive.
       // FIX v8.1: Use boolean `true` for the inert attribute, not the string 'true'.
       const inertProps = alwaysVisible
         ? {}
         : {
             // Pass boolean `true` or `undefined`
             inert: !isActive ? true : undefined,
             // aria-hidden expects string 'true' or `undefined` (this was already correct)
             'aria-hidden': !isActive ? 'true' : undefined
           };

       /* ── Class Definitions ── */
       const rootClasses = cn(
         'panel flex flex-col h-full w-full overflow-hidden', // Base structure
         'bg-[var(--bg-surface-translucent)] backdrop-blur-md', // Styling
         'rounded-2xl shadow ring-1 ring-black/10 dark:ring-white/10', // Styling
         // Note: Opacity styles were removed in the previous step.
         className // Allow external overrides
       );

       /* ── Focus Handler ── */
       const handleFocus = useCallback(() => onFocus?.(), [onFocus]);

       /* ── MAIN RENDER (Now Unconditional) ── */
       // The Panel component always renders its core structure.
       // MobileLayout uses positioning/opacity to show only the active one.
       // DesktopLayout uses flexbox to show all side-by-side.
       return (
         <motion.div
           key={id} // Key remains important for React reconciliation
           ref={ref}
           role="region"
           aria-labelledby={panelTitleId}
           className={rootClasses}
           onFocus={handleFocus}
           tabIndex={-1} // Base panels usually not directly tabbable; focus managed by layout/content
           {...inertProps} // Apply mobile-specific inert/aria-hidden attributes
           // Animation variants removed as AnimatePresence is gone.
           // Use CSS transitions for hover/focus/active states if needed.
         >
           {/* Optional Header */}
           {title && (
             <header
               id={panelTitleId}
               className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-muted)]"
             >
               <h3 className="truncate text-sm font-medium">{title}</h3>
             </header>
           )}

           {/* Scrollable Content Area */}
           <div className="flex-1 min-h-0 overflow-y-auto p-4">
             {children}
           </div>
         </motion.div>
       );
     }
   ));

   Panel.displayName = 'Panel';
   export default Panel;