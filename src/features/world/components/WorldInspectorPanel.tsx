import React from 'react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/panels/Panel';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { PanelHeaderPlaceholder } from '@/components/panels/PanelHeaderPlaceholder';
import { PanelSkeleton } from '@/components/panels/PanelSkeleton';

interface WorldInspectorPanelProps {
  id: string;
  className?: string;
}

const WorldInspectorPanel = React.memo(({ 
  id, 
  className 
}: WorldInspectorPanelProps) => {
  const panelMeta = getPanelMeta('WorldInspectorPanel');
  
  return (
    <Panel 
      id={id} 
      className={cn('@container/world-inspector', className)} 
      data-testid="world-inspector-panel"
      data-command-key="world.inspector"
    >
      <PanelHeaderPlaceholder 
        title={panelMeta?.title || 'Inspector'} 
        iconName={panelMeta?.iconName}
        panelId={id} 
      />
      <PanelSkeleton skeletonType="form" itemCount={5} />
    </Panel>
  );
});

WorldInspectorPanel.displayName = 'WorldInspectorPanel';
export default WorldInspectorPanel;