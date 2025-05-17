// === File: src/features/chat/components/messages/MultiAgentSystemMessage.tsx ===
// Description: Component for rendering system messages related to agent handoffs and coordination.

import React from 'react';
import { motion } from 'framer-motion'; // For animations
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/types';
// import { AgentBadge } from '@/components/ui/AgentBadge'; // TODO: Import when AgentBadge is available

interface MultiAgentSystemMessageProps {
  message: ChatMessage;
  className?: string;
}

export const MultiAgentSystemMessage = React.memo(({
  message,
  className
}: MultiAgentSystemMessageProps) => {

  // Extract potential metadata about the system event type
  const eventType = message.metadata?.eventType || message.metadata?.handoffType; // Example: 'agent_join', 'agent_leave', 'handoff', etc.

  return (
    <motion.div
      // Subtle animation for system message appearance
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      // Styling for the container: centered, horizontal rule like
      className={cn(
        'flex items-center justify-center gap-2 py-2 px-4 my-2',
        'border-t border-b border-[var(--border-subtle)]', // Subtle separator
        className
      )}
      data-message-id={message.id}
      data-message-role={message.role}
    >
        {/* Visual Anchor/Icon - TODO: Replace with dynamic icon based on eventType */}
        <span className="text-sm text-[var(--text-muted)] opacity-75" aria-hidden="true">
            {eventType === 'agent_join' ? '➕' :
             eventType === 'agent_leave' ? '➖' :
             eventType === 'handoff' ? '🤝' :
             'ℹ️'} {/* Default info icon */}
        </span>

        {/* Optional: Badge for Event Type */}
        {eventType && (
            <span className="text-[10px] bg-[var(--bg-muted)] text-[var(--text-muted)] px-1.5 py-0.5 rounded-full font-medium">
                {eventType.replace(/_/g, ' ')} {/* Simple formatting */}
            </span>
        )}

        {/* TODO: Agent Badge Integration */}
        {/* {message.metadata?.agentId && <AgentBadge id={message.metadata.agentId} size="xs" />} */}

        {/* Message Content - Announce changes politely */}
        <div
            className="text-xs text-[var(--text-muted)] italic text-center"
            role="status" // Announce this as a status update
            aria-live="polite" // Announce non-invasively
        >
            {message.content}
        </div>
    </motion.div>
  );
});

MultiAgentSystemMessage.displayName = 'MultiAgentSystemMessage';

// TODO (Brief 5.4 & Refinements): Implement styling & rendering for additional scenarios:
// - Enhance visual distinction based on message.metadata.eventType (e.g., agent_join, agent_leave, handoff).
// - Integrate AgentBadge component when available.
// - Refine handoff animations/transitions for smoother UX.
// - Improve visual hierarchy/layout for complex multi-agent coordination messages.
// - Replace placeholder icons with a proper icon library.