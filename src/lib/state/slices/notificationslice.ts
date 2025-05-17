// === File: lib/state/slices/notificationSlice.ts ===
// Zustand slice for notifications (v10.6 spec - Filtering logic removed)

import { StateCreator } from 'zustand';
import { Toast, Notification } from '@/types/notification';
// Import placeholder server actions (assuming they exist)
// import { saveNotificationAction, updateNotificationAction, markAllNotificationsReadAction, clearArchivedNotificationsAction, getNotificationsAction } from '@/server/actions/notificationActions';

// NOTE: The dedicated hook (useNotificationStore) is defined in store.ts

export interface NotificationSlice {
  // State
  toasts: Toast[];
  notifications: Notification[];
  unreadCount: number;
  isPanelOpen: boolean;
  isLoading: boolean; // Added loading state for async actions
  error: string | null; // Added error state

  // Actions
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'isArchived' | 'isFavorite'>) => Promise<void>; // Adjusted omit
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  toggleFavoriteNotification: (id: string) => Promise<void>;
  clearAllArchived: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  togglePanel: () => void;
}

export const createNotificationSlice: StateCreator<NotificationSlice> = (set, get) => ({
  // Initial state
  toasts: [],
  notifications: [],
  unreadCount: 0,
  isPanelOpen: false,
  isLoading: false, // Initialize loading
  error: null, // Initialize error

  // Actions
  addToast: (toastData) => {
    const id = `toast-${Date.now()}`;
    const toast: Toast = {
      id,
      ...toastData,
      duration: toastData.duration || 5000,
    };

    set(state => ({
      toasts: [...state.toasts, toast]
    }));

    // Auto-remove non-persistent toasts after duration
    if (!toast.isPersistent) {
      setTimeout(() => {
        get().removeToast(id);
      }, toast.duration);
    }

    // Optional: For persistent toasts, also create a notification
    // if (toast.isPersistent) {
    //   get().addNotification({
    //     message: toast.message,
    //     type: toast.type, // Map toast type to notification type/variant if needed
    //     variant: 'system_alert', // Or derive variant
    //   });
    // }
  },

  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },

  addNotification: async (notifData) => {
    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const newNotification: Notification = {
      id: tempId,
      timestamp: Date.now(),
      isRead: false,
      isArchived: false,
      isFavorite: false,
      ...notifData,
    };

    set(state => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1, // Increment unread
    }));

    try {
      // Call Server Action -> Drizzle to save notification
      // const savedNotification = await saveNotificationAction(notifData);
      // Replace temporary notification with saved one (requires action to return saved item with final ID)
      // if(savedNotification){
      //    set(state => ({ notifications: state.notifications.map(n => n.id === tempId ? savedNotification : n) }));
      // } else { throw new Error("Save failed"); }
    } catch (error) {
      console.error('Error saving notification:', error);
      // Revert optimistic update on error
      set(state => ({
        notifications: state.notifications.filter(n => n.id !== tempId),
        unreadCount: state.unreadCount > 0 ? state.unreadCount - 1 : 0, // Decrement if possible
      }));
      // Optionally set an error state: set({ error: 'Failed to save notification' });
    }
  },

  markAsRead: async (id) => {
    const notification = get().notifications.find(n => n.id === id);
    if (!notification || notification.isRead || notification.isArchived) return; // Don't update if already read or archived

    const originalState = notification.isRead;
    // Optimistic update
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1), // Ensure count doesn't go below 0
    }));

    try {
      // Call Server Action -> Drizzle
      // await updateNotificationAction(id, { isRead: true });
      await new Promise(res => setTimeout(res, 200)); // Simulate server call
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert on error
      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, isRead: originalState } : n // Revert to original read state
        ),
        unreadCount: state.unreadCount + 1, // Increment back
      }));
    }
  },

  markAllRead: async () => {
    const originalNotifications = get().notifications;
    const unreadIds = originalNotifications
       .filter(n => !n.isRead && !n.isArchived)
       .map(n => n.id);

    if (unreadIds.length === 0) return;

    // Optimistic update
    set(state => ({
      notifications: state.notifications.map(n =>
        unreadIds.includes(n.id) ? { ...n, isRead: true } : n
      ),
      unreadCount: 0,
    }));

    try {
      // Call Server Action -> Drizzle
      // await markAllNotificationsReadAction(unreadIds); // Pass IDs to update
      await new Promise(res => setTimeout(res, 300)); // Simulate
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Revert on error
      set({ notifications: originalNotifications, unreadCount: unreadIds.length });
    }
  },

  archiveNotification: async (id) => {
    const originalNotifications = get().notifications;
    const notification = originalNotifications.find(n => n.id === id);
    if (!notification || notification.isArchived) return; // Don't archive if already archived

    const wasUnread = !notification.isRead;

    // Optimistic update (Archive also marks as read)
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, isArchived: true, isRead: true } : n
      ),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }));

    try {
      // Call Server Action -> Drizzle
      // await updateNotificationAction(id, { isArchived: true, isRead: true });
      await new Promise(res => setTimeout(res, 200)); // Simulate
    } catch (error) {
      console.error('Error archiving notification:', error);
      // Revert on error by restoring the original notification object
      set({ notifications: originalNotifications, unreadCount: get().notifications.filter(n => !n.isRead && !n.isArchived).length });
    }
  },

  toggleFavoriteNotification: async (id) => {
    const originalNotifications = get().notifications;
    const notification = originalNotifications.find(n => n.id === id);
    if (!notification) return;

    const newValue = !notification.isFavorite;

    // Optimistic update
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, isFavorite: newValue } : n
      ),
    }));

    try {
      // Call Server Action -> Drizzle
      // await updateNotificationAction(id, { isFavorite: newValue });
      await new Promise(res => setTimeout(res, 200)); // Simulate
    } catch (error) {
      console.error('Error updating favorite status:', error);
      // Revert on error
      set({ notifications: originalNotifications });
    }
  },

  clearAllArchived: async () => {
    const originalNotifications = get().notifications;
    const archivedIds = originalNotifications
       .filter(n => n.isArchived)
       .map(n => n.id);

    if (archivedIds.length === 0) return;

    // Optimistic update
    set(state => ({
      notifications: state.notifications.filter(n => !n.isArchived),
    }));

    try {
      // Call Server Action -> Drizzle
      // await clearArchivedNotificationsAction(archivedIds);
      await new Promise(res => setTimeout(res, 300)); // Simulate
    } catch (error) {
      console.error('Error clearing archived notifications:', error);
      // Revert on error
      set({ notifications: originalNotifications });
    }
  },

  loadNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      // Call Server Action -> Drizzle
      // const fetchedNotifications = await getNotificationsAction(); // Fetch non-archived? Or all? Assume non-archived for now.
      // Simulate
      const fetchedNotifications: Notification[] = [/* ... mock data from previous version ... */];

      const unreadCount = fetchedNotifications.filter(n => !n.isRead && !n.isArchived).length;
      set({ notifications: fetchedNotifications, unreadCount, isLoading: false });
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      set({ error: error.message ?? 'Failed to load notifications', isLoading: false });
    }
  },

  togglePanel: () => {
    set(state => ({ isPanelOpen: !state.isPanelOpen }));
  },
});