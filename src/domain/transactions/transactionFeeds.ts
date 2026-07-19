export const normalizeTransactionMutationResponse = (payload: any) =>
  payload?.data ?? payload?.transaction ?? payload ?? null;

export const normalizeChildTransactionFeed = (payload: any) =>
  payload?.data ?? payload ?? {};
