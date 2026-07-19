import { useMemo } from 'react';

export const useUserProfileProviderValue = ({
  state,
  userSeeds,
  getUser,
  runUserSearch,
  getUserLikes,
  userLike,
  userUnLike,
  getStore,
  createStore,
  updateThumbnail,
  inviteUser,
  getInvitations,
  acceptInvitation,
  acceptInviteCode,
  activateTeam,
  activateWorkspace,
  createTeam,
  updateUserProfile,
  editUserProfile
}: {
  state: any;
  userSeeds: any;
  getUser: any;
  runUserSearch: any;
  getUserLikes: any;
  userLike: any;
  userUnLike: any;
  getStore: any;
  createStore: any;
  updateThumbnail: any;
  inviteUser: any;
  getInvitations: any;
  acceptInvitation: any;
  acceptInviteCode: any;
  activateTeam: any;
  activateWorkspace: any;
  createTeam: any;
  updateUserProfile: any;
  editUserProfile: any;
}) =>
  useMemo(
    () => ({
      ...state,
      userSeeds,
      getUser,
      userSearch: runUserSearch,
      getUserLikes,
      userLike,
      userUnLike,
      getStore,
      createStore,
      updateThumbnail,
      inviteUser,
      getInvitations,
      acceptInvitation,
      acceptInviteCode,
      activateTeam,
      activateWorkspace,
      createTeam,
      updateUserProfile,
      editUserProfile
    }),
    [
      state,
      userSeeds,
      getUser,
      runUserSearch,
      getUserLikes,
      userLike,
      userUnLike,
      getStore,
      createStore,
      updateThumbnail,
      inviteUser,
      getInvitations,
      acceptInvitation,
      acceptInviteCode,
      activateTeam,
      activateWorkspace,
      createTeam,
      updateUserProfile,
      editUserProfile
    ]
  );
