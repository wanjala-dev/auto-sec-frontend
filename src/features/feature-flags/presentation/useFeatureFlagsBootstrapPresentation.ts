import { useCallback, useEffect, useRef } from 'react';
import {
  FEATURE_FLAGS_EVALUATED_ERROR,
  FEATURE_FLAGS_EVALUATED_LOADING,
  FEATURE_FLAGS_EVALUATED_SUCCESS,
  FEATURE_FLAGS_INIT,
  FEATURE_FLAGS_SET_CURRENT_WORKSPACE
} from '../../../types/featureFlagsTypes';
import {
  fetchEvaluatedFeatureFlags,
  fetchFeatureFlag
} from '../../../application/featureFlags/featureFlagsService';
import { readViewerStoredUserSummary } from '../../auth/presentation/browserAuthSessionSupport';
import { readFeatureFlagOverrides } from '../../../application/session/browserFeatureFlagsService';

export const STORAGE_KEY_PREFIX = 'featureFlags.overrides.';
export const USER_SUMMARY_UPDATED_EVENT = 'user-summary-updated';

const toBool = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return null;
};

export const resolveEnvironment = () =>
  (process.env.NODE_ENV || 'development').toLowerCase();

const readEnvFeatures = () => {
  const marketplaceRaw = process.env.REACT_APP_ENABLE_MARKETPLACE;
  const googleAuthRaw = process.env.REACT_APP_GOOGLE_AUTH_ENABLED;
  const circuitBreakerRaw = process.env.REACT_APP_ENABLE_CIRCUIT_BREAKER;

  const marketplaceValue = toBool(marketplaceRaw);
  const googleAuthValue = toBool(googleAuthRaw);
  const circuitBreakerValue = toBool(circuitBreakerRaw);

  return {
    isMarketplaceEnabled: marketplaceValue === null ? true : marketplaceValue,
    isGoogleAuthEnabled: googleAuthValue === true,
    isCircuitBreakerEnabled: circuitBreakerValue === true
  };
};

export const useFeatureFlagsBootstrapPresentation = ({
  dispatch
}: {
  dispatch: any;
}) => {
  const didInit = useRef(false);

  const hydrateEvaluatedFromSummary = useCallback((summary) => {
    if (!summary) return null;

    const payload = summary?.data ?? summary;
    const workspaceContext =
      payload?.workspace_context ||
      payload?.workspaceContext ||
      payload?.data?.workspace_context ||
      payload?.data?.workspaceContext ||
      null;

    const workspaceId =
      workspaceContext?.active_workspace_id ||
      workspaceContext?.activeWorkspaceId ||
      payload?.active_workspace_id ||
      payload?.activeWorkspaceId ||
      payload?.user?.active_workspace_id ||
      payload?.user?.activeWorkspaceId ||
      payload?.user?.profile?.active_workspace_id ||
      payload?.user?.profile?.activeWorkspaceId ||
      null;

    const flags =
      payload?.feature_flags ||
      payload?.featureFlags ||
      payload?.data?.feature_flags ||
      payload?.data?.featureFlags ||
      null;

    const normalizedWorkspaceId = workspaceId ? String(workspaceId) : null;
    if (!normalizedWorkspaceId) return null;

    return {
      workspaceId: normalizedWorkspaceId,
      flags: flags && typeof flags === 'object' ? flags : null
    };
  }, []);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const env = resolveEnvironment();
    const envFeatures = readEnvFeatures();

    let overrides = {};
    if (env !== 'production') {
      const stored = readFeatureFlagOverrides(`${STORAGE_KEY_PREFIX}${env}`);
      if (stored && typeof stored === 'object') {
        overrides = stored;
      }
    }

    dispatch({
      type: FEATURE_FLAGS_INIT,
      payload: {
        environment: env,
        features: envFeatures,
        overrides
      }
    });

    const summary = readViewerStoredUserSummary();
    if (summary) {
      const hydrated = hydrateEvaluatedFromSummary(summary);
      if (hydrated?.flags) {
        dispatch({
          type: FEATURE_FLAGS_EVALUATED_SUCCESS,
          payload: {
            workspaceId: hydrated.workspaceId,
            flags: hydrated.flags,
            updatedAt: Date.now()
          }
        });
      }
    }
  }, [dispatch, hydrateEvaluatedFromSummary]);

  const fetchEvaluatedFlags = useCallback(
    async ({ workspaceId }: { workspaceId?: string | number } = {}) => {
      const normalizedWorkspaceId = workspaceId ? String(workspaceId) : null;

      if (!normalizedWorkspaceId) {
        return null;
      }

      // /feature-flags/ requires auth — for an anonymous visitor (public
      // /join, /sponsor, /forms surfaces) the call is a guaranteed 401.
      // Skip it and let flag reads fall back to their defaults.
      if (!localStorage.getItem('token')) {
        return null;
      }

      dispatch({
        type: FEATURE_FLAGS_EVALUATED_LOADING,
        payload: { workspaceId: normalizedWorkspaceId }
      });

      try {
        const evaluated = await fetchEvaluatedFeatureFlags({
          workspaceId: normalizedWorkspaceId
        });
        const flags = evaluated?.flags || {};

        dispatch({
          type: FEATURE_FLAGS_EVALUATED_SUCCESS,
          payload: {
            workspaceId: evaluated?.workspaceId || normalizedWorkspaceId,
            flags,
            updatedAt: Date.now()
          }
        });

        return flags;
      } catch (error) {
        dispatch({
          type: FEATURE_FLAGS_EVALUATED_ERROR,
          payload:
            error?.response?.data?.detail ||
            error?.message ||
            'Unable to load evaluated feature flags'
        });
        return null;
      }
    },
    [dispatch]
  );

  // Point flag reads at the workspace the user is VIEWING, and ensure that
  // workspace's flags are loaded. Called by WorkspaceLayout on every
  // workspace navigation (deduped there), so a workspace's own flags — incl.
  // any workspace-scoped override — are always the ones that gate its UI.
  const selectWorkspace = useCallback(
    async ({ workspaceId }: { workspaceId?: string | number } = {}) => {
      const normalizedWorkspaceId = workspaceId ? String(workspaceId) : null;
      dispatch({
        type: FEATURE_FLAGS_SET_CURRENT_WORKSPACE,
        payload: { workspaceId: normalizedWorkspaceId }
      });
      if (normalizedWorkspaceId) {
        await fetchEvaluatedFlags({ workspaceId: normalizedWorkspaceId });
      }
    },
    [dispatch, fetchEvaluatedFlags]
  );

  const fetchFlag = useCallback(async ({ key, workspaceId }) => {
    const normalizedWorkspaceId = workspaceId ? String(workspaceId) : null;
    const normalizedKey =
      typeof key === 'string' ? key.trim() : String(key || '').trim();
    if (!normalizedWorkspaceId || !normalizedKey) return null;

    try {
      return await fetchFeatureFlag({
        key: normalizedKey,
        workspaceId: normalizedWorkspaceId
      });
    } catch (_) {
      return null;
    }
  }, []);

  return {
    hydrateEvaluatedFromSummary,
    fetchEvaluatedFlags,
    selectWorkspace,
    fetchFlag
  };
};
