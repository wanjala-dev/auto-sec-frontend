import { useCallback } from 'react';
import {
  GET_ALL_SEEDS,
  GET_SEED,
  GET_USER_SEEDS,
  SEED_ERROR,
  SEED_LOADING
} from '../../../types/seedTypes';
import { refreshStoredWorkspaceContext } from '../../../application/auth/authSessionService';
import { updateStoredUserSession as updateStoredUser } from '../../../application/auth/storedUserService';
import { getDashboardPath } from '../../../constants/navigation';
import { normalizeWorkspaceId as normalizeSeedId } from '../../../domain/workspace/workspaceId';
import { fetchUserWorkspaces } from '../../../application/userProfile/userProfileService';
import {
  fetchWorkspaceDetail,
  listWorkspaces,
  updateWorkspaceDetail
} from '../../../application/workspace/workspaceService';
import {
  readBrowserPathname,
  replaceBrowserRoute
} from '../../../features/navigation/presentation/browserNavigationSupport';

const DEFAULT_CACHE_TTL = 3 * 60 * 1000;

export const useSeedResourcePresentation = ({
  dispatch,
  addToast,
  notifySuccess,
  notifyError,
  isCacheEntryFresh,
  resolveUserId,
  seedCacheRef,
  seedRequestRef,
  latestSeedRef,
  seedsCacheRef,
  userSeedsCacheRef,
  mergeTeamCollections,
  persistSeedSnapshot,
  stateSeed
}: {
  dispatch: any;
  addToast?: ((payload: { message: string; error: boolean }) => void) | null;
  notifySuccess?:
    | ((message: string, options?: Record<string, unknown>) => void)
    | null;
  notifyError?:
    | ((message: string, options?: Record<string, unknown>) => void)
    | null;
  isCacheEntryFresh: (
    { updatedAt }?: { updatedAt?: number },
    ttl?: number
  ) => boolean;
  resolveUserId: (explicitId?: any) => string | null;
  seedCacheRef: any;
  seedRequestRef: any;
  latestSeedRef: any;
  seedsCacheRef: any;
  userSeedsCacheRef: any;
  mergeTeamCollections: (existingTeams: any, incomingTeams: any) => any;
  persistSeedSnapshot: (seedPayload: any) => void;
  stateSeed: any;
}) => {
  const getSeed = useCallback(
    async (id, options = {}) => {
      const { force = false, ttl = DEFAULT_CACHE_TTL } = options as any;
      const seedId = normalizeSeedId(id);

      if (!seedId) {
        if (typeof addToast === 'function') {
          addToast({ message: 'Invalid Seed ID', error: true });
        }
        return null;
      }

      const cached = seedCacheRef.current[seedId];
      if (!force && isCacheEntryFresh(cached, ttl)) {
        dispatch({
          type: GET_SEED,
          payload: cached.data
        });
        return cached.data;
      }

      if (!force && seedRequestRef.current[seedId]) {
        return seedRequestRef.current[seedId];
      }

      dispatch({ type: SEED_LOADING });

      const request = (async () => {
        try {
          let data = null;
          try {
            data = await fetchWorkspaceDetail(seedId);
          } catch (error) {
            if (error?.response?.status !== 404) {
              throw error;
            }
          }

          if (!data) {
            try {
              updateStoredUser((current) => {
                const nextUser = { ...(current || {}) };
                delete nextUser.active_workspace_id;
                delete nextUser.active_seed_id;
                return nextUser;
              });
            } catch (_) {}

            const refreshedWorkspaceId = await refreshStoredWorkspaceContext();
            if (
              refreshedWorkspaceId &&
              (readBrowserPathname().includes(`/dashboard/${seedId}`) ||
                readBrowserPathname().includes(`/home/${seedId}`))
            ) {
              replaceBrowserRoute(getDashboardPath(refreshedWorkspaceId));
              return null;
            }

            return null;
          }

          const snapshotSeed = latestSeedRef.current;
          const snapshotSeedId = normalizeSeedId(
            snapshotSeed?.id ?? snapshotSeed?.seed_id
          );
          let nextSeedState = data;

          if (snapshotSeed && snapshotSeedId && snapshotSeedId === seedId) {
            nextSeedState = {
              ...snapshotSeed,
              ...data,
              teams: mergeTeamCollections(snapshotSeed?.teams, data?.teams)
            };
          } else if (data?.teams) {
            nextSeedState = {
              ...data,
              teams: mergeTeamCollections([], data?.teams)
            };
          }

          persistSeedSnapshot(nextSeedState);
          dispatch({
            type: GET_SEED,
            payload: nextSeedState
          });
          return nextSeedState;
        } catch (error) {
          dispatch({
            type: SEED_ERROR,
            payload: error.message
          });
          if (typeof addToast === 'function') {
            const message =
              error.response?.data?.message ||
              error.response?.data?.detail ||
              error.message ||
              'Failed to load seed';
            addToast({ message, error: true });
          }
          throw error;
        } finally {
          delete seedRequestRef.current[seedId];
        }
      })();

      seedRequestRef.current[seedId] = request;
      return request;
    },
    [
      addToast,
      dispatch,
      isCacheEntryFresh,
      latestSeedRef,
      mergeTeamCollections,
      persistSeedSnapshot,
      seedCacheRef,
      seedRequestRef
    ]
  );

  const updateSeedDetails = useCallback(
    async (
      seedId,
      updates = {},
      {
        suppressSuccessToast = false,
        suppressErrorToast = false,
        successToastMessage = 'Organization profile updated!',
        successToastIcon = '✅'
      } = {}
    ) => {
      const normalizedSeedId = normalizeSeedId(seedId);
      if (!normalizedSeedId) {
        throw new Error('Invalid seed identifier provided.');
      }

      const sanitizedPayload = Object.entries(updates || {}).reduce(
        (accumulator, [key, value]) => {
          if (value !== undefined) {
            accumulator[key] = value;
          }
          return accumulator;
        },
        {}
      );

      if (Object.keys(sanitizedPayload).length === 0) {
        const cachedEntry = seedCacheRef.current[normalizedSeedId];
        if (cachedEntry?.data) {
          return cachedEntry.data;
        }
        const activeSeedId =
          normalizeSeedId(
            stateSeed?.id ??
              stateSeed?.pk ??
              stateSeed?.uuid ??
              stateSeed?.slug ??
              stateSeed?.seed_id ??
              null
          ) ?? null;
        if (activeSeedId && activeSeedId === normalizedSeedId) {
          return stateSeed;
        }
        return null;
      }

      // Optimistic update: immediately reflect the change in the seed context
      // so all consumers (FloatingButton, RightSideBar, ForYouTodayCard, etc.)
      // see the new value before the API call completes.
      const optimisticSeed = stateSeed
        ? { ...stateSeed, ...sanitizedPayload }
        : null;
      if (optimisticSeed) {
        dispatch({ type: GET_SEED, payload: optimisticSeed });
      }

      try {
        let resolvedSeed = await updateWorkspaceDetail(
          normalizedSeedId,
          sanitizedPayload
        );

        if (resolvedSeed) {
          // Merge the request payload into the response so any field the
          // backend doesn't echo back (e.g. ai_teammate_enabled) still
          // reflects what the user just set.
          const mergedSeed = { ...resolvedSeed, ...sanitizedPayload };
          seedCacheRef.current[normalizedSeedId] = {
            data: mergedSeed,
            updatedAt: Date.now()
          };
          dispatch({
            type: GET_SEED,
            payload: mergedSeed
          });

          // Patch the all-seeds list too so the sidebar logo column,
          // workspace switcher, and anywhere else that reads from the
          // cached list reflects the update. Previously only the
          // single-seed cache was updated, so photo / name / cover
          // changes didn't propagate until the next full refresh.
          const cachedList = seedsCacheRef.current?.data;
          if (Array.isArray(cachedList)) {
            let matched = false;
            const patched = cachedList.map((entry: any) => {
              const entrySeedId = normalizeSeedId(
                entry?.id ?? entry?.pk ?? entry?.uuid ?? entry?.slug ?? null
              );
              if (entrySeedId && entrySeedId === normalizedSeedId) {
                matched = true;
                return { ...entry, ...mergedSeed };
              }
              return entry;
            });
            if (matched) {
              seedsCacheRef.current = {
                ...seedsCacheRef.current,
                data: patched,
                updatedAt: Date.now()
              };
              dispatch({
                type: GET_ALL_SEEDS,
                payload: patched
              });
            }
          }

          resolvedSeed = mergedSeed;
        } else {
          delete seedCacheRef.current[normalizedSeedId];
          resolvedSeed = await getSeed(normalizedSeedId, { force: true });
        }

        if (!suppressSuccessToast && typeof notifySuccess === 'function') {
          notifySuccess(successToastMessage, { icon: successToastIcon });
        }
        return resolvedSeed;
      } catch (error) {
        // Revert the optimistic update on failure
        if (stateSeed) {
          dispatch({ type: GET_SEED, payload: stateSeed });
        }
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error?.message ||
          'Failed to update organization profile';
        if (!suppressErrorToast && typeof notifyError === 'function') {
          notifyError(message, { icon: '⚠️' });
        }
        throw error;
      }
    },
    [
      dispatch,
      getSeed,
      notifyError,
      notifySuccess,
      seedCacheRef,
      seedsCacheRef,
      stateSeed
    ]
  );

  const getAllseeds = useCallback(
    async (options = {}) => {
      const { force = false, ttl = DEFAULT_CACHE_TTL } = options as any;

      const cached = seedsCacheRef.current;
      if (!force && cached?.data && isCacheEntryFresh(cached, ttl)) {
        dispatch({
          type: GET_ALL_SEEDS,
          payload: cached.data
        });
        return cached.data;
      }

      if (!force && cached.promise) {
        return cached.promise;
      }

      dispatch({ type: SEED_LOADING });

      const request = (async () => {
        try {
          const data = await listWorkspaces();
          seedsCacheRef.current = {
            data,
            updatedAt: Date.now(),
            promise: null
          };
          dispatch({
            type: GET_ALL_SEEDS,
            payload: data
          });
          return data;
        } catch (error) {
          dispatch({
            type: SEED_ERROR,
            payload: error.message
          });
          if (typeof addToast === 'function') {
            const message =
              error.response?.data?.message ||
              error.message ||
              'Failed to fetch seeds';
            addToast({ message, error: true });
          }
          throw error;
        } finally {
          seedsCacheRef.current.promise = null;
        }
      })();

      seedsCacheRef.current.promise = request;
      return request;
    },
    [addToast, dispatch, isCacheEntryFresh, seedsCacheRef]
  );

  const getUserSeed = useCallback(
    async (id, options = {}) => {
      const { force = false, ttl = DEFAULT_CACHE_TTL } = options as any;
      const resolvedUserId = resolveUserId(id);
      if (!resolvedUserId) {
        return [];
      }

      const cacheKey = String(resolvedUserId);
      const cachedEntry = userSeedsCacheRef.current[cacheKey];

      if (!force && cachedEntry?.data && isCacheEntryFresh(cachedEntry, ttl)) {
        dispatch({
          type: GET_USER_SEEDS,
          payload: cachedEntry.data
        });
        return cachedEntry.data;
      }

      if (!force && cachedEntry?.promise) {
        return cachedEntry.promise;
      }

      dispatch({ type: SEED_LOADING });

      const request = (async () => {
        try {
          const payload = await fetchUserWorkspaces(resolvedUserId);
          userSeedsCacheRef.current[cacheKey] = {
            data: payload,
            updatedAt: Date.now(),
            promise: null
          };
          dispatch({
            type: GET_USER_SEEDS,
            payload
          });
          return payload;
        } catch (error) {
          dispatch({
            type: SEED_ERROR,
            payload: error?.message || 'Failed to fetch user seeds'
          });
          if (typeof addToast === 'function') {
            const message =
              error?.response?.data?.message ||
              error?.response?.data?.detail ||
              error?.message ||
              'Failed to load your seeds';
            addToast({ message, error: true });
          }
          throw error;
        } finally {
          const existingEntry = userSeedsCacheRef.current[cacheKey];
          if (existingEntry) {
            userSeedsCacheRef.current[cacheKey] = {
              ...existingEntry,
              promise: null
            };
          } else {
            userSeedsCacheRef.current[cacheKey] = {
              data: null,
              updatedAt: 0,
              promise: null
            };
          }
        }
      })();

      userSeedsCacheRef.current[cacheKey] = {
        ...(cachedEntry || {}),
        promise: request
      };

      return request;
    },
    [addToast, dispatch, isCacheEntryFresh, resolveUserId, userSeedsCacheRef]
  );

  return {
    getSeed,
    updateSeedDetails,
    getAllseeds,
    getUserSeed
  };
};
