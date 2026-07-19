import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DISMISS_BANNER,
  FOLLOW_SEED_ERROR,
  FOLLOW_SEED_LOADING,
  GET_BANNERS_ERROR,
  GET_BANNERS_LOADING,
  GET_BANNERS_SUCCESS,
  GET_SETUP_STATUS_ERROR,
  GET_SETUP_STATUS_LOADING,
  GET_SETUP_STATUS_SUCCESS,
  SET_DISMISSED_BANNERS,
  UPDATE_SEED_FOLLOW_STATE
} from '../../../types/seedTypes';
import {
  getAgentTeammateProfile,
  updateAgentTeammateAlias,
  updateAgentTeammateAvatar
} from '../../../application/agents/agentsService';
import { listWorkspaceBanners } from '../../../application/announcements/announcementsService';
import { listOrganizationSectors } from '../../../application/sectors/sectorsService';
import {
  fetchWorkspaceSetupStatus,
  followWorkspace as followWorkspaceRequest,
  followWorkspaces as followWorkspacesRequest,
  listWorkspaceCommunicationChannels,
  unfollowWorkspace as unfollowWorkspaceRequest,
  unfollowWorkspaces as unfollowWorkspacesRequest
} from '../../../application/workspace/workspaceService';
import { normalizeWorkspaceId as normalizeSeedId } from '../../../domain/workspace/workspaceId';
import {
  readBrowserLocalJsonState,
  writeBrowserLocalJsonState
} from '../../session/presentation/browserLocalStateSupport';

const DEFAULT_CACHE_TTL = 3 * 60 * 1000;
const BANNER_STORAGE_PREFIX = 'seed.dismissedBanners.';

const getDismissedBannerStorageKey = (seedId: string | number | null) => {
  const normalizedSeedId = normalizeSeedId(seedId);
  if (!normalizedSeedId) return null;
  return `${BANNER_STORAGE_PREFIX}${normalizedSeedId}`;
};

const parseDismissedBannerIds = (serialized: unknown) => {
  if (typeof serialized !== 'string') return [];
  try {
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((id) => String(id))
      .filter((id) => id !== null && id !== undefined && id.length > 0);
  } catch (error) {
    return [];
  }
};

export const useSeedWorkspacePresentation = ({
  activeSeed,
  activeBanners = [],
  dispatch,
  addToast,
  getSeed,
  isCacheEntryFresh
}: {
  activeSeed: any;
  activeBanners?: any[];
  dispatch: any;
  addToast?: ((payload: { message: string; error: boolean }) => void) | null;
  getSeed: (
    seedId: string | number,
    options?: Record<string, unknown>
  ) => Promise<any>;
  isCacheEntryFresh: (entry: any, ttl?: number) => boolean;
}) => {
  const [sectors, setSectors] = useState<any[]>([]);
  const [sectorsLoading, setSectorsLoading] = useState(false);
  const [sectorsError, setSectorsError] = useState<any>(null);
  const sectorsRequestRef = useRef<Promise<any> | null>(null);

  const [aiTeammateAliases, setAiTeammateAliases] = useState<
    Record<string, string>
  >({});
  // Assistant avatar cache, keyed like the alias cache. ``undefined``
  // (key absent) = never fetched; '' = fetched, workspace uses the
  // platform default mark. Both halves populate from the SAME teammate
  // fetch so identity consumers never fan out extra requests.
  const [aiTeammateAvatars, setAiTeammateAvatars] = useState<
    Record<string, string>
  >({});
  const [communicationChannelsBySeed, setCommunicationChannelsBySeed] =
    useState<Record<string, any[]>>({});
  const [communicationChannelsLoading, setCommunicationChannelsLoading] =
    useState<Record<string, boolean>>({});
  const [communicationChannelsError, setCommunicationChannelsError] = useState<
    Record<string, any>
  >({});

  const bannerCacheRef = useRef<Record<string, any>>({});
  const bannerRequestRef = useRef<Record<string, Promise<any>>>({});
  const setupStatusCacheRef = useRef<Record<string, any>>({});
  const setupStatusRequestRef = useRef<Record<string, Promise<any>>>({});
  const activeSeedIdRef = useRef<string | null>(null);
  const communicationChannelRequestsRef = useRef<Record<string, Promise<any>>>(
    {}
  );

  const fetchSectors = useCallback(
    async ({ force = false } = {}) => {
      if (!force && Array.isArray(sectors) && sectors.length) {
        return sectors;
      }

      if (!force && sectorsRequestRef.current) {
        return sectorsRequestRef.current;
      }

      setSectorsLoading(true);
      setSectorsError(null);

      const request = (async () => {
        try {
          const normalized = await listOrganizationSectors();
          setSectors(normalized);
          return normalized;
        } catch (error) {
          setSectorsError(error);
          const fallback = [
            { id: 'nonprofit', name: 'Nonprofit', slug: 'nonprofit' },
            { id: 'education', name: 'Education', slug: 'education' },
            { id: 'health', name: 'Health', slug: 'health' },
            { id: 'finance', name: 'Finance', slug: 'finance' },
            {
              id: 'cybersecurity',
              name: 'Cybersecurity',
              slug: 'cybersecurity'
            }
          ];
          setSectors(fallback);
          return fallback;
        } finally {
          setSectorsLoading(false);
          sectorsRequestRef.current = null;
        }
      })();

      sectorsRequestRef.current = request;
      return request;
    },
    [sectors]
  );

  const fetchCommunicationChannelsForSeed = useCallback(
    async (seedId: string | number | null, { force = false } = {}) => {
      const normalizedSeedId = normalizeSeedId(
        seedId ?? activeSeedIdRef.current
      );
      if (!normalizedSeedId) {
        return [];
      }

      if (communicationChannelRequestsRef.current[normalizedSeedId]) {
        return communicationChannelRequestsRef.current[normalizedSeedId];
      }

      if (!force && communicationChannelsBySeed[normalizedSeedId]) {
        return communicationChannelsBySeed[normalizedSeedId];
      }

      setCommunicationChannelsLoading((prev) => ({
        ...prev,
        [normalizedSeedId]: true
      }));
      setCommunicationChannelsError((prev) => ({
        ...prev,
        [normalizedSeedId]: null
      }));

      const request = listWorkspaceCommunicationChannels(normalizedSeedId)
        .then((normalized) => {
          setCommunicationChannelsBySeed((prev) => ({
            ...prev,
            [normalizedSeedId]: normalized
          }));
          return normalized;
        })
        .catch((error) => {
          setCommunicationChannelsError((prev) => ({
            ...prev,
            [normalizedSeedId]: error
          }));
          setCommunicationChannelsBySeed((prev) => ({
            ...prev,
            [normalizedSeedId]: []
          }));
          return [];
        })
        .finally(() => {
          setCommunicationChannelsLoading((prev) => ({
            ...prev,
            [normalizedSeedId]: false
          }));
          delete communicationChannelRequestsRef.current[normalizedSeedId];
        });

      communicationChannelRequestsRef.current[normalizedSeedId] = request;
      return request;
    },
    [communicationChannelsBySeed]
  );

  const getCommunicationChannelsForSeed = useCallback(
    (seedId: string | number | null) => {
      const normalizedSeedId = normalizeSeedId(
        seedId ?? activeSeedIdRef.current
      );
      if (!normalizedSeedId) return [];
      return communicationChannelsBySeed[normalizedSeedId] || [];
    },
    [communicationChannelsBySeed]
  );

  const loadDismissedBannersForSeed = useCallback(
    (seedId: string | number | null) => {
      const storageKey = getDismissedBannerStorageKey(seedId);
      if (!storageKey) {
        dispatch({ type: SET_DISMISSED_BANNERS, payload: [] });
        return [];
      }
      const parsed = parseDismissedBannerIds(
        JSON.stringify(readBrowserLocalJsonState<any[]>(storageKey) ?? [])
      );
      dispatch({ type: SET_DISMISSED_BANNERS, payload: parsed });
      return parsed;
    },
    [dispatch]
  );

  const persistDismissedBannerId = useCallback(
    (seedId: string | number | null, bannerId: string | number | null) => {
      const storageKey = getDismissedBannerStorageKey(seedId);
      if (!storageKey || bannerId === null || bannerId === undefined) {
        return;
      }
      const existing = parseDismissedBannerIds(
        JSON.stringify(readBrowserLocalJsonState<any[]>(storageKey) ?? [])
      );
      const bannerKey = String(bannerId);
      if (!existing.includes(bannerKey)) {
        existing.push(bannerKey);
        writeBrowserLocalJsonState(storageKey, existing);
      }
    },
    []
  );

  const fetchSeedBanners = useCallback(
    async (
      seedId: string | number | null,
      options: Record<string, any> = {}
    ) => {
      const fallbackSeedId = activeSeedIdRef.current;
      const normalizedSeedId = normalizeSeedId(seedId ?? fallbackSeedId);
      if (!normalizedSeedId) return [];

      const {
        force = false,
        ttl = DEFAULT_CACHE_TTL,
        params: extraParams
      } = options;

      if (activeSeedIdRef.current !== normalizedSeedId) {
        activeSeedIdRef.current = normalizedSeedId;
        loadDismissedBannersForSeed(normalizedSeedId);
      }

      const cacheKey = normalizedSeedId;
      const cached = bannerCacheRef.current[cacheKey];
      if (!force && cached && isCacheEntryFresh(cached, ttl)) {
        dispatch({
          type: GET_BANNERS_SUCCESS,
          payload: cached.data || []
        });
        return cached.data || [];
      }

      if (!force && bannerRequestRef.current[cacheKey]) {
        return bannerRequestRef.current[cacheKey];
      }

      dispatch({ type: GET_BANNERS_LOADING });

      const request = (async () => {
        try {
          const normalizedList = await listWorkspaceBanners(
            normalizedSeedId,
            extraParams || {}
          );

          bannerCacheRef.current[cacheKey] = {
            data: normalizedList,
            updatedAt: Date.now()
          };
          dispatch({
            type: GET_BANNERS_SUCCESS,
            payload: normalizedList
          });
          return normalizedList;
        } catch (error: any) {
          const message =
            error?.response?.data?.message ||
            error?.message ||
            'Failed to load banners';
          dispatch({
            type: GET_BANNERS_ERROR,
            payload: message
          });
          if (typeof addToast === 'function') {
            addToast({ message, error: true });
          }
          throw error;
        } finally {
          delete bannerRequestRef.current[cacheKey];
        }
      })();

      bannerRequestRef.current[cacheKey] = request;
      return request;
    },
    [addToast, dispatch, isCacheEntryFresh, loadDismissedBannersForSeed]
  );

  const fetchSeedSetupStatus = useCallback(
    async (
      seedId: string | number | null,
      options: Record<string, any> = {}
    ) => {
      const fallbackSeedId = activeSeedIdRef.current;
      const normalizedSeedId = normalizeSeedId(seedId ?? fallbackSeedId);
      if (!normalizedSeedId) return null;

      const {
        force = false,
        ttl = DEFAULT_CACHE_TTL,
        params: extraParams
      } = options;

      const cacheKey = normalizedSeedId;
      const cached = setupStatusCacheRef.current[cacheKey];
      if (!force && cached && isCacheEntryFresh(cached, ttl)) {
        dispatch({
          type: GET_SETUP_STATUS_SUCCESS,
          payload: {
            setupStatus: cached.data,
            recommendationBanners: cached.recommendationBanners || []
          }
        });
        return cached.data;
      }

      if (!force && setupStatusRequestRef.current[cacheKey]) {
        return setupStatusRequestRef.current[cacheKey];
      }

      dispatch({ type: GET_SETUP_STATUS_LOADING });

      const request = (async () => {
        try {
          const { setupStatus: payload, recommendationBanners } =
            await fetchWorkspaceSetupStatus(
              normalizedSeedId,
              extraParams || {}
            );

          setupStatusCacheRef.current[cacheKey] = {
            data: payload,
            recommendationBanners,
            updatedAt: Date.now()
          };

          dispatch({
            type: GET_SETUP_STATUS_SUCCESS,
            payload: {
              setupStatus: payload,
              recommendationBanners
            }
          });
          return payload;
        } catch (error: any) {
          const message =
            error?.response?.data?.message ||
            error?.message ||
            'Failed to load setup status';
          dispatch({
            type: GET_SETUP_STATUS_ERROR,
            payload: message
          });
          if (typeof addToast === 'function') {
            addToast({ message, error: true });
          }
          throw error;
        } finally {
          delete setupStatusRequestRef.current[cacheKey];
        }
      })();

      setupStatusRequestRef.current[cacheKey] = request;
      return request;
    },
    [addToast, dispatch, isCacheEntryFresh]
  );

  const refreshSeedAnnouncements = useCallback(
    async (seedId: string | number | null) => {
      const normalizedSeedId = normalizeSeedId(
        seedId ?? activeSeedIdRef.current
      );
      if (!normalizedSeedId) return;
      await Promise.all([
        fetchSeedBanners(normalizedSeedId, { force: true }),
        fetchSeedSetupStatus(normalizedSeedId, { force: true })
      ]);
    },
    [fetchSeedBanners, fetchSeedSetupStatus]
  );

  const dismissBanner = useCallback(
    (bannerId: string | number | null, options: Record<string, any> = {}) => {
      if (bannerId === null || bannerId === undefined) return;
      const identifier = String(bannerId);
      const target =
        activeBanners?.find(
          (banner) => String(banner?.id ?? banner?.bannerId) === identifier
        ) || null;
      if (target && target.dismissible === false) {
        return;
      }
      dispatch({ type: DISMISS_BANNER, payload: identifier });
      const fallbackSeedId =
        target?.seedId ?? activeSeedIdRef.current ?? options?.seedId;
      const resolvedSeedId = normalizeSeedId(
        options?.seedId ?? target?.seedId ?? fallbackSeedId
      );
      if (resolvedSeedId) {
        persistDismissedBannerId(resolvedSeedId, identifier);
      }
    },
    [activeBanners, dispatch, persistDismissedBannerId]
  );

  useEffect(() => {
    if (!activeSeed) {
      return;
    }
    const candidateId =
      activeSeed?.id ??
      activeSeed?.seed_id ??
      activeSeed?.seed ??
      activeSeed?.uuid ??
      null;
    const normalizedSeedId = normalizeSeedId(candidateId);
    if (!normalizedSeedId) {
      return;
    }
    if (activeSeedIdRef.current !== normalizedSeedId) {
      activeSeedIdRef.current = normalizedSeedId;
      loadDismissedBannersForSeed(normalizedSeedId);
      fetchSeedBanners(normalizedSeedId).catch(() => {});
      fetchSeedSetupStatus(normalizedSeedId).catch(() => {});
    }
  }, [
    activeSeed,
    fetchSeedBanners,
    fetchSeedSetupStatus,
    loadDismissedBannersForSeed
  ]);

  const followSeed = useCallback(
    async (seedId: string | number) => {
      const normalizedSeedId = normalizeSeedId(seedId);
      if (!normalizedSeedId) {
        throw new Error('A valid seed identifier is required to follow.');
      }
      dispatch({
        type: FOLLOW_SEED_LOADING,
        payload: { seedId: normalizedSeedId, loading: true }
      });
      try {
        const response = await followWorkspaceRequest(normalizedSeedId);
        dispatch({
          type: UPDATE_SEED_FOLLOW_STATE,
          payload: {
            seedId: normalizedSeedId,
            isFollowing: true,
            deltaFollowers: 1
          }
        });
        return response || null;
      } catch (error: any) {
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          'Unable to follow organization.';
        dispatch({
          type: FOLLOW_SEED_ERROR,
          payload: { seedId: normalizedSeedId, error: message }
        });
        throw error;
      } finally {
        dispatch({
          type: FOLLOW_SEED_LOADING,
          payload: { seedId: normalizedSeedId, loading: false }
        });
      }
    },
    [dispatch]
  );

  const unfollowSeed = useCallback(
    async (seedId: string | number) => {
      const normalizedSeedId = normalizeSeedId(seedId);
      if (!normalizedSeedId) {
        throw new Error('A valid seed identifier is required to unfollow.');
      }
      dispatch({
        type: FOLLOW_SEED_LOADING,
        payload: { seedId: normalizedSeedId, loading: true }
      });
      try {
        const response = await unfollowWorkspaceRequest(normalizedSeedId);
        dispatch({
          type: UPDATE_SEED_FOLLOW_STATE,
          payload: {
            seedId: normalizedSeedId,
            isFollowing: false,
            deltaFollowers: -1
          }
        });
        return response || null;
      } catch (error: any) {
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          'Unable to unfollow organization.';
        dispatch({
          type: FOLLOW_SEED_ERROR,
          payload: { seedId: normalizedSeedId, error: message }
        });
        throw error;
      } finally {
        dispatch({
          type: FOLLOW_SEED_LOADING,
          payload: { seedId: normalizedSeedId, loading: false }
        });
      }
    },
    [dispatch]
  );

  const followSeeds = useCallback(
    async (seedIds: Array<string | number> = []) => {
      const normalizedSeeds = Array.from(
        new Set(
          (Array.isArray(seedIds) ? seedIds : [])
            .map((id) => normalizeSeedId(id))
            .filter(Boolean)
        )
      );
      if (!normalizedSeeds.length) {
        return null;
      }
      normalizedSeeds.forEach((id) =>
        dispatch({
          type: FOLLOW_SEED_LOADING,
          payload: { seedId: id, loading: true }
        })
      );
      try {
        const response = await followWorkspacesRequest(normalizedSeeds);
        const followedArray = Array.isArray(response?.followed)
          ? response.followed
          : normalizedSeeds;
        followedArray
          .map((id) => normalizeSeedId(id))
          .filter(Boolean)
          .forEach((id) =>
            dispatch({
              type: UPDATE_SEED_FOLLOW_STATE,
              payload: {
                seedId: id,
                isFollowing: true,
                deltaFollowers: 1
              }
            })
          );
        return response || null;
      } catch (error: any) {
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          'Unable to follow organizations.';
        normalizedSeeds.forEach((id) =>
          dispatch({
            type: FOLLOW_SEED_ERROR,
            payload: { seedId: id, error: message }
          })
        );
        throw error;
      } finally {
        normalizedSeeds.forEach((id) =>
          dispatch({
            type: FOLLOW_SEED_LOADING,
            payload: { seedId: id, loading: false }
          })
        );
      }
    },
    [dispatch]
  );

  const unfollowSeeds = useCallback(
    async (seedIds: Array<string | number> = []) => {
      const normalizedSeeds = Array.from(
        new Set(
          (Array.isArray(seedIds) ? seedIds : [])
            .map((id) => normalizeSeedId(id))
            .filter(Boolean)
        )
      );
      if (!normalizedSeeds.length) {
        return null;
      }
      normalizedSeeds.forEach((id) =>
        dispatch({
          type: FOLLOW_SEED_LOADING,
          payload: { seedId: id, loading: true }
        })
      );
      try {
        const response = await unfollowWorkspacesRequest(normalizedSeeds);
        const unfollowedArray = Array.isArray(response?.unfollowed)
          ? response.unfollowed
          : normalizedSeeds;
        unfollowedArray
          .map((id) => normalizeSeedId(id))
          .filter(Boolean)
          .forEach((id) =>
            dispatch({
              type: UPDATE_SEED_FOLLOW_STATE,
              payload: {
                seedId: id,
                isFollowing: false,
                deltaFollowers: -1
              }
            })
          );
        return response || null;
      } catch (error: any) {
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          'Unable to unfollow organizations.';
        normalizedSeeds.forEach((id) =>
          dispatch({
            type: FOLLOW_SEED_ERROR,
            payload: { seedId: id, error: message }
          })
        );
        throw error;
      } finally {
        normalizedSeeds.forEach((id) =>
          dispatch({
            type: FOLLOW_SEED_LOADING,
            payload: { seedId: id, loading: false }
          })
        );
      }
    },
    [dispatch]
  );

  // De-dupe concurrent alias fetches per workspace. Several components mount the
  // useAiTeammateAlias hook on the same page (ConversationDetail, useChatSession,
  // the agents directory…); before the context cache populates they'd each fire
  // their own GET /ai/agents/teammate/<ws>/. A shared in-flight promise keyed by
  // workspace collapses those into ONE request — the rest await the same promise.
  const inFlightAliasFetches = useRef<Map<string, Promise<string>>>(new Map());

  const fetchAiTeammateAlias = useCallback(async (seedId: string | number) => {
    if (!seedId) {
      return 'Orchestrator Agent';
    }

    const normalized = normalizeSeedId(seedId);
    const cacheKey = normalized || String(seedId);

    const inFlight = inFlightAliasFetches.current.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const request = (async () => {
      try {
        const { alias, avatarUrl } = await getAgentTeammateProfile(seedId);
        const resolvedAlias = alias || 'Orchestrator Agent';
        if (normalized) {
          setAiTeammateAliases((previous) => ({
            ...previous,
            [normalized]: resolvedAlias
          }));
          setAiTeammateAvatars((previous) => ({
            ...previous,
            [normalized]: avatarUrl || ''
          }));
        }
        return resolvedAlias;
      } catch (error: any) {
        if (error?.response?.status === 404) {
          const resolvedAlias = 'Orchestrator Agent';
          if (normalized) {
            setAiTeammateAliases((previous) => ({
              ...previous,
              [normalized]: resolvedAlias
            }));
            setAiTeammateAvatars((previous) => ({
              ...previous,
              [normalized]: ''
            }));
          }
          return resolvedAlias;
        }
        throw error;
      } finally {
        inFlightAliasFetches.current.delete(cacheKey);
      }
    })();

    inFlightAliasFetches.current.set(cacheKey, request);
    return request;
  }, []);

  const renameAiTeammate = useCallback(
    async (seedId: string | number, displayName: string) => {
      if (!seedId) {
        throw new Error(
          'Seed ID is required to rename the orchestrator agent.'
        );
      }

      const payload = {
        display_name:
          typeof displayName === 'string' && displayName.trim().length
            ? displayName.trim()
            : ''
      };

      try {
        const response = await updateAgentTeammateAlias(
          seedId,
          payload.display_name
        );
        const responseAlias =
          response?.display_name ?? payload.display_name ?? '';
        const normalized = normalizeSeedId(seedId);
        const resolvedAlias =
          responseAlias && responseAlias.trim().length
            ? responseAlias.trim()
            : 'Orchestrator Agent';
        if (!normalized) {
          try {
            await getSeed(seedId, { force: true });
          } catch (_) {}
          return response || { seed_id: seedId, display_name: resolvedAlias };
        }
        setAiTeammateAliases((previous) => ({
          ...previous,
          [normalized]: resolvedAlias
        }));
        if (typeof response?.avatar_url === 'string') {
          setAiTeammateAvatars((previous) => ({
            ...previous,
            [normalized]: response.avatar_url
          }));
        }
        try {
          await getSeed(seedId, { force: true });
        } catch (_) {}
        return response || { seed_id: seedId, display_name: resolvedAlias };
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404) {
          const normalized = normalizeSeedId(seedId);
          const resolvedAlias = payload.display_name || 'Orchestrator Agent';
          if (!normalized) {
            return { workspace_id: seedId, display_name: resolvedAlias };
          }
          setAiTeammateAliases((previous) => ({
            ...previous,
            [normalized]: resolvedAlias
          }));
          return { workspace_id: seedId, display_name: resolvedAlias };
        }
        throw error;
      }
    },
    [getSeed]
  );

  const updateAiTeammateAvatar = useCallback(
    async (seedId: string | number, avatarUrl: string) => {
      if (!seedId) {
        throw new Error('Seed ID is required to update the assistant avatar.');
      }
      const response = await updateAgentTeammateAvatar(seedId, avatarUrl);
      const normalized = normalizeSeedId(seedId);
      if (normalized) {
        setAiTeammateAvatars((previous) => ({
          ...previous,
          [normalized]:
            typeof response?.avatar_url === 'string'
              ? response.avatar_url
              : avatarUrl || ''
        }));
      }
      return response;
    },
    []
  );

  return {
    sectors,
    sectorsLoading,
    sectorsError,
    fetchSectors,
    communicationChannelsBySeed,
    communicationChannelsLoading,
    communicationChannelsError,
    fetchCommunicationChannelsForSeed,
    getCommunicationChannelsForSeed,
    fetchSeedBanners,
    fetchSeedSetupStatus,
    refreshSeedAnnouncements,
    dismissBanner,
    followSeed,
    unfollowSeed,
    followSeeds,
    unfollowSeeds,
    aiTeammateAliases,
    aiTeammateAvatars,
    fetchAiTeammateAlias,
    renameAiTeammate,
    updateAiTeammateAvatar
  };
};
