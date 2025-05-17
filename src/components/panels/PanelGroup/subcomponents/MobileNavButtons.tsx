'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface MobileNavButtonsProps {
  onPrev: () => void;
  onNext: () => void;
  panelCount: number;
  currentPanelIndex: number;
}

export const MobileNavButtons = memo(({ 
  onPrev, 
  onNext, 
  panelCount, 
  currentPanelIndex 
}: MobileNavButtonsProps) => {
  if (panelCount <= 1) return null;

  return (
    <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 transform gap-2 rounded-full bg-black/50 p-1 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        aria-label={`Previous Panel (${((currentPanelIndex - 1 + panelCount) % panelCount) + 1} of ${panelCount})`}
        className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </Button>
      <div className="flex items-center justify-center px-2 text-xs font-medium text-white">
        {currentPanelIndex + 1} / {panelCount}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        aria-label={`Next Panel (${((currentPanelIndex + 1) % panelCount) + 1} of ${panelCount})`}
        className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </Button>
    </div>
  );
});

MobileNavButtons.displayName = 'MobileNavButtons';
export default MobileNavButtons;