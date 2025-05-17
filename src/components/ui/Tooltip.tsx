// === File: src/components/ui/Tooltip.tsx ===
// Description: Reusable Tooltip component based on Radix UI Primitives.

'use client'; // Tooltips require client-side interaction/positioning

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip'; // Import Radix Tooltip
import { cn } from '@/lib/utils';

// --- Radix Provider (Include once in your layout or near root) ---
// You typically wrap your app or relevant part in TooltipProvider
const TooltipProvider = TooltipPrimitive.Provider;

// --- Core Tooltip Components ---
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

// --- Tooltip Content (Styled with Tailwind/CSS Vars) ---
const TooltipContent = React.forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
            "z-tooltip", // Ensure high z-index (define in globals.css if needed)
            "overflow-hidden rounded-md px-3 py-1.5 text-xs shadow-md animate-in fade-in-0 zoom-in-95",
            // Use theme variables for background and text
            "bg-[var(--tooltip-bg,var(--color-mineral-gray-800))]", // Fallback color
            "text-[var(--tooltip-text,var(--color-starlight-100))]", // Fallback color
            // Adjust data attribute selectors based on Radix version if needed
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:slide-in-from-top-2",
            "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
            className
        )}
        {...props}
    />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// --- Simplified Wrapper Component (Your primary export/import) ---
interface TooltipProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> {
    content: React.ReactNode; // Content for the tooltip popover
    children: React.ReactNode; // The element that triggers the tooltip
    side?: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>['side'];
    sideOffset?: number;
    delayDuration?: number;
    // Add other Radix props if needed (e.g., open, onOpenChange)
}

/**
 * A simple tooltip component wrapping Radix UI primitives.
 * Ensures accessibility and consistent styling.
 * Requires a TooltipProvider higher up in the component tree.
 */
const Tooltip = ({
    children,
    content,
    side,
    sideOffset,
    delayDuration, // Pass down delayDuration
    ...rootProps // Pass remaining Root props
}: TooltipProps) => {
    // Don't render tooltip if content is empty
    if (!content) {
        return <>{children}</>;
    }

    return (
        <TooltipRoot delayDuration={delayDuration ?? 300} {...rootProps}>
            <TooltipTrigger asChild>
                {children}
            </TooltipTrigger>
            <TooltipContent side={side} sideOffset={sideOffset}>
                {content}
                {/* Optional: Add Arrow if desired */}
                {/* <TooltipPrimitive.Arrow className="fill-[var(--tooltip-bg,var(--color-mineral-gray-800))]" /> */}
            </TooltipContent>
        </TooltipRoot>
    );
};
Tooltip.displayName = 'Tooltip';

// --- Exports ---
// Export the simplified wrapper and the necessary Radix parts if needed elsewhere
export { Tooltip, TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent };

// Ensure file ends with a newline