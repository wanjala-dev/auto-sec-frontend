import { useCallback } from 'react';
import { toast } from 'react-toastify';

import { useNotificationsStream } from '../../realtime/presentation/useNotificationsStream';
import {
  AI_CHANNELS,
  DEFAULT_FILTERS,
  NOTIFICATION_ACTIONS,
  notificationsInitialState
} from './notificationsContextConfig';
import { useNotificationsBootstrapPresentation } from './useNotificationsBootstrapPresentation';
import { useNotificationsPresentationSlices } from './useNotificationsPresentationSlices';
import { useNotificationsProviderSupport } from './useNotificationsProviderSupport';
import { useNotificationsProviderValue } from './useNotificationsProviderValue';

export const useNotificationsProviderComposition = ({
  state,
  dispatch,
  user
}) => {
  const support = useNotificationsProviderSupport({
    state,
    user
  });

  const slices = useNotificationsPresentationSlices({
    dispatch,
    state,
    resolvedUserId: support.resolvedUserId,
    support: {
      filtersRef: support.filtersRef,
      feedRequestRef: support.feedRequestRef,
      unreadRequestRef: support.unreadRequestRef,
      cooldownUntilRef: support.cooldownUntilRef,
      cooldownToastRef: support.cooldownToastRef
    },
    config: {
      actions: NOTIFICATION_ACTIONS,
      initialPagination: notificationsInitialState.pagination,
      defaultFilters: DEFAULT_FILTERS
    }
  });

  useNotificationsBootstrapPresentation({
    resolvedUserId: support.resolvedUserId,
    fetchFeed: slices.feed.fetchFeed,
    resetForMissingUser: slices.feed.resetForMissingUser
  });

  // Live stream: created / read / all-read events over /ws/notifications/.
  // Every envelope carries a fresh unread_count, so the header badge stays
  // correct without polling and converges across tabs/devices.
  const handleStreamReady = useCallback(
    (unreadCount) => {
      if (typeof unreadCount === 'number') {
        dispatch({
          type: NOTIFICATION_ACTIONS.SET_UNREAD_COUNT,
          payload: unreadCount
        });
      }
    },
    [dispatch]
  );

  const handleStreamEvent = useCallback(
    (envelope) => {
      if (typeof envelope?.unread_count === 'number') {
        dispatch({
          type: NOTIFICATION_ACTIONS.SET_UNREAD_COUNT,
          payload: envelope.unread_count
        });
      }
      if (
        envelope?.event_name === 'notification.created' &&
        envelope.notification
      ) {
        dispatch({
          type: NOTIFICATION_ACTIONS.PREPEND_ITEM,
          payload: envelope.notification
        });
        const verb = envelope.notification.verb;
        if (verb) {
          toast.info(String(verb), {
            toastId: `notif-${envelope.notification.id ?? envelope.timestamp}`
          });
        }
        return;
      }
      if (
        envelope?.event_name === 'notification.read' &&
        envelope.notification_id
      ) {
        // Feed item ids are numeric (REST serializer); the envelope carries
        // the id as a string — normalise so the reducer's strict comparison
        // matches.
        const numericId = Number(envelope.notification_id);
        dispatch({
          type: NOTIFICATION_ACTIONS.UPDATE_ITEM,
          payload: {
            id: Number.isNaN(numericId) ? envelope.notification_id : numericId,
            changes: { is_read: true }
          }
        });
        return;
      }
      if (envelope?.event_name === 'notification.all_read') {
        dispatch({ type: NOTIFICATION_ACTIONS.MARK_ALL_READ });
      }
    },
    [dispatch]
  );

  useNotificationsStream({
    enabled: Boolean(support.resolvedUserId),
    onReady: handleStreamReady,
    onEvent: handleStreamEvent
  });

  return useNotificationsProviderValue({
    state,
    aiChannelsCatalog: AI_CHANNELS,
    refreshFeed: slices.feed.refreshFeed,
    applyFilters: slices.feed.applyFilters,
    loadNextPage: slices.feed.loadNextPage,
    markAsRead: slices.feed.markAsRead,
    markAllRead: slices.feed.markAllRead,
    refreshUnreadCount: slices.feed.refreshUnreadCount,
    loadPreferences: slices.preferences.loadPreferences,
    upsertSeedNotificationPreference:
      slices.preferences.upsertSeedNotificationPreference,
    upsertAiNotificationPreference:
      slices.preferences.upsertAiNotificationPreference,
    toggleGlobalNotifications: slices.preferences.toggleGlobalNotifications
  });
};
