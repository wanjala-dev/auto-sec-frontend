import type { AxiosError, AxiosRequestConfig } from 'axios';

export interface WorkspaceRecord {
  id?: string | number;
  pk?: string | number;
  workspace_id?: string | number;
  uuid?: string | number;
  /**
   * Distinguishes invited members from followers. Backend annotates
   * each workspace in the user summary based on whether the user is
   * the owner, a team member, has an active ``WorkspaceMembership``,
   * or just follows the workspace. Frontend redirects ``follower``
   * navigations away from the dashboard to the workspace profile.
   */
  relationship?: 'member' | 'follower';
}

export interface WorkspaceContextRecord {
  active_workspace_id?: string | number;
  workspaces?: WorkspaceRecord[];
}

export interface UserSummaryRecord {
  workspace_context?: WorkspaceContextRecord;
  workspaceContext?: WorkspaceContextRecord;
  workspaces?: WorkspaceRecord[];
  data?: {
    workspace_context?: WorkspaceContextRecord;
    workspaceContext?: WorkspaceContextRecord;
    workspaces?: WorkspaceRecord[];
  };
}

export interface StoredUserRecord {
  active_workspace_id?: string | number;
  default_workspace_id?: string | number;
  active_workspace?: string | number;
  active_seed_id?: string | number;
  default_seed_id?: string | number;
}

export type ApiRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
};

export type ApiError = AxiosError & {
  config?: ApiRequestConfig;
};
