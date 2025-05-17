// === File: asrayaos3.4/src/lib/state/slices/settingsSlice.ts ===

/**
 * settingsSlice.ts
 * Zustand slice for managing user settings (v10.6)
 */

import { StateCreator } from 'zustand';
import { AgentConfig } from '@/types/agent'; // Assuming this type definition exists

// --- Interfaces for different setting categories ---

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  accentColor: string; // e.g., hex code
  font: string; // e.g., 'Inter', 'Roboto Mono'
  reducedMotion: boolean;
  highContrast: boolean;
}

export interface InteractionSettings {
  voice: {
    autoSubmit: boolean;
    useSystemVoice: boolean;
    recognitionLanguage: string; // e.g., 'en-US', 'es-ES'
  };
  autoSave: boolean; // Auto-save chat history/context
  commandMenuEnabled: boolean;
  contextMenuEnabled: boolean;
}

// Map where key is agentId and value is the specific config override for that agent
export interface AgentSettingsMap {
  [agentId: string]: Partial<AgentConfig>; // Allow partial overrides
}

export interface NotificationSettings {
  desktopNotifications: boolean; // Browser push notifications
  soundEnabled: boolean;
  filterLevel: 'all' | 'important' | 'none'; // Filter incoming notifications
  autoArchiveAfterDays: number; // Auto-archive notifications after X days (0 = never)
}

// --- Main Slice Definition ---

export interface SettingsSlice {
  // State
  appearance: AppearanceSettings;
  interaction: InteractionSettings;
  agentOverrides: AgentSettingsMap;
  notifications: NotificationSettings;
  experimentalFeaturesEnabled: boolean;
  isLoading: boolean; // For loading initial settings
  isSaving: boolean; // For saving/updating/resetting settings
  error: string | null; // For storing errors from load/save operations

  // Actions
  updateAppearance: (settings: Partial<AppearanceSettings>) => Promise<void>;
  updateInteraction: (settings: Partial<InteractionSettings>) => Promise<void>;
  updateAgentOverride: (agentId: string, config: Partial<AgentConfig>) => Promise<void>;
  updateNotifications: (settings: Partial<NotificationSettings>) => Promise<void>;
  toggleExperimentalFeatures: () => Promise<void>;
  resetSettings: () => Promise<void>;
  loadSettings: () => Promise<void>; // Action to load settings initially
}

// --- Initial Default State ---

const defaultSettings = {
  appearance: {
    theme: 'system' as const,
    accentColor: '#7C3AED', // Default purple
    font: 'Inter',
    reducedMotion: false,
    highContrast: false,
  },
  interaction: {
    voice: {
      autoSubmit: true,
      useSystemVoice: true,
      recognitionLanguage: 'en-US',
    },
    autoSave: true,
    commandMenuEnabled: true,
    contextMenuEnabled: true,
  },
  agentOverrides: {},
  notifications: {
    desktopNotifications: true,
    soundEnabled: true,
    filterLevel: 'important' as const,
    autoArchiveAfterDays: 30,
  },
  experimentalFeaturesEnabled: false,
};

// --- Slice Creator Function ---

export const createSettingsSlice: StateCreator<SettingsSlice> = (set, get) => ({
  // Initial state values
  ...defaultSettings,
  isLoading: false, // Start assuming not loading until loadSettings is called
  isSaving: false,
  error: null,

  // --- Actions Implementation ---

  updateAppearance: async (settings) => {
    set({ isSaving: true, error: null });
    try {
      const current = get().appearance;
      const newAppearance = { ...current, ...settings };

      // Placeholder: Replace with actual server call
      // await serverActions.updateSettings('appearance', newAppearance);
      console.log('Simulating server update for appearance:', newAppearance);
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay

      set({ appearance: newAppearance, isSaving: false });

      // Apply theme changes directly to the DOM
      // Check if theme setting actually changed
      if (settings.theme && settings.theme !== current.theme) {
        const applyTheme = (themeValue: 'light' | 'dark' | 'system') => {
            document.documentElement.classList.remove('light', 'dark');
            let actualTheme = themeValue;
            if (themeValue === 'system') {
                actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            document.documentElement.classList.add(actualTheme);
        };
        applyTheme(settings.theme);
        // Add listener for system theme changes if 'system' is selected
        // (Remember to clean up listener if component unmounts or theme changes away from system)
      }
       // TODO: Apply accentColor, font changes if necessary (e.g., setting CSS variables)

    } catch (error) {
      console.error('Error updating appearance settings:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update appearance settings',
        isSaving: false,
      });
    }
  },

  updateInteraction: async (settings) => {
    set({ isSaving: true, error: null });
    try {
      const current = get().interaction;
      // Perform a deeper merge for the nested 'voice' object
      const newInteraction = {
         ...current,
         ...settings,
         voice: settings.voice ? { ...current.voice, ...settings.voice } : current.voice
      };

      // Placeholder: Replace with actual server call
      // await serverActions.updateSettings('interaction', newInteraction);
      console.log('Simulating server update for interaction:', newInteraction);
      await new Promise(resolve => setTimeout(resolve, 300));

      set({ interaction: newInteraction, isSaving: false });
    } catch (error) {
      console.error('Error updating interaction settings:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update interaction settings',
        isSaving: false,
      });
    }
  },

  updateAgentOverride: async (agentId, config) => {
    set({ isSaving: true, error: null });
    try {
      const currentOverrides = get().agentOverrides;
      const currentConfig = currentOverrides[agentId] || {};
      // Merge the partial update onto the existing override (or empty object)
      const newConfig = { ...currentConfig, ...config };
      const newOverrides = { ...currentOverrides, [agentId]: newConfig };

      // Placeholder: Replace with actual server call (might update specific agent config)
      // await serverActions.updateAgentSettings(agentId, newConfig);
      console.log(`Simulating server update for agent ${agentId} override:`, newConfig);
       await new Promise(resolve => setTimeout(resolve, 300));

      set({ agentOverrides: newOverrides, isSaving: false });
    } catch (error) {
      console.error(`Error updating agent ${agentId} config:`, error);
      set({
        error: error instanceof Error ? error.message : `Failed to update agent ${agentId} config`,
        isSaving: false,
      });
    }
  },

  updateNotifications: async (settings) => {
    set({ isSaving: true, error: null });
    try {
      const newNotifications = { ...get().notifications, ...settings };

      // Placeholder: Replace with actual server call
      // await serverActions.updateSettings('notifications', newNotifications);
       console.log('Simulating server update for notifications:', newNotifications);
       await new Promise(resolve => setTimeout(resolve, 300));

      set({ notifications: newNotifications, isSaving: false });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update notification settings',
        isSaving: false,
      });
    }
  },

  toggleExperimentalFeatures: async () => {
    set({ isSaving: true, error: null });
    try {
      const newValue = !get().experimentalFeaturesEnabled;

      // Placeholder: Replace with actual server call
      // await serverActions.updateSettings('experimentalFeaturesEnabled', newValue);
      console.log('Simulating server update for experimental features:', newValue);
      await new Promise(resolve => setTimeout(resolve, 300));

      set({ experimentalFeaturesEnabled: newValue, isSaving: false });
    } catch (error) {
      console.error('Error toggling experimental features:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to toggle experimental features',
        isSaving: false,
      });
    }
  },

  resetSettings: async () => {
    set({ isSaving: true, error: null }); // Indicate the reset operation is starting
    try {
      // 1. Call the server action to reset settings on the backend (if applicable)
      // Placeholder: Replace with actual server call
      // await serverActions.resetSettings();
      console.log('Simulating server reset action...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. REVISED LOGIC: Instead of hardcoding defaults, reload the settings
      // This assumes loadSettings fetches the now-reset defaults from the server.
      await get().loadSettings();
      // loadSettings handles its own isLoading state and potential errors.

      // 3. Reset operation successful, clear saving state if loadSettings didn't error
      // Note: If loadSettings *does* error, its catch block handles the error state,
      // but we still need to ensure isSaving is false for the *reset* operation.
      set({ isSaving: false });
      console.log('Settings reset and reloaded.');

    } catch (error) {
      // Catch errors specifically from the reset server action itself
      console.error('Error resetting settings on the server:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to reset settings on server',
        isSaving: false, // Ensure saving state is cleared on error during reset action
      });
    }
  },

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      // Placeholder: Replace with actual server call to load all settings
      // const loadedSettings = await serverActions.loadSettings();
      console.log('Simulating loading settings from server...');
      await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay
      // Simulate receiving settings (using defaults here for example)
      const loadedSettings = defaultSettings;

      // Set the entire state based on loaded data
      set({
        appearance: loadedSettings.appearance,
        interaction: loadedSettings.interaction,
        agentOverrides: loadedSettings.agentOverrides,
        notifications: loadedSettings.notifications,
        experimentalFeaturesEnabled: loadedSettings.experimentalFeaturesEnabled,
        isLoading: false, // Loading finished
        error: null,
      });

       // Apply initial theme after loading
       get().updateAppearance({ theme: loadedSettings.appearance.theme });

    } catch (error) {
      console.error('Error loading settings:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load settings',
        isLoading: false, // Stop loading even if there was an error
      });
    }
  },
});