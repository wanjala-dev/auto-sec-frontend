import { extractWorkspaceId as deriveSeedId } from '../../domain/workspace/workspaceId';
import { authSessionApi } from '../../infrastructure/auth/authSessionApi';
import {
  readAccessToken,
  readStoredUser,
  writeStoredUser,
  writeStoredUserSummary
} from '../../infrastructure/session/browserAuthStore';

export const fetchLoginUserSummary = async () => {
  const response = await authSessionApi.getUserSummary();
  return response?.data?.data ?? response?.data ?? null;
};

export interface ImpersonationSessionPayload {
  id: string;
  target_workspace_id: string;
  target_workspace_name: string;
  target_persona: string;
  target_role: string;
  reason: string;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
}

export const startImpersonationSession = async (payload: {
  workspace_id: string;
  persona: string;
  role: string;
  password?: string;
  reason?: string;
}): Promise<ImpersonationSessionPayload | null> => {
  const response = await authSessionApi.startImpersonationSession(payload);
  return (response?.data ?? null) as ImpersonationSessionPayload | null;
};

export const endImpersonationSession = async (sessionId: string) => {
  const response = await authSessionApi.endImpersonationSession(sessionId);
  return response?.data ?? null;
};

export const fetchActiveWorkspaceIdForUser = async (
  userId: string | number | null | undefined
) => {
  if (!userId) {
    return null;
  }

  const response = await authSessionApi.getUserProfile(userId);
  const payload = response?.data?.data ?? response?.data ?? null;

  if (!payload) {
    return null;
  }

  return deriveSeedId(payload) || deriveSeedId(payload?.profile) || null;
};

export const fetchResolvedActiveWorkspaceIdForUser = async (
  userId: string | number | null | undefined
) => {
  if (!userId) {
    return null;
  }

  const payloadCandidates = [];

  try {
    const profileResponse = await authSessionApi.getUserProfile(userId);
    payloadCandidates.push(
      profileResponse?.data?.data ?? profileResponse?.data
    );
  } catch (_) {}

  try {
    const detailResponse = await authSessionApi.getUserDetail(userId, {
      mode: 'summary'
    });
    payloadCandidates.push(detailResponse?.data?.data ?? detailResponse?.data);
  } catch (_) {}

  for (const payload of payloadCandidates) {
    const workspaceId =
      deriveSeedId(payload) ||
      deriveSeedId(payload?.profile) ||
      deriveSeedId(payload?.user) ||
      deriveSeedId(payload?.user?.profile);
    if (workspaceId) {
      return workspaceId;
    }
  }

  try {
    const workspacesResponse = await authSessionApi.getUserWorkspaces(userId);
    const workspaces =
      workspacesResponse?.data?.data ?? workspacesResponse?.data ?? [];

    if (Array.isArray(workspaces) && workspaces.length > 0) {
      const activeWorkspace =
        workspaces.find(
          (workspace: any) =>
            workspace?.is_active ||
            workspace?.active ||
            workspace?.is_default ||
            workspace?.default ||
            workspace?.is_default_seed
        ) || workspaces[0];

      return deriveSeedId(activeWorkspace);
    }
  } catch (_) {}

  return null;
};

export const refreshStoredWorkspaceContext = async () => {
  const accessToken = readAccessToken();
  if (!accessToken) return null;

  try {
    const summaryPayload = await fetchLoginUserSummary();

    if (summaryPayload) {
      writeStoredUserSummary(summaryPayload);
      window.dispatchEvent(
        new CustomEvent('user-summary-updated', {
          detail: { summary: summaryPayload }
        })
      );
    }

    const workspaceContext =
      summaryPayload?.workspace_context ||
      summaryPayload?.workspaceContext ||
      summaryPayload?.data?.workspace_context ||
      summaryPayload?.data?.workspaceContext ||
      null;

    const workspaces = Array.isArray(summaryPayload?.workspaces)
      ? summaryPayload.workspaces
      : Array.isArray(summaryPayload?.data?.workspaces)
      ? summaryPayload.data.workspaces
      : Array.isArray(workspaceContext?.workspaces)
      ? workspaceContext.workspaces
      : [];

    const availableWorkspaceIds = workspaces
      .map((workspace: any) => deriveSeedId(workspace))
      .filter(Boolean);

    let resolvedWorkspaceId =
      deriveSeedId(summaryPayload?.active_workspace) ||
      deriveSeedId(workspaceContext?.active_workspace) ||
      deriveSeedId(summaryPayload?.workspace) ||
      deriveSeedId(summaryPayload?.default_workspace) ||
      deriveSeedId(workspaces[0]) ||
      null;

    if (
      resolvedWorkspaceId &&
      availableWorkspaceIds.length &&
      !availableWorkspaceIds.includes(resolvedWorkspaceId)
    ) {
      resolvedWorkspaceId = availableWorkspaceIds[0] || null;
    }

    try {
      const parsed = readStoredUser<any>() || {};
      const nextUser = { ...(parsed || {}) };
      if (resolvedWorkspaceId) {
        nextUser.active_workspace_id = resolvedWorkspaceId;
        nextUser.active_seed_id = resolvedWorkspaceId;
      } else {
        delete nextUser.active_workspace_id;
        delete nextUser.active_seed_id;
      }
      writeStoredUser(nextUser);
    } catch (_) {}

    return resolvedWorkspaceId || null;
  } catch (_) {
    return null;
  }
};
