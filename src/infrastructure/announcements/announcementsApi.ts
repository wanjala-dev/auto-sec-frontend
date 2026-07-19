import apiClient from '../http/apiClient';

export const announcementsApi = {
  listBanners: (params?: Record<string, unknown>) =>
    apiClient.get('/announcements/banners/', params ? { params } : undefined)
};
