// === File: asrayaos3.4/src/app/(onboarding)/layout.tsx ===

'use client';

/**
 * Onboarding Layout v10.2
 * Minimal shell for the onboarding flow. Includes dynamically themed ambient
 * background orbs (Framer Motion for idle, GSAP prep for transitions),
 * accessibility improvements, and overlay slot.
 */

import React, { ReactNode, useEffect, useRef } from 'react';
import { Inter } from 'next/font/google';
import { motion } from 'framer-motion';
import { useGSAP } from '@gsap/react'; // Import GSAP hook
import gsap from 'gsap'; // Import GSAP core
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { ONBOARDING_STEPS } from '@/lib/state/slices/onboardingSlice';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

// --- Extracted Ambient Orbs Component ---
// Now includes fadeOut prop and GSAP animation for transitions
const AmbientOrbs = React.memo(({ fadeOut }: { fadeOut?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // GSAP animation for fading out/in during major transitions (e.g., WorldTeleport)
  useGSAP(() => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: fadeOut ? 0 : 1,
        filter: fadeOut ? 'blur(8px)' : 'blur(0px)',
        scale: fadeOut ? 1.1 : 1, // Optional: slightly scale up on fade out
        duration: 0.6, // Match transition duration elsewhere if needed
        ease: 'power2.inOut',
      });
    }
  }, { scope: containerRef, dependencies: [fadeOut] });


  // Comment: These internal orbs use Framer Motion for continuous *ambient* animation.
  // The fadeOut prop allows the parent (e.g., layout during teleport) to control
  // the visibility of this entire ambient effect via GSAP.
  return (
    <div
      ref={containerRef} // Ref for GSAP targeting
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
    >
      {/* Orb 1 */}
      <motion.div
        // Reduced opacity for reduced motion/accessibility (Feedback #🎚️)
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-40 dark:opacity-30 motion-reduce:opacity-20"
        style={{ /* ... background color var(--orb1-color) ... */ }}
        animate={{ /* ... continuous framer motion animation ... */ }}
        transition={{ /* ... framer motion transition ... */ }}
      />
      {/* Orb 2 */}
      <motion.div
         // Reduced opacity for reduced motion/accessibility (Feedback #🎚️)
        className="absolute w-64 h-64 rounded-full blur-3xl opacity-30 dark:opacity-20 motion-reduce:opacity-15"
        style={{ /* ... background color var(--orb2-color) ... */ }}
        animate={{ /* ... continuous framer motion animation ... */ }}
        transition={{ /* ... framer motion transition ... */ }}
      />
    </div>
  );
});
AmbientOrbs.displayName = 'AmbientOrbs';


// --- Main Onboarding Layout Component ---
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  // Get current step and teleport state from the hook
  const { currentStep, isTeleporting } = useOnboardingFlow(); // Default handled internally or via CSS

  return (
    // Added ID, optimized theme class application (Feedback #🔄, #📦)
    <div
      id="onboarding-shell"
      className={cn(
        'min-h-screen bg-bg-body flex flex-col isolate', // isolate for stacking context
        inter.className,
        // Apply step theme or fallback directly, remove theme-default unless needed for base styles
        currentStep ? `theme-step-${currentStep}` : 'theme-step-welcome'
     )}>

      {/* 1. Base Ambient gradient background */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-gradient-to-b from-bg-body to-bg-muted opacity-80 dark:opacity-90 z-[-2]" // Pushed further back
      />

      {/* 2. Optional dark overlay for contrast */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/15 dark:bg-black/25 z-[-1]" // Behind orbs & content
      />

      {/* 3. Render extracted Ambient Orbs, pass fadeOut prop */}
      <AmbientOrbs fadeOut={isTeleporting} />

      {/* 4. Slot for Step-Level Overlays (Feedback #💡 Future Expansion) */}
      <div id="step-overlay" className="fixed inset-0 z-[5] pointer-events-none">
          {/* Content injected here by specific steps if needed */}
      </div>

      {/* 5. Main Content Area */}
      {/* Using z-[10] to be above backgrounds/orbs/overlays */}
      <main className="flex-1 relative z-[10] flex items-center justify-center w-full px-4">
        {/* Content container with padding */}
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6">
          {children}
        </div>
      </main>

      {/* 6. Simple Footer */}
      <footer className="relative z-[10] p-4 text-center text-text-muted text-xs">
        <div className="opacity-60">Asraya OS &copy; {new Date().getFullYear()}</div>
      </footer>

      {/* Note: DevTools component would be rendered here conditionally if needed */}
      {/* {process.env.NODE_ENV === 'development' && <OnboardingDevTools />} */}

    </div>
  );
}

// --- CSS Variable Notes ---
/**
 * Reminder: Ensure CSS variables for orb colors (--orb1-color, --orb2-color)
 * are defined in global.css under classes like .theme-step-welcome, etc.
 * Also ensure :root defines fallback values for --orb1-color and --orb2-color.
 */

// Ensure file ends with a newline