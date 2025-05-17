/**
 * useCreateArtifact.ts
 * Hook for managing artifact creation flow with modal or direct submission (v10.6)
 */

import { useState, useCallback } from 'react';
import { useNotificationStore } from '@/lib/state/slices/notificationSlice';
import { useInteractionContext } from './useInteractionContext';
import { Artifact, ArtifactRelation } from '@/types/artifact';
import { useOrbRenderer } from './useOrbRenderer';

// Placeholder for artifact modal state management
// In a real implementation, this would be imported from a modal store
interface ArtifactModalStore {
  openArtifactModal: (data: ArtifactCreationData) => void;
  closeArtifactModal: () => void;
}

// Placeholder functions to simulate store access
const useArtifactModalStore = (): ArtifactModalStore => {
  return {
    openArtifactModal: (data) => console.log('Would open modal with', data),
    closeArtifactModal: () => console.log('Would close modal')
  };
};

// Server action interface (placeholder)
// In a real implementation, this would be imported from the server actions
interface ArtifactCreationResult {
  success: boolean;
  artifact?: Artifact;
  error?: string;
}

// The data needed to create an artifact
export interface ArtifactCreationPayload {
  name: string;
  type: string;
  content: any;
  tags?: string[];
  metadata?: {
    origin?: {
      contextKey?: string;
      originId?: string;
      highlightedText?: string;
    };
    agentId?: string;
    relations?: ArtifactRelation[];
    worldPosition?: { x: number; y: number; z: number };
    [key: string]: any;
  };
}

// Options for artifact creation
export interface ArtifactCreationOptions {
  agentId?: string;
  contextKey?: string;
  onSuccess?: (artifact: Artifact) => void;
  onError?: (error: string) => void;
}

// Data passed to the modal
export interface ArtifactCreationData extends ArtifactCreationPayload {
  options: ArtifactCreationOptions;
}

/**
 * Hook for creating artifacts with modal confirmation or direct submission
 */
export function useCreateArtifact() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get notification store for toasts
  const { addToast } = useNotificationStore();
  
  // Get modal store for artifact creation modal
  const { openArtifactModal, closeArtifactModal } = useArtifactModalStore();
  
  // Get interaction context for current agent and context
  const { activeAgentId, activeContextKey, canCreateArtifact } = useInteractionContext();
  
  // Get orb renderer for pulse effect
  const { triggerPulse } = useOrbRenderer();
  
  /**
   * Submit artifact directly without user confirmation
   */
  const submitArtifactDirectly = useCallback(async (
    payload: ArtifactCreationPayload,
    options: ArtifactCreationOptions = {}
  ): Promise<ArtifactCreationResult> => {
    setIsCreating(true);
    setError(null);
    
    try {
      // Use provided context or fallback to active context
      const contextKey = options.contextKey || activeContextKey;
      const agentId = options.agentId || activeAgentId;
      
      // Check permission
      if (!canCreateArtifact) {
        throw new Error('You do not have permission to create artifacts in this context');
      }
      
      // Prepare final payload with context data
      const finalPayload = {
        ...payload,
        metadata: {
          ...payload.metadata,
          origin: {
            ...payload.metadata?.origin,
            contextKey: payload.metadata?.origin?.contextKey || contextKey
          },
          agentId: payload.metadata?.agentId || agentId,
        }
      };
      
      // Server action call would go here (Drizzle ORM on server)
      // const result = await createArtifactServerAction(finalPayload);
      
      // Simulate successful response for now
      const result: ArtifactCreationResult = {
        success: true,
        artifact: {
          id: `artifact-${Date.now()}`,
          userId: 'user-1',
          name: finalPayload.name,
          type: finalPayload.type,
          content: finalPayload.content,
          tags: finalPayload.tags || [],
          metadata: finalPayload.metadata || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'published'
        }
      };
      
      if (result.success && result.artifact) {
        // Show success notification
        addToast({ 
          type: 'success', 
          message: `Artifact "${result.artifact.name}" saved.` 
        });
        
        // Trigger orb pulse for visual feedback
        triggerPulse('success');
        
        // Call success callback if provided
        options.onSuccess?.(result.artifact);
        
        return { success: true, artifact: result.artifact };
      } else {
        throw new Error(result.error || 'Failed to create artifact');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error creating artifact';
      
      // Set local error state
      setError(errorMessage);
      
      // Show error notification
      addToast({ 
        type: 'error', 
        message: errorMessage 
      });
      
      // Trigger orb pulse for visual feedback (error)
      triggerPulse('error');
      
      // Call error callback if provided
      options.onError?.(errorMessage);
      
      return { success: false, error: errorMessage };
    } finally {
      setIsCreating(false);
    }
  }, [
    activeAgentId, 
    activeContextKey, 
    canCreateArtifact, 
    addToast, 
    triggerPulse
  ]);
  
  /**
   * Trigger artifact creation with modal for user confirmation/editing
   */
  const triggerArtifactCreationWithModal = useCallback(async (
    payload: ArtifactCreationPayload,
    options: ArtifactCreationOptions = {}
  ): Promise<boolean> => {
    // Check permission
    if (!canCreateArtifact) {
      addToast({ 
        type: 'error', 
        message: 'You do not have permission to create artifacts in this context' 
      });
      return false;
    }
    
    // Include default metadata if not provided
    const creationData: ArtifactCreationData = {
      ...payload,
      metadata: {
        ...payload.metadata,
        origin: {
          ...payload.metadata?.origin,
          contextKey: payload.metadata?.origin?.contextKey || activeContextKey
        },
        agentId: payload.metadata?.agentId || activeAgentId,
      },
      options
    };
    
    // Open the modal with the data
    openArtifactModal(creationData);
    
    // In a real implementation, this would return a promise that resolves when the modal is closed
    // For now, we'll simulate success
    return true;
  }, [
    activeAgentId, 
    activeContextKey, 
    canCreateArtifact, 
    addToast, 
    openArtifactModal
  ]);
  
  /**
   * Create artifact from modal submission (called by modal)
   */
  const createArtifactFromModal = useCallback(async (
    finalPayload: ArtifactCreationPayload,
    options: ArtifactCreationOptions = {}
  ): Promise<ArtifactCreationResult> => {
    // Close the modal
    closeArtifactModal();
    
    // Submit the artifact with the final data
    return submitArtifactDirectly(finalPayload, options);
  }, [closeArtifactModal, submitArtifactDirectly]);
  
  /**
   * Cancel modal without creating (called by modal)
   */
  const cancelArtifactCreation = useCallback(() => {
    // Close the modal without creating
    closeArtifactModal();
    
    // Return false to indicate cancellation
    return false;
  }, [closeArtifactModal]);
  
  return {
    isCreating,
    error,
    triggerArtifactCreationWithModal,
    submitArtifactDirectly,
    createArtifactFromModal,
    cancelArtifactCreation
  };
}