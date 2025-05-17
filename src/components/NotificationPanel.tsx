// === File: features/notifications/components/NotificationPanel.tsx ===
// Panel/dropdown for showing notification history with filtering (v10.6 spec)

import { useEffect, useState, useMemo } from 'react'; // Added useMemo
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '@/lib/state/slices/notificationSlice'; // ✅ CORRECTED HOOK IMPORT
import { NotificationItem } from './NotificationItem';
import { Notification } from '@/types/notification';
import { Button } from '@/components/ui/Button'; // Use Button primitive

interface NotificationPanelProps {
  onClose: () => void; // Callback to close the panel/popover
}

type FilterType = 'all' | 'unread' | 'favorites'; // Removed 'archived' as main filter, handled separately? Or keep it? Let's keep it for now.

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  // Local panel state for filtering
  const [activeFilter, setActiveFilter] = useState<FilterType>('unread'); // Default to unread

  // ✅ Use CORRECTED hook, selecting specific state pieces
  const notifications = useNotificationStore(state => state.notifications);
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const loadNotifications = useNotificationStore(state => state.loadNotifications);
  const markAllRead = useNotificationStore(state => state.markAllRead);
  const clearAllArchived = useNotificationStore(state => state.clearAllArchived);

  // Load notifications when panel opens (only once)
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]); // Dependency array is correct

  // Memoize filtered notifications based on local filter state and notifications from store
  const filteredNotifications = useMemo((): Notification[] => {
    switch (activeFilter) {
      case 'unread':
        return notifications.filter(n => !n.isRead && !n.isArchived);
      case 'favorites':
        return notifications.filter(n => n.isFavorite && !n.isArchived);
      case 'archived':
        return notifications.filter(n => n.isArchived);
      case 'all':
      default:
        return notifications.filter(n => !n.isArchived); // 'all' excludes archived by default
    }
  }, [activeFilter, notifications]); // Recalculate when filter or notifications change

  const hasArchived = useMemo(() => notifications.some(n => n.isArchived), [notifications]);

  // Filter tabs configuration
  const filters = [
    // { id: 'all', label: 'All' }, // Maybe 'All' just shows non-archived?
    { id: 'unread', label: `Unread ${unreadCount > 0 ? `(${unreadCount})` : ''}` }, // Dynamically show count
    { id: 'favorites', label: 'Favorites' },
    { id: 'archived', label: 'Archive' },
  ] as const;

  return (
    <motion.div
      // Popover animation (assuming used within a Radix Popover or similar)
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[calc(100vh-100px)] bg-bg-surface border border-border-default rounded-lg shadow-lg flex flex-col overflow-hidden z-popover" // Use z-index token
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border-default shrink-0">
        <h3 className="font-semibold text-base text-text-heading">Notifications</h3>
        <div className="flex items-center gap-1">
          {/* Mark all read only shown if unread count > 0 */}
          {unreadCount > 0 && (
            <Button
              variant="ghost" size="sm"
              onClick={() => markAllRead()}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
             {/* <Icon name="X" size={16}/> */} ✕
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-border-default shrink-0">
        {filters.map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`flex-1 py-2 px-1 text-center text-xs sm:text-sm font-medium transition-colors duration-150 ${
              activeFilter === filter.id
                ? 'text-text-accent border-b-2 border-agent-color-primary' // Use text-accent
                : 'text-text-muted hover:text-text-default hover:bg-bg-muted'
            }`}
            aria-current={activeFilter === filter.id ? 'page' : undefined}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="overflow-y-auto flex-1">
        {filteredNotifications.length > 0 ? (
          <motion.ul layout> {/* Use layout animation for list changes */}
            <AnimatePresence initial={false}>
              {filteredNotifications.map((notification) => (
                <motion.li
                  key={notification.id}
                  layout // Animate position changes
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <NotificationItem notification={notification} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        ) : (
          <div className="py-8 text-center text-sm text-text-muted">
             {/* Dynamically generate empty state message */}
             {`No ${activeFilter === 'unread' ? 'unread ' : activeFilter === 'favorites' ? 'favorite ' : activeFilter === 'archived' ? 'archived ' : ''}notifications`}
          </div>
        )}
      </div>

      {/* Panel footer for Archive */}
      {activeFilter === 'archived' && hasArchived && (
        <div className="p-3 border-t border-border-default text-right shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearAllArchived()}
            className="text-xs text-text-muted hover:text-[var(--color-error)]" // Use error color on hover
          >
            Clear Archive
          </Button>
        </div>
      )}
    </motion.div>
  );
}