import { fetchMyPermissions as rawFetchMyPermissions } from '../../../application/workspace/groupsService';

export type WorkspacePermissionKey =
  | 'manage_settings'
  | 'manage_billing'
  | 'manage_integrations'
  | 'manage_users'
  | 'manage_permissions'
  | 'view_budgets'
  | 'manage_budgets'
  | 'view_donations'
  | 'manage_donations'
  | 'view_campaigns'
  | 'manage_campaigns'
  | 'view_events'
  | 'manage_events'
  | 'view_grants'
  | 'manage_grants'
  | 'view_workflows'
  | 'manage_workflows'
  | 'view_marketplace'
  | 'manage_marketplace'
  | 'view_reports';

export interface WorkspacePermissionsSnapshot {
  isOwner: boolean;
  permissions: Set<WorkspacePermissionKey>;
}

const EMPTY_SNAPSHOT: WorkspacePermissionsSnapshot = {
  isOwner: false,
  permissions: new Set()
};

/**
 * Fetch the caller's effective capability set for a workspace.
 *
 * The backend unions three grant sources — role (via
 * WorkspaceMembership.workspace_role or the legacy-role fallback),
 * direct user grants, and group-mediated grants — so the set returned
 * here equals exactly what ``has_workspace_permission`` would allow on
 * the backend. Callers can do a straight `.has(key)` check without
 * reimplementing the resolution logic.
 *
 * Returns an empty snapshot (no permissions, is_owner=false) on any
 * error, including 401/403. Callers should treat "unknown" and "none"
 * identically — hide the button, don't fake access.
 */
export const fetchWorkspacePermissionsSnapshot = async (
  workspaceId: string
): Promise<WorkspacePermissionsSnapshot> => {
  if (!workspaceId) return EMPTY_SNAPSHOT;
  try {
    const data = await rawFetchMyPermissions(workspaceId);
    if (!data) return EMPTY_SNAPSHOT;
    const keys = Array.isArray(data.permissions) ? data.permissions : [];
    return {
      isOwner: Boolean(data.is_owner),
      permissions: new Set<WorkspacePermissionKey>(
        keys as WorkspacePermissionKey[]
      )
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
};

export const emptyWorkspacePermissionsSnapshot =
  (): WorkspacePermissionsSnapshot => ({
    ...EMPTY_SNAPSHOT,
    permissions: new Set()
  });
