import { isValidUUID } from '../../shared/validation/uuidValidation';

export type WorkspaceIdentifier = string | number | null | undefined;

export const normalizeWorkspaceId = (
  value: WorkspaceIdentifier
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const normalized = trimmed.toLowerCase();
    if (
      normalized === 'undefined' ||
      normalized === 'null' ||
      normalized === 'nan'
    ) {
      return null;
    }

    // Workspace IDs are UUIDs. Reject non-UUID strings (e.g. store
    // IDs like "1") that would cause API errors downstream.
    if (!isValidUUID(normalized)) {
      return null;
    }

    return trimmed;
  }

  return null;
};

export const pickWorkspaceId = (
  ...candidates: WorkspaceIdentifier[]
): string | null => {
  for (const candidate of candidates) {
    const normalized = normalizeWorkspaceId(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

const extractWorkspaceCandidate = (candidate: any): string | null => {
  if (!candidate) return null;

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return normalizeWorkspaceId(candidate);
  }

  if (Array.isArray(candidate)) {
    for (const item of candidate) {
      const normalized = extractWorkspaceCandidate(item);
      if (normalized) return normalized;
    }
    return null;
  }

  if (typeof candidate === 'object') {
    const workspaceContext =
      candidate.workspace_context ||
      candidate.workspaceContext ||
      candidate.data?.workspace_context ||
      candidate.data?.workspaceContext ||
      null;

    const keys = [
      workspaceContext?.active_workspace_id,
      workspaceContext?.activeWorkspaceId,
      candidate.active_workspace_id,
      candidate.activeWorkspaceId,
      candidate.active_workspace,
      candidate.activeWorkspace,
      candidate.default_workspace_id,
      candidate.defaultWorkspaceId,
      candidate.active_seed_id,
      candidate.activeSeedId,
      candidate.active_seed,
      candidate.activeSeed,
      candidate.default_seed_id,
      candidate.defaultSeedId,
      candidate.default_seed,
      candidate.defaultSeed,
      candidate.workspace_id,
      candidate.workspaceId,
      candidate.seed_id,
      candidate.seed,
      candidate.selected_seed_id,
      candidate.selected_seed,
      candidate.active_seed_pk,
      candidate.id,
      candidate.pk,
      candidate.uuid,
      candidate.profile?.active_workspace_id,
      candidate.profile?.active_workspace,
      candidate.profile?.active_seed_id,
      candidate.profile?.active_seed,
      candidate.user?.active_workspace_id,
      candidate.user?.active_workspace,
      candidate.user?.active_seed_id,
      candidate.user?.active_seed,
      candidate.user?.profile?.active_workspace_id,
      candidate.user?.profile?.active_workspace,
      candidate.user?.profile?.active_seed_id,
      candidate.user?.profile?.active_seed
    ];

    for (const key of keys) {
      const normalized = extractWorkspaceCandidate(key);
      if (normalized) return normalized;
    }
  }

  return null;
};

export const extractWorkspaceId = (source: any): string | null => {
  if (!source) return null;
  return extractWorkspaceCandidate(source);
};
