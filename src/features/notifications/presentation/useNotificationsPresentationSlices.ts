import { useNotificationsFeedPresentation } from './useNotificationsFeedPresentation';
import { useNotificationsPreferencesPresentation } from './useNotificationsPreferencesPresentation';

export const useNotificationsPresentationSlices = ({
  dispatch,
  state,
  resolvedUserId,
  support,
  config
}) => {
  const feed = useNotificationsFeedPresentation({
    dispatch,
    actions: config.actions,
    state,
    initialPagination: config.initialPagination,
    defaultFilters: config.defaultFilters,
    filtersRef: support.filtersRef,
    feedRequestRef: support.feedRequestRef,
    unreadRequestRef: support.unreadRequestRef,
    cooldownUntilRef: support.cooldownUntilRef,
    cooldownToastRef: support.cooldownToastRef
  });

  const preferences = useNotificationsPreferencesPresentation({
    dispatch,
    actions: config.actions,
    resolvedUserId
  });

  return {
    feed,
    preferences
  };
};
