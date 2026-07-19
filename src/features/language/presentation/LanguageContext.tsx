import React from 'react';

import { resolveLanguageData } from './languageContextConfig';
import { useLanguagePresentation } from './useLanguagePresentation';

type LangContextValue = {
  lang: string;
  currentLangData: Record<string, unknown>;
  switchLang: (ln: string) => void;
};

const LanguageContext = React.createContext<LangContextValue>({
  lang: '',
  currentLangData: resolveLanguageData('en-US'),
  switchLang: (_ln: string) => {}
});

export default LanguageContext;

export function LangProvider(props: { children: React.ReactNode }) {
  const value = useLanguagePresentation();

  return (
    <LanguageContext.Provider value={value}>
      {props.children}
    </LanguageContext.Provider>
  );
}
