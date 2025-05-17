/**
 * src/lib/state/slices/chatSlice.ts
 * ---------------------------------------------------------------------------
 * Zustand slice for managing chat messages, sending states, and errors
 * related to quests.
 *
 * Version incorporating "ultra-hard" feedback:
 * - Uses `Map` for messagesByQuestId for potential perf gains with many quests.
 * - Immer for efficient state updates and stable references.
 * - Sequence numbers for robust optimistic updates.
 * - Stable empty array returns from selectors.
 * - Explicit action-only hook (`useChatActions`).
 * - Conceptual placeholders/notes for advanced LRU pruning & IDB eviction.
 * - Enhanced error handling considerations.
 * - Action enums for type safety.
 * - Dev helper function structure.
 *
 * Note on Production DevTools: For the root store, consider:
 * devtools(..., {
 *   name: 'RootStore', // Or your app name
 *   enabled: process.env.NODE_ENV === 'development', // Enable only in dev
 *   // For production builds, if devtools were mistakenly enabled,
 *   // or for very large states even in dev, disable serialization:
 *   // serialize: process.env.NODE_ENV === 'production' ? false : { options: { map: true } },
 *   // Individual slice store names like 'ChatSlice' can be passed when creating the slice with devtools,
 *   // if you were to wrap createChatSlice itself in devtools (less common for combined stores).
 *   // More typically, the action labels like 'chat/appendMessage' are key.
 * });
 * ---------------------------------------------------------------------------
 */

import type { StateCreator } from 'zustand';
import type { Message as VercelMessage } from 'ai/react';
import { produce, type Draft } from 'immer'; // Import Immer and Draft
import { shallow } from 'zustand/shallow';

import type { StoreState } from '../store'; // Assuming your root store's type
// Import the main store hook for implementing slice-specific hooks
// import { useStore } from '../store';

/* -------------------------------------------------------------------------- */
/* 0. Constants, Enums & Helpers                                              */
/* -------------------------------------------------------------------------- */

// Stable empty array reference to prevent unnecessary re-renders
const EMPTY_MESSAGES_ARRAY: ReadonlyArray<VercelMessage> = Object.freeze([]) as VercelMessage[];
const MAX_MESSAGES_PER_QUEST = 250; // Default, consider DevTools toggle
// For advanced LRU, you might use a library like 'tiny-lru' or a custom ring buffer
// and store quest IDs in it. Eviction would then trigger clearQuestChatData or similar.

export interface OptimisticVercelMessage extends VercelMessage {
  sendSeq?: number; // Sequence number for optimistic messages
  isOptimistic?: boolean;
}

export interface ChatErrorObject {
  id: string;
  message: string;
  timestamp: number;
  code?: string; // Optional error code
}

// Action type enum for type safety and easier refactoring
export enum ChatActionType {
  SetMessages = 'chat/setMessages',
  AppendMessage = 'chat/appendMessage',
  OptimisticUpdate_AddOrUpdate = 'chat/optimisticUpdate_AddOrUpdate',
  OptimisticUpdate_Revert = 'chat/optimisticUpdate_Revert',
  OptimisticUpdate_Confirm = 'chat/optimisticUpdate_Confirm',
  SetIsSendingMessage = 'chat/setIsSendingMessage',
  AddChatError = 'chat/addChatError',
  ClearChatErrors = 'chat/clearChatErrors',
  ClearQuestChatData = 'chat/clearQuestChatData',
  ResetChatState = 'chat/resetChatState',
}

let globalSendSequence = 0; // Simple global sequence for optimistic messages

/* -------------------------------------------------------------------------- */
/* 1. Type Definitions                                                        */
/* -------------------------------------------------------------------------- */

export interface ChatState {
  messagesByQuestId: Map<string, OptimisticVercelMessage[]>;
  isSendingMessage: Record<string, boolean>;
  chatErrorByQuestId: Map<string, ChatErrorObject[] | null>;
  // For advanced LRU: consider `activeQuestLRU: string[]` to track usage order
}

export interface ChatActions {
  setMessages: (questId: string, messages: VercelMessage[]) => void;
  appendMessage: (questId: string, message: VercelMessage) => void;
  optimisticallyUpdateMessage: (
    questId: string,
    tempMessageData: Omit<OptimisticVercelMessage, 'id' | 'sendSeq' | 'isOptimistic'> & { tempId: string }
  ) => {
    revert: () => void;
    confirm: (confirmedMessage: VercelMessage) => void;
    optimisticMessage: OptimisticVercelMessage;
  };
  setIsSendingMessage: (questId: string, isSending: boolean) => void;
  addChatError: (questId: string, errorMessage: string, errorCode?: string) => void;
  clearChatErrors: (questId: string) => void;
  pruneOldChatErrors: (questId: string, maxAgeMinutes?: number) => void; // For error list hygiene
  clearQuestChatData: (questId: string) => void;
  resetChatState: () => void;
  // Dev helper
  logChatSlice: (questId?: string) => void;
}

export type ChatSlice = ChatState & ChatActions;

/* -------------------------------------------------------------------------- */
/* 2. Initial State                                                           */
/* -------------------------------------------------------------------------- */

export const INITIAL_CHAT_STATE: ChatState = {
  messagesByQuestId: new Map(),
  isSendingMessage: {},
  chatErrorByQuestId: new Map(),
};

/* -------------------------------------------------------------------------- */
/* 3. Slice Creator Function                                                  */
/* -------------------------------------------------------------------------- */

const manageMessageLimit = (messages: Draft<OptimisticVercelMessage[]>) => {
  if (messages.length > MAX_MESSAGES_PER_QUEST) {
    // Simple trim from the start. For LRU, this would be more complex.
    return messages.slice(-MAX_MESSAGES_PER_QUEST);
  }
  return messages;
};

export const createChatSlice: StateCreator<
  StoreState,
  [], // No special middlewares for this specific slice creator signature
  [],
  ChatSlice
> = (set, get) => ({
  ...INITIAL_CHAT_STATE,

  setMessages: (questId, messages) => {
    set(
      produce((draft: Draft<ChatState>) => {
        const newMessages = messages.slice(-MAX_MESSAGES_PER_QUEST) as OptimisticVercelMessage[];
        draft.messagesByQuestId.set(questId, newMessages);
      }),
      false,
      ChatActionType.SetMessages
    );
  },

  appendMessage: (questId, message) => {
    set(
      produce((draft: Draft<ChatState>) => {
        let questMessages = draft.messagesByQuestId.get(questId) || [];
        questMessages.push(message as OptimisticVercelMessage);
        draft.messagesByQuestId.set(questId, manageMessageLimit(questMessages));
      }),
      false,
      ChatActionType.AppendMessage
    );
  },

  optimisticallyUpdateMessage: (questId, tempMessageData) => {
    const sendSeq = ++globalSendSequence;
    const optimisticMessage: OptimisticVercelMessage = {
      ...tempMessageData,
      id: tempMessageData.tempId, // Use tempId as the initial ID
      sendSeq,
      isOptimistic: true,
      createdAt: new Date(), // Ensure createdAt is set
    };

    const originalMessages = get().messagesByQuestId.get(questId) || EMPTY_MESSAGES_ARRAY;

    set(
      produce((draft: Draft<ChatState>) => {
        let questMessages = draft.messagesByQuestId.get(questId) || [];
        // Check if a message with this tempId already exists (e.g., retry)
        const existingIndex = questMessages.findIndex(m => m.id === optimisticMessage.id);
        if (existingIndex > -1) {
            questMessages[existingIndex] = optimisticMessage;
        } else {
            questMessages.push(optimisticMessage);
        }
        draft.messagesByQuestId.set(questId, manageMessageLimit(questMessages));
      }),
      false,
      `${ChatActionType.OptimisticUpdate_AddOrUpdate}:${optimisticMessage.id}`
    );

    return {
      optimisticMessage, // Return the full optimistic message for the caller
      revert: () => {
        set(
          produce((draft: Draft<ChatState>) => {
            const currentMessages = draft.messagesByQuestId.get(questId);
            if (currentMessages) {
              const newMessages = currentMessages.filter(m => m.id !== optimisticMessage.id);
              if (newMessages.length === 0 && originalMessages === EMPTY_MESSAGES_ARRAY) {
                draft.messagesByQuestId.delete(questId);
              } else {
                draft.messagesByQuestId.set(questId, newMessages.length > 0 ? newMessages : [...originalMessages]); // Fallback to original if empty after filter
              }
            }
            // Also reset sequence if this was the latest? More complex, depends on strategy.
          }),
          false,
          `${ChatActionType.OptimisticUpdate_Revert}:${optimisticMessage.id}`
        );
      },
      confirm: (confirmedMessageFromServer: VercelMessage) => {
        set(
          produce((draft: Draft<ChatState>) => {
            const questMessages = draft.messagesByQuestId.get(questId);
            if (questMessages) {
              // Find based on tempId (optimisticMessage.id) or sendSeq for robustness
              const index = questMessages.findIndex(m => m.id === optimisticMessage.id || m.sendSeq === sendSeq);
              if (index > -1) {
                // Update with the confirmed message, removing optimistic flags
                questMessages[index] = {
                  ...confirmedMessageFromServer,
                  isOptimistic: false,
                  sendSeq: undefined, // Clear sequence number
                };
              } else {
                // If not found (should be rare with seq), append confirmed message.
                // This could happen if revert was called then confirm, or state was cleared.
                // appendMessage(questId, confirmedMessageFromServer); // delegate, or handle here:
                questMessages.push(confirmedMessageFromServer as OptimisticVercelMessage);
                draft.messagesByQuestId.set(questId, manageMessageLimit(questMessages));
              }
            }
          }),
          false,
          `${ChatActionType.OptimisticUpdate_Confirm}:${confirmedMessageFromServer.id}`
        );
      },
    };
  },

  setIsSendingMessage: (questId, isSending) => {
    set(
      produce((draft: Draft<ChatState>) => {
        draft.isSendingMessage[questId] = isSending;
      }),
      false,
      ChatActionType.SetIsSendingMessage
    );
  },

  addChatError: (questId, errorMessage, errorCode) => {
    set(
      produce((draft: Draft<ChatState>) => {
        let questErrors = draft.chatErrorByQuestId.get(questId) || [];
        const newError: ChatErrorObject = {
          id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message: errorMessage,
          timestamp: Date.now(),
          code: errorCode,
        };
        questErrors.push(newError);
        // Optional: Prune very old errors here or in a separate action
        // if (questErrors.length > MAX_ERRORS_PER_QUEST) questErrors.shift();
        draft.chatErrorByQuestId.set(questId, questErrors);
      }),
      false,
      ChatActionType.AddChatError
    );
  },

  clearChatErrors: (questId) => {
    set(
      produce((draft: Draft<ChatState>) => {
        draft.chatErrorByQuestId.set(questId, null); // Or draft.chatErrorByQuestId.delete(questId)
      }),
      false,
      ChatActionType.ClearChatErrors
    );
  },

  pruneOldChatErrors: (questId, maxAgeMinutes = 60) => {
    set(
        produce((draft: Draft<ChatState>) => {
            const questErrors = draft.chatErrorByQuestId.get(questId);
            if (questErrors && questErrors.length > 0) {
                const cutOffTime = Date.now() - maxAgeMinutes * 60 * 1000;
                const newErrors = questErrors.filter(e => e.timestamp >= cutOffTime);
                if (newErrors.length === 0) {
                    draft.chatErrorByQuestId.set(questId, null);
                } else {
                    draft.chatErrorByQuestId.set(questId, newErrors);
                }
            }
        }),
        false,
        `chat/pruneOldChatErrors:${questId}`
    );
  },

  clearQuestChatData: (questId) => {
    set(
      produce((draft: Draft<ChatState>) => {
        draft.messagesByQuestId.delete(questId);
        delete draft.isSendingMessage[questId]; // Records are deleted this way
        draft.chatErrorByQuestId.delete(questId);
      }),
      false,
      `${ChatActionType.ClearQuestChatData}:${questId}`
    );
  },

  resetChatState: () => {
    set(produce((draft: Draft<ChatState>) => {
        draft.messagesByQuestId = new Map();
        draft.isSendingMessage = {};
        draft.chatErrorByQuestId = new Map();
    }), true, ChatActionType.ResetChatState); // true for replacement
  },

  logChatSlice: (questId?: string) => {
    const state = get();
    if (questId) {
        console.group(`[ChatSlice Logger] Data for Quest: ${questId}`);
        console.log("Messages:", state.messagesByQuestId.get(questId)?.slice(-10) || EMPTY_MESSAGES_ARRAY);
        console.log("Is Sending:", state.isSendingMessage[questId] || false);
        console.log("Errors:", state.chatErrorByQuestId.get(questId) || null);
        console.groupEnd();
    } else {
        console.group("[ChatSlice Logger] Full State Snapshot");
        console.log("All Messages by Quest ID (Keys):", Array.from(state.messagesByQuestId.keys()));
        // Avoid logging all messages for all quests to prevent console flood.
        // console.log("messagesByQuestId:", state.messagesByQuestId);
        console.log("isSendingMessage map:", state.isSendingMessage);
        console.log("chatErrorByQuestId map (Keys):", Array.from(state.chatErrorByQuestId.keys()));
        console.groupEnd();
    }
  },
});

/* -------------------------------------------------------------------------- */
/* 4. Selectors                                                               */
/* -------------------------------------------------------------------------- */

export const selectMessagesForQuest =
  (questId: string | null | undefined) =>
  (state: StoreState): ReadonlyArray<OptimisticVercelMessage> => {
    if (!questId) return EMPTY_MESSAGES_ARRAY;
    return state.messagesByQuestId.get(questId) || EMPTY_MESSAGES_ARRAY;
  };

export const selectIsSendingMessageForQuest =
  (questId: string | null | undefined) =>
  (state: StoreState): boolean => {
    if (!questId) return false;
    return state.isSendingMessage[questId] || false;
  };

export const selectChatErrorsForQuest =
  (questId: string | null | undefined) =>
  (state: StoreState): ReadonlyArray<ChatErrorObject> | null => {
    if (!questId) return null;
    const errors = state.chatErrorByQuestId.get(questId);
    return errors && errors.length > 0 ? errors : null;
  };

export const selectLastChatErrorForQuest =
  (questId: string | null | undefined) =>
  (state: StoreState): ChatErrorObject | null => {
    if (!questId) return null;
    const errors = state.chatErrorByQuestId.get(questId);
    return errors && errors.length > 0 ? errors[errors.length - 1] : null;
  };

/* -------------------------------------------------------------------------- */
/* 5. Slice-specific Hooks                                                    */
/*    Ensure `useStore` is imported from your main store file.                 */
/* -------------------------------------------------------------------------- */

// import { useStore } from '../store'; // Path to your main store

/**
 * Hook to access all chat actions.
 * Components using this will not re-render when chat state changes, only if actions themselves change (rare).
 */
/*
export const useChatActions = () => useStore(
  (s: StoreState) => ({
    setMessages: s.setMessages,
    appendMessage: s.appendMessage,
    optimisticallyUpdateMessage: s.optimisticallyUpdateMessage,
    setIsSendingMessage: s.setIsSendingMessage,
    addChatError: s.addChatError,
    clearChatErrors: s.clearChatErrors,
    pruneOldChatErrors: s.pruneOldChatErrors,
    clearQuestChatData: s.clearQuestChatData,
    resetChatState: s.resetChatState,
    logChatSlice: s.logChatSlice,
  }),
  shallow // `shallow` is good practice even for action objects
);
*/

/**
 * Hook to access the entire chat slice state and actions.
 * Use with caution as it will cause re-renders on any change within the chat slice.
 * Prefer specific selectors or `useChatActions` and `useStore(selectMessagesForQuest(id))`.
 */
/*
export const useChatSliceFull = () => useStore(
  (s: StoreState) => ({
    // State
    messagesByQuestId: s.messagesByQuestId,
    isSendingMessage: s.isSendingMessage,
    chatErrorByQuestId: s.chatErrorByQuestId,
    // Actions - include them directly from the s object
    setMessages: s.setMessages,
    appendMessage: s.appendMessage,
    optimisticallyUpdateMessage: s.optimisticallyUpdateMessage,
    setIsSendingMessage: s.setIsSendingMessage,
    addChatError: s.addChatError,
    clearChatErrors: s.clearChatErrors,
    pruneOldChatErrors: s.pruneOldChatErrors,
    clearQuestChatData: s.clearQuestChatData,
    resetChatState: s.resetChatState,
    logChatSlice: s.logChatSlice,
  }),
  shallow
);
*/