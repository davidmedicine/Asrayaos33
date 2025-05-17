// === File: asrayaos3.4/src/lib/state/slices/artifactSlice.ts ===

/**
 * artifactSlice.ts
 * Zustand slice for managing the state of the Artifact Capture Modal.
 * Includes support for onClose callbacks and dev-only logging.
 * It does NOT store the artifact data itself.
 * (v10.6 - Refactored & Polished V2)
 */

import { StateCreator } from 'zustand';
import { ArtifactRelationType } from '@/types/artifact'; // Only types needed for config

// --- Types ---

// Exported type for modal configuration, enhancing reusability (Polish #5)
export type ArtifactCaptureConfig = {
  type?: string;
  initialContent?: string;
  name?: string;
  metadata?: Record<string, unknown>; // Type tweak: unknown is safer than any (Polish #4)
  highlightedText?: string;
  contextKey?: string;
  originId?: string; // Used to determine if editing
  suggestedRelations?: {
    targetId: string;
    type: ArtifactRelationType;
  }[];
  // Add other configuration fields relevant to the modal's setup as needed
};

// Interface for this slice's state
export interface ArtifactModalState {
  // Modal UI State
  isArtifactCaptureModalOpen: boolean;
  artifactCaptureConfig: ArtifactCaptureConfig;
  isSaving: boolean; // Tracks modal submission state (Polish #1)
  isEditingExistingArtifact: boolean; // Flag for edit vs. create mode (Polish #3)
  onCloseCallback?: () => void; // Optional callback after modal closes (Polish #1)

  // Actions
  openArtifactCaptureModal: (config?: ArtifactCaptureConfig & { onCloseCallback?: () => void }) => void;
  closeArtifactCaptureModal: () => void;
  setSaving: (saving: boolean) => void;
  resetModal: () => void; // Helper to reset state without triggering close callback (Polish #2)
}

// Default empty config for resetting
const defaultArtifactCaptureConfig: ArtifactCaptureConfig = {};

// Initial default state values
const initialState = {
    isArtifactCaptureModalOpen: false,
    artifactCaptureConfig: defaultArtifactCaptureConfig,
    isSaving: false,
    isEditingExistingArtifact: false,
    onCloseCallback: undefined,
};

// --- Slice Creator ---

export const createArtifactModalSlice: StateCreator<ArtifactModalState> = (set, get) => ({
  // --- Initial State ---
  ...initialState,

  // --- Actions ---

  openArtifactCaptureModal: (config = {}) => {
    // Extract potential callback from config, keep rest as captureConfig
    const { onCloseCallback, ...captureConfig } = config;

    if (process.env.NODE_ENV === 'development') { // Dev-only log (Polish #3)
        console.debug('[ArtifactModalSlice] Opening modal with config:', captureConfig, 'Has Callback:', !!onCloseCallback);
    }
    // Determine if this represents editing based on presence of an origin ID etc.
    const isEditing = !!captureConfig?.originId;

    set({
      isArtifactCaptureModalOpen: true,
      artifactCaptureConfig: captureConfig,
      isSaving: false, // Reset saving state when opening
      isEditingExistingArtifact: isEditing,
      onCloseCallback: onCloseCallback, // Store the callback (Polish #1)
    });
  },

  closeArtifactCaptureModal: () => {
    // Get callback *before* resetting state
    const callback = get().onCloseCallback;

    if (process.env.NODE_ENV === 'development') { // Dev-only log (Polish #3)
        console.debug('[ArtifactModalSlice] Closing modal.', callback ? 'Will call onCloseCallback.' : '');
    }
    // Reset state to defaults (excluding callback initially for execution)
    set({
        isArtifactCaptureModalOpen: false,
        artifactCaptureConfig: defaultArtifactCaptureConfig,
        isSaving: false,
        isEditingExistingArtifact: false,
        onCloseCallback: undefined, // Clear the stored callback
    });

    // Execute the callback *after* state has been updated (Polish #1)
    if (callback) {
        try {
            callback();
        } catch (e) {
            console.error("[ArtifactModalSlice] Error executing onCloseCallback:", e);
        }
    }
  },

  setSaving: (saving) => {
     if (process.env.NODE_ENV === 'development') { // Dev-only log (Polish #3)
        console.debug(`[ArtifactModalSlice] Setting saving state: ${saving}`);
     }
    set({ isSaving: saving });
  },

  resetModal: () => {
     if (process.env.NODE_ENV === 'development') { // Dev-only log (Polish #3)
        console.debug('[ArtifactModalSlice] Resetting modal state internally');
     }
     // Resets all state fields to their initial values (Polish #2)
     set(initialState);
  }
});