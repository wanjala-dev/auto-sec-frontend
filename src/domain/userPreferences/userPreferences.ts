export const normalizeUserPreferences = (payload: any) =>
  payload?.data ?? payload ?? null;
