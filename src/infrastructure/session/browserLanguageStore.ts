const LANGUAGE_STORAGE_KEY = 'appUILang';

const hasBrowserWindow = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const getStoredLanguage = () => {
  if (!hasBrowserWindow()) {
    return '';
  }
  return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || '';
};

export const setStoredLanguage = (language: string) => {
  if (!hasBrowserWindow()) {
    return;
  }
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
};

export const getBrowserLanguage = () => {
  if (typeof window === 'undefined' || !window.navigator) {
    return '';
  }
  return window.navigator.language || '';
};
