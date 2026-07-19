import { resolveEnvironment } from './useFeatureFlagsBootstrapPresentation';

export const featureFlagsInitialState = {
  loading: true,
  error: null,
  environment: resolveEnvironment(),
  features: {},
  overrides: {},
  evaluated: {
    loading: false,
    error: null,
    currentWorkspaceId: null,
    byWorkspace: {},
    workspaceId: null,
    flags: {},
    updatedAt: 0
  }
};
