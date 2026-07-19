import apiClient from '../http/apiClient';

export const featureFlagsApi = {
  getEvaluatedFlags: (workspaceId: string | number) =>
    apiClient.get('/feature-flags/', {
      params: { workspace_id: workspaceId }
    }),

  getFlag: (key: string, workspaceId: string | number) =>
    apiClient.get(`/feature-flags/${encodeURIComponent(key)}/`, {
      params: { workspace_id: workspaceId }
    })
};
