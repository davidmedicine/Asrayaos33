'use client';
import React from 'react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/panels/Panel';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { PanelHeaderPlaceholder } from '@/components/panels/PanelHeaderPlaceholder';
import { PanelSkeleton } from '@/components/panels/PanelSkeleton';

interface OracleChatPanelProps {
  id: string;
  className?: string;
}

const OracleChatPanel = React.memo(({ 
  id, 
  className 
}: OracleChatPanelProps) => {
  const panelMeta = getPanelMeta('OracleChatPanel');

  return (
    <Panel 
      id={id} 
      className={cn('@container/oracle-chat', className)} 
      data-testid="oracle-chat-panel"
      data-command-key="hub.oracle"
    >
      <PanelHeaderPlaceholder 
        title={panelMeta?.title || 'Oracle Chat'} 
        iconName={panelMeta?.iconName}
        panelId={id} 
      />
      <PanelSkeleton skeletonType="default" itemCount={4} />
    </Panel>
  );
});

OracleChatPanel.displayName = 'OracleChatPanel';
export default OracleChatPanel;