import { useCallback } from 'react';
import {
  GET_SEED_OPERATIONS,
  GET_SEED_PREFERENCES,
  GET_USER_PREFERENCES,
  PATCH_SEED_OPERATIONS,
  PATCH_SEED_PREFENCES,
  PATCH_USER_PREFENCES,
  SEED_ERROR,
  SEED_LOADING
} from '../../../types/seedTypes';
import { normalizeWorkspaceId as normalizeSeedId } from '../../../domain/workspace/workspaceId';
import {
  fetchWorkspaceOperations,
  fetchWorkspacePreferences,
  saveWorkspaceOperations,
  saveWorkspacePreferences
} from '../../../application/workspace/workspaceStateService';
import {
  fetchUserPreferences,
  updateUserPreferencesByUserId
} from '../../../application/userPreferences/userPreferencesService';

export const useSeedPreferencesPresentation = ({
  dispatch
}: {
  dispatch: any;
}) => {
  const updateSeedOperations = useCallback(
    async (operations, id) => {
      dispatch({
        type: SEED_LOADING
      });
      try {
        const data = await saveWorkspaceOperations(id, operations);
        dispatch({
          type: PATCH_SEED_OPERATIONS,
          payload: data
        });
      } catch (error) {
        dispatch({ type: SEED_ERROR });
        throw error;
      }
    },
    [dispatch]
  );

  const getSeedOperations = useCallback(
    async (id) => {
      dispatch({
        type: SEED_LOADING
      });
      try {
        const data = await fetchWorkspaceOperations(id);
        dispatch({
          type: GET_SEED_OPERATIONS,
          payload: data
        });
      } catch (error) {
        dispatch({ type: SEED_ERROR });
        throw error;
      }
    },
    [dispatch]
  );

  const updateSeedPreferences = useCallback(
    async (preferences, id) => {
      const seedId =
        normalizeSeedId(id) ||
        normalizeSeedId(preferences?.seed) ||
        normalizeSeedId(preferences?.seed_id);
      if (!seedId) return null;

      dispatch({
        type: SEED_LOADING
      });
      const payload = {
        ...preferences
      };
      try {
        const data = await saveWorkspacePreferences(seedId, payload);
        dispatch({
          type: PATCH_SEED_PREFENCES,
          payload: data
        });
        return data;
      } catch (error) {
        dispatch({
          type: SEED_ERROR,
          payload: error?.message || error
        });
        throw error;
      }
    },
    [dispatch]
  );

  const updateUserPreferences = useCallback(
    async (id, donations, expenses, income, story, sources, team, budget) => {
      dispatch({
        type: SEED_LOADING
      });
      try {
        const data = await updateUserPreferencesByUserId(id, {
          user: id,
          donations,
          expenses: false,
          income: false,
          story,
          sources: false,
          team: false,
          budget: false
        });
        dispatch({
          type: PATCH_USER_PREFENCES,
          payload: data
        });
      } catch (error) {
        dispatch({ type: SEED_ERROR });
        throw error;
      }
    },
    [dispatch]
  );

  const getSeedPreferences = useCallback(
    async (id) => {
      const seedId = normalizeSeedId(id);
      if (!seedId) return null;

      dispatch({
        type: SEED_LOADING
      });
      try {
        const data = await fetchWorkspacePreferences(seedId);
        dispatch({
          type: GET_SEED_PREFERENCES,
          payload: data
        });
        return data;
      } catch (error) {
        dispatch({
          type: SEED_ERROR,
          payload: error?.message || error
        });
        throw error;
      }
    },
    [dispatch]
  );

  const getUserPreferences = useCallback(
    async (id) => {
      dispatch({
        type: SEED_LOADING
      });
      const data = await fetchUserPreferences(id);
      dispatch({
        type: GET_USER_PREFERENCES,
        payload: data
      });
    },
    [dispatch]
  );

  return {
    updateSeedOperations,
    getSeedOperations,
    updateSeedPreferences,
    updateUserPreferences,
    getSeedPreferences,
    getUserPreferences
  };
};
