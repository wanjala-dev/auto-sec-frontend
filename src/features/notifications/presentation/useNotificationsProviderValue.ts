import { useMemo } from 'react';

export const useNotificationsProviderValue = ({
  state,
  aiChannelsCatalog,
  refreshFeed,
  applyFilters,
  loadNextPage,
  markAsRead,
  markAllRead,
  refreshUnreadCount,
  loadPreferences,
  upsertSeedNotificationPreference,
  upsertAiNotificationPreference,
  toggleGlobalNotifications
}: {
  state: any;
  aiChannelsCatalog: any;
  refreshFeed: any;
  applyFilters: any;
  loadNextPage: any;
  markAsRead: any;
  markAllRead: any;
  refreshUnreadCount: any;
  loadPreferences: any;
  upsertSeedNotificationPreference: any;
  upsertAiNotificationPreference: any;
  toggleGlobalNotifications: any;
}) =>
  useMemo(
    () => ({
      ...state,
      aiChannelsCatalog,
      refresh: refreshFeed,
      applyFilters,
      loadNextPage,
      markAsRead,
      markAllRead,
      refreshUnreadCount: (params) => refreshUnreadCount(params),
      loadPreferences,
      upsertSeedNotificationPreference,
      upsertAiNotificationPreference,
      toggleGlobalNotifications
    }),
    [
      state,
      aiChannelsCatalog,
      refreshFeed,
      applyFilters,
      loadNextPage,
      markAsRead,
      markAllRead,
      refreshUnreadCount,
      loadPreferences,
      upsertSeedNotificationPreference,
      upsertAiNotificationPreference,
      toggleGlobalNotifications
    ]
  );
