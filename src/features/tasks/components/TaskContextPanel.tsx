import React from 'react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/panels/Panel';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { PanelHeaderPlaceholder } from '@/components/panels/PanelHeaderPlaceholder';
import { PanelSkeleton } from '@/components/panels/PanelSkeleton';

interface TaskContextPanelProps {
  id: string;
  className?: string;
}

const TaskContextPanel = React.memo(({ 
  id, 
  className 
}: TaskContextPanelProps) => {
  const panelMeta = getPanelMeta('TaskContextPanel');
  
  return (
    <Panel 
      id={id} 
      className={cn('@container/task-context', className)} 
      data-testid="task-context-panel"
      data-command-key="tasks.context"
    >
      <PanelHeaderPlaceholder 
        title={panelMeta?.title || 'Task Context'} 
        iconName={panelMeta?.iconName}
        panelId={id} 
      />
      <PanelSkeleton skeletonType="form" itemCount={3} />
    </Panel>
  );
});

TaskContextPanel.displayName = 'TaskContextPanel';
export default TaskContextPanel;