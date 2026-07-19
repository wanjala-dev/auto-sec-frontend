import { useEffect, useMemo, useState } from 'react';

import { readStoredUserSummary } from '../../../infrastructure/session/browserAuthStore';
import { useActiveWorkspaceSummary } from '../../workspace/presentation/useActiveWorkspaceSummary';
import { USER_SUMMARY_UPDATED_EVENT } from '../../feature-flags/presentation/useFeatureFlagsBootstrapPresentation';
import { extractWorkspaceTheme } from './applyWorkspaceTheme';

export type ActiveWorkspaceBrand = {
  /** Active workspace's `theme.logo_url`, or null when unbranded/empty. */
  logoUrl: string | null;
  /** Active workspace name, or null when not on a workspace route. */
  name: string | null;
};

/**
 * Reads the active workspace's brand mark for the AUTHED app shell.
 *
 * The logo comes from the same place `useWorkspaceThemePresentation` reads the
 * palette — the cached `me/summary` `workspace_context.theme` (`logo_url`) —
 * and the name from `useActiveWorkspaceSummary`. Returns null fields for
 * unbranded workspaces so callers keep the Octopus fallback unchanged.
 */
export const useActiveWorkspaceBrand = (): ActiveWorkspaceBrand => {
  const { name } = useActiveWorkspaceSummary();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const summary = readStoredUserSummary<any>();
      const theme = extractWorkspaceTheme(summary);
      const url = theme?.logo_url;
      setLogoUrl(typeof url === 'string' && url ? url : null);
    };

    read();
    window.addEventListener(USER_SUMMARY_UPDATED_EVENT, read);
    return () => window.removeEventListener(USER_SUMMARY_UPDATED_EVENT, read);
  }, []);

  return useMemo(() => ({ logoUrl, name }), [logoUrl, name]);
};
