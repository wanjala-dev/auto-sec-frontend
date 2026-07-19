import { useCallback } from 'react';

export const useThemeProviderSupport = ({ dispatch, actions }) => {
  const setLightMode = useCallback(() => {
    dispatch({ type: actions.LIGHTMODE });
  }, [actions.LIGHTMODE, dispatch]);

  const setDarkMode = useCallback(() => {
    dispatch({ type: actions.DARKMODE });
  }, [actions.DARKMODE, dispatch]);

  const setTheme = useCallback(
    (themeData) => {
      dispatch({ type: actions.SET_THEME, payload: themeData });
    },
    [actions.SET_THEME, dispatch]
  );

  return {
    setLightMode,
    setDarkMode,
    setTheme
  };
};
