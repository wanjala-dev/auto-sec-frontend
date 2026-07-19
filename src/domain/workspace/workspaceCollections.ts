export const normalizeWorkspaceCollection = (payload: any) => {
  const data = payload?.data ?? payload ?? [];

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
};

export const normalizeWorkspaceRecord = (payload: any) => {
  const data = payload?.data ?? payload ?? null;

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data;
  }

  return null;
};
