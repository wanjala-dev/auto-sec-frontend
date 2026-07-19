const hasLocalStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const readLocalJsonState = <T>(key: string): T | null => {
  if (!hasLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const writeLocalJsonState = (key: string, value: unknown) => {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const readLocalStringState = (key: string): string | null => {
  if (!hasLocalStorage()) return null;
  return window.localStorage.getItem(key);
};

export const writeLocalStringState = (key: string, value: string) => {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(key, value);
};
