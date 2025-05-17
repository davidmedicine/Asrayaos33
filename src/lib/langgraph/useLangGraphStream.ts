// File path: asrayaos3.4/src/lib/langgraph/useLangGraphStream.ts
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '@/lib/state/store'; // Your main store hook
import { nanoid } from 'nanoid'; // Use nanoid for IDs

// --- Constants ---
const DEFAULT_AGENT_ID = 'oracle';
const DEFAULT_MOCK_ERROR_CHANCE = 0.1;
const DEFAULT_MIN_THINKING_DELAY_MS = 1000;
const DEFAULT_MAX_THINKING_DELAY_MS = 3000;
const DEFAULT_STREAMING_INTERVAL_MS = 150;
const DEFAULT_CONVERSATION_NAME_MAX_LENGTH = 30;
const SUBMIT_DEBOUNCE_MS = 300;

const DEFAULT_SIMULATED_ERROR_MESSAGE =
  'An error occurred while processing your request. Please try again.';

// Keep your actual chunks here
const DEFAULT_MOCK_RESPONSE_CHUNKS = [
    'I understand ', "you're asking about ", 'how to approach this. ',
    "Based on what you've shared, ", 'there are several ways to think about it. ',
    'First, consider the context and your specific goals. ',
    'This helps frame the problem appropriately. ',
    'Second, breaking down complex issues into smaller parts ',
    'often makes them more manageable. ',
    'Finally, remember that iteration is key to improvement. ',
    'Would you like me to elaborate on any of these aspects?',
];

// --- Type Definitions ---
type MessageRole = 'user' | 'agent' | 'system';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  // conversationId?: string; // Optional: Add if needed
}

// --- Hook Interfaces ---
interface UseLangGraphStreamOptions {
  chatId?: string | null;
  agentId?: string;
  onComplete?: (response: string) => void;
  onError?: (err: string) => void;
  chunkInterval?: number;
  errorRate?: number;
  mockResponseChunks?: string[];
}

interface UseLangGraphStreamResult {
  isThinking: boolean;
  isStreaming: boolean;
  hasFinalContent: boolean;
  hasError: boolean;
  streamedContent: string;
  finalContent: string;
  error: string | null;
  submitMessage: (content: string) => void;
  reset: () => void;
  retry: () => void;
}

// --- Hook Implementation ---
export function useLangGraphStream({
  chatId,
  agentId = DEFAULT_AGENT_ID,
  onComplete,
  onError,
  chunkInterval,
  errorRate,
  mockResponseChunks = DEFAULT_MOCK_RESPONSE_CHUNKS,
}: UseLangGraphStreamOptions = {}): UseLangGraphStreamResult {
  // --- State ---
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [finalContent, setFinalContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  // --- Refs ---
  const lastMessageRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isBusyRef = useRef(false);

  // --- Zustand Store Access (Flat State Access) ---
  const storeActiveChatId = useStore((state) => state.activeChatId as string | null | undefined);
  const addMessage = useStore((state) => state.addMessage as ((payload: { chatId: string; message: Message }) => void) | undefined);
  const createConversation = useStore((state) => state.createConversation as ((payload: { name: string; agentId: string }) => string) | undefined);

  // Determine effective chat ID
  const effectiveChatId = chatId ?? storeActiveChatId;

  // --- Cleanup Effect ---
  useEffect(() => {
    return () => {
      clearStreamingInterval();
    };
  }, []);

  // --- Utility Functions ---
  const clearStreamingInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
  };

  const reset = useCallback(() => {
    setIsThinking(false);
    setIsStreaming(false);
    setStreamedContent('');
    setFinalContent('');
    setError(null);
    clearStreamingInterval();
    isBusyRef.current = false; // Also reset busy flag on manual reset
  }, []);

  // --- Core Logic ---
  const submitMessage = useCallback(
    (content: string) => {
      // Debounce check
      if (isBusyRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[LangGraphStream] Submission debounced.');
        }
        return;
      }
      isBusyRef.current = true;
      setTimeout(() => { isBusyRef.current = false; }, SUBMIT_DEBOUNCE_MS);

      lastMessageRef.current = content;
      reset();

      let targetChatId = effectiveChatId;

      // Check actions availability
      if (typeof createConversation !== 'function' || typeof addMessage !== 'function') {
          const errMsg = "Chat actions missing from store.";
          console.error(`[LangGraphStream] ${errMsg}`);
          setError(errMsg); onError?.(errMsg); isBusyRef.current = false; return;
      }

      // Create conversation if needed
      if (!targetChatId) {
        const newConversationName = content.length > DEFAULT_CONVERSATION_NAME_MAX_LENGTH
            ? `${content.substring(0, DEFAULT_CONVERSATION_NAME_MAX_LENGTH)}...` : content;
        // Use the checked createConversation function
        targetChatId = createConversation({ name: newConversationName, agentId });
        if (!targetChatId) {
            const errMsg = 'Could not initiate chat. Failed to get a chat ID from createConversation.';
            console.error(`[LangGraphStream] ${errMsg}`);
            setError(errMsg); onError?.(errMsg); isBusyRef.current = false; return;
        }
      }

      // Telemetry Log
      if (process.env.NODE_ENV === 'development') {
        console.debug('[LangGraphStream] Submit:', { content, chatId: targetChatId, agentId });
      }

      // Create user message
      const userMessage: Message = {
        id: `msg-${nanoid(10)}`, role: 'user', content, timestamp: Date.now(),
      };
      // Use the checked addMessage function
      addMessage({ chatId: targetChatId, message: userMessage });

      // --- Start Simulation ---
      setIsThinking(true);
      // *** FIX: Restore Calculation ***
      const simulatedThinkingTime =
        DEFAULT_MIN_THINKING_DELAY_MS +
        Math.random() *
          (DEFAULT_MAX_THINKING_DELAY_MS - DEFAULT_MIN_THINKING_DELAY_MS);
      // *** END FIX ***

      const effectiveErrorRate = errorRate ?? DEFAULT_MOCK_ERROR_CHANCE;
      const effectiveChunkInterval = chunkInterval ?? DEFAULT_STREAMING_INTERVAL_MS;

      // Simulate backend processing
      setTimeout(() => {
        // Simulate potential error
        if (Math.random() < effectiveErrorRate) {
            setIsThinking(false);
            const errMsg = DEFAULT_SIMULATED_ERROR_MESSAGE;
            setError(errMsg); onError?.(errMsg);
            return; // isBusyRef resets via its own timeout
        }

        setIsThinking(false);
        setIsStreaming(true);

        // --- Simulate Streaming ---
        let chunkIndex = 0;
        intervalRef.current = setInterval(() => {
          if (chunkIndex < mockResponseChunks.length) {
            setStreamedContent((prev) => prev + mockResponseChunks[chunkIndex]);
            chunkIndex++;
          } else {
            // --- Streaming Complete ---
            clearStreamingInterval();
            const completeResponse = mockResponseChunks.join('');
            setFinalContent(completeResponse);
            onComplete?.(completeResponse);

            // Create agent message
            const agentMessage: Message = {
              id: `msg-${nanoid(10)}`, role: 'agent', content: completeResponse, timestamp: Date.now(),
            };
            // Use checked addMessage again
            if(typeof addMessage === 'function') {
                addMessage({ chatId: targetChatId!, message: agentMessage });
            } else {
                console.error("[LangGraphStream] addMessage missing for agent message.");
            }

            setIsStreaming(false);
            setStreamedContent('');
            // isBusyRef resets via its own timeout
          }
        }, effectiveChunkInterval);
      }, simulatedThinkingTime);
    },
    [ // Dependencies
      effectiveChatId, addMessage, createConversation, reset, agentId,
      onError, onComplete, errorRate, chunkInterval, mockResponseChunks,
    ]
  );

  const retry = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
       console.debug('[LangGraphStream] Retry:', { lastMessage: lastMessageRef.current });
    }
    if (lastMessageRef.current) {
      submitMessage(lastMessageRef.current); // Debounce handled within submitMessage
    } else {
      console.warn('Retry called but no previous message was found.');
    }
  }, [submitMessage]);

  // --- Derived State ---
  const hasFinalContent = !!finalContent;
  const hasError = !!error;

  // --- Return Values ---
  return {
    isThinking, isStreaming, hasFinalContent, hasError,
    streamedContent, finalContent, error,
    submitMessage, reset, retry
  };
}

// Future Integration Note... (keep as before)