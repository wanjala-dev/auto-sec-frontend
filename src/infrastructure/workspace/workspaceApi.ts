import apiClient from '../http/apiClient';

export const workspaceApi = {
  list: () => apiClient.get('/workspaces/'),

  getDetail: (workspaceId: string | number) =>
    apiClient.get(`/workspaces/${workspaceId}/`),

  getTheme: (workspaceId: string | number) =>
    apiClient.get(`/workspaces/${workspaceId}/theme/`),

  updateTheme: (
    workspaceId: string | number,
    payload: {
      brand_seed?: string;
      secondary_seed?: string;
      logo_url?: string;
      mode?: string;
      logo_icon_url?: string;
      logo_dark_url?: string;
      favicon_url?: string;
      font_heading?: string;
      font_body?: string;
      voice_tone?: string;
      voice_guidelines?: string;
    }
  ) => apiClient.put(`/workspaces/${workspaceId}/theme/`, payload),

  // Curated platform font catalog (seeded backend-side; never hardcode fonts).
  getFontCatalog: () => apiClient.get('/workspaces/brand-fonts/'),

  create: (payload: Record<string, unknown>) =>
    apiClient.post('/workspaces/create/', payload),

  addContributor: (
    workspaceId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.post(`/workspaces/${workspaceId}/add-contributor/`, payload),

  update: (workspaceId: string | number, payload: Record<string, unknown>) =>
    apiClient.patch(`/workspaces/${workspaceId}/`, payload),

  getSetupStatus: (
    workspaceId: string | number,
    params?: Record<string, unknown>
  ) =>
    apiClient.get(`/workspaces/${workspaceId}/setup-status/`, {
      params
    }),

  followWorkspace: (workspaceId: string | number) =>
    apiClient.post(`/workspaces/${workspaceId}/follow/`, {}),

  unfollowWorkspace: (workspaceId: string | number) =>
    apiClient.delete(`/workspaces/${workspaceId}/follow/`),

  followWorkspaces: (workspaceIds: Array<string | number>) =>
    apiClient.post('/workspaces/follow/', { workspace_ids: workspaceIds }),

  unfollowWorkspaces: (workspaceIds: Array<string | number>) =>
    apiClient.delete('/workspaces/follow/', {
      data: { workspace_ids: workspaceIds }
    }),

  listCommunicationChannels: (workspaceId: string | number) =>
    apiClient.get(`/sponsorship/communications/teams/${workspaceId}/channels/`)
};
