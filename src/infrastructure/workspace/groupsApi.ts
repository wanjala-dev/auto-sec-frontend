import apiClient from '../http/apiClient';

export const groupsApi = {
  // Groups
  listGroups: (workspaceId: string) =>
    apiClient.get(`/workspaces/${workspaceId}/groups/`),

  createGroup: (
    workspaceId: string,
    payload: { name: string; description?: string }
  ) => apiClient.post(`/workspaces/${workspaceId}/groups/`, payload),

  getGroup: (workspaceId: string, groupId: string) =>
    apiClient.get(`/workspaces/${workspaceId}/groups/${groupId}/`),

  updateGroup: (
    workspaceId: string,
    groupId: string,
    payload: Record<string, unknown>
  ) =>
    apiClient.patch(`/workspaces/${workspaceId}/groups/${groupId}/`, payload),

  deleteGroup: (workspaceId: string, groupId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/groups/${groupId}/`),

  addMembers: (workspaceId: string, groupId: string, userIds: string[]) =>
    apiClient.post(`/workspaces/${workspaceId}/groups/${groupId}/members/`, {
      user_ids: userIds
    }),

  removeMember: (workspaceId: string, groupId: string, userId: string) =>
    apiClient.delete(
      `/workspaces/${workspaceId}/groups/${groupId}/members/${userId}/`
    ),

  // Permissions
  listPermissions: (workspaceId: string) =>
    apiClient.get(`/workspaces/${workspaceId}/permissions/`),

  grantPermission: (workspaceId: string, payload: Record<string, unknown>) =>
    apiClient.post(`/workspaces/${workspaceId}/permissions/`, payload),

  revokePermission: (workspaceId: string, grantId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/permissions/${grantId}/`),

  bulkPermissions: (workspaceId: string, payload: Record<string, unknown>) =>
    apiClient.post(`/workspaces/${workspaceId}/permissions/bulk/`, payload),

  myPermissions: (workspaceId: string) =>
    apiClient.get(`/workspaces/${workspaceId}/permissions/my/`),

  // Matrix-specific: effective permissions per member (role + grants
  // surfaced separately so the UI can render role-derived cells as
  // locked "via role" and keep toggles on the override layer only).
  membersEffectivePermissions: (workspaceId: string) =>
    apiClient.get(`/workspaces/${workspaceId}/members/effective-permissions/`),

  // Assign a system or workspace-custom role to a member.
  setMemberRole: (workspaceId: string, userId: string, roleSlug: string) =>
    apiClient.patch(`/workspaces/${workspaceId}/members/${userId}/role/`, {
      role_slug: roleSlug
    })
};
