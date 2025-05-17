'use client';
import React from 'react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/panels/Panel';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { PanelHeaderPlaceholder } from '@/components/panels/PanelHeaderPlaceholder';
import { PanelSkeleton } from '@/components/panels/PanelSkeleton';

interface QuickActionWheelProps {
  id: string;
  className?: string;
}

const QuickActionWheel = React.memo(({ 
  id, 
  className 
}: QuickActionWheelProps) => {
  const panelMeta = getPanelMeta('QuickActionWheel');

  return (
    <Panel 
      id={id} 
      className={cn('@container/quick-action', className)} 
      data-testid="quick-action-wheel"
      data-command-key="hub.actions"
    >
      <PanelHeaderPlaceholder 
        title={panelMeta?.title || 'Quick Actions'} 
        iconName={panelMeta?.iconName}
        panelId={id} 
      />
      <PanelSkeleton skeletonType="grid" itemCount={4} />
    </Panel>
  );
});

QuickActionWheel.displayName = 'QuickActionWheel';
export default QuickActionWheel;