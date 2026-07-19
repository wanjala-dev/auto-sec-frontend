import apiClient from '../http/apiClient';

export const standardBudgetApi = {
  listRows: (budgetId: string | number) =>
    apiClient.get(`/budget/${budgetId}/standard-budget/`),

  getBudgetDetail: (budgetId: string | number) =>
    apiClient.get(`/budget/detail/${budgetId}`),

  updateBudgetStatus: (
    budgetId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/budget/${budgetId}/status/`, payload),

  // Edits the metadata fields on a budget (name, notes, start_date, etc.)
  // by hitting BudgetDetailEdit at /budget/<id>/<workspace>/. Distinct
  // from updateBudgetStatus which only flips the workflow state, and
  // from updateRow which edits individual standard-budget line items.
  updateBudget: (
    budgetId: string | number,
    workspaceId: string,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/budget/${budgetId}/${workspaceId}/`, payload),

  createRow: (budgetId: string | number, payload: Record<string, unknown>) =>
    apiClient.post(`/budget/${budgetId}/standard-budget/`, payload),

  updateRow: (
    budgetId: string | number,
    rowId: string | number,
    payload: Record<string, unknown>
  ) =>
    apiClient.patch(`/budget/${budgetId}/standard-budget/${rowId}/`, payload),

  deleteRow: (budgetId: string | number, rowId: string | number) =>
    apiClient.delete(`/budget/${budgetId}/standard-budget/${rowId}/`),

  reorderRows: (budgetId: string | number, payload: Record<string, unknown>) =>
    apiClient.post(`/budget/${budgetId}/standard-budget/reorder/`, payload),

  listBeneficiaries: (
    budgetId: string | number,
    params?: Record<string, unknown>
  ) =>
    apiClient.get(
      `/budget/${budgetId}/beneficiaries/`,
      params ? { params } : undefined
    )
};
