import { useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  fetchNotifications,
  fetchNotificationsByUrl,
  fetchUnreadNotificationsCount,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from '../../../application/notifications/notificationsService';
import {
  normalizeNotificationList,
  normalizeNotificationPagination,
  normalizeUnreadNotificationsCount
} from '../../../domain/notifications/notificationCollections';

type NotificationFilters = Record<string, any>;

type NotificationFeedOptions = {
  force?: boolean;
  append?: boolean;
  reset?: boolean;
  replace?: boolean;
  url?: string | null;
  skipUnreadRefresh?: boolean;
  errorMessage?: string;
};

export const useNotificationsFeedPresentation = ({
  dispatch,
  actions,
  state,
  initialPagination,
  defaultFilters,
  filtersRef,
  feedRequestRef,
  unreadRequestRef,
  cooldownUntilRef,
  cooldownToastRef
}: {
  dispatch: any;
  actions: any;
  state: any;
  initialPagination: any;
  defaultFilters: any;
  filtersRef: any;
  feedRequestRef: any;
  unreadRequestRef: any;
  cooldownUntilRef: any;
  cooldownToastRef: any;
}) => {
  const normalizeFilters = useCallback((filters: NotificationFilters = {}) => {
    const normalized: NotificationFilters = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (key === 'is_read' && value === 'all')
      ) {
        return;
      }
      normalized[key] = value;
    });
    return normalized;
  }, []);

  const mergeFilters = useCallback(
    (
      baseFilters: NotificationFilters = {},
      overrides: NotificationFilters = {}
    ) => {
      const next: NotificationFilters = { ...baseFilters };
      Object.entries(overrides || {}).forEach(([key, value]) => {
        const isString = typeof value === 'string';
        const normalized = isString ? value.trim().toLowerCase() : null;
        const shouldRemove =
          value === undefined ||
          value === null ||
          (isString && value.trim() === '') ||
          normalized === 'all';
        if (shouldRemove) {
          delete next[key];
          return;
        }
        next[key] = value;
      });
      return next;
    },
    []
  );

  const refreshUnreadCount = useCallback(
    async (params: NotificationFilters = {}) => {
      const now = Date.now();
      if (now < cooldownUntilRef.current.unread) {
        return;
      }

      const requestKey = JSON.stringify({ params: params || {} });
      if (
        unreadRequestRef.current.promise &&
        unreadRequestRef.current.key === requestKey
      ) {
        return unreadRequestRef.current.promise;
      }

      dispatch({ type: actions.UNREAD_LOADING, payload: true });

      const request = (async () => {
        try {
          const response = await fetchUnreadNotificationsCount(params);
          const count = normalizeUnreadNotificationsCount(response);
          dispatch({ type: actions.SET_UNREAD_COUNT, payload: count });
          cooldownToastRef.current.unread = false;
        } catch (error) {
          const status = error?.response?.status;
          if (status === 429) {
            const retryAfterHeader = error?.response?.headers?.['retry-after'];
            const retrySeconds = Number(retryAfterHeader);
            const cooldownMs = Number.isFinite(retrySeconds)
              ? retrySeconds * 1000
              : 30_000;
            cooldownUntilRef.current.unread = Date.now() + cooldownMs;
            if (!cooldownToastRef.current.unread) {
              cooldownToastRef.current.unread = true;
              toast.info('Notifications are rate-limited. Retrying shortly.', {
                toastId: 'notif-rate-limit'
              });
            }
          }
          dispatch({ type: actions.SET_UNREAD_COUNT });
        } finally {
          unreadRequestRef.current = { key: null, promise: null };
        }
      })();

      unreadRequestRef.current = { key: requestKey, promise: request };
      return request;
    },
    [
      actions.SET_UNREAD_COUNT,
      actions.UNREAD_LOADING,
      cooldownToastRef,
      cooldownUntilRef,
      dispatch,
      unreadRequestRef
    ]
  );

  const fetchFeed = useCallback(
    async (
      overrideFilters: NotificationFilters = {},
      options: NotificationFeedOptions = {}
    ) => {
      const now = Date.now();
      if (!options?.force && now < cooldownUntilRef.current.feed) {
        return null;
      }

      const append = Boolean(options.append);
      const reset = options.reset ?? !append;
      const replace = Boolean(options.replace);
      const baseFilters = replace
        ? { ...defaultFilters }
        : { ...filtersRef.current };
      const nextFilters = mergeFilters(baseFilters, overrideFilters);

      const requestKey = JSON.stringify({
        url: options.url || null,
        filters: normalizeFilters(nextFilters),
        append,
        reset,
        replace
      });

      if (
        !options?.force &&
        feedRequestRef.current.promise &&
        feedRequestRef.current.key === requestKey
      ) {
        return feedRequestRef.current.promise;
      }

      dispatch({
        type: actions.FETCH_START,
        payload: {
          filters: nextFilters,
          reset
        }
      });

      const request = (async () => {
        try {
          const response = options.url
            ? await fetchNotificationsByUrl(options.url)
            : await fetchNotifications(normalizeFilters(nextFilters));
          const results = normalizeNotificationList(response);
          const pagination = normalizeNotificationPagination(response);
          dispatch({
            type: actions.FETCH_SUCCESS,
            payload: {
              results,
              pagination,
              append
            }
          });
          cooldownToastRef.current.feed = false;
          if (!options?.skipUnreadRefresh) {
            await refreshUnreadCount(
              nextFilters.seed ? { seed: nextFilters.seed } : {}
            );
          }
          return results;
        } catch (error) {
          const status = error?.response?.status;
          if (status === 429) {
            const retryAfterHeader = error?.response?.headers?.['retry-after'];
            const retrySeconds = Number(retryAfterHeader);
            const cooldownMs = Number.isFinite(retrySeconds)
              ? retrySeconds * 1000
              : 30_000;
            cooldownUntilRef.current.feed = Date.now() + cooldownMs;
            if (!cooldownToastRef.current.feed) {
              cooldownToastRef.current.feed = true;
              toast.info('Notifications are rate-limited. Retrying shortly.', {
                toastId: 'notif-rate-limit'
              });
            }
            dispatch({ type: actions.FETCH_ERROR, payload: null });
            return null;
          }

          dispatch({
            type: actions.FETCH_ERROR,
            payload: error?.message || 'Unable to load notifications'
          });
          toast.error(
            options?.errorMessage ||
              error?.response?.data?.detail ||
              'Unable to load notifications.'
          );
          return null;
        } finally {
          feedRequestRef.current = { key: null, promise: null };
        }
      })();

      feedRequestRef.current = { key: requestKey, promise: request };
      return request;
    },
    [
      actions.FETCH_ERROR,
      actions.FETCH_START,
      actions.FETCH_SUCCESS,
      cooldownToastRef,
      cooldownUntilRef,
      defaultFilters,
      dispatch,
      feedRequestRef,
      filtersRef,
      mergeFilters,
      normalizeFilters,
      refreshUnreadCount
    ]
  );

  const loadNextPage = useCallback(() => {
    if (!state.pagination.next) return;
    fetchFeed(
      {},
      {
        append: true,
        url: state.pagination.next,
        skipUnreadRefresh: true
      }
    );
  }, [fetchFeed, state.pagination.next]);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!notificationId) return;
      const existing = state.feed.find((item) => item.id === notificationId);
      if (existing?.is_read) return;
      try {
        await markNotificationAsRead(notificationId);
        dispatch({
          type: actions.UPDATE_ITEM,
          payload: {
            id: notificationId,
            changes: {
              is_read: true,
              read_at: new Date().toISOString()
            }
          }
        });
        await refreshUnreadCount(
          state.filters.seed ? { seed: state.filters.seed } : {}
        );
      } catch (_) {
        toast.error('Unable to mark notification as read.');
      }
    },
    [
      actions.UPDATE_ITEM,
      dispatch,
      refreshUnreadCount,
      state.feed,
      state.filters.seed
    ]
  );

  const markAllRead = useCallback(
    async (params: NotificationFilters = {}) => {
      const requestFilters = normalizeFilters({
        ...state.filters,
        ...params
      });
      try {
        await markAllNotificationsAsRead(requestFilters);
        dispatch({ type: actions.MARK_ALL_READ });
        await refreshUnreadCount(
          requestFilters.seed ? { seed: requestFilters.seed } : {}
        );
      } catch (_) {
        toast.error('Unable to mark all notifications as read.');
      }
    },
    [
      actions.MARK_ALL_READ,
      dispatch,
      normalizeFilters,
      refreshUnreadCount,
      state.filters
    ]
  );

  const refreshFeed = useCallback(
    () => fetchFeed({}, { reset: true }),
    [fetchFeed]
  );

  const applyFilters = useCallback(
    (
      filters: NotificationFilters,
      options: Pick<NotificationFeedOptions, 'replace'> = {}
    ) =>
      fetchFeed(filters, {
        reset: true,
        replace: options.replace ?? true
      }),
    [fetchFeed]
  );

  const resetForMissingUser = useCallback(() => {
    dispatch({
      type: actions.FETCH_SUCCESS,
      payload: {
        results: [],
        pagination: initialPagination,
        append: false
      }
    });
    dispatch({ type: actions.SET_UNREAD_COUNT, payload: 0 });
  }, [
    actions.FETCH_SUCCESS,
    actions.SET_UNREAD_COUNT,
    dispatch,
    initialPagination
  ]);

  return {
    fetchFeed,
    loadNextPage,
    markAsRead,
    markAllRead,
    refreshUnreadCount,
    refreshFeed,
    applyFilters,
    resetForMissingUser
  };
};
