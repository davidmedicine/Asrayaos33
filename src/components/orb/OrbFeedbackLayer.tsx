/**
 * OrbFeedbackLayer.tsx
 * Renders non-WebGL feedback related to the Orb (status text).
 * Uses GSAP for text transitions.
 */

import { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import SplitText from 'gsap/SplitText';
import { useInteractionContext } from '@/hooks/useInteractionContext';

// Ensure SplitText plugin is registered
gsap.registerPlugin(SplitText);

interface OrbFeedbackLayerProps {
  className?: string;
}

export function OrbFeedbackLayer({ className = '' }: OrbFeedbackLayerProps) {
  const { agentOrbState, activeAgent } = useInteractionContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const textSpanRef = useRef<HTMLSpanElement>(null);
  const splitTextRef = useRef<SplitText | null>(null);
  const prevStateRef = useRef<string | null>(null);

  // Get feedback message based on state
  const getFeedbackMessage = () => {
    if (!activeAgent) return '';

    const agentName = activeAgent.persona.name;

    switch (agentOrbState) {
      case 'thinking':
        return `${agentName} is thinking...`;
      case 'streaming':
        return `${agentName} is responding...`;
      case 'listening':
        return `Listening to you...`;
      case 'error':
        return `Something went wrong`;
      case 'idle':
      default:
        return ``;
    }
  };

  const feedbackMessage = getFeedbackMessage();

  // Use GSAP to animate text transitions
  useGSAP(() => {
    if (!containerRef.current || !textSpanRef.current) return;

    // Clean up previous SplitText
    if (splitTextRef.current) {
      splitTextRef.current.revert();
      splitTextRef.current = null;
    }

    // Kill ongoing animations
    gsap.killTweensOf([containerRef.current, textSpanRef.current]);

    if (feedbackMessage && agentOrbState !== prevStateRef.current) {
      // Animate text in
      splitTextRef.current = new SplitText(textSpanRef.current, { type: "chars" });
      
      // Ensure container is visible
      gsap.to(containerRef.current, { opacity: 1, duration: 0.2 });
      
      // Animate characters in
      gsap.fromTo(
        splitTextRef.current.chars,
        { 
          opacity: 0,
          y: 10
        },
        { 
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.02,
          ease: "power2.out"
        }
      );
    } else if (!feedbackMessage && prevStateRef.current !== 'idle') {
      // Animate out if message becomes empty
      gsap.to(containerRef.current, { opacity: 0, duration: 0.2 });
    }

    prevStateRef.current = agentOrbState;
    
    // Cleanup on scope change
    return () => {
      if (splitTextRef.current) {
        splitTextRef.current.revert();
      }
    };
  }, { 
    dependencies: [agentOrbState, activeAgent, feedbackMessage], 
    scope: containerRef 
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (splitTextRef.current) {
        splitTextRef.current.revert();
      }
    };
  }, []);

  return (
    // Note: Apply fixed/absolute positioning via className or parent component
    <div 
      ref={containerRef} 
      className={`orb-feedback-layer transition-opacity duration-200 ${className}`}
    >
      <div 
        className="text-center text-sm text-text-agent-accent font-medium mt-2 min-h-6"
        aria-live="polite"
      >
        <span ref={textSpanRef}>{feedbackMessage}</span>
      </div>
    </div>
  );
}