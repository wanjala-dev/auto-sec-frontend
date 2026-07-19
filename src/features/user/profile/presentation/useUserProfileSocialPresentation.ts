import { useCallback } from 'react';
import {
  fetchUserFollowers,
  followUserProfile,
  searchUserProfiles,
  unfollowUserProfile
} from '../../../../application/userProfile/userProfileService';
import {
  GET_USER_LIKES,
  LIKE_USER,
  SEARCH_USERS,
  UNLIKE_USER,
  USER_ERROR,
  USER_LOADING
} from '../../../../types/userProfileTypes';

const buildErrorMessage = (error, fallback) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.response?.data?.name ||
  error?.message ||
  fallback;

export const useUserProfileSocialPresentation = ({
  dispatch,
  addToast
}: {
  dispatch: any;
  addToast?: ((payload: { message: string; error: boolean }) => void) | null;
}) => {
  const userSearch = useCallback(
    async (value) => {
      dispatch({ type: USER_LOADING });

      try {
        const results = await searchUserProfiles(value);
        dispatch({
          type: SEARCH_USERS,
          payload: results
        });
        return results;
      } catch (error) {
        dispatch({ type: USER_ERROR });
        addToast?.({
          message: buildErrorMessage(
            error,
            'Unable to search users right now.'
          ),
          error: true
        });
        throw error;
      }
    },
    [addToast, dispatch]
  );

  const getUserLikes = useCallback(
    async (id) => {
      dispatch({ type: USER_LOADING });

      try {
        const likes = await fetchUserFollowers(id);
        dispatch({
          type: GET_USER_LIKES,
          payload: likes
        });
        return likes;
      } catch (error) {
        dispatch({ type: USER_ERROR });
        addToast?.({
          message: buildErrorMessage(
            error,
            'Unable to load profile followers right now.'
          ),
          error: true
        });
        throw error;
      }
    },
    [addToast, dispatch]
  );

  const userLike = useCallback(
    async (id) => {
      dispatch({ type: USER_LOADING });

      try {
        const payload = await followUserProfile(id);
        dispatch({
          type: LIKE_USER,
          payload
        });
        return payload;
      } catch (error) {
        dispatch({ type: USER_ERROR });
        addToast?.({
          message: buildErrorMessage(error, 'Unable to follow this user.'),
          error: true
        });
        throw error;
      }
    },
    [addToast, dispatch]
  );

  const userUnLike = useCallback(
    async (id) => {
      dispatch({ type: USER_LOADING });

      try {
        const payload = await unfollowUserProfile(id);
        dispatch({
          type: UNLIKE_USER,
          payload
        });
        return payload;
      } catch (error) {
        dispatch({ type: USER_ERROR });
        addToast?.({
          message: buildErrorMessage(error, 'Unable to unfollow this user.'),
          error: true
        });
        throw error;
      }
    },
    [addToast, dispatch]
  );

  return {
    userSearch,
    getUserLikes,
    userLike,
    userUnLike
  };
};
