export const normalizeConversationList = (payload: any) =>
  payload?.results || payload?.data || payload || [];

export const normalizeConversationMessages = (payload: any) =>
  payload?.messages || payload?.results || payload || [];

export const extractConversationId = (payload: Record<string, any> = {}) =>
  payload?.id ||
  payload?.conversation_id ||
  payload?.pk ||
  payload?.uuid ||
  null;
