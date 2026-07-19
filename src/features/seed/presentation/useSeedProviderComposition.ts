import { selectSeedPresentationState } from './seedContextConfig';
import { useSeedBootstrapPresentation } from './useSeedBootstrapPresentation';
import { useSeedOnboardingPresentation } from './useSeedOnboardingPresentation';
import { useSeedPresentationSlices } from './useSeedPresentationSlices';
import { useSeedProviderSupport } from './useSeedProviderSupport';
import { useSeedProviderValue } from './useSeedProviderValue';

export const useSeedProviderComposition = ({
  state,
  dispatch,
  addToast,
  notifySuccess,
  notifyError
}) => {
  const { selectedChild, activeSeed, activeBanners, donationsState } =
    selectSeedPresentationState(state);

  const { onboardingState, updateOnboardingState, resetOnboardingState } =
    useSeedOnboardingPresentation();

  const support = useSeedProviderSupport({
    state
  });

  const slices = useSeedPresentationSlices({
    state,
    dispatch,
    addToast,
    notifySuccess,
    notifyError,
    activeSeed,
    activeBanners,
    selectedChild,
    support
  });

  useSeedBootstrapPresentation({
    state,
    support: {
      userSeedsPrefetchRef: support.userSeedsPrefetchRef,
      resolveUserId: support.resolveUserId
    },
    getUserSeed: slices.resource.getUserSeed
  });

  return useSeedProviderValue({
    state,
    dispatch,
    collaboration: slices.collaboration,
    resource: slices.resource,
    workspace: slices.workspace,
    budget: slices.budget,
    transactions: slices.transactions,
    sponsorship: slices.sponsorship,
    entity: slices.entity,
    preferences: slices.preferences,
    project: slices.project,
    donationsState,
    donationsActions: slices.donationsActions,
    onboarding: {
      onboardingState,
      updateOnboardingState,
      resetOnboardingState
    }
  });
};
