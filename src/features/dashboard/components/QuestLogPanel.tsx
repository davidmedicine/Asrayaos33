import React from 'react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/panels/Panel';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { PanelHeaderPlaceholder } from '@/components/panels/PanelHeaderPlaceholder';
import { PanelSkeleton } from '@/components/panels/PanelSkeleton';

interface QuestLogPanelProps {
  id: string;
  className?: string;
}

const QuestLogPanel = React.memo(({ 
  id, 
  className 
}: QuestLogPanelProps) => {
  const panelMeta = getPanelMeta('QuestLogPanel');
  
  return (
    <Panel 
      id={id} 
      className={cn('@container/quest-log', className)} 
      data-testid="quest-log-panel"
      data-command-key="dashboard.quest-log"
    >
      <PanelHeaderPlaceholder 
        title={panelMeta?.title || 'Quest Log'} 
        iconName={panelMeta?.iconName}
        panelId={id} 
      />
      <PanelSkeleton skeletonType="list" itemCount={5} />
    </Panel>
  );
});

QuestLogPanel.displayName = 'QuestLogPanel';
export default QuestLogPanel;