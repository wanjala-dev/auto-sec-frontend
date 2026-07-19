import {
  normalizeBudgetCategoryCollection,
  normalizeBudgetCollection,
  normalizeBudgetEstimateRecord,
  normalizeBudgetRecord,
  normalizeContributionMeansPayload,
  normalizeWorkspaceAggregation
} from '../../domain/reports/workspaceFinance';
import { workspaceFinanceApi } from '../../infrastructure/reports/workspaceFinanceApi';

export const fetchWorkspaceAggregation = async (
  workspaceId: string | number,
  persona?: string | null,
  options?: { startDate?: string; endDate?: string }
) => {
  const params: Record<string, unknown> = {};
  if (persona) {
    params.persona = persona;
  }
  if (options?.startDate && options?.endDate) {
    // Both must be present — the backend computes a custom_range_chart
    // bucket only when both dates are provided.
    params.start_date = options.startDate;
    params.end_date = options.endDate;
  }
  try {
    const response = await workspaceFinanceApi.getAggregation(
      workspaceId,
      Object.keys(params).length ? params : undefined
    );
    return normalizeWorkspaceAggregation(response?.data);
  } catch (error: any) {
    if (error?.response?.status !== 404) {
      throw error;
    }
    const fallback = await workspaceFinanceApi.getLegacyAggregation(
      workspaceId,
      Object.keys(params).length ? params : undefined
    );
    return normalizeWorkspaceAggregation(fallback?.data);
  }
};

export const listWorkspaceCategories = async () => {
  const response = await workspaceFinanceApi.listWorkspaceCategories();
  return response?.data ?? null;
};

export const listBudgetCategories = async (workspaceId: string | number) => {
  const response = await workspaceFinanceApi.listBudgetCategories(workspaceId);
  return normalizeBudgetCategoryCollection(response?.data);
};

export const createBudgetCategory = async (
  workspaceId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await workspaceFinanceApi.createBudgetCategory(
    workspaceId,
    payload
  );
  return normalizeBudgetCategoryCollection(response?.data);
};

export const createWorkspaceBudget = async (
  payload: Record<string, unknown>
) => {
  const response = await workspaceFinanceApi.createBudget(payload);
  return normalizeBudgetRecord(response?.data);
};

export const saveBudgetFromPreview = async (
  payload: Record<string, unknown>
) => {
  const response = await workspaceFinanceApi.saveBudgetFromPreview(payload);
  return normalizeBudgetRecord(response?.data);
};

export const createWorkspaceBudgetEstimate = async (
  workspaceId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await workspaceFinanceApi.createBudgetEstimate(
    workspaceId,
    payload
  );
  return normalizeBudgetEstimateRecord(response?.data);
};

export const listBudgetEstimates = async (
  workspaceId: string | number,
  params: Record<string, unknown> = {}
) => {
  const response = await workspaceFinanceApi.listBudgetEstimates(
    workspaceId,
    params
  );
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const listWorkspaceBudgets = async (workspaceId: string | number) => {
  const response = await workspaceFinanceApi.listBudgets(workspaceId);
  return normalizeBudgetCollection(response?.data);
};

export const listContributionMeans = async ({
  workspaceId,
  page = 1
}: {
  workspaceId?: string | number | null;
  page?: number;
}) => {
  const params = { page };

  try {
    const response = workspaceId
      ? await workspaceFinanceApi.listWorkspaceContributionMeans(
          workspaceId,
          params
        )
      : await workspaceFinanceApi.listContributionMeans(params);
    return normalizeContributionMeansPayload(response?.data);
  } catch (error: any) {
    if (error?.response?.status !== 404) {
      throw error;
    }
    const fallback = workspaceId
      ? await workspaceFinanceApi.listLegacyWorkspaceContributionMeans(
          workspaceId,
          params
        )
      : await workspaceFinanceApi.listLegacyContributionMeans(params);
    return normalizeContributionMeansPayload(fallback?.data);
  }
};

export const fetchContributionMeansPage = async (path: string) => {
  if (!path) {
    return normalizeContributionMeansPayload(null);
  }
  const response = await workspaceFinanceApi.getContributionMeansPage(path);
  return normalizeContributionMeansPayload(response?.data);
};
