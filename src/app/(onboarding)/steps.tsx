'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PanelGroup } from '@/components/panels/PanelGroup';
import { WorldTeleportOverlay } from '@/features/onboarding/components/WorldTeleportOverlay';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';

export default function OnboardingSteps() {
  const router = useRouter();
  
  const {
    currentStep,
    stepMeta,
    inputs,
    setInput,
    handleNextStep,
    handlePrevStep,
    isTeleporting,
    currentProgress,
    endTeleport
  } = useOnboardingFlow({ 
    onComplete: () => router.push('/dashboard') 
  });

  // Prepare panel props for OnboardingStepHost
  const panelProps = useMemo(() => ({
    currentStep,
    stepMeta,
    inputs,
    setInput,
    handleNextStep,
    handlePrevStep,
    currentProgress
  }), [
    currentStep,
    stepMeta,
    inputs,
    setInput,
    handleNextStep,
    handlePrevStep,
    currentProgress
  ]);

  // Create panels override for PanelGroup
  const panelsOverride = useMemo(() => [{
    id: 'onboarding-main',
    component: 'OnboardingStepHost',
    props: panelProps
  }], [panelProps]);

  return (
    <>
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-bg-muted overflow-hidden">
        <div
          className="h-full bg-[var(--agent-color-primary,theme(colors.indigo.500))] transition-all duration-300 ease-out"
          style={{ width: `${currentProgress || 0}%` }}
        />
      </div>

      {/* PanelGroup Container */}
      <div className="flex-1 w-full pt-1"> {/* Offset for progress bar */}
        <PanelGroup
          panelsOverride={panelsOverride}
          direction="horizontal"
          allowResize={false}
          initialFocusPanelId="onboarding-main"
          className="h-full w-full"
        />
      </div>

      {/* Teleport Animation Overlay */}
      <WorldTeleportOverlay 
        isActive={isTeleporting || false} 
        onComplete={endTeleport} 
      />
    </>
  );
}