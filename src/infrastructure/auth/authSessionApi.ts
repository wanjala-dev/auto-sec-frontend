import apiClient from '../http/apiClient';

export const authSessionApi = {
  getUserSummary: () => apiClient.get('/identity/me/summary/'),

  listImpersonationSessions: () =>
    apiClient.get('/identity/me/impersonation-sessions/'),

  startImpersonationSession: (payload: {
    workspace_id: string;
    persona: string;
    role: string;
    password?: string;
    reason?: string;
  }) => apiClient.post('/identity/me/impersonation-sessions/', payload),

  endImpersonationSession: (sessionId: string) =>
    apiClient.delete(`/identity/me/impersonation-sessions/${sessionId}/`),

  getUserProfile: (userId: string | number) =>
    apiClient.get(`/identity/users/${userId}/`),

  getUserDetail: (userId: string | number, params?: Record<string, unknown>) =>
    apiClient.get(
      `/identity/detail/${userId}/`,
      params ? { params } : undefined
    ),

  getUserWorkspaces: (userId: string | number) =>
    apiClient.get(`/identity/workspaces/${userId}/`)
};
