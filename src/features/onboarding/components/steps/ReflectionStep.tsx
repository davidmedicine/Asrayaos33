// === File: asrayaos3.4/src/features/onboarding/components/steps/ReflectionStep.tsx ===

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea'; // Assuming this primitive exists
import { motion, AnimatePresence } from 'framer-motion';

// --- Prop Types ---
// Ensure these types are correctly defined and imported from your central types location
// e.g., '@/lib/state/slices/onboardingSlice.ts' or '@/features/onboarding/types.ts'
import type {
  StepComponentProps,
  OnboardingInputs,
} from '@/features/onboarding/types'; // <-- Adjust this import path if needed

// --- Constants ---
const NAVIGATION_DELAY_MS = 800; // Delay before navigating after save confirmation appears

export const ReflectionStep: React.FC<StepComponentProps> = ({
  inputs,
  setInput,
  onNext,
  onBack,
  // stepMeta is available but not used in this simplified version
}) => {
  // State for the user's reflection input
  const [userReflection, setUserReflection] = useState<string>(
    // Initialize with existing value if user comes back to this step
    // Ensure 'userReflection' key exists in OnboardingInputs type
    (inputs as OnboardingInputs)?.userReflection || ''
  );
  // State to control the visibility of the "saving artifact" preview animation
  const [showArtifactPreview, setShowArtifactPreview] = useState(false);
  // State for potential errors (e.g., if setInput failed, though unlikely here)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer ref for navigation delay
  const navigationTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (navigationTimerRef.current) {
          clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  // Function to handle saving the reflection and moving next
  const handleNext = () => {
    // Basic guard against multiple clicks while preview is showing
    if (showArtifactPreview) return;

    // Clear previous errors
    setErrorMessage(null);

    // Validate input (handled by button disabled state mostly, but good practice)
    if (!userReflection.trim()) {
        setErrorMessage("Please share your reflection before continuing.");
        return;
    }

    if (setInput) {
      // --- CORE FUNCTIONALITY: Save user's reflection to global state ---
      setInput('userReflection', userReflection); // Ensure 'userReflection' key exists in type
    } else {
      console.warn('setInput prop is missing in ReflectionStep');
      // Optionally set an error message for the user
      setErrorMessage("Could not save reflection due to an internal error.");
      return; // Stop processing if setInput is missing
    }

    // Trigger artifact preview animation
    setShowArtifactPreview(true);

    // Delay moving next slightly to allow the user to see the preview animation
    // Clear any existing timer first
    if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    navigationTimerRef.current = setTimeout(() => {
      onNext();
      // Reset preview state if needed, depends on unmount behavior
      // setShowArtifactPreview(false);
    }, NAVIGATION_DELAY_MS);
  };

  return (
    <div
      role="region"
      aria-labelledby="step-title-reflection"
      className="flex flex-col items-center justify-center h-full max-w-xl mx-auto p-6 space-y-8"
    >
      <div className="space-y-6 w-full">
        <h2
          id="step-title-reflection"
          className="text-2xl md:text-3xl font-light text-center mb-6 text-text-default"
        >
          Reflection
        </h2>

        {/* Optional Error Message Display */}
        {errorMessage && (
           <motion.div
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             className="text-center text-sm text-[var(--color-error)] mb-4" // Use CSS var
             role="alert"
           >
             {errorMessage}
           </motion.div>
        )}

        {/* User Reflection Input Section */}
        <div className="space-y-2">
          <label
            htmlFor="user-reflection-textarea"
            className="block text-md font-medium text-text-default"
          >
            What did that reveal to you?
          </label>
          <p className="text-sm text-text-muted mb-2">
            Feel free to write about feelings, insights, or questions that arose during your intention setting.
          </p>
          <Textarea
            id="user-reflection-textarea"
            value={userReflection}
            onChange={(e) => {
              setUserReflection(e.target.value);
              if (errorMessage) setErrorMessage(null); // Clear error on input
            }}
            placeholder="Share your thoughts, feelings, or insights..."
            rows={6}
            className="w-full bg-bg-input border-border-default focus:border-primary focus:ring-primary disabled:opacity-70" // Added disabled style
            data-testid="user-reflection-input"
            aria-label="Your reflection input based on the prompt 'What did that reveal to you?'"
            disabled={showArtifactPreview} // Disable textarea while saving/transitioning
            aria-invalid={!!errorMessage}
            aria-describedby={errorMessage ? "reflection-error-message-id" : undefined} // Link error message if displayed differently
          />
           {/* Render error message specifically for textarea if needed, or use above general error */}
        </div>

        {/* Artifact Preview Notification (using Framer Motion) */}
        <div className="min-h-[2.5em] flex items-center justify-center"> {/* Wrapper to prevent layout shift */}
          <AnimatePresence>
            {showArtifactPreview && (
              <motion.div
                key="artifact-preview" // Add key for AnimatePresence
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="text-center text-sm text-text-muted italic py-2 flex items-center"
              >
                {/* Optional: Could show a simple spinner here too */}
                🪄 This reflection will be remembered as an artifact.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4 w-full"> {/* Ensure button row takes full width */}
          {onBack ? (
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              disabled={showArtifactPreview} // Also disable back during save/transition
              aria-disabled={showArtifactPreview}
            >
              Back
            </Button>
          ) : (
            <div /> // Spacer to keep Save button on the right
          )}
          <Button
            onClick={handleNext}
            disabled={!userReflection.trim() || showArtifactPreview} // Disable if textarea is empty or during preview/navigation delay
            // aria-live="polite" // Only needed if button text changes significantly based on state
          >
            Save Reflection
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReflectionStep; // Add default export if standard convention