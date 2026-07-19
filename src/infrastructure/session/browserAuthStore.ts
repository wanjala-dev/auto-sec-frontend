const hasBrowserStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readJsonRecord = <T>(key: string): T | null => {
  if (!hasBrowserStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeJsonRecord = (key: string, value: unknown) => {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const removeRecord = (key: string) => {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(key);
};

const readStringRecord = (key: string): string | null => {
  if (!hasBrowserStorage()) return null;
  return window.localStorage.getItem(key);
};

const writeStringRecord = (key: string, value: string) => {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(key, value);
};

export const readStoredUser = <T>(): T | null => readJsonRecord<T>('user');

export const writeStoredUser = (value: unknown) => {
  writeJsonRecord('user', value);
};

export const updateStoredUserRecord = (updates: any): any => {
  const current = readStoredUser<any>() || {};
  const next =
    typeof updates === 'function'
      ? updates(current)
      : { ...current, ...updates };
  writeStoredUser(next);
  return next;
};

export const readStoredUserSummary = <T>(): T | null =>
  readJsonRecord<T>('user_summary');

export const writeStoredUserSummary = (value: unknown) => {
  writeJsonRecord('user_summary', value);
  // Notify same-tab listeners (storage event only fires cross-tab)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('user-summary-updated'));
  }
};

export const readAccessToken = (): string | null => readStringRecord('token');

export const writeAccessToken = (value: string) => {
  writeStringRecord('token', value);
};

export const removeAccessToken = () => {
  removeRecord('token');
};

export const readRefreshToken = (): string | null =>
  readStringRecord('token_refresh');

export const writeRefreshToken = (value: string) => {
  writeStringRecord('token_refresh', value);
};

export const removeRefreshToken = () => {
  removeRecord('token_refresh');
};

export const readPreauthToken = (): string | null =>
  readStringRecord('preauth_token');

export const writePreauthToken = (value: string) => {
  writeStringRecord('preauth_token', value);
};

export const removePreauthToken = () => {
  removeRecord('preauth_token');
};

export const readPostLoginRedirect = (): string | null =>
  readStringRecord('postLoginRedirect');

export const writePostLoginRedirect = (value: string) => {
  writeStringRecord('postLoginRedirect', value);
};

export const removePostLoginRedirect = () => {
  removeRecord('postLoginRedirect');
};

const AUTH_SESSION_KEYS = [
  'token',
  'token_refresh',
  'user',
  'user_summary',
  'preauth_token',
  'postLoginRedirect'
] as const;

export const clearAuthSessionStorage = () => {
  if (!hasBrowserStorage()) return;
  for (const key of AUTH_SESSION_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage exceptions (quota, private mode) must never block logout.
    }
  }
};
