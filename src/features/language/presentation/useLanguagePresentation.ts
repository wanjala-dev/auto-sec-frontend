import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  getBrowserLanguage,
  getStoredLanguage,
  setStoredLanguage
} from '../../../application/session/browserLanguageService';
import { resolveLanguageData } from './languageContextConfig';

const resolveInitialLanguage = () =>
  getStoredLanguage() || getBrowserLanguage();

export const useLanguagePresentation = () => {
  const [lang, setLang] = useState(resolveInitialLanguage);

  useLayoutEffect(() => {
    const selectedLang = getStoredLanguage();

    if (selectedLang) {
      setLang(selectedLang);
    }
  }, []);

  const switchLang = useCallback((nextLanguage: string) => {
    setLang(nextLanguage);
    setStoredLanguage(nextLanguage);
  }, []);

  const currentLangData = useMemo(() => resolveLanguageData(lang), [lang]);

  return {
    lang,
    currentLangData,
    switchLang
  };
};
