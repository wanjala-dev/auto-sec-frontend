import apiClient from '../../../infrastructure/http/apiClient';

export const teamApi = {
  createTeam: (payload: Record<string, unknown>) =>
    apiClient.post('/team/', payload),

  // Edits an existing team's metadata via TeamAddByUuidView
  // (/team/<uuid>/). Backend uses TeamSerializer(partial=True) so the
  // payload only needs to carry the fields actually changing.
  updateTeam: (teamId: string, payload: Record<string, unknown>) =>
    apiClient.patch(`/team/${teamId}/`, payload),

  listWorkspaceTeams: (workspaceId: string | number) =>
    apiClient.get(`/team/workspaces/${workspaceId}/teams/`),

  listMembers: (params?: Record<string, unknown>) =>
    apiClient.get('/membership/members/', params ? { params } : undefined),

  listInvitations: (params?: Record<string, unknown>) =>
    apiClient.get('/membership/invitations/', params ? { params } : undefined),

  invite: (payload: Record<string, unknown>) =>
    apiClient.post('/membership/invitations/', payload),

  acceptInvitation: (payload: Record<string, unknown>) =>
    apiClient.post('/membership/invitations/accept/', payload)
};
