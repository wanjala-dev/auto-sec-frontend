const INVITE_STORAGE_KEY = 'pendingInvite';

export const readPendingInviteRecord = () => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(INVITE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Unable to parse pending invite', error);
    return null;
  }
};

export const writePendingInviteRecord = (
  updates: Record<string, unknown> = {}
) => {
  if (typeof window === 'undefined') return null;
  const current = readPendingInviteRecord() || {};
  const next = { ...current, ...updates };
  localStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify(next));
  return next;
};

export const clearPendingInviteRecord = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(INVITE_STORAGE_KEY);
};
