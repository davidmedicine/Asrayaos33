// === File: src/features/chat/components/ConversationHeader.tsx ===
// Description: Sticky header banner for conversations, featuring an editable title,
//              realtime presence indicators, and action buttons.

import React, { forwardRef, useId } from 'react';
import { Button } from '@/components/ui/Button'; // Adjust path as needed
import { RealtimeAvatarStack } from '@/components/realtime-avatar-stack'; // Adjust path as needed

// --- Component Props ---

interface ConversationHeaderProps {
  /** The current title of the conversation. */
  title: string;
  /** The unique identifier for the conversation room (for presence). Can be null/undefined if not applicable. */
  roomId: string | null | undefined;
  /** Callback when the title input changes. Receives the new title string. */
  onTitleChange: (newTitle: string) => void;
  /** Callback for the "Invite" button click. */
  onInvite: () => void;
  /** Callback for the "Artifact" button click. */
  onArtifact: () => void;
  /** Size for the presence avatars (e.g., 'sm', 'md'). Defaults to 'sm'. */
  presenceSize?: 'xs' | 'sm' | 'md' | 'lg';
}

// --- Component Implementation ---

/**
 * Renders a sticky banner header for a conversation.
 * Includes an editable title, a presence stack, and Invite/Artifact buttons.
 * Designed to be controlled by its parent component.
 *
 * Accessibility:
 * - Uses role='banner' for semantic structure.
 * - Input and buttons have aria-labels.
 */
export const ConversationHeader = forwardRef<HTMLDivElement, ConversationHeaderProps>(
  (
    {
      title,
      roomId,
      onTitleChange,
      onInvite,
      onArtifact,
      presenceSize = 'sm', // Default presence size
    },
    ref // Forward ref to the root element
  ) => {
    const titleId = useId(); // Unique ID for the title input

    // Handle input changes and pass the value up
    const handleTitleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onTitleChange(e.target.value);
    };

    return (
      // --- Sticky Banner Container ---
      <div
        ref={ref}
        role="banner"
        // Classes for sticky positioning, layout, background, border, and z-index
        // referencing variables/utilities from global.css
        className="sticky top-0 z-header flex items-center justify-between gap-2 p-2 bg-[var(--bg-surface)] border-b border-[var(--border-muted)] flex-shrink-0"
      >
        {/* --- Left Section: Title & Presence --- */}
        <div className="flex items-center min-w-0 gap-2">
          {/* --- Editable Title --- */}
          <input
            id={titleId}
            type="text"
            value={title}
            onChange={handleTitleInputChange}
            placeholder="Conversation Title..."
            aria-label="Conversation title"
            // Styling for the input field, including focus state using CSS variables
            className="bg-transparent text-lg font-medium leading-tight truncate focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-surface)] focus:ring-[var(--focus-ring-color)] rounded px-1 py-0.5"
          />

          {/* --- Presence Stack (Conditional) --- */}
          {roomId && (
            <RealtimeAvatarStack
               roomName={roomId}
               size={presenceSize}
            />
          )}
        </div>

        {/* --- Right Section: Action Buttons --- */}
        <div className="flex gap-1 flex-shrink-0">
          {/* --- Invite Button (Ghost Variant) --- */}
          <Button
            size="sm"
            variant="ghost" // Uses .btn-ghost styles from global.css
            onClick={onInvite}
            aria-label="Invite people"
            title="Invite people" // Tooltip
          >
            Invite
          </Button>

          {/* --- Artifact Button (Ghost Variant) --- */}
          <Button
            size="sm"
            variant="ghost" // Uses .btn-ghost styles from global.css
            onClick={onArtifact}
            aria-label="Create artifact"
            title="Create artifact" // Tooltip
          >
            Artifact
          </Button>
        </div>
      </div>
    );
  }
);

ConversationHeader.displayName = 'ConversationHeader';