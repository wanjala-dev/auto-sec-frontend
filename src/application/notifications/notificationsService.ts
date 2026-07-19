import { notificationsApi } from '../../infrastructure/notifications/notificationsApi';

export const fetchNotifications = (params: Record<string, unknown> = {}) =>
  notificationsApi.list(params);

export const fetchNotificationsByUrl = (url: string) =>
  notificationsApi.listByUrl(url);

export const markNotificationAsRead = (notificationId: string | number) =>
  notificationsApi.markRead(notificationId);

export const markAllNotificationsAsRead = (
  params: Record<string, unknown> = {}
) => notificationsApi.markAllRead(params);

export const fetchUnreadNotificationsCount = (
  params: Record<string, unknown> = {}
) => notificationsApi.unreadCount(params);

export const fetchSeedPreferences = () =>
  notificationsApi.listSeedPreferences();

export const upsertSeedPreference = (
  payload: Record<string, unknown> & { preferenceId?: string | number }
) => notificationsApi.upsertSeedPreference(payload);

export const fetchAiChannelPreferences = () =>
  notificationsApi.listAiChannelPreferences();

export const upsertAiChannelPreference = (
  payload: Record<string, unknown> & { preferenceId?: string | number }
) => notificationsApi.upsertAiChannelPreference(payload);

export const fetchGlobalNotificationsPreference = (userId: string | number) =>
  notificationsApi.getGlobalPreference(userId);

export const updateGlobalNotificationsPreference = (
  userId: string | number,
  payload: Record<string, unknown>
) => notificationsApi.updateGlobalPreference(userId, payload);
