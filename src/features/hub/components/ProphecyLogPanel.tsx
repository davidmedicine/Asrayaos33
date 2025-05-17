'use client';
import React from 'react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/panels/Panel';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { PanelHeaderPlaceholder } from '@/components/panels/PanelHeaderPlaceholder';
import { PanelSkeleton } from '@/components/panels/PanelSkeleton';

interface ProphecyLogPanelProps {
  id: string;
  className?: string;
}

const ProphecyLogPanel = React.memo(({ 
  id, 
  className 
}: ProphecyLogPanelProps) => {
  const panelMeta = getPanelMeta('ProphecyLogPanel');

  return (
    <Panel 
      id={id} 
      className={cn('@container/prophecy-log', className)} 
      data-testid="prophecy-log-panel"
      data-command-key="hub.prophecy"
    >
      <PanelHeaderPlaceholder 
        title={panelMeta?.title || 'Prophecy Log'} 
        iconName={panelMeta?.iconName}
        panelId={id} 
      />
      <PanelSkeleton skeletonType="list" itemCount={5} />
    </Panel>
  );
});

ProphecyLogPanel.displayName = 'ProphecyLogPanel';
export default ProphecyLogPanel;