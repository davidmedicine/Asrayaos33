// File: src/features/chat/components/ActiveConversationPanel.types.d.ts
// (Generated as part of Prompt 2: Interface Contracts)

import type { PanelProps } from '@/components/panels/Panel';

/**
 * Props for the OracleOrb component.
 */
export interface OracleOrbProps {
  /** Current state of the orb to influence animation/appearance. */
  orbState: 'awaiting' | 'awakening' | 'receding';
  /** Optional quest name to display during the 'awakening' state. */
  questName?: string;
  /** Callback for when the orb's receding animation completes. */
  onRecedeComplete?: () => void;
}

/**
 * Props for the ActiveConversationPanel component.
 */
export interface ActiveConversationPanelProps
  extends Pick<PanelProps, 'id' | 'isActive' | 'alwaysVisible'> {
  /** Instance ID for the panel, often used for unique GSAP contexts or state. */
  instanceId: string;
  /** Optional CSS class names. */
  className?: string;
  /**
   * Panel title ID for ARIA. The panel itself will not display a visual title bar.
   * @example panelTitleId="active-conversation-chamber-heading" title=""
   */
  panelTitleId?: string;
  /** Indicates if the panel is rendered on a mobile device. */
  isMobile: boolean;
}