import apiClient from '../../../infrastructure/http/apiClient';

/**
 * Workspace member + permission administration endpoints (Settings ▸ Workspace ▸
 * Members). These are the workspace-scoped admin routes — distinct from the
 * self-service `/membership/*` reads used elsewhere. The permission matrix edits
 * DIRECT grants via `/permissions/bulk`; role changes go through the dedicated
 * member-role route.
 */
export const membersAdminApi = {
  // Per-member role + effective permissions (role-inherited + direct + group).
  effectivePermissions: (workspaceId: string) =>
    apiClient.get(
      `/workspaces/${workspaceId}/members/effective-permissions/`
    ),

  // Change a member's workspace role. The endpoint keys on the WorkspaceRole
  // slug (owner/admin/member/viewer), NOT the legacy role string.
  updateMemberRole: (
    workspaceId: string,
    userId: string,
    role: string
  ) =>
    apiClient.patch(
      `/workspaces/${workspaceId}/members/${userId}/role/`,
      { role_slug: role }
    ),

  // Invite an operator to the WORKSPACE (not a team) with a role. Uses the
  // persona-invite endpoint — the only workspace-scoped invite primitive
  // (team_id optional). `auditor` is a team-detached persona; the RBAC `role`
  // is what actually governs access in the HUD.
  invite: (
    workspaceId: string,
    body: { email: string; role: string; persona?: string }
  ) =>
    apiClient.post('/membership/invitations/persona/', {
      workspace_id: workspaceId,
      email: body.email,
      role: body.role,
      persona: body.persona || 'auditor'
    }),

  // Grant/revoke a set of direct permission keys for one or more members.
  // Body: { action: 'grant'|'revoke', permission_keys[], user_ids[]?, group_ids[]? }
  bulkPermissions: (
    workspaceId: string,
    body: {
      action: 'grant' | 'revoke';
      permission_keys: string[];
      user_ids?: string[];
      group_ids?: string[];
    }
  ) => apiClient.post(`/workspaces/${workspaceId}/permissions/bulk/`, body)
};
