'use client';

/**
 * ArtifactCaptureModal.tsx
 * Modal for capturing and managing artifacts with typed relations (v10.6 spec)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ArtifactRelation } from '@/types/artifact';
import { useArtifactStore, useNotificationStore } from '@/lib/state/store';
import { useCreateArtifact } from '@/hooks/useCreateArtifact';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import { RelatedArtifactsLinker } from './RelatedArtifactsLinker';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TagInput } from '@/components/ui/TagInput';

export const ArtifactCaptureModal: React.FC = () => {
  // Get artifact modal state from store (using correct hook name)
  const {
    isArtifactCaptureModalOpen,
    artifactCaptureConfig,
    closeArtifactCaptureModal,
    isEditingExistingArtifact
  } = useArtifactStore(state => ({
    isArtifactCaptureModalOpen: state.isArtifactCaptureModalOpen,
    artifactCaptureConfig: state.artifactCaptureConfig,
    closeArtifactCaptureModal: state.closeArtifactCaptureModal,
    isEditingExistingArtifact: state.isEditingExistingArtifact || false
  }));
  
  // Get toast notification function (for validation errors only)
  const { addToast } = useNotificationStore(state => ({
    addToast: state.addToast
  }));
  
  // Get current agent context
  const { activeAgentId } = useInteractionContext();
  
  // Get artifact creation function
  const { createArtifactFromModal, isCreating } = useCreateArtifact();
  
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('note');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [relations, setRelations] = useState<ArtifactRelation[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Track form changes
  useEffect(() => {
    if (isArtifactCaptureModalOpen) {
      setHasUnsavedChanges(true);
    }
  }, [name, content, type, tags, relations, isArtifactCaptureModalOpen]);
  
  // Reset form when modal closes
  useEffect(() => {
    if (!isArtifactCaptureModalOpen) {
      setName('');
      setType('note');
      setContent('');
      setTags([]);
      setRelations([]);
      setHasUnsavedChanges(false);
    }
  }, [isArtifactCaptureModalOpen]);
  
  // Memoize config processing to prevent over-triggering
  const initialFormData = useMemo(() => {
    if (!artifactCaptureConfig) return null;
    
    return {
      name: artifactCaptureConfig.name || '',
      type: artifactCaptureConfig.type || 'note',
      content: artifactCaptureConfig.initialContent || '',
      tags: artifactCaptureConfig.tags || [],
      relations: artifactCaptureConfig.suggestedRelations || []
    };
  }, [artifactCaptureConfig]);
  
  // Initialize form from config when modal opens
  useEffect(() => {
    if (isArtifactCaptureModalOpen && initialFormData) {
      setName(initialFormData.name);
      setType(initialFormData.type);
      setContent(initialFormData.content);
      setTags(initialFormData.tags);
      setRelations(initialFormData.relations);
      setHasUnsavedChanges(false);
      
      // Auto-focus on name input after a short delay
      setTimeout(() => document.getElementById("artifact-name")?.focus(), 10);
    }
  }, [isArtifactCaptureModalOpen, initialFormData]);
  
  // Helper function to generate clean metadata
  const generateMetadataFromConfig = () => {
    const metadata = {
      ...(artifactCaptureConfig?.metadata || {}),
      relations,
      // Ensure origin is properly structured
      origin: {
        ...(artifactCaptureConfig?.metadata?.origin || {}),
        contextKey: artifactCaptureConfig?.contextKey,
        originId: artifactCaptureConfig?.originId,
        highlightedText: artifactCaptureConfig?.highlightedText,
      }
    };
    
    // Add agent ID if available
    if (activeAgentId) {
      metadata.agentId = activeAgentId;
    }
    
    return metadata;
  };
  
  // Check if content is required based on type
  const isContentRequired = useMemo(() => {
    return ['note', 'insight', 'query', 'code', 'reflection'].includes(type);
  }, [type]);
  
  // Handle safe modal closing with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges && 
       (name.trim() !== initialFormData?.name ||
        content.trim() !== initialFormData?.content ||
        tags.length > 0 ||
        relations.length > 0)) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to close?")) {
        return;
      }
    }
    closeArtifactCaptureModal();
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!name.trim()) {
      addToast({
        type: 'error',
        message: 'Please enter a name for the artifact'
      });
      return;
    }
    
    if (isContentRequired && !content.trim()) {
      addToast({
        type: 'error',
        message: `Please enter content for this ${type}`
      });
      return;
    }
    
    // Prepare final payload
    const finalPayload = {
      name: name.trim(),
      type,
      content,
      tags, // Use tags array directly - no parsing needed
      metadata: generateMetadataFromConfig()
    };
    
    // Submit the artifact using the hook
    // Let the hook handle success/error notifications
    await createArtifactFromModal(finalPayload);
    
    // Reset unsaved changes flag (not really needed as modal will close on success)
    setHasUnsavedChanges(false);
  };
  
  // Handle keyboard submission
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.ctrlKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };
  
  return (
    <Modal 
      isOpen={isArtifactCaptureModalOpen}
      onClose={handleClose}
      title={isEditingExistingArtifact ? "Edit Artifact" : "Create New Artifact"}
      aria-labelledby="artifact-modal-title"
      aria-describedby="artifact-modal-description"
    >
      <div id="artifact-modal-description" className="sr-only">
        Create or edit an artifact. Add a name, type, content, tags and optionally link it to other artifacts.
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4" onKeyDown={handleKeyDown}>
        {/* Name field */}
        <div className="space-y-1">
          <label htmlFor="artifact-name" className="block text-sm font-medium text-text-default">
            Name <span className="text-color-error">*</span>
          </label>
          <input
            id="artifact-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Give this artifact a name"
            className="w-full px-3 py-2 border border-border-default rounded-md bg-bg-surface text-sm focus:ring-1 focus:ring-agent-color-primary focus:border-agent-color-primary outline-none"
            autoFocus
            required
            aria-required="true"
          />
        </div>
        
        {/* Type field */}
        <div className="space-y-1">
          <label htmlFor="artifact-type" className="block text-sm font-medium text-text-default">
            Type
          </label>
          <select
            id="artifact-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 border border-border-default rounded-md bg-bg-surface text-sm focus:ring-1 focus:ring-agent-color-primary focus:border-agent-color-primary outline-none"
          >
            <option value="note">Note</option>
            <option value="insight">Insight</option>
            <option value="query">Query</option>
            <option value="code">Code</option>
            <option value="image">Image</option>
            <option value="link">Link</option>
            <option value="concept">Concept</option>
            <option value="reflection">Reflection</option>
          </select>
        </div>
        
        {/* Content field */}
        <div className="space-y-1">
          <label htmlFor="artifact-content" className="block text-sm font-medium text-text-default">
            Content {isContentRequired && <span className="text-color-error">*</span>}
          </label>
          <textarea
            id="artifact-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Enter content for this ${type}`}
            className="w-full px-3 py-2 border border-border-default rounded-md bg-bg-surface text-sm focus:ring-1 focus:ring-agent-color-primary focus:border-agent-color-primary outline-none"
            rows={5}
            aria-required={isContentRequired}
          />
        </div>
        
        {/* Tags field */}
        <div className="space-y-1">
          <label htmlFor="artifact-tags" className="block text-sm font-medium text-text-default">
            Tags
          </label>
          <TagInput
            id="artifact-tags"
            tags={tags}
            onTagsChange={setTags}
            placeholder="Add tags..."
            className="w-full"
            aria-label="Artifact tags"
          />
        </div>
        
        {/* Relations section */}
        <RelatedArtifactsLinker
          selectedRelations={relations}
          onRelationChange={setRelations}
          onFeedback={(message, type = 'info') => addToast({ type, message })}
        />
        
        {/* Form actions */}
        <div className="flex justify-between items-center pt-4 border-t border-border-default">
          <div className="text-xs text-text-muted">
            <kbd className="px-1 py-0.5 text-xs border rounded bg-bg-muted">Ctrl+Enter</kbd> to save
          </div>
          
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || (isContentRequired && !content.trim()) || isCreating}
            >
              {isCreating 
                ? isEditingExistingArtifact ? 'Updating...' : 'Saving...' 
                : isEditingExistingArtifact ? 'Update Artifact' : 'Save Artifact'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ArtifactCaptureModal;