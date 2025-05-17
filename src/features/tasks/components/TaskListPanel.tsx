import React from 'react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/panels/Panel';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { PanelHeaderPlaceholder } from '@/components/panels/PanelHeaderPlaceholder';
import { PanelSkeleton } from '@/components/panels/PanelSkeleton';

interface TaskListPanelProps {
  id: string;
  className?: string;
}

const TaskListPanel = React.memo(({ 
  id, 
  className 
}: TaskListPanelProps) => {
  const panelMeta = getPanelMeta('TaskListPanel');
  
  return (
    <Panel 
      id={id} 
      className={cn('@container/task-list', className)} 
      data-testid="task-list-panel"
      data-command-key="tasks.list"
    >
      <PanelHeaderPlaceholder 
        title={panelMeta?.title || 'Tasks'} 
        iconName={panelMeta?.iconName}
        panelId={id} 
      />
      <PanelSkeleton skeletonType="list" itemCount={7} />
    </Panel>
  );
});

TaskListPanel.displayName = 'TaskListPanel';
export default TaskListPanel;