import React from 'react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/panels/Panel';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { PanelHeaderPlaceholder } from '@/components/panels/PanelHeaderPlaceholder';
import { PanelSkeleton } from '@/components/panels/PanelSkeleton';

interface WorldAssetPanelProps {
id: string;
className?: string;
}

const WorldAssetPanel = React.memo(({ 
id, 
className 
}: WorldAssetPanelProps) => {
const panelMeta = getPanelMeta('WorldAssetPanel');

return (
  <Panel 
    id={id} 
    className={cn('@container/world-asset', className)} 
    data-testid="world-asset-panel"
    data-command-key="world.assets"
  >
    <PanelHeaderPlaceholder 
      title={panelMeta?.title || 'Assets'} 
      iconName={panelMeta?.iconName}
      panelId={id} 
    />
    <PanelSkeleton skeletonType="grid" itemCount={6} />
  </Panel>
);
});

WorldAssetPanel.displayName = 'WorldAssetPanel';
export default WorldAssetPanel;