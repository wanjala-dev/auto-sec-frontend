const hasBrowserStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const readFeatureFlagOverrides = (key: string) => {
  if (!hasBrowserStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writeFeatureFlagOverrides = (key: string, value: unknown) => {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const clearFeatureFlagOverrides = (key: string) => {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(key);
};
