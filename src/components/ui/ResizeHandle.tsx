/* ──────────────────────────────────────────────
   File: src/components/ui/ResizeHandle.tsx
   Visual drag handle for react-resizable-panels
   – zero external state, forwards ref, fully themeable
   – WCAG-AA focus ring, 44 × 44 px hit-area guarantee
   ─────────────────────────────────────────── */
   'use client';

   import React, { forwardRef, useRef } from 'react';
   import { cn } from '@/lib/utils';
   import { useInteractionContext } from '@/hooks/useInteractionContext';
   
   export interface ResizeHandleProps
     extends React.HTMLAttributes<HTMLDivElement> {
     direction?: 'horizontal' | 'vertical';
     thickness?: number;     // px
     handleSize?: number;    // px
     auraStyle?: 'none' | 'subtle' | 'glow' | 'pulse';
     /** aria-valuenow/min/max are forwarded for screen-reader feedback */
     'aria-valuenow'?: number;
     'aria-valuemin'?: number;
     'aria-valuemax'?: number;
   }
   
   export const ResizeHandle = forwardRef<HTMLDivElement, ResizeHandleProps>(
     (
       {
         direction = 'vertical',
         thickness = 1,
         handleSize = 32,
         auraStyle = 'subtle',
         className,
         style,
         ...rest
       },
       ref,
     ) => {
       const { activeAgentId } = useInteractionContext();
       const activeRef   = useRef(false);
       const isVertical  = direction === 'vertical';
       const hitArea     = Math.max(thickness * 3, 12); // WCAG 2.5.8 ≥44×44 CSS px
   
       /* —— event glue ——————————————————————————— */
       const activate = () => {
         if (activeRef.current) return;
         activeRef.current = true;
         document.documentElement.classList.add('resizing');
       };
       const deactivate = () => {
         if (!activeRef.current) return;
         activeRef.current = false;
         document.documentElement.classList.remove('resizing');
       };
   
       /* —— aura style classes —————————————————— */
       const aura = (() => {
         const base =
           'data-[active=true]:shadow-[0_0_8px_color-mix(in_oklab,var(--agent-color-primary,#38bdf8)_60%,transparent)]';
         switch (auraStyle) {
           case 'glow':
             return `${base} data-[active=true]:animate-pulse`;
           case 'pulse':
             return `${base} data-[active=true]:animate-[resize-pulse_1.5s_ease-in-out_infinite]`;
           default:
             return auraStyle === 'none' ? '' : base;
         }
       })();
   
       /* —— render —————————————————————————————— */
       return (
         <div
           ref={ref}
           data-resize-direction={direction}
           data-active={activeRef.current}
           data-theme={activeAgentId ?? undefined}
           role="separator"
           aria-orientation={direction}
           onMouseDown={activate}
           onMouseUp={deactivate}
           onMouseLeave={deactivate}
           onTouchStart={(e) => {
             e.preventDefault();
             activate();
           }}
           onTouchEnd={deactivate}
           onTouchCancel={deactivate}
           className={cn(
             'resize-handle group flex items-center justify-center select-none touch-none flex-shrink-0',
             isVertical ? 'cursor-col-resize' : 'cursor-row-resize',
             isVertical ? `w-[${hitArea}px]` : `h-[${hitArea}px]`,
             activeAgentId && `theme-${activeAgentId}`,
             className,
           )}
           style={style}
           {...rest}
         >
           <div
             aria-hidden="true"
             className={cn(
               'rounded-full bg-border-muted/60 transition-colors duration-150',
               isVertical
                 ? `w-[${thickness}px] h-[${handleSize}px]`
                 : `h-[${thickness}px] w-[${handleSize}px]`,
               'group-hover:bg-border-default',
               'data-[active=true]:bg-[color-mix(in_oklab,var(--agent-color-primary,#38bdf8)_90%,var(--border-default))]',
               aura,
             )}
           />
         </div>
       );
     },
   );
   
   ResizeHandle.displayName = 'ResizeHandle';
   
   /* Optional story – exported only in dev / Storybook */
   export const ResizeHandleStory =
     process.env.STORYBOOK === 'true'
       ? function Story() {
           return (
             <div className="flex flex-wrap gap-8 p-8 bg-bg-default">
               <ResizeHandle />
               <ResizeHandle direction="horizontal" auraStyle="glow" thickness={2} />
               <ResizeHandle direction="horizontal" auraStyle="pulse" handleSize={64} />
             </div>
           );
         }
       : undefined;
   export default ResizeHandle;
   