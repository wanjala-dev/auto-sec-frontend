import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import DarkModeContext from '../../features/theme/presentation/DarkModeContext';
import {
  readBrowserLocalStringState,
  writeBrowserLocalStringState
} from '../../features/session/presentation/browserLocalStateSupport';
import { useWorkspaceThemePresentation } from '../../features/theme/presentation/useWorkspaceThemePresentation';

function Default({ children }) {
  // Apply the active workspace's brand palette (login / workspace switch).
  useWorkspaceThemePresentation();

  // dark mode setup
  const [theme, setTheme] = useState(() => {
    const savedTheme = readBrowserLocalStringState('theme');
    if (savedTheme) {
      return savedTheme;
    }
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    writeBrowserLocalStringState('theme', theme);
  }, [theme]);

  const handleThemeSwitch = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <React.Fragment>
      <DarkModeContext.Provider value={{ theme, handleThemeSwitch }}>
        {children && children}
      </DarkModeContext.Provider>
    </React.Fragment>
  );
}

export default Default;

Default.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired
};
