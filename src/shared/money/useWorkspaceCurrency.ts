/**
 * Resolve the currency the active workspace displays amounts in.
 *
 * Ordered fallbacks so UI never renders a blank/unknown code:
 *
 *   1. Workspace default_currency from the viewer session summary
 *      (the backend Workspace.default_currency we added in
 *      ``components/money`` foundation).
 *   2. The frontend default ('USD').
 *
 * When a `workspaceId` is passed, we look that workspace up in the
 * summary directly. Without it we use whichever workspace the
 * session snapshot considers active.
 *
 * Returns a code from the supported allowlist, or the default
 * 'USD'. If the summary carries an unsupported/unknown code we
 * still return 'USD' so the formatter below always produces a
 * valid symbol.
 */

import { useMemo } from 'react';

import { useViewerSession } from '../../features/auth/presentation/useViewerSession';
import { resolveStoredSummaryWorkspaceCurrency } from '../../domain/auth/storedSummarySelectors';

import { isSupportedCurrency } from './types';
import type { CurrencyCode } from './types';

const DEFAULT: CurrencyCode = 'USD';

export const useWorkspaceCurrency = (workspaceId?: string): CurrencyCode => {
  const { storedSummary } = useViewerSession();

  return useMemo<CurrencyCode>(() => {
    if (workspaceId && storedSummary) {
      const workspaces =
        (Array.isArray(storedSummary.workspaces) && storedSummary.workspaces) ||
        (Array.isArray((storedSummary as any)?.data?.workspaces) &&
          (storedSummary as any).data.workspaces) ||
        [];
      const match = workspaces.find((entry: any) => {
        const id = entry?.id ?? entry?.pk ?? entry?.uuid ?? entry?.workspace_id;
        return id && String(id) === String(workspaceId);
      });
      const explicit =
        match?.default_currency || match?.defaultCurrency || null;
      if (isSupportedCurrency(explicit)) {
        return explicit.toUpperCase() as CurrencyCode;
      }
    }

    const summaryCurrency =
      resolveStoredSummaryWorkspaceCurrency(storedSummary);
    if (isSupportedCurrency(summaryCurrency)) {
      return summaryCurrency as CurrencyCode;
    }
    return DEFAULT;
  }, [storedSummary, workspaceId]);
};
