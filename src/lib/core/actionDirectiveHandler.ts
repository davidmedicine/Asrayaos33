/**
 * actionDirectiveHandler.ts
 * Handles ActionDirectives received from LangGraph streams
 */

import { useState, useCallback } from 'react';
import { validateActionDirectivePayload, DirectiveType } from './directiveValidation';
import { useCreateArtifact } from '@/hooks/useCreateArtifact';
import { useLayoutStore } from '@/lib/state/slices/layoutSlice';
import { useNotificationStore } from '@/lib/state/slices/notificationSlice';
import { useCommandStore } from '@/lib/state/slices/commandSlice';
import { getCommand } from './commandRegistry';
import { canPerformAction } from './permissions';
import { useInteractionContext } from '@/hooks/useInteractionContext';

interface ActionDirective {
  type: DirectiveType;
  payload: any;
  requireConfirmation?: boolean;
  metadata?: {
    agentId?: string;
    contextKey?: string;
    priority?: 'high' | 'medium' | 'low';
  };
}

export function useActionDirectiveHandler() {
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Get necessary hooks for handling directives
  const { triggerArtifactCreationWithModal, submitArtifactDirectly } = useCreateArtifact();
  const addPinnedItem = useLayoutStore(state => state.addPinnedItem);
  const { addNotification, addToast } = useNotificationStore();
  const executeCommand = useCommandStore(state => state.executeCommand);
  const { activeAgentId, activeContextKey, canPerformAction: checkPermission } = useInteractionContext();
  
  /**
   * Process and execute an action directive
   */
  const handleDirective = useCallback(async (directive: ActionDirective): Promise<boolean> => {
    if (!directive || !directive.type) {
      console.error('Invalid directive received', directive);
      return false;
    }
    
    setIsProcessing(true);
    
    try {
      // Get directive details
      const { type, payload, requireConfirmation = false, metadata = {} } = directive;
      const agentId = metadata.agentId || activeAgentId;
      const contextKey = metadata.contextKey || activeContextKey;
      
      // Validate the directive payload
      const validationResult = validateActionDirectivePayload(type, payload);
      
      // Handle validation errors
      if (validationResult && validationResult.level === 'error') {
        console.error(`Directive validation error (${type}):`, validationResult.message);
        addToast({ 
          type: 'error', 
          message: `Couldn't process agent request: ${validationResult.message}` 
        });
        return false;
      }
      
      // Show warning if present but continue
      if (validationResult && validationResult.level === 'warning') {
        console.warn(`Directive validation warning (${type}):`, validationResult.message);
      }
      
      // Check permission for the action
      if (!checkPermission(`directive:${type.toLowerCase()}`, { agentId, contextKey })) {
        console.warn(`Permission denied for directive: ${type}`);
        addToast({ 
          type: 'error', 
          message: `The agent doesn't have permission to perform this action` 
        });
        return false;
      }
      
      // Process the directive based on its type
      switch (type) {
        case 'CREATE_ARTIFACT': {
          // Create artifact with or without confirmation based on flag
          if (requireConfirmation) {
            // Show modal for user to confirm/edit
            return await triggerArtifactCreationWithModal(payload, {
              agentId,
              contextKey,
              onSuccess: () => {
                addToast({ type: 'success', message: 'Artifact created successfully' });
              },
              onError: (error) => {
                console.error('Error creating artifact:', error);
                addToast({ type: 'error', message: 'Failed to create artifact' });
              }
            });
          } else {
            // Create directly without confirmation
            const result = await submitArtifactDirectly(payload, {
              agentId,
              contextKey
            });
            
            if (result.success) {
              addToast({ type: 'success', message: 'Artifact created successfully' });
              return true;
            } else {
              addToast({ type: 'error', message: `Failed to create artifact: ${result.error}` });
              return false;
            }
          }
        }
        
        case 'PIN_CONTEXT': {
          try {
            await addPinnedItem({
              id: `pin-${Date.now()}`,
              contextKey: payload.contextKey,
              name: payload.name || 'Pinned Item',
              icon: payload.icon,
              artifactId: payload.artifactId
            });
            
            addToast({ type: 'success', message: 'Item pinned successfully' });
            return true;
          } catch (error) {
            console.error('Error pinning item:', error);
            addToast({ type: 'error', message: 'Failed to pin item' });
            return false;
          }
        }
        
        case 'SHOW_NOTIFICATION': {
          // Determine if this should be a toast or persistent notification
          if (payload.isPersistent) {
            // Create a persistent notification
            await addNotification({
              message: payload.message,
              type: payload.type || 'info',
              variant: payload.variant || 'agent_insight',
              actor: payload.actor || { 
                id: agentId || '', 
                name: 'Agent', 
                type: 'agent' 
              },
              contextLink: payload.contextLink
            });
          } else {
            // Create a toast notification
            addToast({
              message: payload.message,
              type: payload.type || 'info',
              duration: payload.duration,
              isPersistent: false
            });
          }
          return true;
        }
        
        case 'EXECUTE_COMMAND': {
          const command = getCommand(payload.commandId);
          if (command) {
            // Execute the command with the provided context
            executeCommand(command, { 
              contextKey: payload.contextKey || contextKey 
            });
            return true;
          } else {
            addToast({ 
              type: 'error', 
              message: `Command not found: ${payload.commandId}` 
            });
            return false;
          }
        }
        
        case 'NAVIGATE': {
          // Navigation would typically use a router
          // This is a placeholder for navigation logic
          console.log('Navigation requested to:', payload.path);
          addToast({ 
            type: 'info', 
            message: `Navigation to ${payload.path} would happen here` 
          });
          return true;
        }
        
        case 'SEARCH_MEMORY': {
          // This would typically use the memory store to search
          // This is a placeholder for search logic
          console.log('Memory search requested:', payload.query);
          addToast({ 
            type: 'info', 
            message: `Search for "${payload.query}" would happen here` 
          });
          return true;
        }
        
        default: {
          console.warn(`Unhandled directive type: ${type}`);
          return false;
        }
      }
    } catch (error) {
      console.error('Error handling directive:', error);
      addToast({ 
        type: 'error', 
        message: 'An error occurred while processing the agent request' 
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [
    activeAgentId, 
    activeContextKey, 
    triggerArtifactCreationWithModal, 
    submitArtifactDirectly, 
    addPinnedItem, 
    addNotification, 
    addToast, 
    executeCommand, 
    checkPermission
  ]);
  
  return {
    handleDirective,
    isProcessing
  };
}