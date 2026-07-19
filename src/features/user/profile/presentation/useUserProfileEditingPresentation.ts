import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { updateStoredUserSession as updateStoredUser } from '../../../../application/auth/storedUserService';
import { uploadWorkspaceFile } from '../../../../application/uploads/uploadsService';
import {
  editUserProfileById,
  updateUserProfileById
} from '../../../../application/userProfile/userProfileService';
import {
  readViewerSessionSnapshot,
  writeViewerStoredUser
} from '../../../../features/auth/presentation/useViewerSession';
import {
  USER_PROFILE_UPDATE,
  USER_PROFILE_UPDATE_ERROR,
  USER_PROFILE_UPDATE_LOADING,
  USER_PROFILE_UPDATE_SUCCESS
} from '../../../../types/userProfileTypes';
import { replaceBrowserRoute } from '../../../../features/navigation/presentation/browserNavigationSupport';

export const useUserProfileEditingPresentation = ({
  dispatch,
  addToast,
  userCacheRef,
  stateUser,
  normalizeUserId,
  normalizeSeedValue
}: {
  dispatch: any;
  addToast?: ((payload: { message: string; error: boolean }) => void) | null;
  userCacheRef: any;
  stateUser: any;
  normalizeUserId: (value: any) => string | null;
  normalizeSeedValue: (value: any) => any;
}) => {
  type UpdateThumbnailOptions = {
    photoField?: string;
    skipRedirect?: boolean;
    redirectTo?: string | null;
  };

  const updateThumbnail = useCallback(
    async (file, profile, options: UpdateThumbnailOptions = {}) => {
      let uuid;
      try {
        const { storedUser } = readViewerSessionSnapshot();
        uuid =
          storedUser?.pk ||
          storedUser?.id ||
          profile?.user?.id ||
          profile?.user?.pk ||
          uuid;
        const seedIdForUpload = normalizeSeedValue(
          profile?.user?.profile?.active_seed ||
            profile?.user?.profile?.seed_id ||
            profile?.user?.profile?.seed ||
            storedUser?.active_seed_id ||
            storedUser?.active_seed
        );

        const uploadMeta = await uploadWorkspaceFile({
          file,
          workspaceId: seedIdForUpload,
          workspaceField: 'seed_id'
        });
        const uploadedFileUrl = uploadMeta?.url || '';
        const targetField = options?.photoField || 'photo_url';
        const patchPayload = {
          [targetField]: uploadedFileUrl
        };
        const responsePayload = await updateUserProfileById(uuid, patchPayload);

        if (storedUser) {
          const updatedStoredUser = {
            ...storedUser,
            profile: {
              ...(storedUser.profile || {}),
              [targetField]: uploadedFileUrl
            }
          };
          writeViewerStoredUser(updatedStoredUser);
        }
        return responsePayload;
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error.message ||
          'Unable to update your profile photo right now.';
        addToast?.({ message, error: true });
      } finally {
        const skipRedirect = Boolean(options?.skipRedirect);
        const fallbackRedirect =
          options?.redirectTo || (uuid ? `/user/${uuid}` : null);
        if (!skipRedirect && fallbackRedirect) {
          replaceBrowserRoute(fallbackRedirect);
        }
      }
    },
    [addToast, normalizeSeedValue]
  );

  const updateUserProfile = useCallback(
    async (profileData) => {
      dispatch({ type: USER_PROFILE_UPDATE_LOADING });
      const { storedUser: user_id = {} } = readViewerSessionSnapshot();
      const uuid = user_id.pk;

      try {
        const res = await updateUserProfileById(uuid, profileData);

        dispatch({ type: USER_PROFILE_UPDATE_SUCCESS });
        dispatch({ type: USER_PROFILE_UPDATE, payload: res });

        const normalizedId = normalizeUserId(uuid);
        if (normalizedId) {
          const currentData =
            userCacheRef.current[normalizedId]?.data || stateUser || {};
          const nextData = {
            ...currentData,
            profile: {
              ...currentData?.profile,
              ...(res || {})
            }
          };
          userCacheRef.current[normalizedId] = {
            data: nextData,
            updatedAt: Date.now()
          };
        }

        if (profileData.active_seed_id !== undefined) {
          toast.success('Society switched successfully!', { icon: '✅' });
        } else {
          toast.success('Profile updated successfully!', { icon: '✅' });
        }

        return res;
      } catch (error) {
        dispatch({ type: USER_PROFILE_UPDATE_ERROR });
      }
    },
    [dispatch, normalizeUserId, stateUser, userCacheRef]
  );

  const editUserProfile = useCallback(
    async (profileData) => {
      dispatch({ type: USER_PROFILE_UPDATE_LOADING });
      const { storedUser: user_id = {} } = readViewerSessionSnapshot();
      const uuid = user_id.pk;

      try {
        const res = await editUserProfileById(uuid, profileData);

        dispatch({ type: USER_PROFILE_UPDATE_SUCCESS });
        dispatch({ type: USER_PROFILE_UPDATE, payload: res });

        const normalizedId = normalizeUserId(uuid);
        if (normalizedId) {
          const currentData =
            userCacheRef.current[normalizedId]?.data || stateUser || {};
          const nextData = {
            ...currentData,
            profile: {
              ...currentData?.profile,
              ...(res || {})
            }
          };
          userCacheRef.current[normalizedId] = {
            data: nextData,
            updatedAt: Date.now()
          };
        }

        if (profileData.active_seed_id !== undefined) {
          toast.success('Society switched successfully!', { icon: '✅' });
        } else {
          toast.success('Profile updated successfully!', { icon: '✅' });
        }

        updateStoredUser((current) => {
          const next = { ...current };
          if (profileData?.active_seed_id !== undefined) {
            next.active_seed_id = profileData.active_seed_id;
          }
          if (profileData?.is_onboard_complete !== undefined) {
            next.is_onboard_complete = profileData.is_onboard_complete;
          }
          if (profileData?.is_contributor !== undefined) {
            next.is_contributor = profileData.is_contributor;
          }
          if (profileData?.requires_org_onboarding !== undefined) {
            next.requires_org_onboarding = profileData.requires_org_onboarding;
          }
          return next;
        });

        return res;
      } catch (error) {
        dispatch({ type: USER_PROFILE_UPDATE_ERROR });
        if (error.response && error.response.data) {
          addToast?.({
            message: JSON.stringify(error.response.data),
            error: true
          });
        } else {
          addToast?.({ message: 'Error updating profile', error: true });
        }
        throw error;
      }
    },
    [addToast, dispatch, normalizeUserId, stateUser, userCacheRef]
  );

  return {
    updateThumbnail,
    updateUserProfile,
    editUserProfile
  };
};
