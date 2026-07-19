import apiClient from '../http/apiClient';

export const userProfileApi = {
  getUserDetail: (userId: string | number, params?: Record<string, unknown>) =>
    apiClient.get(
      `/identity/detail/${userId}/`,
      params ? { params } : undefined
    ),

  getPublicUserProfile: (userId: string | number) =>
    apiClient.get(`/identity/users/${userId}/`),

  searchUsers: (query: string) =>
    apiClient.get('/identity/search/', { params: { query } }),

  getUserFollowers: (userId: string | number) =>
    apiClient.get(`/identity/profile/${userId}/followers/`),

  addUserFollower: (userId: string | number) =>
    apiClient.post(`/identity/profile/${userId}/followers/add`, {
      user_id: userId
    }),

  removeUserFollower: (userId: string | number) =>
    apiClient.post(`/identity/profile/${userId}/followers/remove`, {
      user_id: userId
    }),

  createTeam: (payload: Record<string, unknown>) =>
    apiClient.post('/team/', payload),

  // Edits an existing team's metadata (title, description) via
  // TeamAddByUuidView. Backend wraps the response as { status, data }.
  updateTeam: (teamId: string, payload: Record<string, unknown>) =>
    apiClient.patch(`/team/${teamId}/`, payload),

  getStore: (userId: string | number) => apiClient.get(`/store/${userId}/`),

  createStore: (payload: Record<string, unknown>) =>
    apiClient.post('/store/', payload),

  activateTeam: (teamId: string | number) =>
    apiClient.post('/team/activate/', { team_id: teamId }),

  // Single-call workspace activation — backend resolves the user's first
  // accessible team in the workspace and activates it atomically. Replaces
  // the legacy two-call dance (getTeamsBySeed + activateTeam) in the
  // sidebar's workspace switcher.
  activateWorkspace: (workspaceId: string | number) =>
    apiClient.post('/team/workspace/activate/', { workspace_id: workspaceId }),

  updateProfile: (
    profileId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/identity/profile/${profileId}/`, payload),

  editProfile: (profileId: string | number, payload: Record<string, unknown>) =>
    apiClient.patch(`/identity/edit/${profileId}/`, payload)
};
