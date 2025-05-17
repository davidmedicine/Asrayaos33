import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation'; // Correct App Router import
import { useLayoutStore } from '@/lib/state/slices/layoutSlice';
import { shallow } from 'zustand/shallow';
import { navigateDir } from '@/services/navigation'; // Import the helper
import type { CompassDir } from '@/types/compass'; // Import the type

// --- D-Pad Configuration & SVG Path Data ---
interface DPadItem {
    id: CompassDir; // Use the specific type
    label: string;
    d: string; // SVG path data (PLACEHOLDER - REPLACE WITH ACTUAL PRODUCTION GLYPHS)
    gridArea: string;
    rotationClass?: string;
}

// !! IMPORTANT: Replace placeholder 'd' values with actual 24x24 viewBox-compatible SVG path data !!
const dPadItems: DPadItem[] = [
    // Grid areas: row-start / col-start / row-end / col-end
    { id: 'north', label: 'Navigate North', d: 'M12 2 L19 9 H5 Z' /* Placeholder 24x24 */, gridArea: '1 / 2 / 2 / 3', rotationClass: 'rotate-0' },
    { id: 'east', label: 'Navigate East', d: 'M22 12 L15 19 V5 Z' /* Placeholder 24x24 */, gridArea: '2 / 3 / 3 / 4', rotationClass: 'rotate-90' },
    { id: 'south', label: 'Navigate South', d: 'M12 22 L5 15 H19 Z' /* Placeholder 24x24 */, gridArea: '3 / 2 / 4 / 3', rotationClass: 'rotate-180' },
    { id: 'west', label: 'Navigate West', d: 'M2 12 L9 5 V19 Z' /* Placeholder 24x24 */, gridArea: '2 / 1 / 3 / 2', rotationClass: '-rotate-90' },
    { id: 'center', label: 'Center Action / Overview', d: 'M12 12 m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0' /* Placeholder 24x24 */, gridArea: '2 / 2 / 3 / 3' },
];

const focusOrder: CompassDir[] = ['north', 'east', 'south', 'west', 'center'];
const focusOrderMap: Record<CompassDir, number> = focusOrder.reduce((acc, id, index) => {
    acc[id] = index;
    return acc;
}, {} as Record<CompassDir, number>);

// --- Component ---

const CompassDPadDesktop: React.FC = () => {
    // --- Hooks ---
    const router = useRouter();
    const currentWorld = useLayoutStore((state) => state.currentWorld, shallow); // Read for selection state
    const isSidebarExpanded = useLayoutStore((state) => state.isSidebarExpanded ?? false, shallow);
    // Note: setCurrentWorld is NOT used directly here anymore.

    // --- Local State for Focus Management ---
    // Determine initial index based on currentWorld, default to center
    const initialSelectedIndex = useMemo(() => focusOrderMap[currentWorld] ?? focusOrderMap['center'], [currentWorld]);
    const [focusedIndex, setFocusedIndex] = useState<number>(initialSelectedIndex);

    // --- Refs ---
    const tablistRef = useRef<HTMLDivElement>(null);
    const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    useEffect(() => { // Ensure refs array is correctly sized on mount/update
        tabButtonRefs.current = tabButtonRefs.current.slice(0, dPadItems.length);
    }, []);


    // --- RTL Detection ---
    const isRtl = useMemo(() => {
        // Check only on client-side after mount
        if (typeof document !== 'undefined') {
            return document.documentElement.dir === 'rtl';
        }
        return false; // Default assumption for SSR
    }, []); // Re-evaluates if direction changes, though unlikely without full page reload


    // --- Callbacks ---
    // This function NOW ONLY triggers the navigation process.
    // State update (Zustand) happens externally via Activity lifecycle.
    const handleTriggerNavigation = useCallback((worldId: CompassDir) => {
        console.log(`[DPad] Triggering navigation to: ${worldId}`);
        navigateDir(worldId, router);
        // DO NOT set state here (Zustand or local focus)
        // Focus should follow actual state change after navigation completes
    }, [router]); // Depends only on the router instance


    // --- Keyboard Navigation (Roving Tabindex) ---
    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        let nextIndex = focusedIndex;
        const maxIndex = focusOrder.length - 1;

        // Determine directional targets based on RTL
        const leftDir = isRtl ? 'east' : 'west';
        const rightDir = isRtl ? 'west' : 'east';
        const leftIndex = focusOrderMap[leftDir];
        const rightIndex = focusOrderMap[rightDir];
        const northIndex = focusOrderMap['north'];
        const southIndex = focusOrderMap['south'];
        const centerIndex = focusOrderMap['center'];

        // Prevent default scrolling behavior for arrow keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
             event.preventDefault();
        }

        switch (event.key) {
            case 'ArrowUp':
                if (focusedIndex === centerIndex) nextIndex = northIndex;
                else if (focusedIndex === southIndex) nextIndex = centerIndex;
                else if (focusedIndex === leftIndex || focusedIndex === rightIndex) nextIndex = northIndex;
                else if (focusedIndex === northIndex) nextIndex = southIndex; // Wrap North -> South
                break;
            case 'ArrowDown':
                 if (focusedIndex === centerIndex) nextIndex = southIndex;
                 else if (focusedIndex === northIndex) nextIndex = centerIndex;
                 else if (focusedIndex === leftIndex || focusedIndex === rightIndex) nextIndex = southIndex;
                 else if (focusedIndex === southIndex) nextIndex = northIndex; // Wrap South -> North
                break;
            case 'ArrowLeft': // Corresponds to 'leftDir'
                if (focusedIndex === centerIndex) nextIndex = leftIndex;
                else if (focusedIndex === rightIndex) nextIndex = centerIndex;
                else if (focusedIndex === northIndex || focusedIndex === southIndex) nextIndex = leftIndex;
                else if (focusedIndex === leftIndex) nextIndex = rightIndex; // Wrap West -> East (or E->W in RTL)
                break;
            case 'ArrowRight': // Corresponds to 'rightDir'
                if (focusedIndex === centerIndex) nextIndex = rightIndex;
                else if (focusedIndex === leftIndex) nextIndex = centerIndex;
                else if (focusedIndex === northIndex || focusedIndex === southIndex) nextIndex = rightIndex;
                else if (focusedIndex === rightIndex) nextIndex = leftIndex; // Wrap East -> West (or W->E in RTL)
                break;
            case 'Home':
                nextIndex = northIndex; // Go to North
                break;
            case 'End':
                 nextIndex = centerIndex; // Go to Center (logical end?)
                break;
            // Enter/Space are handled by the button's onClick implicitly triggering navigation
            default:
                return; // Exit if key is not handled
        }

        // Clamp index just in case, though logic should prevent out-of-bounds
        nextIndex = Math.max(0, Math.min(nextIndex, maxIndex));

        if (nextIndex !== focusedIndex) {
            setFocusedIndex(nextIndex);
            // Focus is managed by the useEffect below
        }
    }, [focusedIndex, isRtl]); // Depends on current focus and RTL state

    // --- Effects ---
    // Effect 1: Focus the correct button when focusedIndex changes
    useEffect(() => {
        // requestAnimationFrame ensures focus happens after potential DOM updates/renders
        requestAnimationFrame(() => {
            tabButtonRefs.current[focusedIndex]?.focus();
        });
    }, [focusedIndex]);

    // Effect 2: Sync internal focus state if the `currentWorld` changes externally
    // (e.g., after navigation completes and Zustand is updated)
    useEffect(() => {
        const targetIndex = focusOrderMap[currentWorld];
        if (targetIndex !== undefined && targetIndex !== focusedIndex) {
             console.log(`[DPad] Syncing focus: currentWorld changed to ${currentWorld}, setting focus index to ${targetIndex}`);
            setFocusedIndex(targetIndex);
        }
         // If currentWorld becomes invalid/unmapped, default focus back to center.
         else if (targetIndex === undefined && focusedIndex !== focusOrderMap['center']) {
            console.log(`[DPad] Syncing focus: currentWorld (${currentWorld}) unmapped, defaulting focus to center.`);
            setFocusedIndex(focusOrderMap['center']);
         }
    // This effect ONLY reacts to external changes in `currentWorld`.
    // Do NOT include `focusedIndex` in dependencies to avoid loops.
    }, [currentWorld]);


    // --- Dynamic Positioning ---
    // Use logical properties for RTL support automatically. Requires Tailwind v4+ or `theme.logical = true`.
    // Assumes CSS variables like --sidebar-width-expanded are set globally.
    const positionClass = useMemo(() => {
        const expandedOffset = 'calc(var(--sidebar-width-expanded, 6rem) + 1.5rem)'; // example: 24 + 6 = 30 -> 7.5rem
        const collapsedOffset = '1.5rem'; // example: start-6

        return isSidebarExpanded
            ? `start-[${expandedOffset}]` // Uses inset-inline-start
            : `start-[${collapsedOffset}]`;
    }, [isSidebarExpanded]);

    // State for will-change (Performance Hook)
    const [isTransitioning, setIsTransitioning] = useState(false);
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const node = navRef.current;
        if (!node) return;

        const handleTransitionStart = () => setIsTransitioning(true);
        const handleTransitionEnd = () => setIsTransitioning(false);

        // Assuming the transition is on 'inset-inline-start'
        node.addEventListener('transitionstart', handleTransitionStart);
        node.addEventListener('transitionend', handleTransitionEnd);
        node.addEventListener('transitioncancel', handleTransitionEnd); // Handle cancellation

        return () => {
            node.removeEventListener('transitionstart', handleTransitionStart);
            node.removeEventListener('transitionend', handleTransitionEnd);
            node.removeEventListener('transitioncancel', handleTransitionEnd);
        };
    }, []); // Run only once


    // --- Render ---
    return (
        <nav
            ref={navRef}
            aria-label="Primary world navigation D-Pad" // Descriptive label
            // Base classes + Dynamic positioning + Transition
            className={`
                hidden md:block fixed bottom-6 ${positionClass} z-50
                w-24 h-24 /* size-24 */
                motion-safe:transition-[inset-inline-start] duration-300 ease-in-out
                ${isTransitioning ? 'will-change-[inset-inline-start]' : ''} /* Performance: Add will-change only during transition */
            `}
            // Touch actions (less relevant for desktop but good practice)
            style={{ touchAction: 'pan-x pan-y' }} // Allow normal panning if gestures somehow reach this fixed element
            // gesturePolicy="none" // Add once standardized to prevent browser back swipe interference
        >
            {/* Grid container for buttons */}
            <div
                ref={tablistRef}
                role="tablist"
                aria-orientation="horizontal" // Although 2D, L/R is primary axis for standard tablist role
                onKeyDown={handleKeyDown}
                className="relative w-full h-full grid grid-cols-3 grid-rows-3 place-items-center" // Precise grid positioning
            >
                {dPadItems.map((item, index) => {
                    const isSelected = item.id === currentWorld;
                    const isFocused = index === focusedIndex; // Internal focus state drives tabIndex
                    const isCenter = item.id === 'center';

                    return (
                        <button
                            key={item.id}
                            ref={(el) => (tabButtonRefs.current[index] = el)}
                            id={`dpad-tab-${item.id}`}
                            role="tab"
                            aria-selected={isSelected}
                            // aria-controls={`world-panel-${item.id}`} // Add if it directly controls a panel with this ID structure
                            aria-label={item.label} // Essential for screen readers
                            tabIndex={isFocused ? 0 : -1} // Roving tabindex
                            style={{ gridArea: item.gridArea }} // Position via CSS grid
                            // ** CRITICAL FOR FLIP **: Provides the anchor for GSAP Flip
                            // Matches shared elements in the target view (e.g., a header icon)
                            data-flip-id={`${item.id}-glyph`}
                            className={`
                                flex items-center justify-center rounded-full group
                                text-gray-400 bg-gray-800/80 backdrop-blur-sm /* Base styles - theme dependent */
                                hover:bg-gray-700/90 hover:text-white
                                motion-safe:transition-all duration-150 ease-in-out
                                ${isCenter ? 'w-10 h-10 z-10' : 'w-12 h-12'} /* WCAG Target Size: min 24x24, 44x44 preferred */
                                ${item.rotationClass || ''} /* Apply rotation to button */
                                ${isSelected ? 'bg-blue-600 text-white ring-2 ring-blue-400' : ''} /* Selected state */
                                /* Focus State (WCAG 2.4.11/2.4.13 Non-text Contrast >= 3:1) */
                                focus:outline-none focus-visible:ring-2
                                /* Use CSS var with fallback for themeability & guaranteed visibility */
                                /* Ensure --focus-ring-color provides >= 3:1 contrast against bg-gray-800/80 */
                                /* Ensure --focus-ring-offset-color provides >= 3:1 contrast against surrounding page bg */
                                focus-visible:ring-[color:var(--dpad-focus-ring-color,theme(colors.sky.500))] /* Example fallback: Sky Blue */
                                focus-visible:ring-offset-2
                                focus-visible:ring-offset-[color:var(--page-background-color,theme(colors.black))] /* Example offset color */
                                motion-safe:active:scale-95
                            `}
                            onClick={() => handleTriggerNavigation(item.id)}
                        >
                            {/* SVG Icon (24x24 ViewBox, non-scaling stroke) */}
                            {/* !! REPLACE PLACEHOLDER 'd' VALUES IN dPadItems ABOVE !! */}
                            <svg
                                // ** CRITICAL VIEWBOX/VECTOR EFFECT **
                                viewBox="0 0 24 24" // Use 24x24 as requested
                                vectorEffect="non-scaling-stroke" // Prevents stroke distortion on scale/zoom
                                className={`w-6 h-6 fill-current pointer-events-none`} // size-6 fits 24x24 well
                                aria-hidden="true" // Decorative; button has aria-label
                            >
                                {/* Optional: <title>{item.label}</title> */}
                                <path
                                    d={item.d} // Actual path data defined above
                                    className="motion-safe:transition-colors duration-150 ease-in-out"
                                />
                            </svg>
                            {/* <span className="sr-only">{item.label}</span> */}{/* Redundant with aria-label */}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default CompassDPadDesktop;