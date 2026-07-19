import {
  normalizeBudgetDetail,
  normalizeBudgetStatusRecord,
  normalizeChildBudgetSummary,
  normalizeStandardBudgetRow,
  normalizeStandardBudgetRows
} from '../../domain/reports/standardBudget';
import { standardBudgetApi } from '../../infrastructure/reports/standardBudgetApi';

export const fetchStandardBudgetRows = async (budgetId: string | number) => {
  const response = await standardBudgetApi.listRows(budgetId);
  return {
    rows: normalizeStandardBudgetRows(response?.data),
    total:
      typeof response?.data?.totals?.monthly_planned === 'number'
        ? response.data.totals.monthly_planned
        : undefined
  };
};

export const fetchBudgetDetailRecord = async (budgetId: string | number) => {
  const response = await standardBudgetApi.getBudgetDetail(budgetId);
  return normalizeBudgetDetail(response?.data);
};

export const updateBudgetStatusRecord = async (
  budgetId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await standardBudgetApi.updateBudgetStatus(
    budgetId,
    payload
  );
  return normalizeBudgetStatusRecord(response?.data);
};

// Edits budget metadata (name, notes, etc.) via BudgetDetailEdit on the
// backend. Returns the normalized budget detail so seed-context consumers
// can rebuild the cache entry from the same shape the GET endpoint returns.
export const updateBudgetRecord = async (
  budgetId: string | number,
  workspaceId: string,
  payload: Record<string, unknown>
) => {
  const response = await standardBudgetApi.updateBudget(
    budgetId,
    workspaceId,
    payload
  );
  // Backend wraps the body as { status, data } -- unwrap so callers get
  // the same shape as fetchBudgetDetailRecord.
  return normalizeBudgetDetail(response?.data?.data ?? response?.data);
};

export const createStandardBudgetRecord = async (
  budgetId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await standardBudgetApi.createRow(budgetId, payload);
  return normalizeStandardBudgetRow(response?.data);
};

export const updateStandardBudgetRecord = async (
  budgetId: string | number,
  rowId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await standardBudgetApi.updateRow(budgetId, rowId, payload);
  return normalizeStandardBudgetRow(response?.data);
};

export const deleteStandardBudgetRecord = (
  budgetId: string | number,
  rowId: string | number
) => standardBudgetApi.deleteRow(budgetId, rowId);

export const reorderStandardBudgetRecords = (
  budgetId: string | number,
  payload: Record<string, unknown>
) => standardBudgetApi.reorderRows(budgetId, payload);

export const fetchBudgetBeneficiarySummary = async (
  budgetId: string | number,
  params?: Record<string, unknown>
) => {
  const response = await standardBudgetApi.listBeneficiaries(budgetId, params);
  return normalizeChildBudgetSummary(response?.data);
};
