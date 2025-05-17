// === File: src/features/chat/components/ConversationTabs.tsx ===
// Description: Tabbed navigation for the conversations panel, using Radix UI Tabs
// and adhering to project styling and state management conventions.
// Conforms to ASR-230 feedback (initial, detailed, final) incorporating Codex,
// Radix A11y, Tailwind v4, WCAG, Zustand best practices, and v2.3 core-first principles.

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils'; // Assuming utils for classname merging
import type { ConversationTabType } from '@/types/chat'; // Import shared type
// Import store directly for most reliability
import { useStore } from '@/lib/state/store';
// Import shallow for comparison
import { shallow } from 'zustand/shallow';

// --- Tab Configuration ---
// Exported with `as const` for maximum type strictness (literal types).
// Import the tab configuration directly from the uiSlice for consistency
import { TAB_CONFIG } from '@/lib/state/slices/uiSlice';

// Re-export for convenience
export const tabConfig = TAB_CONFIG;

// Type guard for ConversationTabType (safer than `as` casting)
function isConversationTabType(value: string): value is ConversationTabType {
    // Check if the value matches any 'value' in our strictly typed config
    return tabConfig.some(tab => tab.value === value);
}

// --- Base Styles ---
// Consolidating base styles for readability using Tailwind tokens
const baseTriggerStyles = cn(
  // Base layout and appearance
  'relative rounded-md px-4 py-2 text-sm font-medium transition-colors',

  // Focus visible state:
  // Requires:
  // 1. CSS variables defined globally (e.g., in global.css): --focus-ring (color), --ring-offset (width)
  // 2. Tailwind config extensions:
  //    theme.extend.ringColor['focus-visible'] = 'var(--focus-ring)'
  //    theme.extend.ringOffsetWidth.token = 'var(--ring-offset, 2px)'
  // 3. WCAG Compliance:
  //    - ring-2 provides >= 2px thickness.
  //    - --focus-ring color MUST have >= 3:1 contrast against adjacent background in light/dark modes. (Verify with axe-core/testing).
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-visible',
  'focus-visible:ring-offset-token focus-visible:ring-offset-background', // ring-offset-background likely pulls from theme

  // Default/Inactive state styles (ensure text-muted, text-default exist in config)
  'text-muted hover:text-default',

  // Active state styles (Radix data attribute; ensure text-heading, bg-active exist in config)
  'data-[state=active]:text-heading data-[state=active]:bg-active data-[state=active]:font-semibold'
  // Future Motion Hook: Radix's `[data-state='active']` attribute.
  // Note on GSAP Flip: Radix often re-renders the active trigger, destroying the FLIP source.
  // Use position:absolute clone strategy or Framer Motion layout="position".
  // Wrap GSAP logic in useGSAP(..., { scope: container, revertOnUpdate: true }) for cleanup.
);

const countBadgeStyles = cn(
  // Standard Tailwind spacing keys (defaults: 1.5 = 0.375rem, 5 = 1.25rem)
  'ml-1.5',
  'text-xs',
  'inline-flex items-center justify-center rounded-full',
  // Ensure bg-muted is defined in Tailwind config
  'bg-muted',
  // Standard Tailwind sizing/spacing keys
  'min-w-5 h-5 px-1.5'
);

// --- ConversationTabs Props ---
// This component is now fully self-contained regarding tab state logic.
interface ConversationTabsProps {
  /**
   * Optional counts to display in badges next to tab labels.
   * These counts should ideally reflect data relevant ONLY to the visible tabs.
   */
  counts?: Partial<Record<ConversationTabType, number>>;
  /** Optional additional CSS class names for the root element. */
  className?: string;
}

/**
 * Renders accessible tab navigation for conversation categories ('Chats', 'Channels', 'Online').
 * Uses Radix UI Tabs primitives, accessing tab state directly from the store for maximum reliability.
 */
export const ConversationTabs: React.FC<ConversationTabsProps> = ({
  counts,
  className,
}) => {
  // DEVELOPMENT: Add debug info to help diagnose the issue
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const fullState = useStore.getState();
      console.debug('[ConversationTabs] Store check:', {
        selectedConversationTab: fullState.selectedConversationTab,
        setSelectedConversationTab: typeof fullState.setSelectedConversationTab === 'function',
      });
    }
  }, []);
  // --- Direct Store Access ---
  // Get current tab value directly from store for most reliability
  const activeTab = useStore((state) => state.selectedConversationTab, shallow);
  
  // Define a safer setSelectedTab function that handles error cases
  const setSelectedTab = useCallback((value: ConversationTabType) => {
    // Access the setter function directly from the store
    const setterFn = useStore.getState().setSelectedConversationTab;
    
    // Check if the function exists
    if (typeof setterFn !== 'function') {
      console.error('[ConversationTabs] uiSlice is missing `setSelectedConversationTab`. Tab click ignored – check store assembly.');
      throw new Error('[ConversationTabs] uiSlice is missing `setSelectedConversationTab`. Tab click ignored – check store assembly.');
    }
    
    // Call the function if it exists
    setterFn(value);
  }, []);

  // --- Callbacks ---
  // Memoize the callback passed to Radix to prevent unnecessary re-renders.
  const handleValueChange = useCallback(
    (value: string) => {
      // Use the type guard for robust checking before setting state.
      if (isConversationTabType(value)) {
        setSelectedTab(value);
      } else {
        // Log warning for unexpected values, prevents setting invalid state.
        console.warn(`[ConversationTabs] Received invalid tab value: ${value}`);
      }
    },
    [setSelectedTab] // Dependency: the setter function itself
  );

  // --- Computed Values for Rendering ---
  // Use all tabs in the tabConfig for the three-tab structure
  const visibleTabs = tabConfig;
  
  // Process counts for all visible tabs
  const visibleCounts = useMemo(() => {
    if (!counts) return undefined; // If no counts provided, skip calculation.
    return Object.fromEntries(
      // Map over all tabs
      visibleTabs.map(({ value }) => [value, counts[value] ?? 0]) // Default count to 0
    );
  }, [counts]); // Dependencies: original counts
  
  return (
    <Tabs.Root
      value={activeTab} // Controlled by Zustand state
      onValueChange={handleValueChange} // Use memoized handler
      className={cn(
        'border-b border-border-muted', // Ensure border-border-muted exists in config
        className
      )}
    >
      {/* Radix provides role="tablist"; no extra aria-label needed/recommended here. */}
      <Tabs.List
        className={cn(
          'flex space-x-1 p-2' // Default Tailwind spacing
        )}
      >
        {visibleTabs.map(({ label, value }) => {
          const count = visibleCounts?.[value]; // Use the filtered counts
          const hasCount = count !== undefined && count > 0;

          // ARIA pattern: Include count in the accessible name (aria-label) if present.
          const ariaLabel = hasCount ? `${label} – ${count} unread` : label;

          return (
            <Tabs.Trigger
              key={value}
              value={value}
              className={baseTriggerStyles}
              aria-label={ariaLabel} // Provides full context for screen readers
              // Radix automatically manages: role="tab", aria-selected, aria-controls,
              // aria-posinset, aria-setsize (based on rendered triggers).
            >
              {/* Visible text: Keep it concise */}
              {label}

              {/* Decorative visual badge (hidden from assistive tech) */}
              {hasCount && (
                <span className={countBadgeStyles} aria-hidden="true">
                  {count}
                </span>
              )}
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>
      {/* Tabs.Content panels are typically rendered elsewhere, controlled by the same `activeTab` state. */}
    </Tabs.Root>
  );
};

ConversationTabs.displayName = 'ConversationTabs';