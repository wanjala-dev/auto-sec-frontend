import { useCallback, useEffect } from 'react';
import {
  FEATURE_FLAGS_CLEAR_OVERRIDES,
  FEATURE_FLAGS_EVALUATED_SUCCESS,
  FEATURE_FLAGS_SET_OVERRIDE
} from '../../../types/featureFlagsTypes';
import {
  resolveEnvironment,
  STORAGE_KEY_PREFIX,
  USER_SUMMARY_UPDATED_EVENT
} from './useFeatureFlagsBootstrapPresentation';
import {
  clearFeatureFlagOverrides,
  writeFeatureFlagOverrides
} from '../../../application/session/browserFeatureFlagsService';

export const useFeatureFlagsOverridesPresentation = ({
  dispatch,
  state,
  hydrateEvaluatedFromSummary,
  fetchEvaluatedFlags
}: {
  dispatch: any;
  state: any;
  hydrateEvaluatedFromSummary: (summary: any) => any;
  fetchEvaluatedFlags: ({
    workspaceId
  }: {
    workspaceId?: string | number;
  }) => Promise<any>;
}) => {
  const setOverride = useCallback(
    (key, value) => {
      const env = state.environment || resolveEnvironment();
      dispatch({
        type: FEATURE_FLAGS_SET_OVERRIDE,
        payload: { key, value: Boolean(value) }
      });

      if (env === 'production') return;
      const nextOverrides = {
        ...(state.overrides || {}),
        [key]: Boolean(value)
      };
      writeFeatureFlagOverrides(`${STORAGE_KEY_PREFIX}${env}`, nextOverrides);
    },
    [dispatch, state.environment, state.overrides]
  );

  const clearOverrides = useCallback(() => {
    const env = state.environment || resolveEnvironment();
    dispatch({ type: FEATURE_FLAGS_CLEAR_OVERRIDES });

    if (env === 'production') return;
    clearFeatureFlagOverrides(`${STORAGE_KEY_PREFIX}${env}`);
  }, [dispatch, state.environment]);

  const notifySummaryUpdated = useCallback((summary) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent(USER_SUMMARY_UPDATED_EVENT, {
        detail: { summary }
      })
    );
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handler = async (event) => {
      const summary = event?.detail?.summary;
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
        return;
      }

      if (hydrated?.workspaceId) {
        await fetchEvaluatedFlags({ workspaceId: hydrated.workspaceId });
      }
    };

    window.addEventListener(USER_SUMMARY_UPDATED_EVENT, handler);
    return () =>
      window.removeEventListener(USER_SUMMARY_UPDATED_EVENT, handler);
  }, [dispatch, fetchEvaluatedFlags, hydrateEvaluatedFromSummary]);

  return {
    setOverride,
    clearOverrides,
    notifySummaryUpdated
  };
};
