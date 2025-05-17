// === File: src/features/chat/components/messages/AgentMessage.tsx ===
// Description: Agent message bubble component, styled for agent responses (left-aligned).

import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// Assuming this type includes agentId, clientGeneratedId etc.
import type { OptimisticMessageType as ChatMessage } from '@/hooks/useConversationMessages';
import type { AsrayaAgentId } from '@/types/agent'; // Assuming this type exists

interface AgentMessageProps {
  message: ChatMessage;
  /** Optional: Used if message itself doesn't contain agentId (less common) */
  globalActiveAgentId?: AsrayaAgentId | string;
  className?: string;
}

// Helper function to get initials from a name string
const getInitials = (name?: string | null): string => {
    if (!name) return 'A'; // Default to 'A' for Agent if no name
    const names = name.split(' ').filter(Boolean);
    if (names.length === 0) return 'A';
    if (names.length === 1) return names[0][0];
    // Return first letter of first and last word/part
    return names[0][0] + names[names.length - 1][0];
};

// Helper function to format timestamp (simple HH:MM)
const formatTimestamp = (isoString?: string | null): string | null => {
    if (!isoString) return null;
    try {
        const date = new Date(isoString);
        // Consider user's locale and time zone preferences in Phase 2/3
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
        console.error("Error formatting date:", e);
        return null; // Handle invalid date string gracefully
    }
};

export const AgentMessage = React.memo(({
  message,
  globalActiveAgentId, // Keep prop if needed, but primarily use message.agentId
  className,
  ...props
}: AgentMessageProps) => {
  // Prefer agentId from the message itself if available
  const agentId = message.agent_id || globalActiveAgentId || 'oracle'; // Fallback needed
  const messageId = message.id || message.clientGeneratedId; // Use client ID as fallback
  const timestamp = formatTimestamp(message.created_at);

  // TODO (Phase 2): Load agent metadata (name, avatarUrl, potentially colors if not themed)
  // from a centralized agent registry based on `agentId`.
  // For Phase 1, use fallbacks based on ID or message properties.
  const agentRegistryData = null; // Placeholder for fetched data in P2
  const agentAvatarUrl = message.avatarUrl || agentRegistryData?.avatarUrl || `/avatars/${agentId}.png`; // P1 fallback path
  const agentName = message.senderName || agentRegistryData?.name || agentId.charAt(0).toUpperCase() + agentId.slice(1); // P1 fallback name

  // Generate initials using the helper
  const initials = getInitials(agentName);

  // isActiveAgent logic remains if needed for future highlighting (Phase 2)
  // const isActiveAgent = globalActiveAgentId === agentId;

  return (
    <div
      id={`message-${messageId}`}
      className={cn(
        // CRITICAL: Alignment and Width
        'flex items-start gap-3 max-w-[85%] self-start', // Align left, limit width
        'transition-opacity duration-300 ease-in-out',
        // Apply agent-specific theme variables via class
        // Ensure corresponding .theme-AGENT_ID { ... } exists in CSS/globals
        `theme-${agentId}`,
        className
      )}
      data-message-id={messageId}
      data-sender-type="agent"
      data-agent-id={agentId}
      {...props}
    >
      {/* Agent Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0 ring-1 ring-[var(--agent-color-primary)] ring-opacity-20">
        <AvatarImage
          src={agentAvatarUrl}
          alt={agentName}
        />
        {/* Themed fallback using agent-specific variables */}
        <AvatarFallback className="bg-[var(--agent-color-muted)] text-[var(--agent-color-primary)] font-semibold">
          {initials.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Message Content Area */}
      <div className="flex flex-col gap-1 min-w-0">
        {/* Agent Name */}
        <div className="text-xs text-[var(--agent-color-primary)] font-medium px-1">
          {agentName}
        </div>

        {/* Message Bubble */}
        <div className={cn(
            "relative bg-[var(--agent-color-secondary)] text-[var(--agent-color-text)]",
            "rounded-lg rounded-tl-none", // Bubble tail pointing right (towards avatar)
            "py-2 px-3",
            "break-words", // Ensure long words wrap
            "shadow-sm" // Optional subtle shadow
        )}>
            {/* Message Text */}
           <p className="text-sm">{message.content}</p>

            {/* Timestamp inside bubble (optional) */}
            {timestamp && (
                 <span className="text-xs opacity-70 float-right pl-2 pt-1" aria-label={`Sent at ${timestamp}`}>
                    {timestamp}
                 </span>
            )}
        </div>

         {/* Placeholder for potential future elements like action buttons or feedback */}
         {/* <div className="flex gap-2 mt-1"> ... </div> */}
      </div>
    </div>
  );
});

AgentMessage.displayName = 'AgentMessage';