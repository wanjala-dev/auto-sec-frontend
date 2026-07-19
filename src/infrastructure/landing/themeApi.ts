import apiClient from '../http/apiClient';

export const themeApi = {
  getTenantTheme: (tenant: string, signal?: AbortSignal) =>
    apiClient.get(`/landing/theme/${tenant}/`, { signal })
};
