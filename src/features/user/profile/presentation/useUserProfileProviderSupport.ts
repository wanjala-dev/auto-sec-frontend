import { useCallback, useMemo, useRef } from 'react';
import { fetchUserDetail } from '../../../../application/userProfile/userProfileService';
import { extractUserSeedsFromPayload } from '../../../../domain/userProfile/userSeeds';
import { normalizeWorkspaceId as normalizeSeedId } from '../../../../domain/workspace/workspaceId';
import {
  GET_USER,
  USER_ERROR,
  USER_LOADING
} from '../../../../types/userProfileTypes';

const USER_CACHE_TTL = 5 * 60 * 1000;

const resolveSeedIdFromPayload = (payload) => {
  if (!payload) return null;
  if (typeof payload === 'string' || typeof payload === 'number') {
    return normalizeSeedId(payload);
  }
  if (typeof payload !== 'object') return null;
  const directCandidate = normalizeSeedId(
    payload.seed_id ??
      payload.seedId ??
      payload.seed ??
      payload.active_seed_id ??
      payload.activeSeedId ??
      payload.seed?.id ??
      payload.seed?.seed_id ??
      payload.seed?.seedId ??
      payload.seed?.seed ??
      payload.seed?.pk ??
      payload.seed?.uuid
  );
  if (directCandidate) return directCandidate;

  const looksLikeSeed = Boolean(
    payload.seed_name ||
      payload.seedName ||
      payload.slug ||
      payload.name ||
      payload.title ||
      payload.photo_url ||
      payload.logo_url
  );
  if (!looksLikeSeed) return null;

  return normalizeSeedId(payload.id ?? payload.pk ?? payload.uuid);
};

const normalizeUserId = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    return String(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const lower = trimmed.toLowerCase();
    if (lower === 'undefined' || lower === 'null' || lower === 'nan') {
      return null;
    }

    return trimmed;
  }

  if (typeof value === 'object' && value !== null) {
    if ('pk' in value) {
      return normalizeUserId(value.pk);
    }
    if ('id' in value) {
      return normalizeUserId(value.id);
    }
  }

  return null;
};

export const useUserProfileProviderSupport = ({
  state,
  dispatch,
  addToast
}: {
  state: any;
  dispatch: any;
  addToast: any;
}) => {
  const userCacheRef = useRef({});
  const userRequestsRef = useRef({});
  const userSeeds = useMemo(
    () => extractUserSeedsFromPayload(state?.user),
    [state?.user]
  );

  const isCacheEntryFresh = useCallback(
    ({ updatedAt }: { updatedAt?: number } = {}, ttl = USER_CACHE_TTL) => {
      if (!updatedAt) return false;
      return Date.now() - updatedAt < ttl;
    },
    []
  );

  const normalizeSeedValue = useCallback((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') {
      return (
        value?.id ||
        value?.seed_id ||
        value?.seedId ||
        value?.pk ||
        value?.uuid ||
        null
      );
    }
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
    return value;
  }, []);

  const getUser = useCallback(
    async (id, options: { force?: boolean; ttl?: number } = {}) => {
      const { force = false, ttl = USER_CACHE_TTL } = options;
      const normalizedId = normalizeUserId(id);

      if (!normalizedId) {
        console.warn('getUser called with an invalid id:', id);
        return null;
      }

      const cached = userCacheRef.current[normalizedId];
      if (!force && cached && isCacheEntryFresh(cached, ttl)) {
        dispatch({
          type: GET_USER,
          payload: cached.data
        });
        return cached.data;
      }

      if (!force && userRequestsRef.current[normalizedId]) {
        return userRequestsRef.current[normalizedId];
      }

      dispatch({
        type: USER_LOADING
      });

      const requestState: { current: Promise<any> | null } = {
        current: null
      };
      const request = (async () => {
        try {
          const data = await fetchUserDetail(normalizedId);
          userCacheRef.current[normalizedId] = {
            data,
            updatedAt: Date.now()
          };
          dispatch({
            type: GET_USER,
            payload: data
          });
          return data;
        } catch (error) {
          dispatch({
            type: USER_ERROR
          });
          const message =
            error.response?.data?.message ||
            error.message ||
            'Failed to fetch user details';
          if (typeof addToast === 'function') {
            addToast({ message, error: true });
          }
          throw error;
        } finally {
          if (userRequestsRef.current[normalizedId] === requestState.current) {
            delete userRequestsRef.current[normalizedId];
          }
        }
      })();

      requestState.current = request;
      userRequestsRef.current[normalizedId] = request;
      return request;
    },
    [addToast, dispatch, isCacheEntryFresh]
  );

  return {
    userCacheRef,
    userRequestsRef,
    userSeeds,
    isCacheEntryFresh,
    normalizeSeedValue,
    getUser,
    normalizeUserId,
    resolveSeedIdFromPayload
  };
};
