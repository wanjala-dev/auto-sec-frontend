import { useFeatureFlagsBootstrapPresentation } from './useFeatureFlagsBootstrapPresentation';
import { useFeatureFlagsOverridesPresentation } from './useFeatureFlagsOverridesPresentation';
import { useFeatureFlagsProviderSupport } from './useFeatureFlagsProviderSupport';
import { useFeatureFlagsProviderValue } from './useFeatureFlagsProviderValue';

export const useFeatureFlagsProviderComposition = ({ state, dispatch }) => {
  const bootstrap = useFeatureFlagsBootstrapPresentation({
    dispatch
  });

  const overrides = useFeatureFlagsOverridesPresentation({
    dispatch,
    state,
    hydrateEvaluatedFromSummary: bootstrap.hydrateEvaluatedFromSummary,
    fetchEvaluatedFlags: bootstrap.fetchEvaluatedFlags
  });

  const support = useFeatureFlagsProviderSupport({
    state
  });

  return useFeatureFlagsProviderValue({
    state,
    support,
    bootstrap,
    overrides
  });
};
