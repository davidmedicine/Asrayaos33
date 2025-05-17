// === File: src/features/chat/components/TypingIndicator.tsx ===
// Description: Visual indicator for typing status in conversations, with accessibility and polish refinements.

import React from 'react';
import { cn } from '@/lib/utils';
import { PresenceState } from '@/types'; // Assuming PresenceState defines { id: string; name?: string; avatarUrl?: string }

/*
Add this to your global CSS file (e.g., globals.css) for the faster animation:

@keyframes bounce-fast {
  0%, 100% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateY(-25%);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}
.animate-bounce-fast {
  animation: bounce-fast 0.8s infinite;
}
*/

// --- Helper Component: TypingDots ---
// Reusable component for the bouncing dots animation
const TypingDots = () => (
    // Use logical margin-end (me-2) and gap-1 for RTL support
    <div className="w-8 h-3 me-2 flex items-center gap-1" aria-hidden="true">
        {/* Apply the faster bounce animation class */}
        <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce-fast" style={{ animationDelay: '0s' }} />
        <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce-fast" style={{ animationDelay: '0.15s' }} />
        <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce-fast" style={{ animationDelay: '0.3s' }} />
    </div>
);
TypingDots.displayName = 'TypingDots';

// --- Main Component Props ---
interface TypingIndicatorProps {
    typingUsers: PresenceState[]; // Array of users currently typing
    className?: string;
}

// --- Main Component Implementation ---
export const TypingIndicator = React.memo(({ typingUsers, className }: TypingIndicatorProps) => {
    // Don't render anything if no one is typing
    if (typingUsers.length === 0) {
        return null;
    }

    // Determine the text to display based on the number of typers
    // TODO (L10n): Wrap these strings with a translation function `t()`
    const indicatorText = typingUsers.length === 1
        ? `${typingUsers[0]?.name || 'Someone'} is typing...` // Fallback name
        : `${typingUsers.length} people are typing...`;

    return (
        <div
            className={cn(
                "flex items-center text-xs text-[var(--text-muted)] italic p-2", // Base styles
                className // Allow merging external classes
            )}
            role="status" // Use role="status" for semantic meaning of live updates
            aria-live="polite" // Announce updates to assistive technologies politely
            aria-atomic="false" // Only announce the changes, not the whole region
            data-testid="typing-indicator" // For testing purposes
        >
            {/* Bouncing dots animation component */}
            <TypingDots />

            {/* Typing indicator text */}
            <span>{indicatorText}</span>
        </div>
    );
});

TypingIndicator.displayName = 'TypingIndicator';

// TODO (Styling - Brief 3.X): Ensure custom 'animate-bounce-fast' is defined in global CSS.
// TODO (Agent Styling): Consider adding visual distinction if an agent (vs. user) is typing.