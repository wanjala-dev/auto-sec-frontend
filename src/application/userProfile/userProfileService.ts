import { userProfileApi } from '../../infrastructure/userProfile/userProfileApi';
import { extractUserSeedsFromPayload } from '../../domain/userProfile/userSeeds';

export const fetchUserDetail = async (userId: string | number) => {
  const response = await userProfileApi.getUserDetail(userId, {
    mode: 'summary'
  });
  return response?.data?.data ?? null;
};

export const fetchPublicUserProfile = async (userId: string | number) => {
  const response = await userProfileApi.getPublicUserProfile(userId);
  return response?.data ?? null;
};

export const fetchUserWorkspaces = async (userId: string | number) => {
  const response = await userProfileApi.getUserDetail(userId);
  return extractUserSeedsFromPayload(response?.data);
};

export const searchUserProfiles = async (query: string) => {
  const trimmedQuery = typeof query === 'string' ? query.trim() : '';
  if (!trimmedQuery) {
    return [];
  }

  const response = await userProfileApi.searchUsers(trimmedQuery);
  return response?.data?.data ?? [];
};

export const fetchUserFollowers = async (userId: string | number) => {
  const response = await userProfileApi.getUserFollowers(userId);
  return response?.data?.data ?? [];
};

export const followUserProfile = async (userId: string | number) => {
  const response = await userProfileApi.addUserFollower(userId);
  return response?.data ?? null;
};

export const unfollowUserProfile = async (userId: string | number) => {
  const response = await userProfileApi.removeUserFollower(userId);
  return response?.data ?? null;
};

export const fetchUserStore = async (userId: string | number) => {
  const response = await userProfileApi.getStore(userId);
  return response?.data?.data ?? [];
};

export const createUserStore = async (payload: Record<string, unknown>) => {
  const response = await userProfileApi.createStore(payload);
  return response?.data ?? null;
};

export const createUserTeam = async (payload: Record<string, unknown>) => {
  const response = await userProfileApi.createTeam(payload);
  return response?.data ?? null;
};

export const activateUserTeam = async (teamId: string | number) => {
  const response = await userProfileApi.activateTeam(teamId);
  return response?.data ?? null;
};

export const activateUserWorkspace = async (workspaceId: string) => {
  const response = await userProfileApi.activateWorkspace(workspaceId);
  return response?.data ?? null;
};

export const updateUserProfileById = async (
  profileId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await userProfileApi.updateProfile(profileId, payload);
  return response?.data ?? null;
};

export const editUserProfileById = async (
  profileId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await userProfileApi.editProfile(profileId, payload);
  return response?.data ?? null;
};
