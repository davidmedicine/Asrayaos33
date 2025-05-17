// === File: src/features/chat/components/messages/UserMessage.tsx ===
// Description: User message bubble component, styled for the current user (right-aligned).

import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// Use the specific message type from the hook, assuming it includes profile, status, etc.
import type { OptimisticMessageType as ChatMessage } from '@/hooks/useConversationMessages';
import { AlertCircle, Clock } from 'lucide-react'; // Icons for status indication

interface UserMessageProps {
  message: ChatMessage;
  className?: string;
  // Consider adding in Phase 2:
  // onRetry?: (clientGeneratedId: string) => void;
}

// Helper function to get initials from a name string (e.g., "John Doe" -> "JD")
const getInitials = (name?: string | null): string => {
    if (!name) return 'U'; // Default to 'U' for User if no name
    const names = name.trim().split(' ').filter(Boolean);
    if (names.length === 0) return 'U';
    if (names.length === 1) return names[0][0]?.toUpperCase() || 'U';
    // Return first letter of first and last word/part
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

// Helper function to format timestamp (simple HH:MM AM/PM)
// Phase 2/3: Consider using a robust date library (like date-fns or dayjs)
// for better localization, time zones, and relative time formatting.
const formatTimestamp = (isoString?: string | null): string | null => {
    if (!isoString) return null;
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return null; // Check for invalid date
        return date.toLocaleTimeString(navigator.language || 'en-US', { // Use browser locale preference
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        console.error("Error formatting date:", isoString, e);
        return null; // Handle errors gracefully
    }
};


export const UserMessage = React.memo(({
    message,
    className,
    // onRetry, // Destructure Phase 2 prop if added
    ...props
}: UserMessageProps) => {
  const isSending = message.status === 'sending';
  const isFailed = message.status === 'failed';
  // Use clientGeneratedId as a stable key, especially during sending/failure
  const messageId = message.clientGeneratedId || message.id;
  const senderName = message.profile?.full_name; // User's own name from profile
  const avatarUrl = message.profile?.avatar_url; // User's own avatar URL
  // Format timestamp only if message is not actively sending
  const timestamp = (isSending || isFailed) ? null : formatTimestamp(message.created_at);

  // Generate initials using the helper
  const initials = getInitials(senderName);

  // const handleRetry = () => {
  //   if (message.clientGeneratedId) {
  //      onRetry?.(message.clientGeneratedId);
  //   }
  // };

  return (
    <div
      id={`message-${messageId}`} // Use stable client ID if available
      className={cn(
        'flex items-start gap-3 max-w-[85%] ml-auto self-end', // Align user message to the right, limit width
        'transition-opacity duration-300 ease-in-out', // Smooth opacity change for sending state
        isSending && 'opacity-70', // Fade slightly when sending
        // isFailed state is handled more explicitly below (border/icon/alert)
        className
      )}
      data-message-id={messageId}
      data-sender-type="user"
      data-status={message.status}
      aria-live="polite" // Announce changes (like failed status) to screen readers
      {...props}
    >
        {/* Avatar Section (Optional for user's own message) */}
        {/* Usually hidden in modern UIs as alignment implies sender. Uncomment if needed. */}
        {/* <Avatar className="h-8 w-8 flex-shrink-0 order-last ml-2">
            <AvatarImage
                src={avatarUrl || undefined} // Use profile avatar
                alt={senderName || 'User'}
            />
            <AvatarFallback>{initials}</AvatarFallback>
        </Avatar> */}


      {/* Message Content Area (Aligned to the right due to parent's self-end) */}
      <div className="flex flex-col items-end gap-0.5 min-w-0"> {/* Reduced gap slightly */}

        {/* Message Bubble */}
        <div className={cn(
            "relative text-[var(--color-primary-foreground)] bg-[var(--color-primary)]", // Use primary theme color for user bubble
            "rounded-xl rounded-tr-none", // Standard chat bubble "tail" pointing left
            "py-2 px-3",
            "break-words", // Wrap long words/strings
            "shadow-sm", // Subtle depth
             // Visual indication for failed state directly on the bubble
             isFailed && 'ring-1 ring-red-500/80 bg-gradient-to-br from-[var(--color-primary)] to-red-800/20',
        )}>
            {/* Message Text */}
            {/* Consider rendering Markdown here in Phase 2/3 */}
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>

            {/* Status Container (Timestamp or Sending Indicator) inside bubble */}
            <div className="text-xs opacity-70 float-right clear-both pl-2 pt-1 h-[1em]"> {/* Ensure height for alignment */}
                {/* Timestamp (only if sent successfully) */}
                {timestamp && (
                    <span aria-label={`Sent at ${timestamp}`}>
                        {timestamp}
                    </span>
                )}
                {/* Sending Indicator */}
                {isSending && (
                    <span className="inline-flex items-center" aria-label="Sending message">
                        <Clock size={12} className="mr-1 animate-spin-slow" /> {/* Ensure animate-spin-slow is defined */}
                        {/* Sending... */}
                    </span>
                )}
             </div>
        </div>

        {/* Status Indicator for Failed Messages (Displayed Below Bubble) */}
        {isFailed && (
          <div
            className="text-xs text-[var(--color-error)] flex items-center gap-1 mt-1 px-1"
            role="alert" // Important for accessibility
          >
            <AlertCircle size={14} aria-hidden="true" />
            <span>Failed to send.</span>
            {/* Phase 2: Retry Button/Link */}
            {/* <button onClick={handleRetry} className="underline ml-1 hover:text-[var(--color-error-hover)]">Retry</button> */}
          </div>
        )}
      </div>
    </div>
  );
});

UserMessage.displayName = 'UserMessage';