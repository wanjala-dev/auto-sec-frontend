import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CREATE_BUDGET,
  CREATE_BUDGET_ESTIMATE,
  DELETE_BUDGET,
  REPLACE_BUDGET_TEMP,
  GET_BUDGET,
  GET_CATEGORY,
  GET_CONTRIBUTION_MEANS,
  GET_CONTRIBUTION_MEANS_ERROR,
  GET_CONTRIBUTION_MEANS_LOADING,
  GET_CONTRIBUTION_MEANS_SUCCESS,
  GET_FINANCIAL_DATA_ERROR,
  GET_FINANCIAL_DATA_LOADING,
  GET_FINANCIAL_DATA_SUCCESS,
  GET_INCOME_CATEGORY,
  SEED_ERROR,
  SEED_LOADING,
  SEED_SUCCESS,
  UPDATE_BUDGET,
  UPDATE_BUDGET_STATUS,
  UPDATE_PROJECT_BUDGET_ESTIMATES,
  UPDATE_SEED_TRANSACTIONS_CATEGORIES
} from '../../../types/seedTypes';
import {
  createStandardBudgetRecord,
  deleteStandardBudgetRecord,
  fetchBudgetBeneficiarySummary,
  fetchBudgetDetailRecord,
  fetchStandardBudgetRows,
  reorderStandardBudgetRecords,
  updateBudgetRecord,
  updateBudgetStatusRecord,
  updateStandardBudgetRecord
} from '../../../application/reports/standardBudgetService';
import { trashEntity } from '../../../application/recycleBin/recycleBinService';
import {
  createBudgetCategory as createBudgetCategoryRequest,
  createWorkspaceBudget,
  createWorkspaceBudgetEstimate,
  saveBudgetFromPreview,
  fetchWorkspaceAggregation,
  listBudgetCategories,
  listContributionMeans as listContributionMeansRequest,
  listWorkspaceBudgets,
  listWorkspaceCategories
} from '../../../application/reports/workspaceFinanceService';
import { normalizeStoredUserId } from '../../../domain/auth/storedUserSelectors';
import { normalizeWorkspaceId as normalizeSeedId } from '../../../domain/workspace/workspaceId';
import { readViewerStoredUser } from '../../../features/auth/presentation/browserAuthSessionSupport';

const DEFAULT_CACHE_TTL = 3 * 60 * 1000;

type StandardBudgetRow = Record<string, any>;
type StandardBudgetState = {
  rows: StandardBudgetRow[];
  total: number;
  loading: boolean;
  error: any;
  fetchedAt: number;
  [key: string]: any;
};
type BudgetDetailEntry = {
  data?: any;
  fetchedAt?: number;
  loading?: boolean;
  error?: any;
  [key: string]: any;
};
type ChildBudgetSummaryState = {
  list: any[];
  byId: Record<string, any>;
  fetchedAt: number;
};
type ChildBudgetSummaryEntry = {
  summary?: ChildBudgetSummaryState;
  loading?: boolean;
  error?: any;
  [key: string]: any;
};
type BudgetQueryOptions = {
  force?: boolean;
  ttl?: number;
  refresh?: boolean;
  lock?: boolean;
  persona?: string | null;
  startDate?: string;
  endDate?: string;
};
type StandardBudgetPayload = {
  name?: any;
  notes?: any;
  amount?: any;
  category_id?: any;
  position?: any;
  is_big_expense?: any;
  isBigExpense?: any;
  [key: string]: any;
};
type BudgetStatusPayload = {
  status: string;
  lock?: boolean;
};

const createEmptyStandardBudgetState = (
  overrides: Partial<StandardBudgetState> = {}
): StandardBudgetState => ({
  rows: [],
  total: 0,
  loading: false,
  error: null,
  fetchedAt: 0,
  ...overrides
});

const computeStandardBudgetTotal = (rows: StandardBudgetRow[] = []) =>
  rows.reduce((sum, row) => sum + (Number(row?.amount) || 0), 0);

const sortStandardBudgetRows = (rows: StandardBudgetRow[] = []) =>
  [...rows].sort((a, b) => {
    const positionDiff =
      (Number(a?.position) || 0) - (Number(b?.position) || 0);
    if (positionDiff !== 0) return positionDiff;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });

const resolveBudgetIdentifier = (budget) => {
  if (!budget || typeof budget !== 'object') return null;
  return (
    budget?.id ??
    budget?.pk ??
    budget?.uuid ??
    budget?.slug ??
    budget?.budget_id ??
    null
  );
};

const removeBudgetFromCollection = (collection, budgetId) => {
  const matches = (entry) => {
    const candidateId = resolveBudgetIdentifier(entry);
    return candidateId && String(candidateId) === String(budgetId);
  };

  if (Array.isArray(collection)) {
    return collection.filter((entry) => !matches(entry));
  }
  if (collection && typeof collection === 'object') {
    if (Array.isArray(collection.results)) {
      return {
        ...collection,
        results: collection.results.filter((entry) => !matches(entry))
      };
    }
    if (Array.isArray(collection.data)) {
      return {
        ...collection,
        data: collection.data.filter((entry) => !matches(entry))
      };
    }
    if (Array.isArray(collection.budgets)) {
      return {
        ...collection,
        budgets: collection.budgets.filter((entry) => !matches(entry))
      };
    }
  }
  return collection;
};

const resolveStoredUserId = () => {
  return normalizeStoredUserId(readViewerStoredUser());
};

export const useSeedBudgetPresentation = ({
  dispatch,
  addToast,
  notifySuccess,
  notifyError,
  isCacheEntryFresh,
  seedCacheRef
}: {
  dispatch: any;
  addToast?: ((payload: { message: string; error: boolean }) => void) | null;
  notifySuccess?:
    | ((message: string, options?: Record<string, unknown>) => void)
    | null;
  notifyError?:
    | ((message: string, options?: Record<string, unknown>) => void)
    | null;
  isCacheEntryFresh: (entry: any, ttl?: number) => boolean;
  seedCacheRef: any;
}) => {
  const [standardBudgetPlans, setStandardBudgetPlans] = useState<
    Record<string, StandardBudgetState>
  >({});
  const [budgetDetails, setBudgetDetails] = useState<
    Record<string, BudgetDetailEntry>
  >({});
  const [budgetCategories, setBudgetCategories] = useState<any[]>([]);
  const [childBudgetSummaries, setChildBudgetSummaries] = useState<
    Record<string, ChildBudgetSummaryEntry>
  >({});

  const budgetCategoriesRef = useRef(budgetCategories);
  const transactionCategoryRequestsRef = useRef<Record<string, Promise<any>>>(
    {}
  );
  const childBudgetSummariesRef = useRef<
    Record<string, ChildBudgetSummaryEntry>
  >({});
  const budgetDetailsRef = useRef<Record<string, BudgetDetailEntry>>({});
  const budgetDetailRequestsRef = useRef<Record<string, Promise<any>>>({});
  const childBudgetSummaryRequestsRef = useRef<Record<string, Promise<any>>>(
    {}
  );
  const budgetCategoriesSeedRef = useRef<string | null>(null);
  const categoryCacheRef = useRef<{
    data: any;
    updatedAt: number;
    promise: Promise<any> | null;
  }>({ data: null, updatedAt: 0, promise: null });
  const budgetCacheRef = useRef<Record<string, any>>({});
  const budgetRequestRef = useRef<Record<string, Promise<any>>>({});
  const financialCacheRef = useRef<Record<string, any>>({});
  const financialRequestRef = useRef<Record<string, Promise<any>>>({});

  useEffect(() => {
    budgetCategoriesRef.current = budgetCategories;
  }, [budgetCategories]);

  const updateBudgetDetails = useCallback((updater: any) => {
    setBudgetDetails((previous) => {
      const next =
        typeof updater === 'function' ? updater(previous) : updater || {};
      budgetDetailsRef.current = next;
      return next;
    });
  }, []);

  const setStandardBudgetPlan = useCallback(
    (
      budgetId: string | number,
      rows: StandardBudgetRow[] = [],
      extras: Partial<StandardBudgetState> = {}
    ) => {
      if (!budgetId) return;
      setStandardBudgetPlans((previous) => {
        const state = previous[budgetId] || createEmptyStandardBudgetState();
        const normalizedRows = sortStandardBudgetRows(
          Array.isArray(rows)
            ? rows.map((row, index) => ({
                ...row,
                position:
                  typeof row?.position === 'number' ? row.position : index
              }))
            : []
        );
        return {
          ...previous,
          [budgetId]: {
            ...state,
            ...extras,
            rows: normalizedRows,
            total:
              extras.total !== undefined
                ? extras.total
                : computeStandardBudgetTotal(normalizedRows),
            loading: extras.loading ?? false,
            error: extras.error ?? null,
            fetchedAt: extras.fetchedAt ?? state.fetchedAt
          }
        };
      });
    },
    []
  );

  const clearStandardBudgetPlan = useCallback((budgetId) => {
    if (!budgetId) return;
    setStandardBudgetPlans((previous) => {
      if (!Object.prototype.hasOwnProperty.call(previous, budgetId)) {
        return previous;
      }
      const next = { ...previous };
      delete next[budgetId];
      return next;
    });
  }, []);

  const getStandardBudgetPlan = useCallback(
    (budgetId, fallback = []) => {
      if (!budgetId) return fallback;
      const entry = standardBudgetPlans[budgetId];
      if (entry) {
        if (Array.isArray(entry.rows)) {
          return entry.rows;
        }
        if (Array.isArray(entry)) {
          return entry;
        }
      }
      return fallback;
    },
    [standardBudgetPlans]
  );

  const fetchStandardBudgetPlan = useCallback(
    async (budgetId, options: BudgetQueryOptions = {}) => {
      if (!budgetId) return [];
      const { force = false } = options;
      const existing = standardBudgetPlans[budgetId];
      if (
        !force &&
        existing &&
        Array.isArray(existing.rows) &&
        existing.rows.length
      ) {
        return existing.rows;
      }

      setStandardBudgetPlans((previous) => ({
        ...previous,
        [budgetId]: {
          ...(previous[budgetId] || createEmptyStandardBudgetState()),
          loading: true,
          error: null
        }
      }));

      try {
        const { rows, total: apiTotal } = await fetchStandardBudgetRows(
          budgetId
        );
        const sortedRows = sortStandardBudgetRows(rows);

        setStandardBudgetPlan(budgetId, sortedRows, {
          total:
            typeof apiTotal === 'number'
              ? apiTotal
              : computeStandardBudgetTotal(sortedRows),
          loading: false,
          error: null,
          fetchedAt: Date.now()
        });

        return sortedRows;
      } catch (error) {
        setStandardBudgetPlans((previous) => ({
          ...previous,
          [budgetId]: {
            ...(previous[budgetId] || createEmptyStandardBudgetState()),
            loading: false,
            error
          }
        }));
        throw error;
      }
    },
    [setStandardBudgetPlan, standardBudgetPlans]
  );

  const fetchBudgetDetail = useCallback(
    async (budgetId, options: BudgetQueryOptions = {}) => {
      if (!budgetId) return null;
      const cacheKey = String(budgetId);
      const { force = false, ttl = DEFAULT_CACHE_TTL } = options;

      const cached = budgetDetailsRef.current[cacheKey];
      if (!force && cached?.data && isCacheEntryFresh(cached, ttl)) {
        return cached.data;
      }

      if (!force && budgetDetailRequestsRef.current[cacheKey]) {
        return budgetDetailRequestsRef.current[cacheKey];
      }

      updateBudgetDetails((previous = {}) => ({
        ...previous,
        [cacheKey]: {
          ...(previous[cacheKey] || {}),
          loading: true,
          error: null
        }
      }));

      const request = (async () => {
        try {
          const data = await fetchBudgetDetailRecord(cacheKey);

          updateBudgetDetails((previous = {}) => ({
            ...previous,
            [cacheKey]: {
              data,
              fetchedAt: Date.now(),
              loading: false,
              error: null
            }
          }));

          return data;
        } catch (error) {
          updateBudgetDetails((previous = {}) => ({
            ...previous,
            [cacheKey]: {
              ...(previous[cacheKey] || {}),
              loading: false,
              error
            }
          }));

          throw error;
        } finally {
          delete budgetDetailRequestsRef.current[cacheKey];
        }
      })();

      budgetDetailRequestsRef.current[cacheKey] = request;
      return request;
    },
    [isCacheEntryFresh, updateBudgetDetails]
  );

  const updateBudgetStatus = useCallback(
    async (budgetId, status, options: BudgetQueryOptions = {}) => {
      if (!budgetId) {
        throw new Error('Budget id is required to update status');
      }
      if (
        !status ||
        (typeof status !== 'string' && typeof status !== 'number')
      ) {
        throw new Error('A status value is required');
      }

      const cacheKey = String(budgetId);
      const normalizedStatus = String(status).trim().toLowerCase();
      const resolvedStatus =
        normalizedStatus === 'review' ? 'in_review' : normalizedStatus;

      const payload: BudgetStatusPayload = { status: resolvedStatus };
      if (typeof options?.lock === 'boolean') {
        payload.lock = options.lock;
      }

      const data = await updateBudgetStatusRecord(cacheKey, payload);
      const nextStatus = data?.status ?? data?.budget_status ?? resolvedStatus;

      updateBudgetDetails((previous = {}) => {
        const existing = previous[cacheKey]?.data;
        const resolvedData =
          data && typeof data === 'object'
            ? data
            : {
                ...(existing || {}),
                status: nextStatus,
                budget_status: nextStatus
              };
        return {
          ...previous,
          [cacheKey]: {
            data: resolvedData,
            fetchedAt: Date.now(),
            loading: false,
            error: null
          }
        };
      });

      dispatch({
        type: UPDATE_BUDGET_STATUS,
        payload: {
          budgetId: cacheKey,
          data,
          status: nextStatus
        }
      });

      return data;
    },
    [dispatch, updateBudgetDetails]
  );

  const softDeleteBudget = useCallback(
    async (budgetId, opts: { seedId?: string; reason?: string } = {}) => {
      if (!budgetId) {
        throw new Error('Budget id is required to delete a budget');
      }
      if (!opts.seedId) {
        // A workspace context is required because trash entries are
        // scoped to a workspace -- without it the row would land in
        // the bin but no UI could surface it.
        throw new Error('A workspace is required to delete a budget');
      }

      const cacheKey = String(budgetId);
      // Route through the shared recycle bin instead of the legacy
      // /budget/<id>/soft-delete/ endpoint. The bin captures actor +
      // timestamp + reason in EntityAuditLog and gives the user a
      // 30-day restore window from Settings -> Recycle bin.
      await trashEntity({
        entityType: 'budget',
        entityId: cacheKey,
        seedId: opts.seedId,
        reason: opts.reason ?? ''
      });
      // The trash response is a RecycleBinEntry, not a Budget; mark
      // is_deleted locally so list views drop the row immediately.
      const data = null;

      updateBudgetDetails((previous = {}) => {
        const existing = previous[cacheKey]?.data;
        const resolvedData = {
          ...(existing || {}),
          is_deleted: true
        };
        return {
          ...previous,
          [cacheKey]: {
            data: resolvedData,
            fetchedAt: Date.now(),
            loading: false,
            error: null
          }
        };
      });

      Object.keys(budgetCacheRef.current || {}).forEach((key) => {
        const cached = budgetCacheRef.current[key];
        if (!cached || !cached.data) return;
        const nextData = removeBudgetFromCollection(cached.data, cacheKey);
        budgetCacheRef.current[key] = {
          ...cached,
          data: nextData,
          updatedAt: Date.now()
        };
      });

      Object.keys(seedCacheRef.current || {}).forEach((key) => {
        const cached = seedCacheRef.current[key];
        if (!cached?.data?.budgets) return;
        const nextBudgets = removeBudgetFromCollection(
          cached.data.budgets,
          cacheKey
        );
        seedCacheRef.current[key] = {
          ...cached,
          data: {
            ...cached.data,
            budgets: nextBudgets
          },
          updatedAt: Date.now()
        };
      });

      clearStandardBudgetPlan(cacheKey);
      dispatch({ type: DELETE_BUDGET, payload: { budgetId: cacheKey, data } });
      return data;
    },
    [clearStandardBudgetPlan, dispatch, seedCacheRef, updateBudgetDetails]
  );

  const createStandardBudgetEntry = useCallback(
    async (budgetId, payload: StandardBudgetPayload) => {
      if (!budgetId) {
        throw new Error(
          'Budget id is required to create a standard budget entry'
        );
      }

      const body: StandardBudgetPayload = {
        name: payload?.name ?? '',
        notes: payload?.notes ?? '',
        amount: Number(payload?.amount) || 0,
        category_id:
          payload?.category_id === '' || payload?.category_id === null
            ? null
            : payload?.category_id,
        position: payload?.position
      };
      if (payload?.is_big_expense !== undefined) {
        body.is_big_expense = Boolean(payload.is_big_expense);
      } else if (payload?.isBigExpense !== undefined) {
        body.is_big_expense = Boolean(payload.isBigExpense);
      }

      const normalized = await createStandardBudgetRecord(budgetId, body);

      setStandardBudgetPlans((previous) => {
        const state = previous[budgetId] || createEmptyStandardBudgetState();
        const rows = sortStandardBudgetRows([
          ...(state.rows || []),
          normalized
        ]);
        return {
          ...previous,
          [budgetId]: {
            ...state,
            rows,
            total: computeStandardBudgetTotal(rows),
            loading: false,
            error: null,
            fetchedAt: Date.now()
          }
        };
      });

      return normalized;
    },
    []
  );

  const updateStandardBudgetEntry = useCallback(
    async (budgetId, rowId, payload: StandardBudgetPayload) => {
      if (!budgetId || !rowId) {
        throw new Error(
          'Budget and row ids are required to update a standard budget entry'
        );
      }

      const body: StandardBudgetPayload = {};
      if (payload?.name !== undefined) body.name = payload.name;
      if (payload?.notes !== undefined) body.notes = payload.notes;
      if (payload?.amount !== undefined) {
        body.amount = Number(payload.amount) || 0;
      }
      if (payload?.category_id !== undefined) {
        body.category_id =
          payload.category_id === '' || payload.category_id === null
            ? null
            : payload.category_id;
      }
      if (payload?.position !== undefined) body.position = payload.position;
      if (payload?.is_big_expense !== undefined) {
        body.is_big_expense = Boolean(payload.is_big_expense);
      } else if (payload?.isBigExpense !== undefined) {
        body.is_big_expense = Boolean(payload.isBigExpense);
      }

      const normalized = await updateStandardBudgetRecord(
        budgetId,
        rowId,
        body
      );

      setStandardBudgetPlans((previous) => {
        const state = previous[budgetId] || createEmptyStandardBudgetState();
        const rows = sortStandardBudgetRows(
          (state.rows || []).map((row) =>
            String(row.id) === String(normalized.id) ? normalized : row
          )
        );
        return {
          ...previous,
          [budgetId]: {
            ...state,
            rows,
            total: computeStandardBudgetTotal(rows),
            loading: false,
            error: null,
            fetchedAt: Date.now()
          }
        };
      });

      return normalized;
    },
    []
  );

  const deleteStandardBudgetEntry = useCallback(async (budgetId, rowId) => {
    if (!budgetId || !rowId) return;
    await deleteStandardBudgetRecord(budgetId, rowId);

    setStandardBudgetPlans((previous) => {
      const state = previous[budgetId] || createEmptyStandardBudgetState();
      const rows = (state.rows || []).filter(
        (row) => String(row.id) !== String(rowId)
      );
      return {
        ...previous,
        [budgetId]: {
          ...state,
          rows,
          total: computeStandardBudgetTotal(rows),
          loading: false,
          error: null,
          fetchedAt: Date.now()
        }
      };
    });
  }, []);

  const reorderStandardBudgetEntries = useCallback(async (budgetId, rows) => {
    if (!budgetId || !Array.isArray(rows) || rows.length === 0) {
      return;
    }

    const payload = {
      rows: rows.map((row, index) => ({
        id: row.id,
        position:
          row.position !== undefined && row.position !== null
            ? row.position
            : index
      }))
    };

    await reorderStandardBudgetRecords(budgetId, payload);

    setStandardBudgetPlans((previous) => {
      const state = previous[budgetId] || createEmptyStandardBudgetState();
      const positionMap = new Map();
      payload.rows.forEach((row) => {
        positionMap.set(String(row.id), row.position);
      });
      const nextRows = sortStandardBudgetRows(
        (state.rows || []).map((row) => {
          if (!positionMap.has(String(row.id))) return row;
          return {
            ...row,
            position: positionMap.get(String(row.id))
          };
        })
      );
      return {
        ...previous,
        [budgetId]: {
          ...state,
          rows: nextRows,
          total: computeStandardBudgetTotal(nextRows),
          loading: false,
          error: null,
          fetchedAt: Date.now()
        }
      };
    });
  }, []);

  const fetchChildBudgetSummary = useCallback(
    async (budgetId, options: BudgetQueryOptions = {}) => {
      if (!budgetId) return null;
      const cacheKey = String(budgetId);
      const { force = false, refresh = false } = options;

      const cached = childBudgetSummariesRef.current[cacheKey];
      if (!force && !refresh && cached?.summary) {
        return cached.summary;
      }

      if (!force && childBudgetSummaryRequestsRef.current[cacheKey]) {
        return childBudgetSummaryRequestsRef.current[cacheKey];
      }

      setChildBudgetSummaries((previous = {}) => ({
        ...previous,
        [cacheKey]: {
          ...(previous[cacheKey] || {}),
          loading: true,
          error: null
        }
      }));

      const request = (async () => {
        try {
          const normalizedSummary = await fetchBudgetBeneficiarySummary(
            cacheKey,
            refresh ? { refresh: true } : undefined
          );

          const summary = {
            list: normalizedSummary.list,
            byId: normalizedSummary.byId,
            fetchedAt: Date.now()
          };

          childBudgetSummariesRef.current[cacheKey] = {
            summary
          };

          setChildBudgetSummaries((previous = {}) => ({
            ...previous,
            [cacheKey]: {
              summary,
              loading: false,
              error: null
            }
          }));

          return summary;
        } catch (error) {
          setChildBudgetSummaries((previous = {}) => ({
            ...previous,
            [cacheKey]: {
              ...(previous[cacheKey] || {}),
              loading: false,
              error
            }
          }));

          throw error;
        } finally {
          delete childBudgetSummaryRequestsRef.current[cacheKey];
        }
      })();

      childBudgetSummaryRequestsRef.current[cacheKey] = request;
      return request;
    },
    []
  );

  const resetBudgetCategoryState = useCallback(() => {
    setBudgetCategories([]);
    budgetCategoriesSeedRef.current = null;
  }, []);

  const getCategory = useCallback(
    async (options: BudgetQueryOptions = {}) => {
      const { force = false, ttl = DEFAULT_CACHE_TTL } = options;

      const cached = categoryCacheRef.current;
      if (!force && cached.data && isCacheEntryFresh(cached, ttl)) {
        dispatch({
          type: GET_CATEGORY,
          payload: cached.data
        });
        return cached.data;
      }

      if (!force && cached.promise) {
        return cached.promise;
      }

      dispatch({
        type: SEED_LOADING
      });

      const request = (async () => {
        try {
          const data = await listWorkspaceCategories();
          categoryCacheRef.current = {
            data,
            updatedAt: Date.now(),
            promise: null
          };
          dispatch({
            type: GET_CATEGORY,
            payload: data
          });
          return data;
        } catch (error) {
          dispatch({
            type: SEED_ERROR,
            payload: error.message || 'Failed to load categories'
          });
          if (typeof addToast === 'function') {
            const message =
              error.response?.data?.message ||
              error.message ||
              'Failed to load categories';
            addToast({ message, error: true });
          }
          throw error;
        } finally {
          categoryCacheRef.current.promise = null;
        }
      })();

      categoryCacheRef.current.promise = request;
      return request;
    },
    [addToast, dispatch, isCacheEntryFresh]
  );

  const getIncomeCategory = useCallback(
    async (id, category) => {
      dispatch({
        type: SEED_LOADING
      });

      const seedId = normalizeSeedId(id);
      if (!seedId) {
        return;
      }

      const aggregation = await fetchWorkspaceAggregation(seedId);
      const normalizedCategory = String(category || 'income').toLowerCase();
      const isDonationCategory =
        normalizedCategory === 'donation' || normalizedCategory === 'donations';
      const isExpenseCategory =
        normalizedCategory === 'expense' || normalizedCategory === 'expenses';
      const currentMonth = new Date().toLocaleString('en-US', {
        month: 'long'
      });
      let amount = null;

      if (Array.isArray(aggregation.monthly_summary)) {
        const monthEntry = aggregation.monthly_summary.find(
          (entry) => entry?.month === currentMonth
        );
        if (monthEntry) {
          if (isDonationCategory) {
            // Backend used to ship this value under `savings` (legacy
            // personal-finance naming); the field was renamed to
            // `donation` mid-2026. Fall back to `savings` so older
            // cached responses keep rendering during the rollout window.
            amount = monthEntry.donation ?? monthEntry.savings;
          } else if (isExpenseCategory) {
            amount = monthEntry.expenses;
          } else {
            amount = monthEntry.income;
          }
        }
      }

      if (amount === null || typeof amount === 'undefined') {
        if (isDonationCategory) {
          amount =
            aggregation.today_donation_total ??
            aggregation.weekly_donation_total ??
            0;
        } else if (isExpenseCategory) {
          amount =
            aggregation.today_expense_total ??
            aggregation.weekly_expense_total ??
            0;
        } else {
          amount =
            aggregation.today_income_total ??
            aggregation.weekly_income_total ??
            0;
        }
      }

      dispatch({
        type: GET_INCOME_CATEGORY,
        payload: { amount__sum: amount }
      });
    },
    [dispatch]
  );

  const getTransactionCategory = useCallback(
    async (id, options: BudgetQueryOptions = {}) => {
      const { force = false } = options;
      const seedId = normalizeSeedId(id);
      if (!seedId) {
        return;
      }

      if (!force && budgetCategoriesSeedRef.current === seedId) {
        const cachedCategories = budgetCategoriesRef.current;
        if (Array.isArray(cachedCategories)) {
          return cachedCategories;
        }
        return [];
      }

      const inFlight = transactionCategoryRequestsRef.current[seedId];
      if (inFlight) {
        return inFlight;
      }

      dispatch({
        type: SEED_LOADING
      });
      const request = (async () => {
        try {
          const categories = await listBudgetCategories(seedId);
          setBudgetCategories(categories);
          budgetCategoriesSeedRef.current = seedId;
          return categories;
        } catch (error) {
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
          throw error;
        } finally {
          delete transactionCategoryRequestsRef.current[seedId];
        }
      })();

      transactionCategoryRequestsRef.current[seedId] = request;
      return request;
    },
    [addToast, dispatch]
  );

  const createBudgeCategories = useCallback(
    async (seed, data) => {
      dispatch({
        type: SEED_LOADING
      });
      try {
        const createdCategories = await createBudgetCategoryRequest(seed, data);

        dispatch({
          type: UPDATE_SEED_TRANSACTIONS_CATEGORIES,
          payload: createdCategories
        });

        dispatch({
          type: SEED_SUCCESS
        });

        setBudgetCategories((previousCategories) => [
          createdCategories[0],
          ...previousCategories
        ]);
        budgetCategoriesSeedRef.current = normalizeSeedId(seed);

        if (typeof notifySuccess === 'function') {
          notifySuccess('Category Added successful!', { icon: '✅' });
        }

        return createdCategories;
      } catch (error) {
        dispatch({
          type: SEED_ERROR
        });
        if (typeof addToast === 'function' && error.response === undefined) {
          addToast({
            message: 'Unknown Error',
            error: true
          });
        } else if (
          typeof addToast === 'function' &&
          (error.response.status === 500 || error.response.status === 404)
        ) {
          addToast({ message: 'Server Error!', error: true });
        } else if (error.response?.status === 400) {
          if (
            error.response.data[0].slug &&
            typeof notifyError === 'function'
          ) {
            notifyError(error.response?.data[0].slug[0], { icon: '❌' });
          }
        }
      }
    },
    [addToast, dispatch, notifyError, notifySuccess]
  );

  // Optimistic create: dispatches CREATE_BUDGET with a stub immediately
  // so BudgetDashboardPage's SwitcherCard re-renders before the network
  // round-trip lands. On success the stub is swapped for the real
  // backend record (preserves list order); on failure the stub is
  // removed and the error is re-thrown so callers can still react.
  //
  // Every "create a budget" path (manual wizard, extract from txns,
  // future ones) goes through this so the "I saved it but I can't see
  // it" failure mode is structurally impossible -- the row is in the
  // list before the API even responds.
  const createBudgetOptimistic = useCallback(
    async <T>({
      draft,
      persist,
      successMessage
    }: {
      draft: Record<string, any>;
      persist: () => Promise<T>;
      successMessage?: string;
    }): Promise<T | undefined> => {
      const tempId = `optimistic-budget-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const optimisticBudget = {
        id: tempId,
        isOptimistic: true,
        ...draft
      };
      dispatch({
        type: CREATE_BUDGET,
        payload: optimisticBudget
      });
      dispatch({ type: SEED_LOADING });
      try {
        const realBudget = (await persist()) as any;
        dispatch({ type: SEED_SUCCESS });
        if (realBudget && resolveBudgetIdentifier(realBudget)) {
          dispatch({
            type: REPLACE_BUDGET_TEMP,
            payload: { tempId, budget: realBudget }
          });
        } else {
          // Backend returned nothing recognizable -- drop the stub so
          // the list doesn't carry a permanent placeholder.
          dispatch({
            type: DELETE_BUDGET,
            payload: { budgetId: tempId }
          });
        }
        if (successMessage && typeof addToast === 'function') {
          addToast({ message: successMessage, error: false });
        }
        return realBudget;
      } catch (error: any) {
        dispatch({ type: SEED_ERROR });
        dispatch({
          type: DELETE_BUDGET,
          payload: { budgetId: tempId }
        });
        if (typeof addToast === 'function') {
          if (error?.response === undefined) {
            addToast({ message: 'Unknown Error', error: true });
          } else if (
            error.response.status === 500 ||
            error.response.status === 404
          ) {
            addToast({ message: 'Server Error!', error: true });
          } else if (
            error.response.status === 400 &&
            error.response.data?.name
          ) {
            addToast({
              message: 'Budget: ' + error.response.data.name,
              error: true
            });
          } else {
            addToast({
              message:
                error?.response?.data?.detail ||
                error?.message ||
                'Could not save budget.',
              error: true
            });
          }
        }
        throw error;
      }
    },
    [addToast, dispatch]
  );

  const createBudget = useCallback(
    async (_seed, data) =>
      createBudgetOptimistic({
        draft: {
          name: data?.name,
          slug: data?.slug,
          source: 'manual',
          ...data
        },
        persist: () => createWorkspaceBudget(data),
        successMessage: 'Success Budget Added!'
      }),
    [createBudgetOptimistic]
  );

  // Persists the edited extract-from-transactions preview. Same
  // optimistic flow as createBudget so the row lands in the list the
  // moment the user clicks "Save Budget" -- not after the round-trip.
  const createBudgetFromPreview = useCallback(
    async (seedId, payload: Record<string, any>) =>
      createBudgetOptimistic({
        draft: {
          name: payload?.name,
          workspace_id: seedId,
          source: 'extracted_from_transactions',
          start_date: payload?.start_date,
          estimate_count: Array.isArray(payload?.expense_estimates)
            ? payload.expense_estimates.length
            : 0
        },
        persist: () => saveBudgetFromPreview(payload),
        successMessage: 'Budget created from your transactions!'
      }),
    [createBudgetOptimistic]
  );

  // Edits an existing budget's metadata (name, notes, etc.). Mirrors
  // softDeleteBudget's cache-touch pattern: PATCH the backend, then patch
  // every cache layer that holds a copy of the budget so the UI rerenders
  // with the new values before the next seed refresh fetches the
  // canonical version. seedId is required because the backend route is
  // /budget/<id>/<workspace>/ -- without it the PATCH 404s.
  const updateBudget = useCallback(
    async (
      budgetId,
      payload: Record<string, unknown>,
      opts: { seedId?: string } = {}
    ) => {
      if (!budgetId) {
        throw new Error('Budget id is required to update a budget');
      }
      if (!opts.seedId) {
        throw new Error('A workspace is required to update a budget');
      }

      const cacheKey = String(budgetId);
      const updated = await updateBudgetRecord(cacheKey, opts.seedId, payload);

      // Dispatch UPDATE_BUDGET so the seedReducer merges the patch
      // into state.budgets AND state.seed.budgets -- that's the
      // reducer state the SwitcherCard reads from, so this is what
      // makes the new name show up immediately. Without this dispatch
      // the cache touches below mutate refs that don't trigger React
      // re-renders, and the UI shows the old name until a full
      // refetch -- exactly the bug that shipped in PR #141.
      //
      // The patch payload should be the actual fields that changed
      // (name, slug, ...). Fall back to the request payload if the
      // backend response is null/empty.
      const reducerPatch =
        updated && typeof updated === 'object' ? updated : payload;
      dispatch({
        type: UPDATE_BUDGET,
        payload: { budgetId: cacheKey, patch: reducerPatch }
      });

      // Cache-layer touches mirror softDeleteBudget: budgetDetails
      // (per-budget cache used by BudgetOverview and the wizard's
      // prefill), seedCacheRef (the lower-level cache layer that the
      // reducer's seed state mirrors). The reducer dispatch above is
      // what drives the active render; these keep older cache entries
      // consistent so navigating away and back doesn't show stale
      // data.
      updateBudgetDetails((previous = {}) => {
        const existing = previous[cacheKey]?.data;
        return {
          ...previous,
          [cacheKey]: {
            data: { ...(existing || {}), ...(reducerPatch || {}) },
            fetchedAt: Date.now(),
            loading: false,
            error: null
          }
        };
      });

      Object.keys(seedCacheRef.current || {}).forEach((key) => {
        const cached = seedCacheRef.current[key];
        if (!cached?.data?.budgets) return;
        const nextBudgets = cached.data.budgets.map((b) => {
          const bid = b?.id ?? b?.pk ?? b?.uuid ?? b?.slug;
          if (String(bid) !== cacheKey) return b;
          return { ...b, ...(reducerPatch || {}) };
        });
        seedCacheRef.current[key] = {
          ...cached,
          data: { ...cached.data, budgets: nextBudgets },
          updatedAt: Date.now()
        };
      });

      if (typeof addToast === 'function') {
        addToast({ message: 'Budget updated.', error: false });
      }
      return updated;
    },
    [addToast, dispatch, seedCacheRef, updateBudgetDetails]
  );

  const createBudgetEstimate = useCallback(
    async (seed, data) => {
      const userId = resolveStoredUserId();

      dispatch({
        type: SEED_LOADING
      });
      try {
        const createdEstimate = await createWorkspaceBudgetEstimate(seed, {
          ...data,
          user: userId
        });
        dispatch({
          type: SEED_SUCCESS
        });
        dispatch({
          type: CREATE_BUDGET_ESTIMATE,
          payload: createdEstimate
        });

        const formattedEstimate = {
          id: createdEstimate.id,
          category_name: createdEstimate.category?.name || 'Unknown Category',
          amount: createdEstimate.amount
        };

        dispatch({
          type: UPDATE_PROJECT_BUDGET_ESTIMATES,
          payload: {
            projectId: data.project,
            newEstimate: formattedEstimate
          }
        });

        if (typeof addToast === 'function') {
          addToast({ message: 'Success Budget Added!', error: false });
        }
        return createdEstimate;
      } catch (error) {
        dispatch({
          type: SEED_ERROR
        });
        if (typeof addToast === 'function') {
          if (error.response === undefined) {
            addToast({
              message: 'Unknown Error',
              error: true
            });
          } else if (
            error.response.status === 500 ||
            error.response.status === 404
          ) {
            addToast({ message: 'Server Error!', error: true });
          } else if (error.response.status === 400) {
            if (error.response.data.amount) {
              addToast({
                message: 'Amount: ' + error.response.data.amount,
                error: true
              });
            } else {
              addToast({
                message: 'Server Error!',
                error: true
              });
            }
          } else {
            addToast({ message: 'Server Error!', error: true });
          }
        }
        throw error;
      }
    },
    [addToast, dispatch]
  );

  const getBudgets = useCallback(
    async (id, options: BudgetQueryOptions = {}) => {
      if (typeof id !== 'string' && typeof id !== 'number') {
        return null;
      }

      const { force = false, ttl = DEFAULT_CACHE_TTL } = options;
      const cacheKey = String(id);
      const cached = budgetCacheRef.current[cacheKey];

      if (!force && isCacheEntryFresh(cached, ttl)) {
        dispatch({
          type: GET_BUDGET,
          payload: cached.data
        });
        dispatch({
          type: SEED_SUCCESS
        });
        return cached.data;
      }

      if (!force && budgetRequestRef.current[cacheKey]) {
        return budgetRequestRef.current[cacheKey];
      }

      dispatch({
        type: SEED_LOADING
      });
      const request = (async () => {
        try {
          const data = await listWorkspaceBudgets(cacheKey);
          budgetCacheRef.current[cacheKey] = {
            data,
            updatedAt: Date.now()
          };
          dispatch({
            type: GET_BUDGET,
            payload: data
          });
          dispatch({
            type: SEED_SUCCESS
          });
          return data;
        } catch (error) {
          dispatch({
            type: SEED_ERROR
          });
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
          throw error;
        } finally {
          delete budgetRequestRef.current[cacheKey];
        }
      })();

      budgetRequestRef.current[cacheKey] = request;
      return request;
    },
    [addToast, dispatch, isCacheEntryFresh]
  );

  const getFinancialData = useCallback(
    async (seedId, options: BudgetQueryOptions = {}) => {
      const {
        force = false,
        ttl = DEFAULT_CACHE_TTL,
        persona,
        startDate,
        endDate
      } = options;
      const normalizedSeedId = normalizeSeedId(seedId);

      if (!normalizedSeedId) {
        return null;
      }

      // Custom-range fetches bypass the time-based cache — the range
      // itself is part of the key and caching every variant would bloat
      // memory. Re-fetch every time; the range changes are user-driven
      // and infrequent.
      const hasCustomRange = Boolean(startDate && endDate);
      const cached = financialCacheRef.current[normalizedSeedId];
      if (!force && !hasCustomRange && isCacheEntryFresh(cached, ttl)) {
        dispatch({
          type: GET_FINANCIAL_DATA_SUCCESS,
          payload: cached.data
        });
        return cached.data;
      }

      if (
        !force &&
        !hasCustomRange &&
        financialRequestRef.current[normalizedSeedId]
      ) {
        return financialRequestRef.current[normalizedSeedId];
      }

      dispatch({ type: GET_FINANCIAL_DATA_LOADING });

      const request = (async () => {
        try {
          const aggregation = await fetchWorkspaceAggregation(
            normalizedSeedId,
            persona,
            hasCustomRange ? { startDate, endDate } : undefined
          );
          if (aggregation && typeof aggregation === 'object') {
            const {
              weekly = {},
              monthly_chart = {},
              yearly_chart = {},
              custom_range_chart = {},
              top_categories,
              monthly_summary
            } = aggregation;

            const extractSeries = (bucket = {}, ...keys) => {
              for (const key of keys) {
                const candidate = bucket?.[key];
                if (Array.isArray(candidate)) {
                  return candidate;
                }
              }
              return [];
            };

            const normalizeSeries = (series = []) => {
              if (!Array.isArray(series)) return [];
              return series.map((entry) => {
                if (entry === null || entry === undefined) return 0;
                if (typeof entry === 'number') return entry;
                if (typeof entry === 'string') {
                  const parsed = parseFloat(entry);
                  return Number.isFinite(parsed) ? parsed : 0;
                }
                if (typeof entry === 'object' && entry !== null) {
                  const value =
                    entry.amount !== undefined ? entry.amount : entry.value;
                  if (typeof value === 'number') return value;
                  const parsed = parseFloat(value);
                  return Number.isFinite(parsed) ? parsed : 0;
                }
                return 0;
              });
            };

            const normalizedMonthlySummary = Array.isArray(monthly_summary)
              ? monthly_summary.map((entry, index) => {
                  // Backend renamed `savings` → `donation` mid-2026 to
                  // match what the field actually carries. Prefer the
                  // new name; fall back so an older cached response
                  // doesn't render zeros during the rollout window.
                  const donationRaw =
                    entry?.donation !== undefined && entry?.donation !== null
                      ? entry.donation
                      : entry?.savings;
                  return {
                    id: entry?.id ?? entry?.month ?? `month-${index}`,
                    month: entry?.month,
                    income:
                      typeof entry?.income === 'number'
                        ? entry.income
                        : parseFloat(entry?.income || 0) || 0,
                    expenses:
                      typeof entry?.expenses === 'number'
                        ? entry.expenses
                        : parseFloat(entry?.expenses || 0) || 0,
                    donation:
                      typeof donationRaw === 'number'
                        ? donationRaw
                        : parseFloat(donationRaw || 0) || 0,
                    net:
                      typeof entry?.net === 'number'
                        ? entry.net
                        : parseFloat(entry?.net ?? '') ||
                          (typeof entry?.income === 'number'
                            ? entry.income
                            : parseFloat(entry?.income || 0) || 0) -
                            (typeof entry?.expenses === 'number'
                              ? entry.expenses
                              : parseFloat(entry?.expenses || 0) || 0)
                  };
                })
              : [];

            const buildBucket = (bucket = {}) => ({
              income: normalizeSeries(
                extractSeries(bucket, 'income', 'incomes')
              ),
              expense: normalizeSeries(
                extractSeries(bucket, 'expense', 'expenses')
              ),
              donation: normalizeSeries(
                extractSeries(bucket, 'donation', 'donations')
              ),
              sponsorship: normalizeSeries(
                extractSeries(
                  bucket,
                  'sponsorship',
                  'sponsorships',
                  'sponsorship_income'
                )
              ),
              project_funding: normalizeSeries(
                extractSeries(
                  bucket,
                  'project_funding',
                  'project_fundings',
                  'projects',
                  'project_income'
                )
              ),
              campaign: normalizeSeries(
                extractSeries(
                  bucket,
                  'campaign',
                  'campaigns',
                  'campaign_income'
                )
              ),
              event: normalizeSeries(
                extractSeries(bucket, 'event', 'events', 'event_income')
              ),
              shop: normalizeSeries(
                extractSeries(bucket, 'shop', 'shop_income')
              ),
              grant: normalizeSeries(
                extractSeries(bucket, 'grant', 'grants', 'grant_income')
              ),
              contribution: normalizeSeries(
                extractSeries(bucket, 'contribution', 'contributions')
              ),
              hours_value: normalizeSeries(
                extractSeries(bucket, 'hours_value', 'volunteer_value')
              )
            });

            const payload = {
              weekly: buildBucket(weekly),
              monthly: buildBucket(monthly_chart),
              yearly: buildBucket(yearly_chart),
              custom: buildBucket(custom_range_chart),
              // Expose the raw chart-point labels so the chart can render
              // x-axis labels that match the backend's bucket granularity
              // (e.g. "Jan 2026" vs "Jan 15") without re-deriving them.
              customLabels: Array.isArray(custom_range_chart?.income)
                ? custom_range_chart.income.map((p) => p?.day || p?.label || '')
                : Array.isArray(custom_range_chart?.expense)
                ? custom_range_chart.expense.map(
                    (p) => p?.day || p?.label || ''
                  )
                : [],
              monthlySummary: normalizedMonthlySummary,
              topCategories: top_categories
            };

            financialCacheRef.current[normalizedSeedId] = {
              data: payload,
              updatedAt: Date.now()
            };

            dispatch({
              type: GET_FINANCIAL_DATA_SUCCESS,
              payload
            });
            return payload;
          }

          const message = 'Failed to fetch financial data';
          dispatch({
            type: GET_FINANCIAL_DATA_ERROR,
            payload: message
          });
          throw new Error(message);
        } catch (error) {
          dispatch({
            type: GET_FINANCIAL_DATA_ERROR,
            payload: error.message || 'An error occurred'
          });
          throw error;
        } finally {
          delete financialRequestRef.current[normalizedSeedId];
        }
      })();

      financialRequestRef.current[normalizedSeedId] = request;
      return request;
    },
    [dispatch, isCacheEntryFresh]
  );

  const getContributionMeans = useCallback(
    async (page = 1, append = false, seedId = null) => {
      try {
        dispatch({ type: GET_CONTRIBUTION_MEANS_LOADING });
        const normalizedSeedId = normalizeSeedId(seedId);
        const response = await listContributionMeansRequest({
          workspaceId: normalizedSeedId,
          page
        });
        dispatch({
          type: GET_CONTRIBUTION_MEANS,
          payload: response,
          append
        });
        dispatch({ type: GET_CONTRIBUTION_MEANS_SUCCESS });
        return response;
      } catch (error) {
        dispatch({
          type: GET_CONTRIBUTION_MEANS_ERROR,
          payload:
            error.response?.data?.message || 'Error fetching contribution means'
        });
        throw error;
      }
    },
    [dispatch]
  );

  return {
    getCategory,
    getIncomeCategory,
    getTransactionCategory,
    createBudgeCategories,
    budgetCategories,
    standardBudgetPlans,
    setStandardBudgetPlan,
    getStandardBudgetPlan,
    clearStandardBudgetPlan,
    fetchStandardBudgetPlan,
    budgetDetails,
    fetchBudgetDetail,
    updateBudgetStatus,
    softDeleteBudget,
    updateBudget,
    createStandardBudgetEntry,
    updateStandardBudgetEntry,
    deleteStandardBudgetEntry,
    reorderStandardBudgetEntries,
    fetchChildBudgetSummary,
    childBudgetSummaries,
    createBudget,
    createBudgetFromPreview,
    createBudgetEstimate,
    getBudgets,
    getFinancialData,
    getContributionMeans,
    resetBudgetCategoryState
  };
};
