import apiClient from '../http/apiClient';

export const commentsApi = {
  getWorkspaceComments: (workspaceId: string | number) =>
    apiClient.get(`/workspaces/${workspaceId}/comment/`),

  getLegacySeedComments: (workspaceId: string | number) =>
    apiClient.get(`/workspaces/${workspaceId}/comment/`),

  createWorkspaceComment: (payload: Record<string, unknown>) =>
    apiClient.post('/workspaces/comment/create/', payload)
};
