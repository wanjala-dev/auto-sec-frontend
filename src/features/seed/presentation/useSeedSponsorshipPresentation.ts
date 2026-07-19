import { useCallback, useState } from 'react';
import {
  CHILD_STATUS_UPDATE_ERROR,
  CHILD_STATUS_UPDATE_LOADING,
  CHILD_STATUS_UPDATE_SUCCESS,
  DELETE_STATUS_UPDATES,
  EDIT_STATUS_UPDATES,
  GET_CHILD_SUCCESS,
  GET_STATUS_UPDATE,
  TEAM_EVENTS_ERROR,
  TEAM_EVENTS_LOADING,
  TEAM_EVENTS_SUCCESS,
  TEAM_EVENT_SUBMITTING
} from '../../../types/seedTypes';
import {
  createCampaign as createCampaignRequest,
  createChildStatusUpdate as createChildStatusUpdateRequest,
  createTeamEvent as createTeamEventRequest,
  deleteChildStatusUpdate as deleteChildStatusUpdateRequest,
  editChildStatusUpdate as editChildStatusUpdateRequest,
  fetchCampaignMeta as fetchCampaignMetaRequest,
  fetchChildStatusUpdate,
  listCampaigns as listCampaignsRequest,
  listChildStatusUpdates,
  listTeamEvents as listTeamEventsRequest
} from '../../../application/sponsorship/sponsorshipService';
import { normalizeWorkspaceId as normalizeSeedId } from '../../../domain/workspace/workspaceId';

const DEFAULT_CACHE_TTL = 3 * 60 * 1000;

export const useSeedSponsorshipPresentation = ({
  dispatch,
  addToast,
  seedCacheRef,
  seedRequestRef,
  stateTeamEvents
}: {
  dispatch: any;
  addToast?: ((payload: { message: string; error: boolean }) => void) | null;
  seedCacheRef: any;
  seedRequestRef: any;
  stateTeamEvents: any;
}) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignsTotal, setCampaignsTotal] = useState(0);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<any>(null);
  const [campaignSubmitting, setCampaignSubmitting] = useState(false);
  const [campaignCategories, setCampaignCategories] = useState<any[]>([]);
  const [campaignCategoriesLoading, setCampaignCategoriesLoading] =
    useState(false);
  const [campaignCategoriesError, setCampaignCategoriesError] =
    useState<any>(null);
  const [campaignBudgets, setCampaignBudgets] = useState<any[]>([]);
  const [childStatusUpdates, setChildStatusUpdates] = useState<any[]>([]);

  const campaignsRequestRef = useState(() => ({
    current: {} as Record<string, Promise<any>>
  }))[0];
  const campaignCategoriesFetchedRef = useState(() => ({ current: false }))[0];

  const getCampaigns = useCallback(
    async (seedId, { append = false, force = false } = {}) => {
      const normalizedSeed = normalizeSeedId(seedId);
      if (!normalizedSeed) {
        setCampaigns([]);
        setCampaignsTotal(0);
        return [];
      }

      const requestKey = `${normalizedSeed}-${append ? 'append' : 'replace'}`;
      if (!force && campaignsRequestRef.current[requestKey]) {
        return campaignsRequestRef.current[requestKey];
      }

      setCampaignsLoading(true);
      setCampaignsError(null);

      const requestPromise = (async () => {
        try {
          const { items, total } = await listCampaignsRequest(normalizedSeed);
          setCampaigns((previous) => {
            const next = append ? [...previous, ...items] : items;
            setCampaignsTotal(
              typeof total === 'number' && !Number.isNaN(total)
                ? total
                : next.length
            );
            return next;
          });
          return items;
        } catch (error: any) {
          setCampaignsError(error);
          const message =
            error?.response?.data?.message ||
            error?.response?.data?.detail ||
            'Failed to fetch campaigns';
          if (typeof addToast === 'function') {
            addToast({ message, error: true });
          }
          throw error;
        } finally {
          setCampaignsLoading(false);
          delete campaignsRequestRef.current[requestKey];
        }
      })();

      campaignsRequestRef.current[requestKey] = requestPromise;
      return requestPromise;
    },
    [addToast, campaignsRequestRef]
  );

  const createCampaign = useCallback(
    async (campaign) => {
      setCampaignSubmitting(true);
      setCampaignsError(null);

      try {
        const createdCampaign = await createCampaignRequest(campaign);

        if (createdCampaign) {
          setCampaigns((previous = []) => {
            const next = Array.isArray(previous) ? [...previous] : [];
            const createdId =
              createdCampaign?.id ??
              createdCampaign?.pk ??
              createdCampaign?.uuid ??
              null;
            const existingIndex = next.findIndex(
              (entry) =>
                String(entry?.id ?? entry?.pk ?? entry?.uuid ?? '') ===
                String(createdId ?? '')
            );
            if (existingIndex !== -1) {
              next[existingIndex] = createdCampaign;
              return next;
            }
            return [createdCampaign, ...next];
          });
          setCampaignsTotal((previous) => previous + 1);
        }

        if (typeof addToast === 'function') {
          addToast({ message: 'Campaign created!', error: false });
        }
        return createdCampaign;
      } catch (error: any) {
        setCampaignsError(error);
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          'Failed to create campaign';
        if (typeof addToast === 'function') {
          addToast({ message, error: true });
        }
        throw error;
      } finally {
        setCampaignSubmitting(false);
      }
    },
    [addToast]
  );

  const fetchTeamEvents = useCallback(
    async (seedId, params = {}) => {
      const normalizedSeed = normalizeSeedId(seedId);
      if (!normalizedSeed) {
        dispatch({ type: TEAM_EVENTS_SUCCESS, payload: [] });
        return [];
      }

      dispatch({ type: TEAM_EVENTS_LOADING });

      try {
        const items = await listTeamEventsRequest(normalizedSeed, params);
        dispatch({ type: TEAM_EVENTS_SUCCESS, payload: items });
        return items;
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error?.message ||
          'Failed to load events';
        dispatch({ type: TEAM_EVENTS_ERROR, payload: message });
        if (typeof addToast === 'function') {
          addToast({ message, error: true });
        }
        throw error;
      }
    },
    [addToast, dispatch]
  );

  const createTeamEvent = useCallback(
    async (seedId, payload = {}) => {
      const normalizedSeed = normalizeSeedId(seedId);
      if (!normalizedSeed) {
        throw new Error('A valid seed id is required to create events.');
      }

      dispatch({ type: TEAM_EVENT_SUBMITTING, payload: true });
      dispatch({ type: TEAM_EVENTS_ERROR, payload: null });

      try {
        const createdEvent = await createTeamEventRequest(
          normalizedSeed,
          payload
        );
        if (createdEvent) {
          const existingEvents = Array.isArray(stateTeamEvents)
            ? stateTeamEvents
            : [];
          const createdId =
            createdEvent?.id ??
            createdEvent?.pk ??
            createdEvent?.uuid ??
            createdEvent?.event_id ??
            null;
          const dedupedExisting = createdId
            ? existingEvents.filter((event) => {
                const existingId =
                  event?.id ?? event?.pk ?? event?.uuid ?? event?.event_id;
                return String(existingId ?? '') !== String(createdId);
              })
            : existingEvents;
          dispatch({
            type: TEAM_EVENTS_SUCCESS,
            payload: [createdEvent, ...(dedupedExisting || [])]
          });
        }
        if (typeof addToast === 'function') {
          addToast({ message: 'Event created!', error: false });
        }
        return createdEvent;
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error?.message ||
          'Failed to create event';
        dispatch({ type: TEAM_EVENTS_ERROR, payload: message });
        if (typeof addToast === 'function') {
          addToast({ message, error: true });
        }
        throw error;
      } finally {
        dispatch({ type: TEAM_EVENT_SUBMITTING, payload: false });
      }
    },
    [addToast, dispatch, stateTeamEvents]
  );

  const getCampaignMeta = useCallback(
    async (seed, { force = false } = {}) => {
      const normalizedSeed = normalizeSeedId(seed);
      if (!normalizedSeed) {
        throw new Error(
          'A valid seed id is required to load campaign metadata.'
        );
      }

      const cacheEntry = seedCacheRef.current[normalizedSeed];
      if (!force && cacheEntry && cacheEntry.metaUpdatedAt) {
        const ageMs = Date.now() - cacheEntry.metaUpdatedAt;
        if (ageMs < DEFAULT_CACHE_TTL) {
          const cachedMeta = cacheEntry.meta || {};
          const cachedCategories = Array.isArray(cachedMeta?.categories)
            ? cachedMeta.categories
            : [];
          const cachedBudgets = Array.isArray(cachedMeta?.budgets)
            ? cachedMeta.budgets
            : [];
          setCampaignCategories(cachedCategories);
          setCampaignBudgets(cachedBudgets);
          return cachedMeta;
        }
      }

      if (!force && seedRequestRef.current[normalizedSeed]) {
        return seedRequestRef.current[normalizedSeed];
      }

      setCampaignCategoriesLoading(true);
      setCampaignCategoriesError(null);

      const request = (async () => {
        try {
          const payload = await fetchCampaignMetaRequest(normalizedSeed);
          const metaCategories = payload?.categories || [];
          const metaBudgets = payload?.budgets || [];

          setCampaignCategories(metaCategories);
          setCampaignBudgets(metaBudgets);

          seedCacheRef.current[normalizedSeed] = {
            ...(seedCacheRef.current[normalizedSeed] || {}),
            meta: payload,
            metaUpdatedAt: Date.now()
          };

          campaignCategoriesFetchedRef.current = true;
          return payload;
        } catch (error: any) {
          setCampaignCategoriesError(
            error?.response?.data?.message ||
              error?.response?.data?.detail ||
              error?.message ||
              'Failed to load campaign metadata'
          );
          setCampaignBudgets([]);
          if (typeof addToast === 'function') {
            addToast({
              message:
                error?.response?.data?.message ||
                error?.response?.data?.detail ||
                'Failed to load campaign metadata',
              error: true
            });
          }
          throw error;
        } finally {
          delete seedRequestRef.current[normalizedSeed];
          setCampaignCategoriesLoading(false);
        }
      })();

      seedRequestRef.current[normalizedSeed] = request;
      return request;
    },
    [addToast, seedCacheRef, seedRequestRef, campaignCategoriesFetchedRef]
  );

  const getChildStatusUpdates = useCallback(
    async (seed, child) => {
      dispatch({ type: CHILD_STATUS_UPDATE_LOADING });
      try {
        const result = await listChildStatusUpdates(seed, child);
        setChildStatusUpdates(result);
        dispatch({ type: CHILD_STATUS_UPDATE_SUCCESS });
      } catch (error: any) {
        dispatch({ type: CHILD_STATUS_UPDATE_ERROR });
        if (typeof addToast === 'function') {
          if (error.response === undefined) {
            addToast({
              message: 'Unknown Error - check your network connection',
              error: true
            });
          } else if (
            error.response.status === 500 ||
            error.response.status === 404
          ) {
            addToast({ message: 'Server Error!', error: true });
          } else {
            addToast({ message: 'Server Error!', error: true });
          }
        }
      }
    },
    [addToast, dispatch]
  );

  const getChildStatusUpdate = useCallback(
    async (seed, child, update) => {
      dispatch({ type: CHILD_STATUS_UPDATE_LOADING });
      try {
        const result = await fetchChildStatusUpdate(seed, child, update);
        dispatch({ type: GET_STATUS_UPDATE, payload: result });
        dispatch({ type: CHILD_STATUS_UPDATE_SUCCESS });
      } catch (error: any) {
        dispatch({ type: CHILD_STATUS_UPDATE_ERROR });
        if (typeof addToast === 'function') {
          if (error.response === undefined) {
            addToast({
              message: 'Unknown Error - check your network connection',
              error: true
            });
          } else if (
            error.response.status === 500 ||
            error.response.status === 404
          ) {
            addToast({ message: 'Server Error!', error: true });
          } else {
            addToast({ message: 'Server Error!', error: true });
          }
        }
      }
    },
    [addToast, dispatch]
  );

  const createChildStatusUpdate = useCallback(
    async (data) => {
      dispatch({ type: CHILD_STATUS_UPDATE_LOADING });
      try {
        const result = await createChildStatusUpdateRequest(data);
        setChildStatusUpdates((previous) => [result, ...previous]);
        dispatch({ type: CHILD_STATUS_UPDATE_SUCCESS });
        if (typeof addToast === 'function') {
          addToast({
            message: 'Success Child Status Update Added!',
            error: false
          });
        }
        return result;
      } catch (error: any) {
        dispatch({ type: CHILD_STATUS_UPDATE_ERROR });
        if (typeof addToast === 'function') {
          if (error.response === undefined) {
            addToast({ message: 'Unknown Error', error: true });
          } else if (
            error.response.status === 500 ||
            error.response.status === 404
          ) {
            addToast({ message: 'Server Error!', error: true });
          } else {
            addToast({ message: 'Server Error!', error: true });
          }
        }
      }
    },
    [addToast, dispatch]
  );

  const editChildStatusUpdate = useCallback(
    async (data, statusUpdateId) => {
      dispatch({ type: CHILD_STATUS_UPDATE_LOADING });
      try {
        const result = await editChildStatusUpdateRequest(statusUpdateId, data);
        dispatch({ type: CHILD_STATUS_UPDATE_SUCCESS });
        dispatch({ type: EDIT_STATUS_UPDATES, payload: result });
        if (typeof addToast === 'function') {
          addToast({ message: 'Success Child Status Updated!', error: false });
        }
        return result;
      } catch (error: any) {
        dispatch({ type: CHILD_STATUS_UPDATE_ERROR });
        if (typeof addToast === 'function') {
          if (error.response === undefined) {
            addToast({ message: 'Unknown Error', error: true });
          } else if (
            error.response.status === 500 ||
            error.response.status === 404
          ) {
            addToast({ message: 'Server Error!', error: true });
          } else {
            addToast({ message: 'Server Error!', error: true });
          }
        }
      }
    },
    [addToast, dispatch]
  );

  const deleteChildStatusUpdate = useCallback(
    async (statusUpdateId) => {
      dispatch({ type: CHILD_STATUS_UPDATE_LOADING });
      try {
        const result = await deleteChildStatusUpdateRequest(statusUpdateId);
        dispatch({ type: CHILD_STATUS_UPDATE_SUCCESS });
        dispatch({ type: DELETE_STATUS_UPDATES, payload: result });
        if (typeof addToast === 'function') {
          addToast({ message: 'Child Status Deleted!', error: false });
        }
        return result;
      } catch (error: any) {
        dispatch({ type: CHILD_STATUS_UPDATE_ERROR });
        if (typeof addToast === 'function') {
          if (error.response === undefined) {
            addToast({ message: 'Unknown Error', error: true });
          } else if (
            error.response.status === 500 ||
            error.response.status === 404
          ) {
            addToast({ message: 'Server Error!', error: true });
          } else {
            addToast({ message: 'Server Error!', error: true });
          }
        }
      }
    },
    [addToast, dispatch]
  );

  return {
    campaigns,
    campaignsTotal,
    campaignsLoading,
    campaignsError,
    campaignSubmitting,
    campaignCategories,
    campaignCategoriesLoading,
    campaignCategoriesError,
    campaignBudgets,
    getCampaigns,
    createCampaign,
    fetchTeamEvents,
    createTeamEvent,
    getCampaignMeta,
    childStatusUpdates,
    getChildStatusUpdates,
    getChildStatusUpdate,
    createChildStatusUpdate,
    editChildStatusUpdate,
    deleteChildStatusUpdate
  };
};
