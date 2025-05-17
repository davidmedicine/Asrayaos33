/**
 * InputBar.tsx
 * Core text input component for user interaction
 * Adapts based on context, agent, and state
 */

import { useState, useRef, useEffect, KeyboardEvent, FormEvent } from 'react';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import { useDraftsStore } from '@/lib/state/slices/draftsSlice';
import { AgentChipDisplay } from './AgentChipDisplay';
import { VoiceInputButton } from './VoiceInputButton';

interface InputBarProps {
  contextKey: string;
  onSubmit?: (text: string) => void | Promise<void>;
  className?: string;
  autoFocus?: boolean;
}

export function InputBar({
  contextKey,
  onSubmit,
  className = '',
  autoFocus = false
}: InputBarProps) {
  const { 
    inputConfig, 
    activeAgent,
    agentOrbState,
    isLangGraphActive,
    isRecording
  } = useInteractionContext();
  
  const { saveDraft, getDraft } = useDraftsStore();
  
  // Get current draft for this context
  const currentDraft = getDraft(contextKey) || '';
  
  // Local input state (syncs with draft)
  const [inputValue, setInputValue] = useState(currentDraft);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Update input when draft changes (e.g., from another component)
  useEffect(() => {
    setInputValue(currentDraft);
  }, [currentDraft]);
  
  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [inputValue]);
  
  // Auto-focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus, contextKey]);
  
  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Save draft
    saveDraft(contextKey, value);
  };

  // Handle voice transcription updates
  const handleTranscript = (transcript: string, isFinal: boolean) => {
    setInputValue((prev) => {
      // If this is a final result or the first interim result, append it
      const newValue = prev + (prev && !prev.endsWith(' ') ? ' ' : '') + transcript;
      
      // Save draft for final results
      if (isFinal) {
        saveDraft(contextKey, newValue);
      }
      
      return newValue;
    });
  };
  
  // Handle keyboard submit (Ctrl/Cmd + Enter or just Enter if not multi-line)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const isMultiLine = inputValue.includes('\n');
    
    if (
      (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ||
      (e.key === 'Enter' && !isMultiLine && !e.shiftKey)
    ) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  // Handle form submit
  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    
    if (!inputValue.trim()) return;
    
    if (onSubmit) {
      await onSubmit(inputValue.trim());
    }
    
    // Clear input and draft
    setInputValue('');
    saveDraft(contextKey, '');
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };
  
  // Determine placeholder
  const placeholder = inputConfig?.placeholder || 'Type a message...';
  
  // Determine if we should show the agent chip
  const showAgentChip = inputConfig?.agentDisplay && activeAgent;
  
  // Determine if input should be disabled - improved logic using isLangGraphActive
  const isDisabled = 
    isRecording || 
    agentOrbState === 'error' || 
    (isLangGraphActive && inputConfig?.submitTo === 'LangGraph');
  
  // Set error state styling
  const isError = agentOrbState === 'error';
  
  return (
    <form 
      onSubmit={handleSubmit} 
      className={`input-bar relative flex items-end rounded-lg 
        ${isError ? 'border-[var(--color-error)]' : 'border-[var(--inputbar-border-color)]'} 
        bg-[var(--inputbar-bg-color)] p-2 transition-all ${className}`}
      style={{
        boxShadow: isError 
          ? '0 0 0 1px var(--color-error)' 
          : inputValue 
            ? '0 0 0 2px var(--inputbar-glow-color)' 
            : 'none'
      }}
    >
      {/* Agent Chip (if applicable) */}
      {showAgentChip && (
        <AgentChipDisplay className="mb-1 mr-2 flex-shrink-0" />
      )}
      
      {/* Input Area */}
      <div className="flex flex-1 items-end">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isError ? 'An error occurred. Please try again.' : placeholder}
          disabled={isDisabled}
          rows={1}
          className={`w-full resize-none bg-transparent py-2 px-3 text-text-default placeholder-text-muted focus:outline-none disabled:opacity-60
            ${isError ? 'placeholder-[var(--color-error)]' : ''}`}
          style={{
            minHeight: '44px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        />
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-1 pl-2">
        {/* Voice Input Button */}
        <VoiceInputButton 
          contextKey={contextKey} 
          onTranscript={handleTranscript}
        />
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={!inputValue.trim() || isDisabled}
          className={`rounded-full p-2 text-white transition-all duration-200 hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
            ${isError ? 'bg-[var(--color-error)]' : 'bg-[var(--agent-color-primary)]'}`}
          aria-label="Send message"
        >
          {/* Icon placeholder - replace with actual icon component */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="h-5 w-5"
          >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </div>
    </form>
  );
}