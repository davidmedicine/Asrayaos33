// src/features/chat/components/ChatInputBar.tsx
'use client';

import React, {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { VoiceInputButton } from '@/components/input-bar/VoiceInputButton';
import { AgentChipDisplay } from '@/components/input-bar/AgentChipDisplay';

import { cn } from '@/lib/utils';
import { useAgentStore } from '@/lib/state/slices/agentSlice';

/* ─────────────────────────────────────────────────────────────── */
/* Types                                                           */
/* ─────────────────────────────────────────────────────────────── */
export interface ChatInputBarProps {
  onSubmit: (msg: string) => Promise<void>;
  isProcessing?: boolean;
  disabled?: boolean;
  /** Override placeholder text */
  placeholderText?: string;
  className?: string;
  /** Override the global active‑agent chip */
  agentId?: string;
}

/* ─────────────────────────────────────────────────────────────── */
/* Component                                                       */
/* ─────────────────────────────────────────────────────────────── */
export const ChatInputBar: React.FC<ChatInputBarProps> = React.memo(
  ({
    onSubmit,
    isProcessing = false,
    disabled = false,
    placeholderText,
    className,
    agentId,
  }) => {
    /* local state / refs */
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    /* active agent for chip */
    const globalAgentId = useAgentStore((s) => s.activeAgentId);
    const activeAgent = agentId ?? globalAgentId ?? 'oracle';

    /* handlers */
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value),
      [],
    );

    const handleSubmit = useCallback(
      async (e: FormEvent) => {
        e.preventDefault();
        const msg = value.trim();
        if (!msg || isProcessing || disabled) return;

        setValue(''); // optimistic clear
        await onSubmit(msg);
      },
      [value, isProcessing, disabled, onSubmit],
    );

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit(e as unknown as FormEvent);
        }
      },
      [handleSubmit],
    );

    const handleVoiceResult = useCallback((text: string) => {
      setValue((prev) => (prev ? `${prev} ${text}` : text));
      textareaRef.current?.focus();
    }, []);

    /* textarea auto‑resize */
    useEffect(() => {
      if (!textareaRef.current) return;
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        240,
      )}px`;
    }, [value]);

    /* derived placeholder */
    const derivedPlaceholder = placeholderText ?? 'Type your message…';

    /* ─────────────────────────────────────────────────────────── */

    return (
      <form
        onSubmit={handleSubmit}
        aria-busy={isProcessing}
        aria-label="Chat message input form"
        className={cn(
          'flex-shrink-0 border-t border-[var(--border-muted)]',
          'bg-[var(--bg-surface)] p-3',
          'pb-[calc(0.75rem+env(safe-area-inset-bottom))]',
          className,
        )}
      >
        <AgentChipDisplay agentId={activeAgent} className="mb-2" />

        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message input
          </label>

          <Textarea
            ref={textareaRef}
            id="chat-input"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={derivedPlaceholder}
            rows={1}
            disabled={isProcessing || disabled}
            className={cn(
              'flex-grow resize-none min-h-[38px] rounded-md border',
              'border-[var(--border-muted)] bg-transparent px-3 py-2',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agent-color-primary)] focus-visible:ring-offset-1',
              'field-sizing-auto' /* Enhancement for Tailwind v4 */
            )}
          />

          <VoiceInputButton
            onResult={handleVoiceResult}
            disabled={isProcessing || disabled}
            aria-label="Start voice input"
          />

          <Button
            type="submit"
            disabled={!value.trim() || isProcessing || disabled}
            isLoading={isProcessing}
            aria-label="Send message"
          >
            Send
          </Button>
        </div>
      </form>
    );
  },
);

ChatInputBar.displayName = 'ChatInputBar';
