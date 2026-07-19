import {
  normalizeFeatureFlagsPayload,
  normalizeWorkspaceId
} from '../../domain/featureFlags/evaluatedFlags';
import { featureFlagsApi } from '../../infrastructure/featureFlags/featureFlagsApi';

export const fetchEvaluatedFeatureFlags = async ({
  workspaceId
}: {
  workspaceId?: string | number | null;
}) => {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);

  if (!normalizedWorkspaceId) {
    return null;
  }

  const response = await featureFlagsApi.getEvaluatedFlags(
    normalizedWorkspaceId
  );
  const normalized = normalizeFeatureFlagsPayload(response?.data);

  return {
    workspaceId: normalized.workspaceId || normalizedWorkspaceId,
    flags: normalized.flags
  };
};

export const fetchFeatureFlag = async ({
  key,
  workspaceId
}: {
  key?: string;
  workspaceId?: string | number | null;
}) => {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  const normalizedKey =
    typeof key === 'string' ? key.trim() : String(key || '').trim();

  if (!normalizedWorkspaceId || !normalizedKey) {
    return null;
  }

  const response = await featureFlagsApi.getFlag(
    normalizedKey,
    normalizedWorkspaceId
  );

  return response?.data?.data ?? response?.data ?? null;
};
