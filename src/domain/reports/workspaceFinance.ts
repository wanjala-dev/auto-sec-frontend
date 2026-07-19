const unwrapData = (payload: any) =>
  payload?.data !== undefined ? payload.data : payload;

export const normalizeBudgetCategoryCollection = (payload: any) => {
  const data = unwrapData(payload);
  return Array.isArray(data) ? data : [];
};

export const normalizeBudgetCollection = (payload: any) => {
  const data = unwrapData(payload);
  return Array.isArray(data) ? data : [];
};

export const normalizeWorkspaceAggregation = (payload: any) => {
  const data = unwrapData(payload);
  return data && typeof data === 'object' ? data : {};
};

export const normalizeBudgetRecord = (payload: any) => unwrapData(payload);

export const normalizeBudgetEstimateRecord = (payload: any) =>
  unwrapData(payload);

export const normalizeContributionMeansPayload = (payload: any) =>
  payload ?? null;
