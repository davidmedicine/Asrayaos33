import React from 'react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/panels/Panel';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { PanelHeaderPlaceholder } from '@/components/panels/PanelHeaderPlaceholder';
import { PanelSkeleton } from '@/components/panels/PanelSkeleton';

interface WorldCanvasPanelProps {
  id: string;
  className?: string;
}

const WorldCanvasPanel = React.memo(({ 
  id, 
  className 
}: WorldCanvasPanelProps) => {
  const panelMeta = getPanelMeta('WorldCanvasPanel');
  
  return (
    <Panel 
      id={id} 
      className={cn('@container/world-canvas', className)} 
      data-testid="world-canvas-panel"
      data-command-key="world.canvas"
    >
      <PanelHeaderPlaceholder 
        title={panelMeta?.title || 'World Canvas'} 
        iconName={panelMeta?.iconName}
        panelId={id} 
      />
      <div className="flex h-full w-full items-center justify-center bg-bg-muted/20">
        <div className="text-center">
          <div className="mb-4 text-4xl opacity-30">⊿</div>
          <div className="text-sm font-medium text-text-muted">3D World Canvas</div>
          <div className="mt-2 text-xs text-text-muted opacity-70">Coming in Brief 2</div>
        </div>
      </div>
    </Panel>
  );
});

WorldCanvasPanel.displayName = 'WorldCanvasPanel';
export default WorldCanvasPanel;