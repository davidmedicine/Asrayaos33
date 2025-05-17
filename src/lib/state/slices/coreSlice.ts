/**
 * coreSlice.ts
 * Zustand slice for core application state
 */

import { type StateCreator } from 'zustand';
import { AgentData } from '@/types/agent';
import { UserProfile } from '@/types/user';

// Import placeholder server actions (these would be implemented in server/actions/)
import { loadCoreDataAction } from '@/server/actions/coreActions';
import { addAgentAction, updateAgentAction } from '@/server/actions/agentActions';

// For debouncing theme changes
const THEME_CHANGE_DELAY = 50; // ms

// Safe access to browser APIs
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};

// Safe access to window object
const getIsMobile = (): boolean => {
  if (typeof window !== 'undefined') {
    return window.innerWidth <= 768;
  }
  return false; // Default to desktop view for SSR
};

export interface CoreSlice {
  // State
  userProfile: UserProfile | null;
  agents: AgentData[];
  activeAgentId: string | null;
  isLoading: boolean;
  error: string | null;
  activeContextKey: string;
  isSidebarOpen: boolean;
  user: { name: string; email: string } | null;
  
  // Selectors
  getActiveAgent: () => AgentData | null;
  
  // Actions
  loadInitialCoreState: () => Promise<void>;
  setActiveAgentId: (agentId: string | null) => void;
  addAgent: (agentData: AgentData) => Promise<void>;
  updateAgent: (agentId: string, updates: Partial<AgentData>) => Promise<void>;
  resetCoreState: () => void;
  setActiveContext: (contextKey: string) => void;
  toggleSidebar: () => void;
}

export const createCoreSlice: StateCreator<CoreSlice> = (set, get) => {
  // For debouncing theme changes
  let themeChangeTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Function to apply theme to body
  const applyTheme = (themeKey: string | null) => {
    if (typeof document !== 'undefined') {
      document.body.className = document.body.className.replace(/theme-\w+/g, ''); // Remove old theme
      document.body.classList.add(`theme-${themeKey || 'default'}`);
    }
  };
  
  return {
    // Initial state
    userProfile: null,
    agents: [],
    activeAgentId: safeLocalStorage.getItem('asraya_activeAgentId'), // Restore from localStorage
    isLoading: false,
    error: null,
    activeContextKey: 'dashboard', // Default context is dashboard
    isSidebarOpen: !getIsMobile(), // Open on desktop, closed on mobile
    user: { name: 'Test User', email: 'user@example.com' }, // Placeholder user data
    
    // Selectors
    getActiveAgent: () => {
      const { agents, activeAgentId } = get();
      return agents.find(a => a.id === activeAgentId) ?? null;
    },
  
    // Actions
    loadInitialCoreState: async () => {
      set({ isLoading: true, error: null });
      try {
        // Call server action to load core data
        const { userProfile, agents } = await loadCoreDataAction();
        
        // Update state with server data
        set({ 
          userProfile, 
          agents,
          isLoading: false 
        });
        
        // Set active agent and apply theme - first try restoring from localStorage
        const storedAgentId = safeLocalStorage.getItem('asraya_activeAgentId');
        const validStoredAgent = storedAgentId && agents.some(a => a.id === storedAgentId);
        
        if (validStoredAgent) {
          get().setActiveAgentId(storedAgentId);
        } else if (agents.length > 0) {
          get().setActiveAgentId(agents[0].id);
        } else {
          applyTheme('default');
        }
      } catch (error) {
        console.error('Error loading core state:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load core state',
          isLoading: false
        });
      }
    },
    
    setActiveAgentId: (agentId) => {
      set({ activeAgentId: agentId });
      
      // Save to localStorage for persistence
      if (agentId) {
        safeLocalStorage.setItem('asraya_activeAgentId', agentId);
      } else {
        safeLocalStorage.removeItem('asraya_activeAgentId');
      }
      
      // Only run client-side code if in browser environment
      if (typeof window !== 'undefined') {
        // Debounce theme changes to prevent rapid DOM updates
        if (themeChangeTimeout) {
          clearTimeout(themeChangeTimeout);
        }
        
        themeChangeTimeout = setTimeout(() => {
          const agent = get().agents.find(a => a.id === agentId);
          applyTheme(agent?.persona?.themeKey || 'default');
          themeChangeTimeout = null;
        }, THEME_CHANGE_DELAY);
      }
    },
    
    addAgent: async (agentData) => {
      set({ isLoading: true, error: null });
      try {
        // Call server action to add agent
        const savedAgent = await addAgentAction(agentData);
        
        // Verify successful response
        if (!savedAgent) {
          throw new Error("Failed to save agent on server");
        }
        
        // Update state with saved agent from server
        set(state => ({
          agents: [...state.agents, savedAgent],
          isLoading: false
        }));
      } catch (error) {
        console.error('Error adding agent:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to add agent',
          isLoading: false
        });
      }
    },
    
    updateAgent: async (agentId, updates) => {
      set({ isLoading: true, error: null });
      try {
        // Call server action to update agent
        const updatedAgent = await updateAgentAction(agentId, updates);
        
        // Verify successful response
        if (!updatedAgent) {
          throw new Error("Failed to update agent on server");
        }
        
        // Update state with server response
        set(state => ({
          agents: state.agents.map(agent => 
            agent.id === agentId ? updatedAgent : agent
          ),
          isLoading: false
        }));
        
        // Only run client-side code if in browser environment
        if (typeof window !== 'undefined') {
          // If this is the active agent and theme changed, update theme
          const { activeAgentId } = get();
          if (activeAgentId === agentId && updates.persona?.themeKey) {
            if (themeChangeTimeout) {
              clearTimeout(themeChangeTimeout);
            }
            themeChangeTimeout = setTimeout(() => {
              applyTheme(updatedAgent.persona.themeKey);
              themeChangeTimeout = null;
            }, THEME_CHANGE_DELAY);
          }
        }
      } catch (error) {
        console.error('Error updating agent:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to update agent',
          isLoading: false
        });
      }
    },
    
    resetCoreState: () => {
      // Clear state for logout
      set({
        userProfile: null,
        agents: [],
        activeAgentId: null,
        isLoading: false,
        error: null,
        activeContextKey: 'dashboard',
        isSidebarOpen: !getIsMobile(),
      });
      
      // Clear localStorage (only if in browser)
      safeLocalStorage.removeItem('asraya_activeAgentId');
      
      // Reset theme (only if in browser)
      applyTheme('default');
    },
    
    setActiveContext: (contextKey) => {
      set({ activeContextKey: contextKey });
    },
    
    toggleSidebar: () => {
      set(state => ({ isSidebarOpen: !state.isSidebarOpen }));
    }
  };
};