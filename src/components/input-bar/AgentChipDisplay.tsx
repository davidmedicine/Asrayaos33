/**
 * AgentChipDisplay.tsx
 * Renders the small agent chip, often used in input bars.
 * Displays agent name and a visual indicator ("orb") of its state.
 * Refactored based on feedback (ASR-241) for improved performance,
 * accessibility, and type safety.
 */

import React from 'react'; // useCallback removed as inline handlers are gone
import { cn } from '@/lib/utils';
// Removed useState, useRef, useEffect, gsap, durations, easings, prefersReducedMotion
// Removed useAgentStore (unused as per feedback point 1)
// MiniOrb component was not used in the original snippet's JSX, using styled div instead.

// Hoisted agent name mapping outside the component to prevent recreation on render (Feedback 1)
const agentNames = {
  oracle: 'Oracle',
  muse: 'Muse',
  sentinel: 'Sentinel',
  architect: 'Architect',
  explorer: 'Explorer',
} as const; // Use 'as const' for stricter typing of keys

// Defined AgentOrbState type for clarity and potential use elsewhere (Feedback 4)
export type AgentOrbState =
  | 'idle'
  | 'thinking'
  | 'streaming'
  | 'listening'
  | 'error';

// Consolidated and refined props interface (Feedback 1 & 4)
export interface AgentChipDisplayProps {
  /** Unique identifier for the agent, used to look up the display name. */
  agentId: keyof typeof agentNames;
  /** Current state of the agent, influences orb appearance and potentially label. Defaults to 'idle'. */
  agentState?: AgentOrbState; // Make agentState an optional prop
  /** Optional click handler */
  onClick?: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

// Using React.memo for potential performance optimization (Feedback 5)
export const AgentChipDisplay: React.FC<AgentChipDisplayProps> = React.memo(
  ({ agentId, agentState = 'idle', onClick, className }) => {
    // Removed useState for isHovered (Feedback 2.1)
    // Removed useRef (Feedback 2.1)
    // Removed useEffect for GSAP animation (Feedback 2.1 & 2.4)

    const agentDisplayName = agentNames[agentId] || 'Agent'; // Get display name using hoisted map

    // NOTE (Accessibility - WCAG SC 1.4.11): Ensure the contrast ratio between
    // the button's background color on hover (`--bg-hover`) and its text
    // (`--text-default`) is at least 3:1. (Feedback 2.3)

    // NOTE (Accessibility - Focus): Ensure the focus ring color
    // (`--agent-color-primary`) has sufficient contrast against the adjacent
    // background and that the ring offset isn't clipped by parent overflow. (Feedback 2.3)

    return (
      <button
        // Removed ref={chipRef}
        className={cn(
          'group', // Add group for group-hover state styling on children
          'flex items-center gap-2 px-3 py-1.5 rounded-full',
          'border border-transparent', // Add transparent border to prevent layout shift on focus ring
          'bg-[var(--bg-muted)] text-[var(--text-default)]',
          // Use CSS transition for hover effect (Feedback 2.1 & 2.4)
          'transition-colors duration-150 ease-out', // Use Tailwind duration/easing or map lib/motiontokens
          'hover:bg-[var(--bg-hover)]', // Apply hover background color via CSS
          // Focus styles (Feedback 2.3)
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agent-color-primary)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-background)]', // Use background color for offset
          className
        )}
        onClick={onClick}
        // Removed onMouseEnter/onMouseLeave (Feedback 2.1 & 3)
        // Refined aria-label for better screen reader experience (Feedback 2.3)
        // Provides full context while hiding decorative visible text.
        aria-label={`Select agent: ${agentDisplayName}. Current status: ${agentState}`}
        type="button"
      >
        {/* Agent Orb */}
        <div
          className={cn(
            'w-3 h-3 rounded-full bg-[var(--agent-color-primary)]',
            // Use CSS filter: drop-shadow for performance (Feedback 3)
            '[filter:drop-shadow(0_0_4px_var(--agent-color-primary))]', // Note: Tailwind syntax for arbitrary properties with spaces
            // Use CSS transform for hover scale (Feedback 2.1) & group-hover
            'transition-transform duration-150 ease-out', // Match duration/easing
            'group-hover:scale-110' // Apply scale via CSS group-hover
          )}
        />

        {/* Agent Name - hidden from screen readers as info is in aria-label (Feedback 2.3) */}
        <span className="text-sm font-medium" aria-hidden="true">
          {agentDisplayName}
        </span>

        {/* Optional: Display non-idle agent state text */}
        {agentState !== 'idle' && (
          <span
            className="text-[var(--text-muted)] text-xs italic ml-1"
            aria-hidden="true" // Also hide this decorative state text
          >
            {agentState === 'thinking' && '(thinking...)'}
            {agentState === 'streaming' && '(responding...)'}
            {agentState === 'listening' && '(listening...)'}
            {agentState === 'error' && '(error)'}
          </span>
        )}
      </button>
    );
  }
);

AgentChipDisplay.displayName = 'AgentChipDisplay'; // Helps in React DevTools