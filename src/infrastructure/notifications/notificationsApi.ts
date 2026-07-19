import apiClient from '../http/apiClient';

export const notificationsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get('/notifications/', params ? { params } : undefined),

  listByUrl: (url: string) => apiClient.get(url),

  markRead: (notificationId: string | number) =>
    apiClient.post(`/notifications/${notificationId}/mark_read/`),

  markAllRead: (params?: Record<string, unknown>) =>
    apiClient.post(
      '/notifications/mark_all_read/',
      null,
      params ? { params } : undefined
    ),

  unreadCount: (params?: Record<string, unknown>) =>
    apiClient.get(
      '/notifications/unread_count/',
      params ? { params } : undefined
    ),

  listSeedPreferences: () =>
    apiClient.get('/notifications/preferences/workspaces/'),

  upsertSeedPreference: ({
    preferenceId,
    ...payload
  }: Record<string, unknown> & { preferenceId?: string | number }) => {
    if (preferenceId) {
      return apiClient.patch(
        `/notifications/preferences/workspaces/${preferenceId}/`,
        payload
      );
    }

    return apiClient.post('/notifications/preferences/workspaces/', payload);
  },

  listAiChannelPreferences: () =>
    apiClient.get('/notifications/preferences/ai/'),

  upsertAiChannelPreference: ({
    preferenceId,
    ...payload
  }: Record<string, unknown> & { preferenceId?: string | number }) => {
    if (preferenceId) {
      return apiClient.patch(
        `/notifications/preferences/ai/${preferenceId}/`,
        payload
      );
    }

    return apiClient.post('/notifications/preferences/ai/', payload);
  },

  getGlobalPreference: (userId: string | number) =>
    apiClient.get(`/userpreferences/${userId}/`),

  updateGlobalPreference: (
    userId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/userpreferences/${userId}/`, payload)
};
