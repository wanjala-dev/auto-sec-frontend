import { useEffect } from 'react';

import { readStoredUserSummary } from '../../../infrastructure/session/browserAuthStore';
import { USER_SUMMARY_UPDATED_EVENT } from '../../feature-flags/presentation/useFeatureFlagsBootstrapPresentation';
import {
  applyWorkspaceTheme,
  extractWorkspaceTheme
} from './applyWorkspaceTheme';

/**
 * Applies the active workspace's brand palette whenever the cached user summary
 * changes (login, workspace switch) — and once on mount, which also reconciles
 * whatever the FOUC head script applied before React booted.
 */
export const useWorkspaceThemePresentation = (): void => {
  useEffect(() => {
    const apply = () => {
      const summary = readStoredUserSummary<any>();
      applyWorkspaceTheme(extractWorkspaceTheme(summary));
    };

    apply();
    window.addEventListener(USER_SUMMARY_UPDATED_EVENT, apply);
    return () => window.removeEventListener(USER_SUMMARY_UPDATED_EVENT, apply);
  }, []);
};
