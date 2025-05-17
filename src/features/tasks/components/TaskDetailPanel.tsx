import React from 'react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/panels/Panel';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { PanelHeaderPlaceholder } from '@/components/panels/PanelHeaderPlaceholder';
import { PanelSkeleton } from '@/components/panels/PanelSkeleton';

interface TaskDetailPanelProps {
  id: string;
  className?: string;
}

const TaskDetailPanel = React.memo(({ 
  id, 
  className 
}: TaskDetailPanelProps) => {
  const panelMeta = getPanelMeta('TaskDetailPanel');
  
  return (
    <Panel 
      id={id} 
      className={cn('@container/task-detail', className)} 
      data-testid="task-detail-panel"
      data-command-key="tasks.detail"
    >
      <PanelHeaderPlaceholder 
        title={panelMeta?.title || 'Task Details'} 
        iconName={panelMeta?.iconName}
        panelId={id} 
      />
      <PanelSkeleton skeletonType="default" itemCount={4} />
    </Panel>
  );
});

TaskDetailPanel.displayName = 'TaskDetailPanel';
export default TaskDetailPanel;