// === File: src/features/chat/components/messages/SystemMessage.tsx ===
// Description: Component for rendering generic system messages within the chat.

import React from 'react';
import { cn } from '@/lib/utils'; // Correct alias import
import { ChatMessage } from '@/types'; // Correct alias import for the message type
import { motion } from 'framer-motion'; // Optional: For animations

// --- Component Props ---

interface SystemMessageProps {
    message: ChatMessage; // Accept the full ChatMessage object
    className?: string;
}

// --- Component Implementation ---

export const SystemMessage = React.memo(({ message, className }: SystemMessageProps) => {
    // Format the timestamp (using createdAt)
    const formattedTime = message.createdAt
        ? new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
        : null; // Don't show timestamp if createdAt is missing

    return (
        // Optional: Add animation wrapper
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
                'flex flex-col items-center justify-center my-2', // Center alignment, margin top/bottom
                className
            )}
            data-message-id={message.id || message.clientGeneratedId}
            data-message-role={message.role || 'system'} // Use role or default to system
            data-sender-type="system"
            role="log" // Treat system messages like log entries
            aria-label={`System message: ${message.content}`}
        >
            {/* Timestamp (Optional, less prominent for system messages) */}
            {/* Consider showing timestamp only on hover/focus if desired */}
            {formattedTime && (
                <time
                    dateTime={message.createdAt ? new Date(message.createdAt).toISOString() : undefined}
                    className="text-[10px] text-[var(--text-muted)] opacity-70 mb-0.5"
                >
                    {formattedTime}
                </time>
            )}

            {/* Message Content Bubble */}
            <div
                className={cn(
                    "bg-[var(--bg-muted)] text-[var(--text-muted)]", // Muted background and text
                    "rounded-full", // Pill shape often used for system messages
                    "px-3 py-1", // Padding for pill shape
                    "text-xs italic shadow-sm", // Smaller, italic text
                    "max-w-[90%]" // Limit width
                )}
            >
                {/* Display the message content */}
                {message.content}
            </div>
        </motion.div>
    );
});

SystemMessage.displayName = 'SystemMessage';

// TODO (Styling - Brief 3.X): Refine system message styling (e.g., pill vs. block, icon usage) based on the final design system. Consider distinct styles for different system message types if metadata provides clues.