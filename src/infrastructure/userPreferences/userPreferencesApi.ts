import apiClient from '../http/apiClient';

export const userPreferencesApi = {
  getByUserId: (userId: string | number) =>
    apiClient.get(`/userpreferences/${userId}/`),

  updateByUserId: (userId: string | number, payload: Record<string, unknown>) =>
    apiClient.patch(`/userpreferences/${userId}/`, payload)
};
