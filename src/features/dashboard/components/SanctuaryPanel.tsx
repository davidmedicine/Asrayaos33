import React from 'react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/panels/Panel';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { PanelHeaderPlaceholder } from '@/components/panels/PanelHeaderPlaceholder';
import { PanelSkeleton } from '@/components/panels/PanelSkeleton';

interface SanctuaryPanelProps {
  id: string;
  className?: string;
}

const SanctuaryPanel = React.memo(({ 
  id, 
  className 
}: SanctuaryPanelProps) => {
  const panelMeta = getPanelMeta('SanctuaryPanel');
  
  return (
    <Panel 
      id={id} 
      className={cn('@container/sanctuary', className)} 
      data-testid="sanctuary-panel"
      data-command-key="dashboard.sanctuary"
    >
      <PanelHeaderPlaceholder 
        title={panelMeta?.title || 'Sanctuary'} 
        iconName={panelMeta?.iconName}
        panelId={id} 
      />
      <PanelSkeleton />
    </Panel>
  );
});

SanctuaryPanel.displayName = 'SanctuaryPanel';
export default SanctuaryPanel;