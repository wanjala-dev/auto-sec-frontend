import { useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  fetchAiChannelPreferences,
  fetchGlobalNotificationsPreference,
  fetchSeedPreferences,
  updateGlobalNotificationsPreference,
  upsertAiChannelPreference,
  upsertSeedPreference
} from '../../../application/notifications/notificationsService';
import { normalizeNotificationList } from '../../../domain/notifications/notificationCollections';

export const useNotificationsPreferencesPresentation = ({
  dispatch,
  actions,
  resolvedUserId
}: {
  dispatch: any;
  actions: any;
  resolvedUserId: any;
}) => {
  const loadPreferences = useCallback(async () => {
    const userId = resolvedUserId;
    if (!userId) {
      toast.error('Unable to load notification preferences: missing user id.');
      return;
    }
    dispatch({ type: actions.PREFERENCES_LOADING });
    try {
      const [seedRes, aiRes, globalRes] = await Promise.all([
        fetchSeedPreferences(),
        fetchAiChannelPreferences(),
        fetchGlobalNotificationsPreference(userId)
      ]);
      const nextState = {
        seeds: normalizeNotificationList(seedRes),
        aiChannels: normalizeNotificationList(aiRes),
        global: globalRes?.data ?? null
      };
      dispatch({
        type: actions.PREFERENCES_SUCCESS,
        payload: nextState
      });
    } catch (error) {
      dispatch({
        type: actions.PREFERENCES_ERROR,
        payload: error?.message || 'Unable to load preferences'
      });
      toast.error('Unable to load notification preferences.');
    }
  }, [
    actions.PREFERENCES_ERROR,
    actions.PREFERENCES_LOADING,
    actions.PREFERENCES_SUCCESS,
    dispatch,
    resolvedUserId
  ]);

  const upsertSeedNotificationPreference = useCallback(
    async ({ seed, is_enabled, preferenceId }) => {
      dispatch({ type: actions.PREFERENCES_SAVING, payload: true });
      try {
        await upsertSeedPreference({
          preferenceId,
          seed,
          is_enabled
        });
        await loadPreferences();
        toast.success('Notification preference updated.');
      } catch (_) {
        toast.error('Unable to update notification preference.');
      } finally {
        dispatch({ type: actions.PREFERENCES_SAVING, payload: false });
      }
    },
    [actions.PREFERENCES_SAVING, dispatch, loadPreferences]
  );

  const upsertAiNotificationPreference = useCallback(
    async ({ seed, channel, is_enabled, preferenceId }) => {
      dispatch({ type: actions.PREFERENCES_SAVING, payload: true });
      try {
        await upsertAiChannelPreference({
          preferenceId,
          seed,
          channel,
          is_enabled
        });
        await loadPreferences();
        toast.success('AI channel preference updated.');
      } catch (_) {
        toast.error('Unable to update AI channel preference.');
      } finally {
        dispatch({ type: actions.PREFERENCES_SAVING, payload: false });
      }
    },
    [actions.PREFERENCES_SAVING, dispatch, loadPreferences]
  );

  const toggleGlobalNotifications = useCallback(
    async (isEnabled) => {
      const userId = resolvedUserId;
      if (!userId) {
        toast.error('Missing user id.');
        return;
      }
      dispatch({ type: actions.PREFERENCES_SAVING, payload: true });
      try {
        const response = await updateGlobalNotificationsPreference(userId, {
          notifications_enabled: isEnabled
        });
        dispatch({
          type: actions.PREFERENCES_SAVED,
          payload: {
            global: response?.data ?? {
              notifications_enabled: isEnabled
            }
          }
        });
        toast.success('Global notification settings updated.');
      } catch (_) {
        toast.error('Unable to update global notifications.');
      } finally {
        dispatch({ type: actions.PREFERENCES_SAVING, payload: false });
      }
    },
    [
      actions.PREFERENCES_SAVED,
      actions.PREFERENCES_SAVING,
      dispatch,
      resolvedUserId
    ]
  );

  return {
    loadPreferences,
    upsertSeedNotificationPreference,
    upsertAiNotificationPreference,
    toggleGlobalNotifications
  };
};
