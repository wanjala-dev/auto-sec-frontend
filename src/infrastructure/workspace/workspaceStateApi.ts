import apiClient from '../http/apiClient';

export const workspaceStateApi = {
  getOperations: (workspaceId: string | number) =>
    apiClient.get(`/workspaces/${workspaceId}/operations/`),

  updateOperations: (
    workspaceId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.put(`/workspaces/${workspaceId}/operations/`, payload),

  getPreferences: (workspaceId: string | number) =>
    apiClient.get(`/workspaces/${workspaceId}/preferences/`),

  updatePreferences: (
    workspaceId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/workspaces/${workspaceId}/preferences/`, payload),

  createPreferences: (payload: Record<string, unknown>) =>
    apiClient.post('/workspaces/preferences/', payload),

  getActions: (workspaceId: string | number) =>
    apiClient.get(`/workspaces/${workspaceId}/actions/`),

  createAction: (payload: Record<string, unknown>) =>
    apiClient.post('/workspaces/actions/', payload)
};
