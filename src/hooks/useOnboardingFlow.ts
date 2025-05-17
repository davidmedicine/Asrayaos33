'use client';

/**
 * useOnboardingFlow.ts
 * Hook that orchestrates the onboarding experience, connecting state to UI
 * and coordinating animations and transitions
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/state/store';
import { ONBOARDING_STEPS, OnboardingStepId } from '@/lib/state/slices/onboardingSlice';
import { useCreateArtifact } from './useCreateArtifact';
import { useCoreStore } from '@/lib/state/store';

export function useOnboardingFlow({ onComplete }: { onComplete?: () => void } = {}) {
  const router = useRouter();
  const [animatingStep, setAnimatingStep] = useState<boolean>(false);
  
  // Onboarding state
  const {
    currentStep,
    inputs,
    isCompleted,
    isLoading,
    teleport,
    error,
    totalSteps,
    getStepIndex,
    isInTransition,
    getCurrentStepMeta,
    
    // Actions
    setCurrentStep,
    setInput,
    nextStep,
    prevStep,
    startTeleport,
    endTeleport,
    resetOnboarding,
    registerTeleportCallbacks
  } = useStore((state) => state);
  
  // Active agent
  const activeAgentId = useCoreStore((state) => state.activeAgentId);
  
  // Artifact creation
  const { 
    triggerArtifactCreationWithModal, 
    submitArtifactDirectly,
    isCreating
  } = useCreateArtifact();
  
  // Update selected agent if active agent changes
  useEffect(() => {
    if (activeAgentId && !inputs.selectedAgentId) {
      setInput('selectedAgentId', activeAgentId);
    }
  }, [activeAgentId, inputs.selectedAgentId, setInput]);
  
  // Setup teleport animation callbacks
  useEffect(() => {
    registerTeleportCallbacks({
      onStart: () => {
        setAnimatingStep(true);
        console.debug('[Onboarding] Teleport animation started');
      },
      onEnd: () => {
        setAnimatingStep(false);
        console.debug('[Onboarding] Teleport animation completed');
        
        // If we're at the completion step and not redirected yet, go to dashboard
        if (currentStep === ONBOARDING_STEPS.COMPLETE && isCompleted) {
          handleRedirectToApp();
        }
      }
    });
  }, [registerTeleportCallbacks, currentStep, isCompleted]);
  
  // Orchestrate the artifact creation after reflection
  const createFirstArtifact = useCallback(async () => {
    if (!inputs.artifactName || !inputs.reflectionSummary) {
      console.warn('[Onboarding] Missing artifact data for creation');
      return;
    }
    
    try {
      // Create the first artifact directly (no modal)
      await submitArtifactDirectly({
        name: inputs.artifactName,
        type: 'reflection',
        content: inputs.reflectionSummary,
        tags: ['intention', 'first-insight', 'onboarding'],
        metadata: {
          origin: {
            contextKey: 'asraya:onboarding',
            highlightedText: inputs.intention
          },
          agentId: inputs.selectedAgentId || 'oracle'
        }
      });
      
      console.debug('[Onboarding] First artifact created successfully');
    } catch (error) {
      console.error('[Onboarding] Failed to create first artifact:', error);
    }
  }, [inputs.artifactName, inputs.reflectionSummary, inputs.intention, inputs.selectedAgentId, submitArtifactDirectly]);
  
  // Handle completion and redirect
  const handleRedirectToApp = useCallback(() => {
    // After completing onboarding, redirect to the main app
    console.debug('[Onboarding] Redirecting to main app...');
    
    // Note: First artifact creation is triggered here, tied directly to the final redirect/completion logic
    createFirstArtifact().then(() => {
      // Give a small delay for a smoother transition
      setTimeout(() => {
        if (onComplete) {
          onComplete(); // Call the provided callback
        } else {
          router.push('/dashboard'); // Default action if no callback
        }
      }, 500);
    });
  }, [router, createFirstArtifact, onComplete]);
  
  // Simplified: teleport.isActive is the core state driving the teleport; animatingStep is mainly for guarding handlers
  const isTeleporting = teleport.isActive;
  
  // Clean way to handle step transitions
  const handleNextStep = useCallback(async () => {
    // Don't allow proceeding during animations
    if (animatingStep || isInTransition()) return;
    
    await nextStep();
  }, [nextStep, animatingStep, isInTransition]);
  
  const handlePrevStep = useCallback(() => {
    // Don't allow going back during animations
    if (animatingStep || isInTransition()) return;
    
    prevStep();
  }, [prevStep, animatingStep, isInTransition]);
  
  // Calculate progress
  const currentProgress = Math.min(
    100,
    ((getStepIndex() + (isTeleporting ? 0.5 : 0)) / totalSteps) * 100
  );
  
  return {
    // State
    currentStep,
    inputs,
    isCompleted,
    isLoading,
    teleport,
    error,
    animatingStep,
    isTeleporting,
    currentProgress,
    stepMeta: getCurrentStepMeta(),
    
    // Inputs
    setInput,
    
    // Navigation
    handleNextStep,
    handlePrevStep,
    
    // Teleport
    endTeleport,
    
    // Utility
    getStepIndex,
    totalSteps
  };
}