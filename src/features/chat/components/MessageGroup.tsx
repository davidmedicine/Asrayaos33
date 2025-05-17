// === File: src/features/chat/components/MessageGroup.tsx ===
// Description: Groups consecutive chat messages from the same sender and applies entry animation.

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils'; // Utility for conditional classNames
import { ChatMessage } from '@/types'; // Assuming ChatMessage type is defined here
import { durations, easings } from '@/lib/motiontokens'; // Assuming animation constants are here
import { prefersReducedMotion } from '@/lib/accessibility'; // Assuming accessibility helper is here
import { Avatar } from '@/components/ui/Avatar'; // Assuming an Avatar component exists
import { ChatBubble } from './ChatBubble'; // Assuming a ChatBubble component exists

// --- Component Props ---

interface MessageGroupProps {
  /** An array of consecutive messages from the same sender. */
  messages: ChatMessage[];
  /** Flag indicating if this is the last message group in the chat list. */
  isLastGroup?: boolean; // Optional prop, can be used for styling/logic if needed
  /** The ID of the currently active agent (used for differentiating agent messages). */
  activeAgentId?: string; // May not be strictly needed if message has agent_id
}

// --- Component Implementation ---

/**
 * React component that groups an array of ChatMessage objects from the
 * same sender. Displays an avatar for non-user messages and applies a
 * GSAP entry animation on initial render.
 */
export const MessageGroup: React.FC<MessageGroupProps> = ({
  messages,
  isLastGroup,
  activeAgentId, // Keep prop in case needed for avatar styling or logic
}) => {
  const groupRef = useRef<HTMLDivElement>(null);

  // --- Input Validation ---
  // If there are no messages, render nothing.
  if (!messages || messages.length === 0) {
    return null;
  }

  // --- Derive Group Properties ---
  // Assume all messages in the group share the same sender properties.
  const firstMessage = messages[0];
  const senderType = firstMessage.sender_type; // 'user' or 'assistant' (or other agent type)
  const isUser = senderType === 'user';
  const agentId = firstMessage.agent_id; // Specific agent ID for this message group

  // --- Animation Effect ---
  useEffect(() => {
    // Animate the group fading in and sliding up slightly on mount.
    if (groupRef.current && !prefersReducedMotion()) {
      gsap.from(groupRef.current, {
        opacity: 0,
        y: 12, // Slide up distance
        duration: durations.fast, // Use predefined duration
        ease: easings.out, // Use predefined easing
      });
    }
    // No cleanup needed as it's a 'from' animation on mount.
  }, []); // Empty dependency array ensures this runs only once on mount.

  // --- Render Logic ---
  return (
    <div
      ref={groupRef}
      className={cn(
        'flex w-full items-end gap-2', // Base layout: flex, align items bottom, gap
        isUser ? 'justify-end' : 'justify-start' // Align group right for user, left otherwise
        // Add margin bottom if needed, e.g., 'mb-2' or 'mb-3'
      )}
      data-sender-type={senderType}
      data-agent-id={agentId || 'user'}
    >
      {/* --- Avatar (Conditional) --- */}
      {/* Show avatar only for non-user messages */}
      {!isUser && (
        <div className="flex-shrink-0 self-start pt-1"> {/* Align avatar top, prevent shrinking */}
           <Avatar
             agentId={agentId || 'default'} // Pass agent ID to Avatar
             size="sm" // Example size, adjust as needed
             // Add other Avatar props like status if available/needed
           />
         </div>
      )}

      {/* --- Message Bubbles Container --- */}
      {/* This div contains all bubbles for the group */}
      <div
        className={cn(
          'flex flex-col',
          isUser ? 'items-end' : 'items-start', // Align bubbles internally
          'space-y-1' // Vertical spacing between bubbles in the group
        )}
      >
        {messages.map((message, index) => (
          <ChatBubble
            key={message.id || `msg-${index}`} // Use message ID or index as key
            message={message}
            // Optional: Pass flags if bubble styling depends on position
            // isFirstInGroup={index === 0}
            // isLastInGroup={index === messages.length - 1}
            // Pass other relevant props to ChatBubble if needed
          />
        ))}
      </div>
    </div>
  );
};

MessageGroup.displayName = 'MessageGroup';