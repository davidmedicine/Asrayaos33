// === File: src/components/ui/QuestProgressMeter.tsx ===
// Description: Visual progress indicator for quests, calculable from milestones or explicit percentage.

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { QuestMilestone } from '@/types/quest'; // Import needed type

// --- Constants ---
const DEFAULT_SIZE = 'md';
const DEFAULT_SHOW_PERCENTAGE = true;

// --- Types ---
interface QuestProgressMeterProps {
  /** Optional array of milestones to calculate progress from (if progressPercent not provided). */
  milestones?: QuestMilestone[];
  /** Optional explicit progress percentage (0-100), overrides milestone calculation. */
  progressPercent?: number;
  /** Optional label displayed above the progress bar. */
  label?: string;
  /** Size of the progress bar. Defaults to 'md'. */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Whether to display the percentage value. Defaults to true. */
  showPercentage?: boolean;
  /** Optional CSS class name(s) to apply to the root element. */
  className?: string;
  /** Optional CSS color value (e.g., var(--color-success), #ff0000) to override the default progress bar color. */
  colorOverride?: string;
  /** Optional tooltip text or ReactNode to display on hover over the percentage. */
  tooltip?: string | React.ReactNode; // Use this prop instead of importing Tooltip here
}

// --- Component Implementation ---
// Corrected: Use export const, React.memo, and arrow function syntax
export const QuestProgressMeter = React.memo(({
  milestones,
  progressPercent,
  label,
  size = DEFAULT_SIZE,
  showPercentage = DEFAULT_SHOW_PERCENTAGE,
  className,
  colorOverride,
  tooltip,
}: QuestProgressMeterProps) => {

  // Corrected: Calculate percentage based on correct props using useMemo
  const percentage = useMemo(() => {
    let calculatedPercentage = 0;
    if (typeof progressPercent === 'number') {
      calculatedPercentage = progressPercent;
    } else if (milestones && milestones.length > 0) {
      const completedCount = milestones.filter(m => m.completed === true).length;
      calculatedPercentage = (completedCount / milestones.length) * 100;
    }
    return Math.max(0, Math.min(100, calculatedPercentage));
  }, [progressPercent, milestones]);

  // Size variants
  const sizeClasses: Record<NonNullable<QuestProgressMeterProps['size']>, string> = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const percentageText = `${Math.round(percentage)}%`;

  const percentageElement = (
    <span className="font-medium text-[var(--text-default)]">{percentageText}</span>
  );

  return (
    <div className={cn('w-full space-y-1', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          {label && <span className="truncate">{label}</span>}
          {showPercentage && (
            // Use title attribute for basic tooltip if tooltip prop provided
            <span title={typeof tooltip === 'string' ? tooltip : undefined}>
              {percentageElement}
              {/* Note: For complex ReactNode tooltips, a Tooltip component would be needed here */}
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full bg-[var(--bg-muted)] rounded-full overflow-hidden', // Corrected: Use --bg-muted
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${label} progress` : 'Progress'}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          // Corrected: Use colorOverride or agent-color-primary CSS variable
          style={{
            width: `${percentage}%`,
            backgroundColor: colorOverride || 'var(--agent-color-primary)',
          }}
        />
      </div>
      {/* TODO (Styling - Brief 3.X): Further refine progress bar appearance, add animations or gradients? */}
    </div>
  );
});

QuestProgressMeter.displayName = 'QuestProgressMeter';

// Ensure file ends with a newline