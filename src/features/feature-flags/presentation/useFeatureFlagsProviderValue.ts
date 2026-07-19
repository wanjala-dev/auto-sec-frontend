import { useMemo } from 'react';

export const useFeatureFlagsProviderValue = ({
  state,
  support,
  bootstrap,
  overrides
}) =>
  useMemo(
    () => ({
      loading: state.loading,
      error: state.error,
      environment: state.environment,
      features: support.features,
      isEnabled: support.isEnabled,
      flags: support.flags,
      evaluated: state.evaluated,
      isFlagEnabled: support.isFlagEnabled,
      flagsReady: support.flagsReady,
      fetchEvaluatedFlags: bootstrap.fetchEvaluatedFlags,
      selectWorkspace: bootstrap.selectWorkspace,
      fetchFlag: bootstrap.fetchFlag,
      notifySummaryUpdated: overrides.notifySummaryUpdated,
      setOverride: overrides.setOverride,
      clearOverrides: overrides.clearOverrides
    }),
    [state, support, bootstrap, overrides]
  );
