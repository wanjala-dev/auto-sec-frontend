import { useCallback, useState } from 'react';

const DEFAULT_ONBOARDING_STATE = {
  // 'create' = start a new workspace/org you'll run.
  // 'join'   = find an existing org to support (sponsor / volunteer / contribute).
  intent: '',
  accountType: '',
  sector: null,
  role: ''
};

export const useSeedOnboardingPresentation = () => {
  const [onboardingState, setOnboardingState] = useState(
    DEFAULT_ONBOARDING_STATE
  );

  const updateOnboardingState = useCallback((nextState) => {
    setOnboardingState((previous) => {
      const resolved =
        typeof nextState === 'function' ? nextState(previous) : nextState;
      return { ...previous, ...(resolved || {}) };
    });
  }, []);

  const resetOnboardingState = useCallback(() => {
    setOnboardingState(DEFAULT_ONBOARDING_STATE);
  }, []);

  return {
    onboardingState,
    updateOnboardingState,
    resetOnboardingState
  };
};
