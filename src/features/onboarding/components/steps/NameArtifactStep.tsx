// === File: asrayaos3.4/src/features/onboarding/components/steps/NameArtifactStep.tsx ===

'use client';

/**
 * NameArtifactStep.tsx
 * Onboarding step where the user names the first artifact created from their intention.
 * Includes validation, error focus/feedback, accessibility, responsive layout, and loading state.
 * (v10.10 - Final Polish)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';     // Assuming Input component supports label, error, ref forwarding
import { Spinner } from '@/components/ui/Spinner'; // Assuming Spinner component exists for loading state
import { cn } from '@/lib/utils';

// --- Prop Types ---
// Import shared types from their definitive source (Ensure correct path) (#Type Imports)
import type {
    OnboardingInputs,
    OnboardingStepMeta
} from '@/lib/state/slices/onboardingSlice';

// Assume StepComponentProps is defined centrally
export interface StepComponentProps {
  inputs: Partial<OnboardingInputs>;
  setInput: <K extends keyof OnboardingInputs>(key: K, value: OnboardingInputs[K] | any) => void;
  onNext: () => Promise<void> | void;
  onBack?: () => Promise<void> | void;
  stepMeta?: OnboardingStepMeta;
  activeAgentId?: string | null;
  isLoading?: boolean; // Add isLoading prop for submission state (#Consistent UI Behavior)
}

// Constants
const MIN_ARTIFACT_NAME_LENGTH = 3;
const ARTIFACT_NAME_INPUT_ID = 'artifact-name-input';
const ARTIFACT_NAME_ERROR_ID = 'artifact-name-error';

// --- Name Artifact Step Component ---

export const NameArtifactStep: React.FC<StepComponentProps> = ({
  inputs,
  setInput,
  onNext,
  onBack,
  stepMeta,
  isLoading // Destructure isLoading prop
}) => {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // For potential animations

  // Focus input field when an error message is set
  useEffect(() => {
    if (error && inputRef.current) {
      inputRef.current.focus();
    }
  }, [error]);

  // Optional: Entrance Animation (kept from previous step)
  useGSAP(() => { /* ... GSAP animation logic ... */ }, { scope: containerRef });

  // Refactored onChange handler (#Refactoring of onChange Handler)
  const handleArtifactNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null); // Clear error on change
    setInput('artifactName', e.target.value); // Verify 'artifactName' key (#Verify State Key)
  }, [setInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent multiple submissions

    const artifactName = inputs.artifactName?.trim() || '';

    // Validation
    if (!artifactName) {
      setError('Please give your artifact a name.');
      inputRef.current?.focus(); // Focus on error
      return;
    }
    // More specific error message (#Error Handling Enhancement)
    if (artifactName.length < MIN_ARTIFACT_NAME_LENGTH) {
        setError(`Artifact name must be at least ${MIN_ARTIFACT_NAME_LENGTH} characters.`);
        inputRef.current?.focus(); // Focus on error
        return;
    }

    setError(null); // Clear any previous errors
    try {
        await onNext(); // Await async action
        // Confirmation feedback ideally happens after transition/next step load
    } catch (err) {
        console.error("Error during onNext in NameArtifactStep:", err);
        setError("Something went wrong saving the name. Please try again.");
        // Optional: trackEvent(...)
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center h-full max-w-xl mx-auto p-6 space-y-8">
        {/* Accessibility Region */}
        <section role="region" aria-labelledby="step-title-name-artifact" className="w-full">
            <div className="space-y-6 w-full">
                <h2 id="step-title-name-artifact" className="text-2xl md:text-3xl font-light text-center mb-4 text-text-heading">
                    Name Your First Artifact
                </h2>

                {/* Preview Box with hover effect */}
                <div className={cn(
                    "bg-bg-surface border border-border-default rounded-lg p-5 mb-6",
                    "relative overflow-hidden shadow-sm transition-all duration-200 ease-out",
                    "hover:shadow-md hover:border-border-emphasis" // (#Artifact Name Preview)
                 )}>
                    <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-[var(--agent-color-primary)] to-transparent pointer-events-none"></div>
                    <p className="text-text-muted text-sm mb-4">
                        Your intention has been captured. Give this new artifact a name to save it to your memory.
                    </p>
                    <div className="p-4 border border-border-muted rounded bg-bg-subtle mb-4 max-h-24 overflow-hidden relative">
                        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-bg-subtle to-transparent pointer-events-none"></div>
                        <div className="text-xs uppercase tracking-wider text-text-muted mb-2 font-medium">Intention Summary</div>
                        <div className="text-sm text-text-default line-clamp-3 italic">
                            {inputs.intention || "Your intention content will appear here..."}
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6 w-full">
                    <Input
                        ref={inputRef}
                        id={ARTIFACT_NAME_INPUT_ID}
                        label="Artifact Name"
                        placeholder="e.g., 'My First Reflection', 'Project Phoenix Plan'" // Updated placeholder
                        value={inputs.artifactName || ''}
                        onChange={handleArtifactNameChange} // Use refactored handler
                        // Input component should use this boolean to apply error styling (#Error Styling)
                        error={!!error}
                        maxLength={100} // Limit input length
                        autoFocus
                        required
                        aria-required="true"
                        aria-invalid={!!error}
                        aria-describedby={error ? ARTIFACT_NAME_ERROR_ID : undefined} // Link error message (#Form Accessibility)
                    />
                    {/* Error Message - with aria-live */}
                    {error && (
                        <p
                           id={ARTIFACT_NAME_ERROR_ID}
                           className="text-sm text-[var(--color-error)] -mt-4"
                           role="alert"
                           aria-live="assertive" // Announce errors immediately
                        >
                            {error}
                        </p>
                    )}

                    {/* Navigation Buttons - Responsive Layout */}
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between items-center pt-4">
                        {onBack ? (
                            <Button type="button" onClick={onBack} variant="outline" className="w-full sm:w-auto" disabled={isLoading}>
                                Back
                            </Button>
                        ) : ( <div className="sm:w-[calc(theme(spacing.10)+theme(spacing.8))]"/> /* Spacer to align Continue button if no Back button */ )}

                        <Button type="submit" className="w-full sm:w-auto sm:ml-auto" disabled={isLoading}>
                            {/* Loading State (#Consistent UI Behavior) */}
                            {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
                            {isLoading ? 'Creating...' : 'Create Artifact'}
                        </Button>
                    </div>
                </form>
            </div>
        </section>
    </div>
  );
};

export default NameArtifactStep;

// Ensure file ends with a newline