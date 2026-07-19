import {
  FEATURE_FLAGS_INIT,
  FEATURE_FLAGS_SET_OVERRIDE,
  FEATURE_FLAGS_CLEAR_OVERRIDES,
  FEATURE_FLAGS_ERROR,
  FEATURE_FLAGS_EVALUATED_LOADING,
  FEATURE_FLAGS_EVALUATED_SUCCESS,
  FEATURE_FLAGS_EVALUATED_ERROR,
  FEATURE_FLAGS_SET_CURRENT_WORKSPACE
} from '../types/featureFlagsTypes';

type EvaluatedWorkspaceEntry = {
  flags: Record<string, boolean>;
  updatedAt: number;
};

type FeatureFlagsState = {
  loading?: boolean;
  error?: string | null;
  environment?: string | null;
  features?: Record<string, boolean>;
  overrides?: Record<string, boolean>;
  evaluated?: {
    loading?: boolean;
    error?: string | null;
    // The workspace flag reads resolve against — the workspace the user is
    // VIEWING (set by WorkspaceLayout), which may differ from the persisted
    // active_workspace_id that seeded ``flags`` from me/summary.
    currentWorkspaceId?: string | null;
    // Per-workspace cache so one workspace's flags can never be used for
    // another (the bug this shape exists to make impossible).
    byWorkspace?: Record<string, EvaluatedWorkspaceEntry>;
    // Fallback used only when currentWorkspaceId is null (non-workspace
    // pages) — the last-loaded / summary (active-workspace) flags.
    workspaceId?: string | null;
    flags?: Record<string, boolean>;
    updatedAt?: number;
  };
};

type FeatureFlagsAction = {
  type: string;
  payload?: any;
};

const featureFlagsReducer = (
  state: FeatureFlagsState,
  action: FeatureFlagsAction
): FeatureFlagsState => {
  const { type, payload } = action;

  switch (type) {
    case FEATURE_FLAGS_INIT:
      return {
        ...state,
        loading: false,
        error: null,
        environment: payload.environment,
        features: payload.features,
        overrides: payload.overrides
      };

    case FEATURE_FLAGS_SET_OVERRIDE:
      return {
        ...state,
        overrides: {
          ...(state.overrides || {}),
          [payload.key]: payload.value
        }
      };

    case FEATURE_FLAGS_CLEAR_OVERRIDES:
      return {
        ...state,
        overrides: {}
      };

    case FEATURE_FLAGS_ERROR:
      return {
        ...state,
        loading: false,
        error: payload || 'Unable to load feature flags'
      };

    case FEATURE_FLAGS_SET_CURRENT_WORKSPACE: {
      const nextCurrent =
        payload?.workspaceId != null && String(payload.workspaceId)
          ? String(payload.workspaceId)
          : null;
      if ((state.evaluated?.currentWorkspaceId ?? null) === nextCurrent) {
        return state;
      }
      return {
        ...state,
        evaluated: {
          ...(state.evaluated || {}),
          currentWorkspaceId: nextCurrent
        }
      };
    }

    case FEATURE_FLAGS_EVALUATED_LOADING:
      // Per-workspace cache means we never blow away another workspace's
      // flags on load — just flip the loading flag. The flags a consumer
      // sees are still resolved from byWorkspace[currentWorkspaceId].
      return {
        ...state,
        evaluated: {
          ...(state.evaluated || {}),
          loading: true,
          error: null
        }
      };

    case FEATURE_FLAGS_EVALUATED_SUCCESS: {
      const wid =
        payload?.workspaceId != null && String(payload.workspaceId)
          ? String(payload.workspaceId)
          : null;
      const flags = payload?.flags || {};
      const updatedAt = payload?.updatedAt || Date.now();
      const prev = state.evaluated || {};
      const byWorkspace = { ...(prev.byWorkspace || {}) };
      if (wid) {
        byWorkspace[wid] = { flags, updatedAt };
      }
      return {
        ...state,
        evaluated: {
          ...prev,
          loading: false,
          error: null,
          byWorkspace,
          // Keep the flat fields as the no-workspace / last-loaded fallback
          // (used only when currentWorkspaceId is null).
          workspaceId: wid,
          flags,
          updatedAt
        }
      };
    }

    case FEATURE_FLAGS_EVALUATED_ERROR:
      return {
        ...state,
        evaluated: {
          ...(state.evaluated || {}),
          loading: false,
          error: payload || 'Unable to load evaluated feature flags'
        }
      };

    default:
      return state;
  }
};

export default featureFlagsReducer;
