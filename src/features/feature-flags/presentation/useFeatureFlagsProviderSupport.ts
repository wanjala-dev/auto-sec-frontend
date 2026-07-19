import { useCallback, useMemo } from 'react';

export const useFeatureFlagsProviderSupport = ({ state }) => {
  const features = useMemo(() => {
    const base = state.features || {};
    const overrides = state.overrides || {};
    return { ...base, ...overrides };
  }, [state.features, state.overrides]);

  const isEnabled = useCallback((key) => Boolean(features?.[key]), [features]);

  // Resolve evaluated flags against the workspace the user is VIEWING
  // (currentWorkspaceId, set by WorkspaceLayout). When that workspace's flags
  // haven't loaded yet we deliberately return an empty set (not another
  // workspace's flags), so gated features stay hidden and paywalls stay held
  // (flagsReady=false) rather than showing a wrong state. Only when there is
  // no viewed workspace (auth/onboarding pages) do we fall back to the flat
  // last-loaded/summary flags.
  const evaluated = state.evaluated || {};
  const currentEntry = useMemo(() => {
    const wid = evaluated.currentWorkspaceId;
    if (wid) {
      return evaluated.byWorkspace?.[wid] || null;
    }
    // No viewed workspace → flat fallback (summary / last loaded).
    return {
      flags: evaluated.flags || {},
      updatedAt: evaluated.updatedAt || 0
    };
  }, [
    evaluated.currentWorkspaceId,
    evaluated.byWorkspace,
    evaluated.flags,
    evaluated.updatedAt
  ]);

  const flags = useMemo(() => currentEntry?.flags || {}, [currentEntry]);

  const isFlagEnabled = useCallback((key) => Boolean(flags?.[key]), [flags]);

  // True once the VIEWED workspace's flags have actually loaded — consumers
  // (e.g. the sidebar) use this to hold "locked Pro" placeholders until the
  // real per-workspace state is known, avoiding a flash of the wrong gate.
  const flagsReady = Boolean(currentEntry?.updatedAt);

  return {
    features,
    isEnabled,
    flags,
    isFlagEnabled,
    flagsReady
  };
};
