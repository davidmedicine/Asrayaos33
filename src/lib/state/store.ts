/**
 * src/lib/state/store.ts
 * ---------------------------------------------------------------------------
 * Root Zustand store for Asraya-OS (client + server safe).
 * – Defines Scene state and slice creator.
 * – Composes all slices using an array pattern.
 * – Adds Redux-DevTools integration in development.
 * – Exports the main `useStore` hook and `StoreState` type.
 *
 * Architectural Notes & Patches:
 * • SSR Safety (Window Access): Wrapped all direct `window` access in dev helpers
 *   with `typeof window !== 'undefined'` checks to prevent "window is not defined"
 *   errors during Next.js SSR.
 * • Slice-Specific Hooks: In line with a modular slice pattern, this store
 *   exports the main `useStore`. Slice-specific hooks (e.g., `useQuestStore`,
 *   `useAgentStore`) are defined within their respective slice files
 *   (e.g., `slices/questSlice.ts`) and typically use the main `useStore` internally.
 *   This resolves issues like "useQuestStore is not defined" by ensuring components
 *   import these hooks from the correct slice files.
 * • Slice Imports: Standardized import paths for slice files (e.g., `questSlice.ts`).
 * • Maintained integrations for questSlice, chatSlice, contextSlice.
 * • Removed `ContextMenuSlice` (as per original refactor notes).
 * ---------------------------------------------------------------------------
 */

import { create, type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';

// Assuming sceneDefinitions provides the keys for scenes
import { sceneDefinitions } from '@/scenes/sceneDefinitions'; // Adjust path as necessary

/* -------------------------------------------------------------------------- */
/* 0. Scene Types & Slice Definition                                          */
/* -------------------------------------------------------------------------- */

export type SceneKey = keyof typeof sceneDefinitions;

export interface SceneSlice {
  activeSceneKey: SceneKey | null;
  setActiveSceneKey: (key: SceneKey | null) => void;
}

let sceneSliceCreated = false; // HMR safety flag

export const createSceneSlice: StateCreator<StoreState, [], [], SceneSlice> = (set) => {
  if (process.env.NODE_ENV !== 'production' && sceneSliceCreated) {
    console.warn('[store] createSceneSlice called more than once. This might indicate an HMR issue.');
  }
  sceneSliceCreated = true;
  return {
    activeSceneKey: null,
    setActiveSceneKey: (key) => {
      set({ activeSceneKey: key }, false, 'scene/setActiveSceneKey');
    },
  };
};

/* -------------------------------------------------------------------------- */
/* 1.  Slice imports (strict alphabetical order, UI slice last)               */
/* -------------------------------------------------------------------------- */

import { createAgentSlice,          type AgentSlice          } from './slices/agentSlice';
import { createArtifactModalSlice,  type ArtifactModalState  } from './slices/artifactSlice';
import { createChannelSlice,        type ChannelSlice        } from './slices/channelSlice';
import { createChatSlice,           type ChatSlice           } from './slices/chatSlice';
import { createCommandSlice,        type CommandState        } from './slices/commandSlice';
import { createContextSlice,        type ContextSlice        } from './slices/contextSlice';
import { createCoreSlice,           type CoreSlice           } from './slices/coreSlice';
import { createDevToolsSlice,       type DevToolsState       } from './slices/devToolsSlice';
import { createDraftsSlice,         type DraftsSlice         } from './slices/draftsSlice';
import { createLayoutSlice,         type LayoutSlice         } from './slices/layoutSlice';
import { createModalSlice,          type ModalState          } from './slices/modalSlice';
import { createNotificationSlice,   type NotificationSlice   } from './slices/notificationSlice'; // Standardized path
import { createPresenceSlice,       type PresenceSlice       } from './slices/presenceSlice';
import { createQuestSlice,          type QuestSlice          } from './slices/questslice';      // Standardized path
// createSceneSlice defined above
import { createSettingsSlice,       type SettingsSlice       } from './slices/settingsSlice';
import { createTypingSlice,         type TypingSlice         } from './slices/typingSlice';
import { createUISlice,             type UISlice             } from './slices/uiSlice';

/* -------------------------------------------------------------------------- */
/* 2.  Placeholder slices (Memory / Voice)                                  */
/* -------------------------------------------------------------------------- */

interface MemorySlice {
  lastAccessedMemoryId: string | null;
  setLastAccessedMemoryId: (id: string | null) => void;
}
const createMemorySlice: StateCreator<StoreState, [], [], MemorySlice> = (set) => ({
  lastAccessedMemoryId: null,
  setLastAccessedMemoryId: (id) => set({ lastAccessedMemoryId: id }, false, 'memory/setLastAccessedMemoryId'),
});

interface VoiceSlice {
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
}
const createVoiceSlice: StateCreator<StoreState, [], [], VoiceSlice> = (set) => ({
  isRecording: false,
  startRecording: () => set({ isRecording: true  }, false, 'voice/startRecording'),
  stopRecording:  () => set({ isRecording: false }, false, 'voice/stopRecording'),
});

/* -------------------------------------------------------------------------- */
/* 3.  Store type (Combine all slice interfaces)                              */
/* -------------------------------------------------------------------------- */

export interface StoreState extends
  AgentSlice,
  ArtifactModalState,
  ChannelSlice,
  ChatSlice,
  CommandState,
  ContextSlice,
  CoreSlice,
  DevToolsState,
  DraftsSlice,
  LayoutSlice,
  MemorySlice,
  ModalState,
  NotificationSlice,
  PresenceSlice,
  QuestSlice,
  SceneSlice,
  SettingsSlice,
  TypingSlice,
  UISlice,
  VoiceSlice {}

/* -------------------------------------------------------------------------- */
/* 4.  Slice Composition                                                      */
/* -------------------------------------------------------------------------- */

const slices: StateCreator<StoreState, [], [], Partial<StoreState>>[] = [
  createAgentSlice,
  createArtifactModalSlice,
  createChannelSlice,
  createChatSlice,
  createCommandSlice,
  createContextSlice,
  createCoreSlice,
  createDevToolsSlice,
  createDraftsSlice,
  createLayoutSlice,
  createMemorySlice,
  createModalSlice,
  createNotificationSlice,
  createPresenceSlice,
  createQuestSlice,
  createSceneSlice, // Defined in this file
  createSettingsSlice,
  createTypingSlice,
  createUISlice,
  createVoiceSlice,
];

const createRootStore: StateCreator<StoreState, [['zustand/devtools', never]]> =
  (set, get, api) => {
    const combinedSlices = slices.reduce((acc, createSliceFn) => {
      return Object.assign(acc, createSliceFn(set, get, api));
    }, {});
    return combinedSlices as StoreState;
  };

/* -------------------------------------------------------------------------- */
/* 5.  Store hook Creation                                                    */
/* -------------------------------------------------------------------------- */

const ANONYMOUS_ACTION_SYMBOL = Symbol('zustand/anonymousAction');

export const useStore = create<StoreState>()(
  devtools(createRootStore, {
    name: 'AsrayaOS-Store-v3.2', // Version maintained
    enabled: process.env.NODE_ENV === 'development', // Devtools active only in development
    anonymousActionType: ANONYMOUS_ACTION_SYMBOL,
    serialize: { options: { map: true, undefined: true } },
  }),
);

export const useAppStore = useStore; // Alias

/* -------------------------------------------------------------------------- */
/* 6.  Convenience Selectors & Slice Hooks Guidance                           */
/* -------------------------------------------------------------------------- */

// Global selectors operating on multiple slices or very generic ones can live here.
export const selectSceneState = (st: StoreState): SceneSlice => ({
  activeSceneKey: st.activeSceneKey,
  setActiveSceneKey: st.setActiveSceneKey,
});

// Individual slice hooks (e.g., useAgentStore, useQuestStore, useChatActions)
// are defined in and exported from their respective slice files.
// Components should import them directly from those slice files:
// Example: `import { useQuestStore } from '@/lib/state/slices/questSlice';`
// This `store.ts` file primarily exports the main `useStore` hook and `StoreState` type.
// Such slice-specific hooks would typically use the main `useStore` hook internally, e.g.:
// export const useQuestStore = <T>(selector: (s: QuestSlice) => T, eq?: EqFn<T>) =>
//   useStore(state => selector(state as QuestSlice), eq);

/* -------------------------------------------------------------------------- */
/* 7.  Dev helper (SSR Safe)                                                  */
/* -------------------------------------------------------------------------- */

// General developer console message about Redux DevTools (safe for SSR in dev mode)
if (process.env.NODE_ENV === 'development') {
  console.info('%cZustand DevTools: Open Redux DevTools to inspect the AsrayaOS store (v3.2).',
               'font-weight:bold;color:#8b5cf6', 'color:inherit');
}

// Browser-specific dev helpers that assign to `window` or depend on browser console features.
// These must only run on the client in development mode to prevent SSR errors.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const getDevToolsStateFromStore = () => useStore.getState() as Partial<DevToolsState & { logSlices?: () => void }>;

  const devToolsState = getDevToolsStateFromStore();
  if (devToolsState.logSlices && typeof devToolsState.logSlices === 'function') {
    (window as any).logAllSlicesFromDevToolsSlice = () => {
        console.group("--- Dumping Slices via DevToolsSlice's logSlices ---");
        const currentDevToolsState = getDevToolsStateFromStore(); // Re-fetch current state
        if (currentDevToolsState.logSlices) {
          currentDevToolsState.logSlices();
        } else {
          console.warn("logSlices function from DevToolsSlice is no longer available.");
        }
        console.groupEnd();
    };
    console.info('Dev helper: Call logAllSlicesFromDevToolsSlice() in console.');
  } else {
    (window as any).logAllStoreSlices = () => {
        console.group("--- Current Zustand Store State (Generic Dump) ---");
        const state = useStore.getState();
        const sliceKeys = Object.keys(state).filter(key =>
            !key.startsWith('_') &&
            typeof (state as any)[key] === 'object' &&
            (state as any)[key] !== null
        );
        for (const sliceName of sliceKeys) {
            const potentialSlice = (state as any)[sliceName];
            let hasStateProperties = false;
            if (typeof potentialSlice === 'object' && potentialSlice !== null) {
                for (const prop in potentialSlice) {
                    if (Object.prototype.hasOwnProperty.call(potentialSlice, prop) && typeof potentialSlice[prop] !== 'function') {
                        hasStateProperties = true;
                        break;
                    }
                }
            }
            if (hasStateProperties) {
                console.groupCollapsed(`Slice: ${sliceName}`);
                console.log(potentialSlice);
                console.groupEnd();
            }
        }
        console.groupEnd();
    };
    console.info('Dev helper: Call logAllStoreSlices() in console for a generic dump.');
  }
}

// Test snippet (remains largely the same, assuming tests correctly access state/actions)
// ========================================================================== //
// Unit Test Snippet (Adjusted for new slices and hook pattern)               //
// ========================================================================== //
/*
import { act } from '@testing-library/react';
import { useStore, StoreState, SceneKey, selectSceneState } from './store';
// Example: If testing QuestSlice behavior through its dedicated hook
// import { useQuestStore } from './slices/questSlice'; // Assuming this is where it's defined
import { sceneDefinitions } from '@/scenes/sceneDefinitions';

let initialStoreState: StoreState;

beforeAll(() => {
  initialStoreState = useStore.getState();
});

beforeEach(() => {
  act(() => {
    useStore.setState(initialStoreState, true); // Full reset
  });
  // sceneSliceCreated is a module-level variable in store.ts.
  // If testing HMR for sceneSlice, it might need an exported reset or test-specific handling.
  // sceneSliceCreated = false; // Reset HMR flag for sceneSlice if necessary for test logic
});

describe('Store Initialization and SceneSlice', () => {
  it('initializes with activeSceneKey as null', () => {
    expect(useStore.getState().activeSceneKey).toBeNull();
  });

  it('can set activeSceneKey using its action directly via store state', () => {
    const sceneKeys = Object.keys(sceneDefinitions) as SceneKey[];
    if (sceneKeys.length > 0) {
      const testSceneKey = sceneKeys[0];
      act(() => { useStore.getState().setActiveSceneKey(testSceneKey); });
      expect(useStore.getState().activeSceneKey).toBe(testSceneKey);
    }
  });
});

describe('AgentSlice Integration (Direct Store Access for Actions)', () => {
  it('initializes with default AgentSlice state properties', () => {
    expect(useStore.getState().activeAgentId).toBeNull();
  });

  it('can set activeAgentId using AgentSlice action via store state', () => {
    const testAgentId = 'test-agent-007';
    act(() => { useStore.getState().setActiveAgentId(testAgentId); });
    expect(useStore.getState().activeAgentId).toBe(testAgentId);
  });
});

// Example for testing with a slice-specific hook (if Option B is fully implemented)
// describe('QuestSlice via useQuestStore (Illustrative)', () => {
//   it('allows selecting quest state via useQuestStore', () => {
//     // This test would be more complex, requiring rendering a component using useQuestStore
//     // or mocking the hook's behavior based on useStore.
//     // For direct state verification related to QuestSlice:
//     const initialQuestTitle = useStore.getState().currentQuestTitle; // Example property
//     expect(initialQuestTitle).toBe('Default Quest'); // Assuming a default
//
//     act(() => { useStore.getState().startNewQuest('The Great Adventure'); });
//     expect(useStore.getState().currentQuestTitle).toBe('The Great Adventure');
//   });
// });

// ... other slice integration tests
*/