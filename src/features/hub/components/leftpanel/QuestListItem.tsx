// src/features/hub/components/leftpanel/QuestListItem.tsx
'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { PinIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
export interface QuestForListItem {
  id: string;
  name: string;
  type: string;
  timestamp: number;
  lastMessagePreview: string;
  unreadCount: number;
  agentId: string | null;
  isGroup?: boolean;
  isSomeoneOnline?: boolean;
  metadata?: {
    pinned?: boolean;
  };
}

interface QuestListItemProps
  // ✨ remove nameId from the attributes we forward to the root div
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'nameId'> {
  quest: QuestForListItem;
  isActive: boolean;
  isPinned: boolean;
  isFirstFlameRitual?: boolean;
  /** ID for aria-labelling the quest name – NOT forwarded to DOM  */
  nameId?: string;
  onPin?: () => void;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
export const QuestListItem: React.FC<QuestListItemProps> = ({
  quest,
  isActive,
  isPinned,
  isFirstFlameRitual,
  nameId,
  onPin,
  className,
  ...rest /* all remaining, safe-to-forward HTML props */
}) => {
  return (
    <div
      className={cn(
        'flex items-center p-2 rounded-md cursor-pointer transition-colors duration-150 ease-in-out',
        'hover:bg-[var(--bg-hover)]',
        isActive && 'bg-[var(--bg-selected)]',
        className,
      )}
      role="button"
      tabIndex={0}
      aria-current={isActive ? 'page' : undefined}
      {...rest}
    >
      {/* ---------------- Left section ---------------- */}
      <div className="flex-1 min-w-0 mr-2">
        <div className="flex items-center justify-between">
          <p
            id={nameId}
            className="text-sm font-medium text-[var(--text-primary)] truncate"
          >
            {quest.name}
          </p>

          {/* First-Flame badge or pin icon */}
          {isFirstFlameRitual ? (
            <Badge
              variant="destructive"
              size="sm"
              className="ml-2 flex-shrink-0"
            >
              Ritual
            </Badge>
          ) : (
            isPinned && (
              <PinIcon className="w-3 h-3 text-[var(--text-muted)] ml-2 flex-shrink-0" />
            )
          )}
        </div>

        <p className="text-xs text-[var(--text-muted)] truncate">
          {quest.lastMessagePreview || 'No messages yet'}
        </p>
      </div>

      {/* ---------------- Right section: pin button ---------------- */}
      {onPin && !isFirstFlameRitual && (
        <button
          onClick={e => {
            e.stopPropagation();
            onPin();
          }}
          aria-label={isPinned ? `Unpin ${quest.name}` : `Pin ${quest.name}`}
          className="p-1 rounded hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] flex-shrink-0"
          title={isPinned ? 'Unpin quest' : 'Pin quest'}
        >
          <PinIcon
            className={cn(
              'w-4 h-4 transition-colors',
              isPinned
                ? 'text-[var(--accent-primary)]'
                : 'text-[var(--icon-muted)]',
            )}
          />
        </button>
      )}
      {/* Unread-count badge could be added here later */}
    </div>
  );
};

QuestListItem.displayName = 'QuestListItem';
