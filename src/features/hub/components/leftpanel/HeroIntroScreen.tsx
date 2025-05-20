// src/features/hub/components/leftpanel/HeroIntroScreen.tsx
'use client';                           // 👈 App-Router component

import React, {
  memo, useCallback, useLayoutEffect, useRef,
} from 'react';
import { useRouter } from 'next/navigation';  // 👈 modern hook
import { gsap, CustomEase } from '@/lib/gsapSetup';
import { Button }   from '@/components/ui/Button';
import { Spinner }  from '@/components/ui/Spinner';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { useMediaQuery } from '@/hooks/useMediaQuery';

import type { Quest } from './useUnifiedChatPanelData';
import {
  RUNE_GLOW_EASE,
  UIPanelPhase,
  AppRoutes,
} from './unifiedChatListPanelConstants';


// ---------------------------------------------------------------------------
// One-time GSAP ease registration
// ---------------------------------------------------------------------------
if (!CustomEase.get('runeGlow')) {
  CustomEase.create('runeGlow', RUNE_GLOW_EASE);
}


// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  uiPhase: UIPanelPhase;
  isLoadingInitial: boolean;
  errorDisplay: { message: string; code?: any } | null;
  firstFlameQuest?: Quest;

  /* callbacks supplied by orchestrator */
  onSelectFirstFlame: () => void;
  bootstrapFirstFlame: () => void;
  onRetryLoad: () => void;

  /* misc state */
  heroButtonRef: React.RefObject<HTMLButtonElement>;
  isInitialLoadComplete: boolean;
  questsAvailable: boolean;
}


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const HeroIntroScreenComp: React.FC<Props> = (props) => {
  const {
    uiPhase,
    isLoadingInitial,
    errorDisplay,
    firstFlameQuest,
    onSelectFirstFlame,
    bootstrapFirstFlame,
    onRetryLoad,
    heroButtonRef,
    isInitialLoadComplete,
    questsAvailable,
  } = props;

  const safeFirstFlameQuest = firstFlameQuest ?? null;

  const router         = useRouter();
  const containerRef   = useRef<HTMLDivElement>(null);
  const prefersReduced = useMediaQuery('(prefers-reduced-motion: reduce)');


  // ---------------------------------------------------
  // Hover / focus glow on the primary CTA
  // ---------------------------------------------------
  useLayoutEffect(() => {
    if (prefersReduced || !heroButtonRef.current) return;

    const tl = gsap.timeline({ paused: true }).to(heroButtonRef.current, {
      scale: 1.08,
      boxShadow: '0 0 15px rgba(var(--color-primary-rgb), .5)',
      duration: 0.4,
      ease: 'runeGlow',
    });

    const enter = () => tl.play();
    const leave = () => tl.reverse();

    const btn = heroButtonRef.current;
    btn.addEventListener('mouseenter', enter);
    btn.addEventListener('mouseleave', leave);
    btn.addEventListener('focus', enter);
    btn.addEventListener('blur',  leave);

    return () => {
      btn.removeEventListener('mouseenter', enter);
      btn.removeEventListener('mouseleave', leave);
      btn.removeEventListener('focus', enter);
      btn.removeEventListener('blur',  leave);
      tl.revert();
      tl.kill();
    };
  }, [prefersReduced, heroButtonRef]);


  // ---------------------------------------------------
  // Button handlers
  // ---------------------------------------------------
  const handleBeginExisting = useCallback(() => {
    bootstrapFirstFlame();
    onSelectFirstFlame();
  }, [bootstrapFirstFlame, onSelectFirstFlame]);

  const handleBeginOnboarding = useCallback(() => {
    bootstrapFirstFlame();
    router.push(AppRoutes.RitualDayOne);   // ✅ navigation hook works now
  }, [bootstrapFirstFlame, router]);


  // ---------------------------------------------------
  // Render helpers
  // ---------------------------------------------------
  const renderInner = () => {
    // ––– fatal error –––
    if (uiPhase === UIPanelPhase.ERROR && errorDisplay) {
      return (
        <ErrorDisplay
          title="Error"
          message={errorDisplay.message}
          action={<Button onClick={onRetryLoad}>Retry</Button>}
        />
      );
    }

    // ––– initial spinner –––
    if (isLoadingInitial) {
      return (
        <div className="flex flex-col items-center space-y-2" aria-busy>
          <Spinner size="large" />
          <p className="text-muted-foreground">Preparing your journey…</p>
        </div>
      );
    }

    // ––– zero-quest onboarding –––
    if (isInitialLoadComplete && !questsAvailable) {
      return (
        <>
          <h3 className="text-xl font-semibold">Begin your legend</h3>
          <p className="text-muted-foreground">
            Forge your path by lighting the First Flame.
          </p>
          <Button ref={heroButtonRef} size="lg" onClick={handleBeginOnboarding}>
            Begin ritual
          </Button>
        </>
      );
    }

    // ––– at least one quest exists –––
    if (isInitialLoadComplete && questsAvailable && safeFirstFlameQuest) {
      return (
        <>
          <h3 className="text-xl font-semibold">Your path awaits</h3>
          <p className="text-muted-foreground">
            Continue your adventure or embark on the First Flame.
          </p>
          <Button ref={heroButtonRef} size="lg" onClick={handleBeginExisting}>
            {safeFirstFlameQuest.name ?? 'Begin First Flame'}
          </Button>
        </>
      );
    }

    // ––– fallback (shouldn’t occur) –––
    return null;
  };


  // ---------------------------------------------------
  // JSX
  // ---------------------------------------------------
  return (
    <div
      ref={containerRef}
      className="h-full grid place-items-center p-6 text-center"
    >
      {renderInner()}
    </div>
  );
};

export const HeroIntroScreen = memo(HeroIntroScreenComp);
