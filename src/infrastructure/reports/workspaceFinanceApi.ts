import apiClient from '../http/apiClient';

export const workspaceFinanceApi = {
  listWorkspaceCategories: () =>
    apiClient.get('/workspaces/categories-subcategories/'),

  getAggregation: (
    workspaceId: string | number,
    params?: Record<string, unknown>
  ) =>
    apiClient.get(`/workspaces/aggregations/${workspaceId}/`, {
      params
    }),

  getLegacyAggregation: (
    workspaceId: string | number,
    params?: Record<string, unknown>
  ) =>
    apiClient.get(`/workspaces/aggregations/${workspaceId}/`, {
      params
    }),

  listBudgetCategories: (workspaceId: string | number) =>
    apiClient.get(`/budget/category/${workspaceId}`),

  createBudgetCategory: (
    workspaceId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.post(`/budget/category/${workspaceId}`, payload),

  updateBudgetCategory: (
    categoryId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/budget/category/detail/${categoryId}/`, payload),

  deleteBudgetCategory: (categoryId: string | number) =>
    apiClient.delete(`/budget/category/detail/${categoryId}/`),

  createBudget: (payload: Record<string, unknown>) =>
    apiClient.post('/budget/add/', payload),

  saveBudgetFromPreview: (payload: Record<string, unknown>) =>
    apiClient.post('/budget/save-from-preview/', payload),

  createBudgetEstimate: (
    workspaceId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.post(`/budget/estimate/${workspaceId}/`, payload),

  listBudgetEstimates: (
    workspaceId: string | number,
    params?: Record<string, unknown>
  ) =>
    apiClient.get(
      `/budget/estimate/${workspaceId}/`,
      params ? { params } : undefined
    ),

  // Accept an auto-proposed estimate. Flips its ``source`` from
  // ``auto_proposed`` → ``user_confirmed``. Optional ``amount`` lets
  // the user adjust the proposed value in the same call.
  acceptBudgetEstimate: (
    estimateId: string | number,
    payload?: { amount?: string | number }
  ) => apiClient.post(`/budget/estimate/${estimateId}/accept/`, payload || {}),

  // Dismiss an auto-proposed estimate. Flips ``source`` →
  // ``dismissed`` AND soft-deletes the row so it doesn't show on the
  // budget. The proposal use case checks the dismissed set so the same
  // category is never re-proposed.
  dismissBudgetEstimate: (estimateId: string | number) =>
    apiClient.post(`/budget/estimate/${estimateId}/dismiss/`),

  // PATCH an existing estimate by primary key. Used by the recipient
  // detail "Planned spend" inline editor: the operator types a new
  // amount, this PATCHes the BudgetEstimate, then the backend's
  // BeneficiaryBudgetSummary recompute task refreshes the materialised
  // planned/actual/remaining values surfaced by /budget/{id}/beneficiaries/.
  updateBudgetEstimate: (
    estimateId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/budget/estimate/${estimateId}/`, payload),

  listBudgets: (workspaceId: string | number) =>
    apiClient.get(`/budget/${workspaceId}`),

  listContributionMeans: (params?: Record<string, unknown>) =>
    apiClient.get(
      '/workspaces/contribution-means/',
      params ? { params } : undefined
    ),

  listWorkspaceContributionMeans: (
    workspaceId: string | number,
    params?: Record<string, unknown>
  ) =>
    apiClient.get(
      `/workspaces/${workspaceId}/contribution-means/`,
      params ? { params } : undefined
    ),

  listLegacyContributionMeans: (params?: Record<string, unknown>) =>
    apiClient.get(
      '/workspaces/contribution-means/',
      params ? { params } : undefined
    ),

  listLegacyWorkspaceContributionMeans: (
    workspaceId: string | number,
    params?: Record<string, unknown>
  ) =>
    apiClient.get(
      `/workspaces/${workspaceId}/contribution-means/`,
      params ? { params } : undefined
    ),

  getContributionMeansPage: (path: string) => apiClient.get(path)
};
