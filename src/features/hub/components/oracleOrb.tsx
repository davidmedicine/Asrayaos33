// File: src/features/chat/components/oracleOrb.tsx
// (Generated as part of Prompt 3: Implementation Plan)

import React, { useRef, useEffect, useState, memo } from 'react';
import { gsap, CustomEase } from '@/lib/gsapSetup'; // Assuming CustomEase is registered in gsapSetup
import { cn } from '@/lib/utils';
import type { OracleOrbProps } from './ActiveConversationPanel.types';

const OracleOrbComponent: React.FC<OracleOrbProps> = ({
  orbState,
  questName,
  onRecedeComplete,
}) => {
  const orbRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const motionQuery = useRef<MediaQueryList | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // Controls rendering post-recede

  useEffect(() => {
    motionQuery.current = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.current.matches);
    const handleChange = () => setPrefersReducedMotion(motionQuery.current!.matches);
    motionQuery.current.addEventListener('change', handleChange);
    return () => motionQuery.current?.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!orbRef.current) return;
    gsap.set(orbRef.current, { willChange: 'transform, opacity' });

    if (!prefersReducedMotion) {
      gsap.fromTo(
        orbRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1, ease: 'power2.out' }
      );
    } else {
      gsap.set(orbRef.current, { scale: 1, opacity: 1 });
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!orbRef.current || prefersReducedMotion) return;

    let pulseTween: gsap.core.Tween | null = null;

    if (orbState === 'awaiting' || orbState === 'awakening') {
      const easeType = CustomEase.get('ethereal') || 'sine.inOut'; // Fallback if custom ease not found
      pulseTween = gsap.to(orbRef.current, {
        scale: orbState === 'awakening' ? 1.1 : 1.05,
        duration: orbState === 'awakening' ? 1.5 : 2,
        ease: easeType,
        yoyo: true,
        repeat: -1,
        boxShadow: orbState === 'awakening' ? '0 0 35px 12px rgba(168, 85, 247, 0.6)' : '0 0 25px 8px rgba(124, 58, 237, 0.5)',
      });
    } else if (orbState === 'receding') {
      gsap.to(orbRef.current, {
        opacity: 0,
        scale: 0.7,
        duration: 0.7,
        ease: 'power2.in',
        onComplete: () => {
          setIsVisible(false);
          onRecedeComplete?.();
        },
      });
      // Optional: GSAP Flip can be integrated here if complex layout shifts occur
      // This would involve Flip.getState before this animation and Flip.from after
      // the chat messages potentially appear.
    }

    return () => {
      pulseTween?.kill();
    };
  }, [orbState, prefersReducedMotion, onRecedeComplete]);

  if (!isVisible && orbState === 'receding') {
    return null;
  }

  let displayText = '';
  if (orbState === 'awaiting') {
    displayText = 'The Asraya Oracle awaits. Your journey to connecting with your Higher self begins now. Select a Quest or "Begin Your Quest" to start';
  } else if (orbState === 'awakening' && questName) {
    displayText = `The Oracle stirs... Your Quest, '${questName}', has begun. Speak your first words to the Oracle.`;
  }

  return (
    <div
      className="flex flex-col items-center justify-center text-center p-8"
      data-testid="oracle-orb-container"
    >
      <div
        ref={orbRef}
        data-testid="oracle-orb"
        className={cn(
          'w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 grid place-items-center shadow-xl transition-all duration-500',
          orbState === 'awakening' ? 'animate-pulse-strong' : 'animate-pulse-gentle' // Example tailwind pulse
        )}
        style={{ filter: 'drop-shadow(0 0 15px rgba(124, 58, 237, 0.4))' }} // Initial shadow via style
      >
        {/* Placeholder for internal orb design/icon if needed */}
        <div className="w-1/2 h-1/2 bg-white/10 rounded-full backdrop-blur-sm"></div>
      </div>
      {displayText && (
        <p
          ref={textRef}
          id="oracle-prompt-text"
          className="mt-6 text-sm md:text-base text-[var(--text-muted)] max-w-md leading-relaxed"
        >
          {displayText}
        </p>
      )}
    </div>
  );
};

export const OracleOrb = memo(OracleOrbComponent);
OracleOrb.displayName = 'OracleOrb';