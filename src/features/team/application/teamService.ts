import {
  emptyPaginatedCollection,
  extractCollectionResults,
  normalizePaginatedCollection,
  normalizeWorkspaceScopedParams
} from '../domain/teamCollections';
import { teamApi } from '../infrastructure/teamApi';

export const listTeamMembers = async (
  workspaceId: string | number | null | undefined,
  params: Record<string, any> = {}
) => {
  const normalizedParams = normalizeWorkspaceScopedParams(workspaceId, params);

  if (!normalizedParams.workspace_id) {
    return emptyPaginatedCollection();
  }

  const response = await teamApi.listMembers(normalizedParams);
  return normalizePaginatedCollection(response?.data);
};

export const listTeamInvitations = async (
  workspaceId: string | number | null | undefined,
  params: Record<string, any> = {}
) => {
  const normalizedParams = normalizeWorkspaceScopedParams(workspaceId, params);

  if (!normalizedParams.workspace_id) {
    throw new Error('listTeamInvitations requires a workspaceId');
  }

  const response = await teamApi.listInvitations(normalizedParams);
  return normalizePaginatedCollection(response?.data);
};

export const inviteTeamMembers = async (
  payload: Record<string, unknown> = {}
) => {
  const response = await teamApi.invite(payload);
  return response?.data;
};

export const acceptTeamInvitation = async (
  payload: Record<string, unknown> = {}
) => {
  const response = await teamApi.acceptInvitation(payload);
  return response;
};

export const acceptTeamInvitationCode = async (code: string) => {
  const normalizedCode =
    typeof code === 'string' ? code.trim() : String(code || '').trim();

  if (!normalizedCode) {
    throw new Error('Invite code is required.');
  }

  return acceptTeamInvitation({ code: normalizedCode });
};

export const listWorkspaceTeams = async (
  workspaceId: string | number | null | undefined
) => {
  if (!workspaceId) {
    return [];
  }

  try {
    const response = await teamApi.listWorkspaceTeams(workspaceId);
    return extractCollectionResults(response?.data);
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

export const createWorkspaceTeam = async (
  payload: Record<string, unknown> = {}
) => {
  const response = await teamApi.createTeam(payload);
  return response?.data ?? null;
};

// Edits an existing team. Backend wraps the response as { status, data }
// for the patch path; unwrap so callers see the same Team shape as
// createWorkspaceTeam returns.
export const updateWorkspaceTeam = async (
  teamId: string,
  payload: Record<string, unknown>
) => {
  const response = await teamApi.updateTeam(teamId, payload);
  const body = response?.data;
  return body?.data ?? body ?? null;
};
