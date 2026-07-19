import { useUserProfileEditingPresentation } from './useUserProfileEditingPresentation';
import { useUserProfileSocialPresentation } from './useUserProfileSocialPresentation';
import { useUserProfileStorePresentation } from './useUserProfileStorePresentation';
import { useUserProfileTeamPresentation } from './useUserProfileTeamPresentation';
import { replaceBrowserRoute } from '../../../../features/navigation/presentation/browserNavigationSupport';

export const useUserProfilePresentationSlices = ({
  dispatch,
  state,
  addToast,
  support,
  featureFlags
}) => {
  const team = useUserProfileTeamPresentation({
    dispatch,
    addToast,
    fetchEvaluatedFlags: featureFlags.fetchEvaluatedFlags,
    notifySummaryUpdated: featureFlags.notifySummaryUpdated,
    userCacheRef: support.userCacheRef,
    stateUser: state.user,
    normalizeUserId: support.normalizeUserId,
    resolveSeedIdFromPayload: support.resolveSeedIdFromPayload
  });

  const editing = useUserProfileEditingPresentation({
    dispatch,
    addToast,
    userCacheRef: support.userCacheRef,
    stateUser: state.user,
    normalizeUserId: support.normalizeUserId,
    normalizeSeedValue: support.normalizeSeedValue
  });

  const social = useUserProfileSocialPresentation({
    dispatch,
    addToast
  });

  const store = useUserProfileStorePresentation({
    dispatch,
    addToast,
    onCreateSuccess: () => {
      replaceBrowserRoute('/shop/store');
    }
  });

  return {
    team,
    editing,
    social,
    store
  };
};
