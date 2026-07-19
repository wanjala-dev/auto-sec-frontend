export const normalizeWorkspaceId = (
  workspaceId: string | number | null | undefined
) => {
  if (workspaceId === null || workspaceId === undefined) {
    return null;
  }

  const normalized = String(workspaceId).trim();
  return normalized.length ? normalized : null;
};

export const normalizeFeatureFlagsPayload = (payload: any) => {
  const data = payload?.data ?? payload ?? {};
  const flags = data?.flags || data?.feature_flags || data?.featureFlags || {};

  return {
    workspaceId: normalizeWorkspaceId(
      data?.workspace_id || data?.workspaceId || null
    ),
    flags: flags && typeof flags === 'object' ? flags : {}
  };
};
