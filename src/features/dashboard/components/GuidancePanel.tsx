import React from 'react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/panels/Panel';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { PanelHeaderPlaceholder } from '@/components/panels/PanelHeaderPlaceholder';
import { PanelSkeleton } from '@/components/panels/PanelSkeleton';

interface GuidancePanelProps {
  id: string;
  className?: string;
}

const GuidancePanel = React.memo(({ 
  id, 
  className 
}: GuidancePanelProps) => {
  const panelMeta = getPanelMeta('GuidancePanel');
  
  return (
    <Panel 
      id={id} 
      className={cn('@container/guidance', className)} 
      data-testid="guidance-panel"
      data-command-key="dashboard.guidance"
    >
      <PanelHeaderPlaceholder 
        title={panelMeta?.title || 'Guidance'} 
        iconName={panelMeta?.iconName}
        panelId={id} 
      />
      <PanelSkeleton skeletonType="cards" itemCount={3} />
    </Panel>
  );
});

GuidancePanel.displayName = 'GuidancePanel';
export default GuidancePanel;