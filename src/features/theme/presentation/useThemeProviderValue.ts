import { useMemo } from 'react';

export const useThemeProviderValue = ({ state, dispatch, support }) =>
  useMemo(
    () => ({
      state,
      dispatch,
      setLightMode: support.setLightMode,
      setDarkMode: support.setDarkMode,
      setTheme: support.setTheme
    }),
    [state, dispatch, support]
  );
