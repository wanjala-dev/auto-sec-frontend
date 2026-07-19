export const extractCollectionResults = (payload: any) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export const normalizeWorkspaceScopedParams = (
  workspaceId: string | number | null | undefined,
  params: Record<string, any> = {}
) => {
  const normalizedParams = { ...(params || {}) };

  if (normalizedParams.seed_id && !normalizedParams.workspace_id) {
    normalizedParams.workspace_id = normalizedParams.seed_id;
    delete normalizedParams.seed_id;
  }

  if (normalizedParams.seed && !normalizedParams.workspace_id) {
    normalizedParams.workspace_id = normalizedParams.seed;
    delete normalizedParams.seed;
  }

  if (workspaceId && !normalizedParams.workspace_id) {
    normalizedParams.workspace_id = workspaceId;
  }

  return normalizedParams;
};

export const normalizePaginatedCollection = (payload: any) => {
  const results = extractCollectionResults(payload);

  return {
    count:
      typeof payload?.count === 'number'
        ? payload.count
        : Array.isArray(results)
        ? results.length
        : 0,
    next: payload?.next ?? null,
    previous: payload?.previous ?? null,
    results
  };
};

export const emptyPaginatedCollection = () => ({
  count: 0,
  next: null,
  previous: null,
  results: []
});
