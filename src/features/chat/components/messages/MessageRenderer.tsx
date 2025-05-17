// === File: src/features/chat/components/messages/MessageRenderer.tsx ===
// Description: Centralized component for rendering various chat message types and stream events.

import React from 'react';
import { cn } from '@/lib/utils';
// Import specific message/trace components
import { ThinkingTraceMessage } from './ThinkingTraceMessage';
import { ToolCallMessage } from './ToolCallMessage';
import { MultiAgentSystemMessage } from './MultiAgentSystemMessage';
import { UserMessage } from './UserMessage';
import { AgentMessage } from './AgentMessage';
// Types
// Use the more specific type from the hook if it defines the structure accurately
import type { OptimisticMessageType as ChatMessage } from '@/hooks/useConversationMessages';
import type { StreamEvent } from '@/types'; // Assuming StreamEvent type is defined elsewhere
import type { AsrayaAgentId } from '@/types/agent'; // Assuming AsrayaAgentId type exists

// --- Combined Item Type ---
// Type for combined content items passed to the renderer
export type CombinedContentItem =
    | { type: 'message'; message: ChatMessage; timestamp: string }
    | { type: 'stream'; event: StreamEvent; timestamp: string };

// --- Fallback Component ---
// Renders a fallback UI for unhandled message/stream types
const FallbackMessageOrEvent = ({ item, isDebug }: { item: CombinedContentItem | ChatMessage; isDebug?: boolean }) => {
    const isStream = 'event' in item;
    const messageType = isStream ? item.event.type : (item.role || item.senderType);
    const messageContent = isStream ? item.event.part.metadata?.stepType || 'Unknown Step' : item.content;

    return (
        <div className="text-xs text-center text-[var(--color-error)] italic p-2 my-1 border border-dashed border-[var(--color-error)] rounded">
            Unhandled {isStream ? 'stream event' : 'message'} type: {messageType}
            {isDebug && <pre className="text-left mt-1 whitespace-pre-wrap text-[10px]">{JSON.stringify(item, null, 2)}</pre>}
            {!isDebug && !isStream && <p className="mt-1 text-[10px] non-italic">Content: "{String(messageContent).substring(0, 100)}..."</p>}
        </div>
    );
};
FallbackMessageOrEvent.displayName = 'FallbackMessageOrEvent';

// --- Component Props ---
interface MessageRendererProps {
    /** The message or stream event item to render */
    item: CombinedContentItem;
    /** The ID of the currently active agent, for potential highlighting (Phase 2) */
    globalActiveAgentId?: AsrayaAgentId | string;
    /** Flag to enable debug output within fallback components */
    isDebug?: boolean;
    /** Optional index, useful for staggered animations applied by the parent list */
    index?: number;
    /** Optional className to apply to the root element rendered */
    className?: string;
}

// --- Component Implementation ---
// This component acts as a dispatcher, selecting the appropriate rendering component
// based on the item's type and subtype (role, senderType, event type, etc.).
export const MessageRenderer = React.memo(({
    item,
    globalActiveAgentId,
    isDebug = false,
    index, // Kept for potential Phase 2 staggered animations via parent
    className, // Pass className down if specific styling is needed per item
}: MessageRendererProps) => {

    // --- 1. Stream Event Rendering ---
    // TODO (Refactor): If stream rendering logic becomes significantly more complex,
    // consider extracting this block into a separate `StreamEventRenderer` component.
    if (item.type === 'stream') {
        const { event } = item;
        const metadata = event.part.metadata; // Destructure for clarity
        const stepType = metadata?.stepType;
        const toolName = metadata?.toolName;
        const traceAgentName = metadata?.agentName;

        // Determine if the event is associated with the globally active agent
        const isActiveAgent = !!(globalActiveAgentId && traceAgentName && traceAgentName === globalActiveAgentId);

        // Common data attributes for debugging and testing stream events
        const streamDataAttrs = {
            'data-event-type': event.type,
            'data-source-agent': traceAgentName,
            'data-step-type': stepType,
            className: className, // Apply className to the rendered component's root
            // 'data-stream-index': index, // Pass index if needed by child animations
        };

        // Choose between ToolCall and ThinkingTrace based on metadata presence
        if (stepType === 'action' && toolName) {
            return (
                <ToolCallMessage
                    event={event}
                    globalActiveAgentId={globalActiveAgentId}
                    isActiveAgent={isActiveAgent}
                    isDebug={isDebug}
                    {...streamDataAttrs}
                    data-tool-name={toolName} // Specific attribute for tool calls
                />
            );
        } else if (stepType === 'thought' || stepType === 'planning') { // More explicit check?
             return (
                 <ThinkingTraceMessage
                     event={event}
                     globalActiveAgentId={globalActiveAgentId}
                     isActiveAgent={isActiveAgent}
                     isDebug={isDebug}
                     {...streamDataAttrs}
                     // Add other relevant data attributes if needed
                 />
             );
        } else {
            // Fallback for unhandled stream event stepTypes
             if (process.env.NODE_ENV === 'development') {
                 console.warn(`[MessageRenderer] Fallback used for stream event stepType: ${stepType}`, event);
             }
            return <FallbackMessageOrEvent item={item} isDebug={isDebug} />;
        }
    }

    // --- 2. Regular Message Rendering ---
    // TODO (Refactor): If the number of message types grows significantly,
    // consider using a mapping object (e.g., `messageTypeToComponentMap`)
    // instead of a long `else if` chain for better maintainability.
    else if (item.type === 'message') {
        const { message } = item;
        // Common data attributes for debugging and testing messages
        const messageDataAttrs = {
            'data-message-type': message.role,
            'data-sender-type': message.senderType,
            'data-message-id': message.id || message.clientGeneratedId, // Use client ID as fallback
            'data-source-agent': message.senderType === 'agent' ? message.agent_id : undefined,
            className: className, // Apply className to the rendered component's root
            // 'data-message-index': index, // Pass index if needed by child animations
        };

        let messageComponent: React.ReactNode = null;

        // Dispatch rendering based on role or senderType
        switch (message.senderType) {
            case 'user':
                messageComponent = <UserMessage message={message} {...messageDataAttrs} />;
                break;
            case 'agent':
                messageComponent = <AgentMessage message={message} globalActiveAgentId={globalActiveAgentId} {...messageDataAttrs} />;
                break;
            case 'system':
                 // Handle specific system roles differently if needed
                 if (message.role === 'multi-agent-coordination') {
                     messageComponent = <MultiAgentSystemMessage message={message} {...messageDataAttrs} />;
                 } else {
                     // Generic system message display (e.g., "Conversation started")
                     messageComponent = (
                         <div className={cn("text-xs text-center italic text-[var(--text-muted)] p-2 my-1", className)} role="status" {...messageDataAttrs}>
                             {message.content}
                         </div>
                     );
                 }
                 break;
            default:
                 // Fallback for unhandled sender types
                 if (process.env.NODE_ENV === 'development') {
                     console.warn(`[MessageRenderer] Fallback used for message senderType: ${message.senderType || 'unknown'}`, message);
                 }
                 messageComponent = <FallbackMessageOrEvent item={message} isDebug={isDebug} />;
                 break;
         }

        return messageComponent;
    }

    // --- 3. Ultimate Fallback ---
    // This should ideally never be reached if `item.type` is always 'message' or 'stream'
    if (process.env.NODE_ENV === 'development') {
        console.error('[MessageRenderer] Encountered item with unknown top-level type:', item);
    }
    // Render nothing or a minimal error indicator in production if this state occurs
    return null;
});

MessageRenderer.displayName = 'MessageRenderer';