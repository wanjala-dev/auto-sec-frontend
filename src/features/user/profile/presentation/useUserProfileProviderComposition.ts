import { useUserProfilePresentationSlices } from './useUserProfilePresentationSlices';
import { useUserProfileProviderSupport } from './useUserProfileProviderSupport';
import { useUserProfileProviderValue } from './useUserProfileProviderValue';

export const useUserProfileProviderComposition = ({
  state,
  dispatch,
  addToast,
  fetchEvaluatedFlags,
  notifySummaryUpdated
}) => {
  const support = useUserProfileProviderSupport({
    state,
    dispatch,
    addToast
  });

  const slices = useUserProfilePresentationSlices({
    dispatch,
    state,
    addToast,
    support: {
      userCacheRef: support.userCacheRef,
      normalizeSeedValue: support.normalizeSeedValue,
      normalizeUserId: support.normalizeUserId,
      resolveSeedIdFromPayload: support.resolveSeedIdFromPayload
    },
    featureFlags: {
      fetchEvaluatedFlags,
      notifySummaryUpdated
    }
  });

  return useUserProfileProviderValue({
    state,
    userSeeds: support.userSeeds,
    getUser: support.getUser,
    runUserSearch: slices.social.userSearch,
    getUserLikes: slices.social.getUserLikes,
    userLike: slices.social.userLike,
    userUnLike: slices.social.userUnLike,
    getStore: slices.store.getStore,
    createStore: slices.store.createStore,
    updateThumbnail: slices.editing.updateThumbnail,
    inviteUser: slices.team.inviteUser,
    getInvitations: slices.team.getInvitations,
    acceptInvitation: slices.team.acceptInvitation,
    acceptInviteCode: slices.team.acceptInviteCode,
    activateTeam: slices.team.activateTeam,
    activateWorkspace: slices.team.activateWorkspace,
    createTeam: slices.team.createTeam,
    updateUserProfile: slices.editing.updateUserProfile,
    editUserProfile: slices.editing.editUserProfile
  });
};
