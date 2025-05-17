// === File: asrayaos3.4/src/features/onboarding/components/steps/SetIntentionStep.tsx ===

'use client';

/**
 * SetIntentionStep.tsx
 * Onboarding step where the user defines their primary intention and focus areas.
 * Includes accessibility enhancements, type safety, optional quick tags, and animations.
 * (v10.10 - Final Accessibility Polish)
 */

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea'; // Assumed component
import { TagInput } from '@/components/ui/TagInput';   // Assumed component (#Verify TagInput)
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';

// --- Prop Types ---
// Import shared types from their definitive source
import type {
    OnboardingInputs,
    OnboardingStepMeta
} from '@/lib/state/slices/onboardingSlice'; // Adjust path as needed

// Assume StepComponentProps is defined centrally
export interface StepComponentProps {
  inputs: Partial<OnboardingInputs>;
  setInput: <K extends keyof OnboardingInputs>(key: K, value: OnboardingInputs[K] | any) => void;
  onNext: () => Promise<void> | void;
  onBack?: () => Promise<void> | void;
  stepMeta?: OnboardingStepMeta;
  activeAgentId?: string | null;
}

// --- Default Tags Configuration ---
const defaultFocusTags = ['Growth', 'Clarity', 'Productivity', 'Learning', 'Creativity'];
const MAX_FOCUS_TAGS = 5;

// --- Set Intention Step Component ---

export const SetIntentionStep: React.FC<StepComponentProps> = ({
  inputs,
  setInput,
  onNext,
  onBack,
  stepMeta
}) => {
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Optional: Entrance Animation
  // Note: Test GSAP performance if many elements are animated (#GSAP Performance)
  useGSAP(() => {
    const tl = gsap.timeline({ delay: 0.1 });
    tl.from("#step-title-set-intention", { opacity: 0, y: 10, duration: 0.4, ease: 'power2.out' });
    tl.from(formRef.current?.children || [], { opacity: 0, y: 15, duration: 0.5, ease: 'power2.out', stagger: 0.08 }, "-=0.2");
  }, { scope: containerRef });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputs.intention?.trim()) {
      const errorMsg = 'Please describe your main intention.';
      setError(errorMsg);
      // Focus the input on error for accessibility (#Dynamic Focus for Error)
      document.getElementById('intention-textarea')?.focus();
      return;
    }
    setError(null);
    onNext();
  };

  const handleAddDefaultTag = useCallback((tagToAdd: string) => {
    // Verify 'focusAreas' key (#Verify State Key)
    const currentTags = (inputs.focusAreas as string[] | undefined) || [];
    if (currentTags.length < MAX_FOCUS_TAGS && !currentTags.includes(tagToAdd)) {
        const newTags = [...currentTags, tagToAdd];
        setInput('focusAreas', newTags);
    }
    // Optional: Add validation within TagInput if needed (e.g., tag length)
  }, [inputs.focusAreas, setInput]);

  // Verify 'focusAreas' key (#Verify State Key)
  const currentTags = (inputs.focusAreas as string[] | undefined) || [];

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center h-full max-w-xl mx-auto p-6 space-y-8">
        {/* Accessibility Region Wrapper */}
        <section role="region" aria-labelledby="step-title-set-intention" className="w-full">
            <div className="space-y-4 w-full">
                <h2 id="step-title-set-intention" className="text-2xl md:text-3xl font-light text-center mb-4 text-text-heading">
                    Set Your Intention
                </h2>

                <p className="text-text-muted text-center mb-8">
                    What would you like to accomplish with Asraya OS? This intention will help guide your experience and shape how your AI assists you.
                </p>

                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 w-full">
                    {/* Intention Textarea */}
                    {/* Note: Assuming Textarea component internally styles label/placeholder (#Label Styling, #Placeholder Styling) */}
                    <div className="input-group relative">
                         <Textarea
                            id="intention-textarea" // ID used for focus on error
                            label="Your Intention"
                            placeholder="e.g., Explore creative writing ideas, research market trends for my startup, manage my personal knowledge base..."
                            value={inputs.intention || ''}
                            onChange={(e) => { setError(null); setInput('intention', e.target.value); }} // Clear error on change
                            error={!!error} // Pass boolean for error state styling
                            rows={4}
                            autoFocus
                            required
                            aria-required="true"
                            aria-invalid={!!error}
                            aria-describedby={error ? "intention-error" : undefined}
                         />
                         {/* Optional: Placeholder for Voice Input Icon */}
                         {/* <span className="absolute right-2 bottom-2 ..."> MicIcon </span> */}
                    </div>
                    {/* Error Message - Added aria-live (#Error Message Accessibility) */}
                    {error && (
                        <p
                           id="intention-error"
                           className="text-sm text-[var(--color-error)] mt-1" // Use CSS Var
                           role="alert"
                           aria-live="assertive" // Announce errors immediately
                        >
                            {error}
                        </p>
                    )}

                    {/* Focus Areas Tag Input */}
                    <div>
                        <TagInput
                            label="Key Focus Areas (Optional)"
                            placeholder="Add focus (e.g., Productivity)"
                            tags={currentTags}
                            onChange={(tags) => setInput('focusAreas', tags)}
                            maxTags={MAX_FOCUS_TAGS}
                            aria-describedby="focus-tags-description" // Add description if needed
                        />
                         {/* Optional Quick Pick Tags */}
                         <div className="flex gap-2 flex-wrap mt-3">
                            <p id="focus-tags-description" className="text-xs text-text-muted w-full mb-1 sr-only">Optionally add focus areas or select from suggestions:</p> {/* Added sr-only description */}
                            {defaultFocusTags.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    className={cn(
                                        "text-xs px-2 py-0.5 rounded-full border border-border-default text-text-muted hover:bg-bg-muted hover:border-border-emphasis hover:text-text-default transition-colors focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)]", // Added focus style
                                        currentTags.includes(tag) && "bg-bg-muted border-border-emphasis text-text-default cursor-default opacity-70"
                                    )}
                                    onClick={() => handleAddDefaultTag(tag)}
                                    disabled={currentTags.includes(tag) || currentTags.length >= MAX_FOCUS_TAGS}
                                >
                                    {tag}
                                </button>
                            ))}
                         </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center pt-4 button-group">
                        {onBack ? ( <Button type="button" onClick={onBack} variant="outline">Back</Button> ) : ( <div /> )}
                        <Button type="submit" className="ml-auto"> Continue </Button>
                    </div>
                </form>
            </div>
        </section>
    </div>
  );
};

export default SetIntentionStep;

// Ensure file ends with a newline