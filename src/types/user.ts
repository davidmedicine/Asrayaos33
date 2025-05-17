/**
 * user.ts
 * TypeScript definitions for User Profile and Settings
 */

import { AgentConfig } from '@/types/agent';

// Interface for user settings
export interface UserSettings {
  appearance: {
    theme: string;
    accentColor: string;
    font: string;
  };
  interaction: {
    voice: {
      autoSubmit: boolean;
      language: string;
      feedbackSounds?: boolean;
    };
  };
  agentOverrides: Record<string, AgentConfig>; // Typed with AgentConfig
  notifications: {
    sound: boolean;
    desktop: boolean;
  };
  experimentalFeaturesEnabled?: boolean;
}

// Interface for user profile (settings decoupled)
export interface UserProfile {
  id: string; // Supabase User ID
  email?: string;
  username?: string;
  avatarUrl?: string;
  role?: 'user' | 'admin';
  defaultAgentId?: string;
  // Settings removed - managed separately in settingsSlice
  createdAt: string;
  updatedAt?: string;
}