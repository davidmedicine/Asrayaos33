// create file asrayaos3.4/src/features/onboarding/components/steps/CompletionStep.tsx

'use client';

import React, { useRef, useState, useEffect } from 'react';
// DEV_VERIFY: Ensure Button component exists and supports disabled state, children rendering.
import { Button } from '@/components/ui/Button';
// DEV_VERIFY: Ensure Spinner component exists and accepts expected props (e.g., className).
import { Spinner } from '@/components/ui/Spinner';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
// DEV_VERIFY: Ensure central types are correct and path is valid.
import {
  StepComponentProps,
  OnboardingInputs,
  // OnboardingStepMeta // Import if stepMeta prop is actually used
} from '@/features/onboarding/types'; // Adjust path as needed

// Removed local StepProps, using imported StepComponentProps

export const CompletionStep: React.FC<StepComponentProps> = ({
  inputs, // Now typed as OnboardingInputs via StepComponentProps
  onNext,
  // onBack, // onBack is defined in StepComponentProps but not used here
  // setInput, // setInput is defined in StepComponentProps but not used here
  // stepMeta // stepMeta is defined in StepComponentProps but not used here
}) => {
  const artifactRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false); // State for loading indicator

  // Type assertion for clarity within the component if needed, though props are typed
  const typedInputs = inputs as OnboardingInputs;

  useGSAP(() => {
    // Ensure refs are current before animating
    if (!artifactRef.current || !orbRef.current) return;

    // --- GSAP Refinement: Use a single timeline ---
    const tl = gsap.timeline();

    // Artifact card animation added to the main timeline
    tl.fromTo(artifactRef.current,
      { // from vars
        y: 30,
        opacity: 0,
        scale: 0.95,
        boxShadow: "0 0 0 0px var(--agent-color-primary)" // DEV_VERIFY: Ensure --agent-color-primary is defined CSS variable
      },
      { // to vars
        y: 0,
        opacity: 1,
        scale: 1,
        // --- Animation Performance: boxShadow ---
        // Animating boxShadow can be performance-intensive. Test on target devices.
        // Consider alternatives like scaling/opacity if performance issues arise.
        boxShadow: "0 0 30px 2px var(--agent-color-primary)", // DEV_VERIFY: Ensure --agent-color-primary is defined CSS variable
        duration: 1,
        ease: "power3.out"
      }
    );

    // Orb pulse animation added to the same timeline, repeating indefinitely
    // Add label to start orb animation concurrently or slightly after card appears
    tl.addLabel("orbStart", ">-0.5"); // Start orb pulse slightly before card finishes landing
    tl.to(orbRef.current, {
        // --- Animation Performance: boxShadow --- (Same note as above)
        boxShadow: "0 0 20px 5px var(--agent-color-primary)", // DEV_VERIFY: Ensure --agent-color-primary is defined CSS variable
        duration: 1.5,
        ease: "sine.inOut",
        repeat: -1, // Repeat indefinitely
        yoyo: true // Go back and forth between states
      },
      "orbStart" // Start at the defined label
    );

    // --- GSAP Cleanup: Kill timeline on unmount ---
    // useGSAP handles basic cleanup, but explicitly killing is robust.
    return () => {
      tl.kill(); // Kill the timeline animations
    };
  }, { scope: [artifactRef, orbRef] }); // Scope animations to refs

  // --- Error Handling for onNext ---
  const handleNext = async () => {
     if (isLoading) return; // Prevent multiple clicks
     setIsLoading(true);
     try {
        // Assuming onNext might be async (e.g., involves API call before routing)
        await onNext();
        // isLoading state might implicitly reset on successful navigation/unmount
     } catch (err) {
        console.error('Error during onNext navigation:', err);
        // Optionally: Display an error message to the user
        setIsLoading(false); // Reset loading state on error
     }
  };


  // --- Mobile and Tablet Testing: ---
  // Ensure layout (max-w-lg), font sizes, and button tap areas are suitable
  // across various screen sizes, especially smaller mobile views.

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto p-6 text-center space-y-8">
      <div className="space-y-6 w-full"> {/* Added w-full for better structure */}
        <h2 className="text-2xl md:text-3xl font-light mb-6 text-text-default"> {/* DEV_VERIFY: Ensure text-text-default is defined */}
            Setup Complete!
        </h2>

        <p className="text-lg text-text-muted mb-8"> {/* DEV_VERIFY: Ensure text-text-muted is defined */}
          Your personal Asraya OS is ready. You've created your first artifact and set your intention.
        </p>

        {/* Artifact Display Card */}
        <div
          ref={artifactRef}
          // DEV_VERIFY: Ensure background/border styles are defined (bg-bg-surface, border-border-default).
          className="bg-bg-surface border border-border-default rounded-lg p-6 mb-8 mx-auto max-w-sm opacity-0" // Start hidden for animation
          style={{ willChange: 'transform, opacity, box-shadow' }} // Hint browser about animations
        >
          <div className="text-xs uppercase tracking-wider text-text-muted mb-2">Artifact</div>
          <div className="text-xl font-medium mb-3 text-text-default"> {/* DEV_VERIFY: Ensure text-text-default is defined */}
            {/* Use specific typed input key, add fallback */}
            {typedInputs.artifactName || "My First Intention"}
          </div>
          {/* DEV_VERIFY: Ensure line-clamp utility works or use alternative truncation */}
          <div className="text-sm text-text-muted line-clamp-3 text-left">
            {/* Use specific typed input key, add fallback */}
            {typedInputs.intention || "Your defined intention will appear here."}
          </div>
        </div>

        {/* OS Ready Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-8"> {/* Added space-x */}
          <div
            ref={orbRef}
            className="w-12 h-12 rounded-full bg-[var(--agent-color-primary)] opacity-80 shadow-md" // Initial shadow state
            style={{ boxShadow: "0 0 10px 2px var(--agent-color-primary)", willChange: 'box-shadow' }} // Initial state matches GSAP end state for smoother start
          />
          <div className="text-lg text-text-default"> {/* DEV_VERIFY: Ensure text-text-default is defined */}
            <span className="font-medium">{typedInputs.osName || "Asraya OS"}</span> is ready to assist you
          </div>
        </div>

        {/* Final Action Button */}
        {/* DEV_VERIFY: Ensure Button component styles (px, py, text-lg) are appropriate. */}
        <Button
          onClick={handleNext}
          disabled={isLoading} // Disable button when loading
          className="px-8 py-3 text-lg w-full sm:w-auto" // Make button full width on small screens
          aria-live="polite" // Announce loading state change
        >
          {isLoading ? (
            // DEV_VERIFY: Ensure Spinner renders correctly inline & check alignment.
            <span className="inline-flex items-center justify-center">
              <Spinner className="h-5 w-5 mr-2 animate-spin" />
              Entering...
            </span>
          ) : (
             // --- Button Text Clarity ---
            'Enter Your Personal OS'
          )}
        </Button>
      </div>
    </div>
  );
};