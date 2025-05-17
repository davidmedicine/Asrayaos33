// src/lib/state/slices/agentSlice.ts
import type { StateCreator } from 'zustand';
import { shallow } from 'zustand/shallow';

// Import useStore from the main store file.
// The path '../store' assumes agentSlice.ts is in a subdirectory of where store.ts is.
// Adjust if your directory structure is different (e.g., '@/lib/state/store').
import { useStore } from '../store';
import type { StoreState } from '../store'; // Import the combined StoreState type

/* -------------------------------------------------------------------------- */
/* 1. Type Definition (as per instructions)                                   */
/* -------------------------------------------------------------------------- */
export interface AgentSlice {
  activeAgentId: string | null;
  setActiveAgentId: (id: string | null) => void;
  // You can add more agent-specific state and actions here if needed
  // For example:
  // availableAgents: AgentProfile[];
  // loadAgents: () => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* 2. Initial State (Implicit in createAgentSlice for this simple case)       */
/*    For more complex slices, you might define an explicit INITIAL_AGENT_STATE */
/* -------------------------------------------------------------------------- */
// export const INITIAL_AGENT_STATE: Pick<AgentSlice, 'activeAgentId'> = {
//   activeAgentId: null,
// };

/* -------------------------------------------------------------------------- */
/* 3. Slice Creator Function (as per instructions)                            */
/* -------------------------------------------------------------------------- */
export const createAgentSlice: StateCreator<
  StoreState, // Full store state for context, if needed by more complex actions
  [],         // Middlewares applied to this slice creator (none here)
  [],         // Middlewares applied to the store (none here for this signature)
  AgentSlice  // The shape of the slice being created
> = (set) => ({
  activeAgentId: null, // Initial state for activeAgentId
  setActiveAgentId: (id: string | null) =>
    set({ activeAgentId: id }, false, 'agent/setActiveAgentId'), // Action with label
  // Define other initial state properties and actions for AgentSlice here
});

/* -------------------------------------------------------------------------- */
/* 4. Slice-specific Hook (as per instructions)                               */
/* -------------------------------------------------------------------------- */
/**
 * Bounded selector hook for components that need agent-related data and actions.
 * Subscribes only to the specified parts of the AgentSlice.
 */
export const useAgentStore = () =>
  useStore(
    (s: StoreState) => ({
      activeAgentId: s.activeAgentId,
      setActiveAgentId: s.setActiveAgentId,
      // If AgentSlice grows, only select what's needed by most users of this hook
      // or create more granular hooks like useActiveAgentId below.
    }),
    shallow // Ensures re-render only if selected values change
  );

// Optional: A more granular hook if some components *only* need the ID
export const useActiveAgentId = () => useStore((s: StoreState) => s.activeAgentId);

// Note: The `useAgentSlice` name from your previous version is effectively replaced by `useAgentStore`
// to follow a common convention (use<SliceName>Store).