import React, { createContext, useReducer } from 'react';

import { themeActionTypes, themeInitialState } from './themeContextConfig';
import { useThemeBootstrapPresentation } from './useThemeBootstrapPresentation';
import { useThemeProviderSupport } from './useThemeProviderSupport';
import { useThemeProviderValue } from './useThemeProviderValue';

type ThemeProviderProps = {
  children: React.ReactNode;
};

export const ThemeContext = createContext(null as any);

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

const themeReducer = (state, action) => {
  switch (action.type) {
    case themeActionTypes.LIGHTMODE:
      return { ...state, darkMode: false };
    case themeActionTypes.DARKMODE:
      return { ...state, darkMode: true };
    case themeActionTypes.SET_THEME:
      return { ...state, themeData: action.payload };
    default:
      return state;
  }
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [state, dispatch] = useReducer(themeReducer, themeInitialState);

  const support = useThemeProviderSupport({
    dispatch,
    actions: themeActionTypes
  });

  useThemeBootstrapPresentation({
    dispatch,
    actions: themeActionTypes
  });

  const contextValue = useThemeProviderValue({
    state,
    dispatch,
    support
  });

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}
