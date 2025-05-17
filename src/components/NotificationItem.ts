// === File: features/notifications/components/NotificationItem.tsx ===
// Individual notification item with actions and badges (v10.6 spec)

import { useState } from 'react';
import { useNotificationStore } from '@/lib/state/slices/notificationSlice'; // ✅ CORRECTED HOOK IMPORT
import { Notification } from '@/types/notification';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button'; // Use Button primitive
import Link from 'next/link'; // For context link
// import { formatDistanceToNowStrict } from 'date-fns'; // Preferred for relative time

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false); // Controls action visibility

  // ✅ Use CORRECTED hook, selecting specific actions needed
  const markAsRead = useNotificationStore(state => state.markAsRead);
  const archiveNotification = useNotificationStore(state => state.archiveNotification);
  const toggleFavoriteNotification = useNotificationStore(state => state.toggleFavoriteNotification);

  // Handle notification click - mark read, navigate (if link present), or toggle expansion
  const handleClick = () => {
    if (!notification.isRead && !notification.isArchived) { // Don't mark archived as read again
      markAsRead(notification.id);
    }

    // Simple toggle for now, could navigate directly if contextLink exists and not expanded
    setIsExpanded(!isExpanded);

    // Navigation logic (example - needs integration with router/context)
    // if (notification.contextLink && !isExpanded) {
    //   const [type, id] = notification.contextLink.split(':'); // Assuming format type:id
    //   // Example navigation
    //   if (type === 'memory') router.push(`/memory/${id}`);
    //   if (type === 'chat') router.push(`/chat/${id}`);
    // }
  };

  // Format relative time (replace with date-fns ideally)
  const formatRelativeTime = (timestamp: number): string => {
     // ... (implementation from previous version) ...
     return 'Just now'; // Placeholder
  };

  // Render badge based on notification.variant
  const renderVariantBadge = () => { /* ... (switch statement as before) ... */ };

  // Render badge/info for the actor (agent/system/user)
  const renderActorInfo = () => {
    if (!notification.actor) return null;
    const colorVar = notification.actor.type === 'agent' ? 'var(--agent-color-primary)' : 'var(--color-info)'; // Example color logic
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <span style={{ backgroundColor: colorVar }} className="h-1.5 w-1.5 rounded-full block" />
        <span>{notification.actor.name ?? notification.actor.type}</span>
      </div>
    );
  };

  return (
    <div
      className={`block px-3 py-2.5 border-b border-border-default transition-colors duration-150 cursor-pointer group ${ // Added group for hover actions
        notification.isRead
          ? 'bg-bg-surface hover:bg-bg-muted'
          : 'bg-bg-muted hover:bg-[color-mix(in_oklch,var(--bg-muted)_95%,_black)]' // Slightly darker hover for unread
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()} // Basic keyboard accessibility
    >
      <div className="flex items-start gap-2.5"> {/* Increased gap */}
        {/* Unread indicator */}
        <div className="flex-shrink-0 pt-1">
            {!notification.isRead && (
                <span className="h-1.5 w-1.5 rounded-full bg-agent-color-primary block" title="Unread"/>
            )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Top Row: Message + Timestamp */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`text-sm leading-snug ${notification.isRead ? 'text-text-default' : 'font-medium text-text-heading'}`}>
              {notification.message}
            </p>
            <span className="text-xs text-text-muted flex-shrink-0 pt-px">{formatRelativeTime(notification.timestamp)}</span>
          </div>

          {/* Bottom Row: Badges + Actions */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-1">
             <div className="flex flex-wrap items-center gap-2">
                {renderActorInfo()}
                {renderVariantBadge()}
                {notification.isFavorite && <Badge variant="outline" className="text-xs !py-0 !px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400">★</Badge>}
             </div>

             {/* Actions: Show on hover/focus within group */}
             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
                <Tooltip content={notification.isFavorite ? 'Unfavorite' : 'Favorite'}>
                   <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 text-text-muted hover:text-amber-500"
                      onClick={(e) => { e.stopPropagation(); toggleFavoriteNotification(notification.id); }}
                   >
                      {/* <Icon name="Star" size={14} fill={notification.isFavorite ? 'currentColor' : 'none'} /> */} ★
                   </Button>
                </Tooltip>
                {!notification.isArchived && (
                   <Tooltip content="Archive">
                      <Button
                         variant="ghost" size="icon"
                         className="h-6 w-6 text-text-muted hover:text-text-default"
                         onClick={(e) => { e.stopPropagation(); archiveNotification(notification.id); }}
                      >
                        {/* <Icon name="Archive" size={14} /> */} A
                      </Button>
                   </Tooltip>
                )}
                 {/* Add Link button if contextLink exists */}
                 {notification.contextLink && (
                    <Tooltip content="Go to Context">
                        <Link href={`/${notification.contextLink.replace(':', '/')}`} onClick={(e) => e.stopPropagation()}>
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-text-muted hover:text-text-default">
                              {/* <Icon name="Link" size={14} /> */} L
                           </Button>
                        </Link>
                    </Tooltip>
                 )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}