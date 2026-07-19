import { useCallback, useRef, useState } from 'react';
import {
  CREATE_CHILD_ERROR,
  CREATE_CHILD_EXPENSE,
  CREATE_CHILD_INCOME,
  CREATE_CHILD_LOADING,
  CREATE_CHILD_SUCCESS,
  GET_CHILD_ERROR,
  GET_CHILD_LOADING,
  GET_CHILD_SUCCESS,
  GET_EXPENSE_TOTAL,
  GET_INCOME_ERROR,
  GET_INCOME_LOADING,
  SEED_ERROR,
  SEED_LOADING,
  SEED_SUCCESS
} from '../../../types/seedTypes';
import {
  listSeedExpenseTransactions,
  listSeedIncomeTransactions,
  listSeedTransactions
} from '../../../application/transactions/transactionFeedService';
import { buildTransactionFeedQueryParams } from '../../../domain/transactions/feedQuery';
import {
  createBudgetTransaction,
  fetchChildExpenseTransactions,
  fetchChildIncomeTransactions
} from '../../../application/transactions/transactionsService';
import { normalizeWorkspaceId as normalizeSeedId } from '../../../domain/workspace/workspaceId';
import { readViewerStoredUser } from '../../../features/auth/presentation/browserAuthSessionSupport';

const TRANSACTION_CACHE_TTL = 2 * 60 * 1000;
const DEFAULT_TRANSACTIONS_PAGE_SIZE = 200;
const MAX_TRANSACTIONS_PAGES = 50;

const readStoredTransactionUser = () => readViewerStoredUser() || {};

const resolveBudgetList = (budgets) =>
  Array.isArray(budgets)
    ? budgets
    : Array.isArray(budgets?.results)
    ? budgets.results
    : Array.isArray(budgets?.data)
    ? budgets.data
    : Array.isArray(budgets?.budgets)
    ? budgets.budgets
    : [];

type TransactionQueryOptions = {
  force?: boolean;
  ttl?: number;
  filters?: Record<string, unknown>;
  page_size?: number;
  page?: number;
  maxPages?: number;
  budget?: string | number | null;
};

export const useSeedTransactionsPresentation = ({
  dispatch,
  addToast,
  budgetCategories,
  budgets
}: {
  dispatch: any;
  addToast?: ((payload: { message: string; error: boolean }) => void) | null;
  budgetCategories?: any[];
  budgets?: any;
}) => {
  const [income, setIncome] = useState<any[]>([]);
  const [incomeBudgets, setIncomeBudgets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<any>(null);
  const [incomeTotal, setIncomeTotal] = useState<any>();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseTotal, setExpenseTotal] = useState<any>();
  const [incomeChartData, setIncomeChartData] = useState<any>();
  const [expenseChartData, setExpenseChartData] = useState<any>();
  const [transactionsSeedId, setTransactionsSeedId] = useState<any>(null);

  const [childTransactions, setChildTransactions] = useState<any[]>([]);
  const [childYesterdayTransactions, setChildYesterdayTransactions] =
    useState<any>();
  const [childTotalTransactions, setChildTotalTransactions] = useState<any>();
  const [childYDiffFromLastWeek, setChildYDiffFromLastWeek] = useState<any>();
  const [childTodayTransactions, setChildTodayTransactions] = useState<any>();
  const [childCurrentMonthTotal, setChildCurrentMonthTotal] = useState<any>();
  const [childLastMonthTotal, setChildLastMonthTotal] = useState<any>();
  const [childDiffFromLastMonth, setChildDiffFromLastMonth] = useState<any>();
  const [childYesterdayTotal, setChildYesterdayTotal] = useState<any>();
  const [childTodayTotal, setChildTodayTotal] = useState<any>();
  const [childWeeklyChart, setChildWeeklyChart] = useState<any>();
  const [childIncomeTransactions, setChildIncomeTransactions] = useState<any[]>(
    []
  );
  const [
    childIncomeYesterdayTransactions,
    setChildIncomeYesterdayTransactions
  ] = useState<any>();
  const [childIncomeTotalTransactions, setChildIncomeTotalTransactions] =
    useState<any>();
  const [childIncomeYDiffFromLastWeek, setChildIncomeYDiffFromLastWeek] =
    useState<any>();
  const [childIncomeTodayTransactions, setChildIncomeTodayTransactions] =
    useState<any>();
  const [childIncomeCurrentMonthTotal, setChildIncomeCurrentMonthTotal] =
    useState<any>();
  const [childIncomeLastMonthTotal, setChildIncomeLastMonthTotal] =
    useState<any>();
  const [childIncomeDiffFromLastMonth, setChildIncomeDiffFromLastMonth] =
    useState<any>();
  const [childIncomeYesterdayTotal, setChildIncomeYesterdayTotal] =
    useState<any>();
  const [childIncomeTodayTotal, setChildIncomeTodayTotal] = useState<any>();
  const [childIncomeWeeklyChart, setChildIncomeWeeklyChart] = useState<any>();
  const [childIncomeLoading, setChildIncomeLoading] = useState(false);
  const [childIncomeError, setChildIncomeError] = useState<any>(null);

  const transactionsCacheRef = useRef<Record<string, any>>({});
  const incomeRequestsRef = useRef<Record<string, Promise<any>>>({});
  const expenseRequestsRef = useRef<Record<string, Promise<any>>>({});
  const transactionsRequestsRef = useRef<Record<string, Promise<any>>>({});
  const childIncomeRequestsRef = useRef<Record<string, Promise<any>>>({});

  const getTransactionCacheEntry = useCallback(
    (seedId) => transactionsCacheRef.current[seedId],
    []
  );

  const updateTransactionCache = useCallback(
    (seedId, patch = {}, { bumpTimestamp = true } = {}) => {
      if (!seedId) return null;
      const existing = transactionsCacheRef.current[seedId] || {};
      const next = {
        ...existing,
        ...patch
      };
      if (bumpTimestamp) {
        next.updatedAt = Date.now();
      } else if (existing.updatedAt && next.updatedAt === undefined) {
        next.updatedAt = existing.updatedAt;
      }
      transactionsCacheRef.current[seedId] = next;
      return next;
    },
    []
  );

  const isTransactionCacheFresh = useCallback(
    (entry, ttl = TRANSACTION_CACHE_TTL) => {
      if (!entry || !entry.updatedAt) return false;
      return Date.now() - entry.updatedAt < ttl;
    },
    []
  );

  const applyTransactionsToState = useCallback(
    (seedId, data: Record<string, any> = {}) => {
      if (!seedId) return;
      setTransactionsSeedId(seedId);
      if (typeof data.income !== 'undefined') setIncome(data.income);
      if (typeof data.incomeBudgets !== 'undefined')
        setIncomeBudgets(data.incomeBudgets);
      if (typeof data.incomeTotal !== 'undefined')
        setIncomeTotal(data.incomeTotal);
      if (typeof data.incomeChartData !== 'undefined')
        setIncomeChartData(data.incomeChartData);
      if (typeof data.expenses !== 'undefined') setExpenses(data.expenses);
      if (typeof data.expenseTotal !== 'undefined')
        setExpenseTotal(data.expenseTotal);
      if (typeof data.expenseChartData !== 'undefined')
        setExpenseChartData(data.expenseChartData);
      if (typeof data.transactions !== 'undefined')
        setTransactions(data.transactions);
    },
    []
  );

  const buildWeeklyChartData = useCallback((transactionsList = []) => {
    const days = [];
    const totals = [];
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - offset
      );
      days.push(date.toLocaleDateString(undefined, { weekday: 'short' }));
      totals.push(0);
    }

    transactionsList.forEach((transaction) => {
      const rawDate =
        transaction?.date || transaction?.created_at || transaction?.createdAt;
      if (!rawDate) return;
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) return;
      const transactionStart = new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate()
      ).getTime();
      const diffDays = Math.floor(
        (todayStart - transactionStart) / (1000 * 60 * 60 * 24)
      );
      if (diffDays < 0 || diffDays > 6) return;
      const index = 6 - diffDays;
      totals[index] += Math.abs(Number(transaction?.amount) || 0);
    });

    const maxValue = Math.max(...totals, 0);
    return totals.map((value, index) => ({
      day: days[index],
      amount: maxValue > 0 ? Number(((value / maxValue) * 100).toFixed(2)) : 0,
      displayAmount: Number(value.toFixed(2))
    }));
  }, []);

  const resetTransactionState = useCallback(() => {
    setIncome([]);
    setIncomeTotal(null);
    setIncomeChartData(undefined);
    setExpenses([]);
    setExpenseTotal(null);
    setExpenseChartData(undefined);
    setTransactions([]);
    setTransactionsSeedId(null);
  }, []);

  const getIncome = useCallback(
    async (id, options: TransactionQueryOptions = {}) => {
      const {
        force = false,
        ttl = TRANSACTION_CACHE_TTL,
        filters = {},
        page_size = DEFAULT_TRANSACTIONS_PAGE_SIZE,
        maxPages = MAX_TRANSACTIONS_PAGES
      } = options;
      const seedId = normalizeSeedId(id);
      if (!seedId) return null;

      const cached = getTransactionCacheEntry(seedId);
      if (
        !force &&
        cached?.income &&
        typeof cached?.incomeTotal !== 'undefined' &&
        isTransactionCacheFresh(cached, ttl)
      ) {
        applyTransactionsToState(seedId, cached);
        return cached;
      }

      if (!force && incomeRequestsRef.current[seedId]) {
        return incomeRequestsRef.current[seedId];
      }

      dispatch({ type: GET_INCOME_LOADING });

      const requestState: { current: Promise<any> | null } = {
        current: null
      };
      const request = (async () => {
        try {
          const res = await listSeedIncomeTransactions({
            seedId,
            filters,
            page_size,
            maxPages
          });
          const payload = {
            income: res?.items || [],
            incomeBudgets: [],
            incomeTotal: (res?.items || []).reduce(
              (sum, transaction) => sum + (Number(transaction?.amount) || 0),
              0
            ),
            incomeChartData: buildWeeklyChartData(res?.items || [])
          };

          const nextCache = updateTransactionCache(seedId, payload);
          applyTransactionsToState(seedId, nextCache);
          return nextCache;
        } catch (error) {
          dispatch({
            type: GET_INCOME_ERROR,
            payload: error.message || 'An error occurred'
          });
          throw error;
        } finally {
          if (incomeRequestsRef.current[seedId] === requestState.current) {
            delete incomeRequestsRef.current[seedId];
          }
        }
      })();

      requestState.current = request;
      incomeRequestsRef.current[seedId] = request;
      return request;
    },
    [
      applyTransactionsToState,
      buildWeeklyChartData,
      dispatch,
      getTransactionCacheEntry,
      isTransactionCacheFresh,
      updateTransactionCache
    ]
  );

  const getIncomeTotal = useCallback(
    async (id, options: TransactionQueryOptions = {}) => {
      const data = await getIncome(id, options);
      return data?.incomeTotal ?? incomeTotal;
    },
    [getIncome, incomeTotal]
  );

  const getTransactions = useCallback(
    async (seedId, options: TransactionQueryOptions = {}) => {
      const {
        force = false,
        ttl = TRANSACTION_CACHE_TTL,
        filters = {},
        page_size = DEFAULT_TRANSACTIONS_PAGE_SIZE,
        maxPages = MAX_TRANSACTIONS_PAGES
      } = options;
      const normalizedSeedId = normalizeSeedId(seedId);
      if (!normalizedSeedId) return null;

      const cached = getTransactionCacheEntry(normalizedSeedId);
      if (
        !force &&
        cached?.transactions &&
        isTransactionCacheFresh(cached, ttl)
      ) {
        applyTransactionsToState(normalizedSeedId, cached);
        return cached;
      }

      if (!force && transactionsRequestsRef.current[normalizedSeedId]) {
        return transactionsRequestsRef.current[normalizedSeedId];
      }

      setTransactionsLoading(true);
      setTransactionsError(null);

      const requestState: { current: Promise<any> | null } = {
        current: null
      };
      const request = (async () => {
        try {
          const res = await listSeedTransactions({
            seedId: normalizedSeedId,
            filters,
            page_size,
            maxPages
          });
          const payload = {
            transactions: Array.isArray(res?.items) ? res.items : []
          };

          const nextCache = updateTransactionCache(normalizedSeedId, payload);
          applyTransactionsToState(normalizedSeedId, nextCache);
          return nextCache;
        } catch (error) {
          const message =
            error.response?.data?.message ||
            error.message ||
            'Unable to load transactions';
          setTransactionsError(message);
          if (typeof addToast === 'function') {
            addToast({ message, error: true });
          }
          throw error;
        } finally {
          setTransactionsLoading(false);
          if (
            transactionsRequestsRef.current[normalizedSeedId] ===
            requestState.current
          ) {
            delete transactionsRequestsRef.current[normalizedSeedId];
          }
        }
      })();

      requestState.current = request;
      transactionsRequestsRef.current[normalizedSeedId] = request;
      return request;
    },
    [
      addToast,
      applyTransactionsToState,
      getTransactionCacheEntry,
      isTransactionCacheFresh,
      updateTransactionCache
    ]
  );

  const queryTransactions = useCallback(
    async (seedId, options: TransactionQueryOptions = {}) => {
      const {
        filters = {},
        page_size = DEFAULT_TRANSACTIONS_PAGE_SIZE,
        page = 1,
        maxPages = MAX_TRANSACTIONS_PAGES
      } = options;
      const normalizedSeedId = normalizeSeedId(seedId);
      if (!normalizedSeedId) {
        return { items: [], meta: { count: 0, next: null, previous: null } };
      }
      return listSeedTransactions({
        seedId: normalizedSeedId,
        filters,
        page,
        page_size,
        maxPages
      });
    },
    []
  );

  const getExpenses = useCallback(
    async (id, options: TransactionQueryOptions = {}) => {
      const {
        force = false,
        ttl = TRANSACTION_CACHE_TTL,
        filters = {},
        page_size = DEFAULT_TRANSACTIONS_PAGE_SIZE,
        maxPages = MAX_TRANSACTIONS_PAGES
      } = options;
      const seedId = normalizeSeedId(id);
      if (!seedId) return null;

      const cached = getTransactionCacheEntry(seedId);
      if (
        !force &&
        cached?.expenses &&
        typeof cached?.expenseTotal !== 'undefined' &&
        isTransactionCacheFresh(cached, ttl)
      ) {
        applyTransactionsToState(seedId, cached);
        return cached;
      }

      if (!force && expenseRequestsRef.current[seedId]) {
        return expenseRequestsRef.current[seedId];
      }

      dispatch({ type: SEED_LOADING });

      const requestState: { current: Promise<any> | null } = {
        current: null
      };
      const request = (async () => {
        try {
          const res = await listSeedExpenseTransactions({
            seedId,
            filters,
            page_size,
            maxPages
          });
          const payload = {
            expenses: res?.items || [],
            expenseTotal: (res?.items || []).reduce(
              (sum, transaction) =>
                sum + Math.abs(Number(transaction?.amount) || 0),
              0
            ),
            expenseChartData: buildWeeklyChartData(res?.items || [])
          };

          const nextCache = updateTransactionCache(seedId, payload);
          applyTransactionsToState(seedId, nextCache);
          dispatch({ type: SEED_SUCCESS });
          return nextCache;
        } catch (error) {
          dispatch({ type: SEED_ERROR });
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
          if (expenseRequestsRef.current[seedId] === requestState.current) {
            delete expenseRequestsRef.current[seedId];
          }
        }
      })();

      requestState.current = request;
      expenseRequestsRef.current[seedId] = request;
      return request;
    },
    [
      addToast,
      applyTransactionsToState,
      buildWeeklyChartData,
      dispatch,
      getTransactionCacheEntry,
      isTransactionCacheFresh,
      updateTransactionCache
    ]
  );

  const getExpsenseTotal = useCallback(
    async (id, options: TransactionQueryOptions = {}) => {
      const data = await getExpenses(id, options);
      return data?.expenseTotal ?? expenseTotal;
    },
    [expenseTotal, getExpenses]
  );

  const createIncome = useCallback(
    async (
      seed,
      description,
      amount,
      category,
      options: TransactionQueryOptions = {}
    ) => {
      const currentUser = readStoredTransactionUser();
      const uuid = currentUser?.pk;

      dispatch({ type: SEED_LOADING });

      const today = new Date().toISOString().split('T')[0];
      const payload: any = {
        seed,
        user: uuid,
        notes: description,
        transaction_type: 'income',
        amount,
        date: today
      };

      if (options?.budget) {
        payload.budget = options.budget;
      } else if (category) {
        payload.category = category;
      }
      // Merge additional optional fields
      const extraKeys = [
        'source_type',
        'project',
        'campaign',
        'event',
        'recipient',
        'income_source_name',
        'receipt_file',
        // ``recurring`` mirrors the expense flow — the backend
        // controller now plumbs the same {frequency, end_date?}
        // payload through to CreateRecurringExpenseTemplateCommand
        // for income too.
        'recurring',
        // Sprint 1.5 — operating | savings | investing | debt. Orthogonal
        // to source_type; lets the dashboard hero split Savings/Debt
        // moves out of operating spend so Leftover stays honest.
        'purpose',
        // Sprint 6 — planned | unplanned | sinking_fund | one_time.
        // Orthogonal to purpose; drives the Unplanned hero row + amber
        // row pill + downstream AI pattern detection. Income forms still
        // pass it (default 'planned') so the BE round-trip stays stable.
        'spend_kind'
      ];
      extraKeys.forEach((k) => {
        if (
          options?.[k] !== undefined &&
          options[k] !== null &&
          options[k] !== ''
        ) {
          payload[k] = options[k];
        }
      });

      try {
        const res = await createBudgetTransaction({ seedId: seed, payload });
        const budgetList = resolveBudgetList(budgets);

        let categoryName = '';
        if (options?.budget) {
          const budgetMatch = budgetList.find((budget) => {
            const budgetId =
              budget?.id || budget?.pk || budget?.uuid || budget?.slug;
            return String(budgetId) === String(options.budget);
          });
          categoryName =
            budgetMatch?.name ||
            budgetMatch?.title ||
            budgetMatch?.display_name ||
            `Budget ${options.budget}`;
        } else {
          const categoryObj = (budgetCategories || []).find(
            (cat) => String(cat.id) === String(category)
          );
          categoryName = categoryObj?.name || `Category ${category}`;
        }

        const enhancedTransaction = {
          ...(res.raw || {}),
          user: {
            username: currentUser.username,
            first_name: currentUser.first_name,
            last_name: currentUser.last_name,
            profile: {
              photo_url: currentUser.profile?.photo_url || null
            }
          },
          category: categoryName,
          ...(options?.budget
            ? {
                budget: {
                  id: options.budget,
                  name: categoryName
                }
              }
            : {}),
          status: 'pending'
        };

        setIncome((previous) => {
          const nextIncome = [enhancedTransaction, ...previous];
          updateTransactionCache(seed, { income: nextIncome });
          return nextIncome;
        });
        setIncomeTotal((previous) => {
          const numericAmount = Number(amount) || 0;
          const nextTotal =
            typeof previous === 'number'
              ? previous + numericAmount
              : numericAmount;
          updateTransactionCache(seed, { incomeTotal: nextTotal });
          return nextTotal;
        });
        const ledgerEntry = {
          ...enhancedTransaction,
          transaction_type: 'income'
        };
        setTransactions((previous = []) => {
          const nextTransactions = [ledgerEntry, ...previous];
          updateTransactionCache(seed, { transactions: nextTransactions });
          return nextTransactions;
        });
        dispatch({ type: SEED_SUCCESS });
        if (typeof addToast === 'function') {
          addToast({ message: 'Success Budget Saved!', error: false });
        }
      } catch (error) {
        dispatch({ type: SEED_ERROR });
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
          } else if (error.response.status === 400) {
            if (error.response.data.amount) {
              addToast({
                message: 'Amount: ' + error.response.data.amount,
                error: true
              });
            } else if (error.response.data.category) {
              addToast({
                message: 'Category: ' + error.response.data.category,
                error: true
              });
            } else {
              addToast({
                message: 'Unknown Error',
                error: true
              });
            }
          } else {
            addToast({ message: 'Server Error!', error: true });
          }
        }
      }
    },
    [addToast, budgetCategories, budgets, dispatch, updateTransactionCache]
  );

  const prefetchTransactions = useCallback(
    async (
      seedId,
      {
        include = ['income', 'expense'],
        force = false,
        ttl = TRANSACTION_CACHE_TTL
      } = {}
    ) => {
      if (!seedId) return [];
      const requested = Array.isArray(include) ? include : [include];
      const tasks = [];
      if (requested.includes('income')) {
        tasks.push(getIncome(seedId, { force, ttl }));
      }
      if (requested.includes('expense')) {
        tasks.push(getExpenses(seedId, { force, ttl }));
      }
      if (requested.includes('transactions') || requested.includes('all')) {
        tasks.push(getTransactions(seedId, { force, ttl }));
      }
      return Promise.all(tasks);
    },
    [getExpenses, getIncome, getTransactions]
  );

  const refreshTransactionData = useCallback(
    async (seedId) => {
      try {
        await Promise.all([
          getIncome(seedId, { force: true }),
          getExpenses(seedId, { force: true }),
          getTransactions(seedId, { force: true })
        ]);
      } catch (_) {
        if (typeof addToast === 'function') {
          addToast({ message: 'Failed to refresh transactions', error: true });
        }
      }
    },
    [addToast, getExpenses, getIncome, getTransactions]
  );

  const clearTransactionCache = useCallback(
    (seedId = null) => {
      if (seedId) {
        const key = normalizeSeedId(seedId);
        if (key) {
          delete transactionsCacheRef.current[key];
          delete incomeRequestsRef.current[key];
          delete expenseRequestsRef.current[key];
          delete transactionsRequestsRef.current[key];
        }
        if (transactionsSeedId === key) {
          resetTransactionState();
        }
      } else {
        transactionsCacheRef.current = {};
        incomeRequestsRef.current = {};
        expenseRequestsRef.current = {};
        transactionsRequestsRef.current = {};
        resetTransactionState();
      }
    },
    [resetTransactionState, transactionsSeedId]
  );

  const createExpense = useCallback(
    async (seed, description, amount, categoryexpense, extras = {}) => {
      const currentUser = readStoredTransactionUser();
      const uuid = currentUser?.pk;
      dispatch({ type: SEED_LOADING });
      try {
        const today = new Date().toISOString().split('T')[0];
        const payload: Record<string, unknown> = {
          seed,
          user: uuid,
          notes: description,
          transaction_type: 'expense',
          amount,
          category: categoryexpense,
          date: today
        };
        // Merge optional fields: budget, source_type, project, campaign, event, recipient, receipt_file
        if (extras) {
          Object.entries(extras).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
              payload[k] = v;
            }
          });
        }
        const res = await createBudgetTransaction({
          seedId: seed,
          payload
        });

        const categoryObj = (budgetCategories || []).find(
          (cat) => cat.id == categoryexpense
        );
        const categoryName = categoryObj?.name || `Category ${categoryexpense}`;

        const enhancedTransaction = {
          ...(res.raw || {}),
          user: {
            username: currentUser.username,
            first_name: currentUser.first_name,
            last_name: currentUser.last_name,
            profile: {
              photo_url: currentUser.profile?.photo_url || null
            }
          },
          category: categoryName,
          status: 'pending'
        };

        setExpenses((previous) => {
          const nextExpenses = [enhancedTransaction, ...previous];
          updateTransactionCache(seed, { expenses: nextExpenses });
          return nextExpenses;
        });
        setExpenseTotal((previous) => {
          const numericAmount = Number(amount) || 0;
          const nextTotal =
            typeof previous === 'number'
              ? previous + numericAmount
              : numericAmount;
          updateTransactionCache(seed, { expenseTotal: nextTotal });
          return nextTotal;
        });
        const ledgerEntry = {
          ...enhancedTransaction,
          transaction_type: 'expense'
        };
        setTransactions((previous = []) => {
          const nextTransactions = [ledgerEntry, ...previous];
          updateTransactionCache(seed, { transactions: nextTransactions });
          return nextTransactions;
        });
        dispatch({ type: SEED_SUCCESS });
        if (typeof addToast === 'function') {
          addToast({ message: 'Success Expenses Saved!', error: false });
        }
      } catch (error) {
        dispatch({ type: SEED_ERROR });
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
          } else if (error.response.status === 400) {
            if (error.response.data.amount) {
              addToast({
                message: 'Amount: ' + error.response.data.amount,
                error: true
              });
            } else if (error.response.data.category) {
              addToast({
                message: 'Category: ' + error.response.data.category,
                error: true
              });
            } else {
              addToast({
                message: 'Unknown Error',
                error: true
              });
            }
          } else {
            addToast({ message: 'Server Error!', error: true });
          }
        }
      }
    },
    [addToast, budgetCategories, dispatch, updateTransactionCache]
  );

  const createChildExpense = useCallback(
    async (seed, data) => {
      const userPayload = readStoredTransactionUser();
      const uuid = userPayload?.pk;

      dispatch({ type: CREATE_CHILD_LOADING });
      try {
        const normalizedPayload = {
          ...data,
          recipient:
            data?.recipient ?? data?.child_id ?? data?.child ?? undefined
        };

        if (Object.prototype.hasOwnProperty.call(normalizedPayload, 'child')) {
          delete normalizedPayload.child;
        }
        if (
          Object.prototype.hasOwnProperty.call(normalizedPayload, 'child_id')
        ) {
          delete normalizedPayload.child_id;
        }

        const res = await createBudgetTransaction({
          seedId: seed,
          payload: normalizedPayload
        });
        dispatch({ type: CREATE_CHILD_SUCCESS });
        dispatch({ type: CREATE_CHILD_EXPENSE, payload: res.raw });

        const responseTransaction = res?.transaction ?? null;
        const nowIso = new Date().toISOString();
        const normalizedUser =
          responseTransaction?.user &&
          typeof responseTransaction.user === 'object'
            ? responseTransaction.user
            : {
                id: uuid,
                pk: uuid,
                first_name:
                  responseTransaction?.user_first_name ??
                  userPayload?.first_name ??
                  userPayload?.user?.first_name ??
                  '',
                last_name:
                  responseTransaction?.user_last_name ??
                  userPayload?.last_name ??
                  userPayload?.user?.last_name ??
                  '',
                email:
                  responseTransaction?.user_email ??
                  userPayload?.email ??
                  userPayload?.user?.email ??
                  ''
              };

        const optimisticTransaction = {
          id: responseTransaction?.id ?? `temp-${Date.now()}`,
          amount: Number(responseTransaction?.amount ?? data?.amount ?? 0) || 0,
          notes:
            responseTransaction?.notes ??
            responseTransaction?.description ??
            data?.notes ??
            data?.description ??
            '',
          description:
            responseTransaction?.description ??
            data?.notes ??
            data?.description ??
            '',
          category:
            responseTransaction?.category ??
            responseTransaction?.category_name ??
            data?.category ??
            null,
          status: responseTransaction?.status ?? 'pending',
          transaction_type: responseTransaction?.transaction_type ?? 'expense',
          income_source_email:
            responseTransaction?.income_source_email ??
            data?.income_source_email,
          income_source_name:
            responseTransaction?.income_source_name ?? data?.income_source_name,
          receipt_file:
            responseTransaction?.receipt_file ??
            responseTransaction?.receipt?.id ??
            data?.receipt_file ??
            null,
          receipt: responseTransaction?.receipt ?? null,
          user: normalizedUser,
          created_at: responseTransaction?.created_at ?? nowIso,
          updated_at: responseTransaction?.updated_at ?? nowIso,
          date: responseTransaction?.date ?? nowIso,
          child:
            responseTransaction?.child ??
            responseTransaction?.recipient ??
            normalizedPayload?.recipient ??
            null
        };

        setChildTransactions((previous = []) => [
          optimisticTransaction,
          ...previous
        ]);
        setChildTotalTransactions((previous) => {
          const previousValue = Number(previous) || 0;
          return previousValue + optimisticTransaction.amount;
        });

        if (typeof addToast === 'function') {
          addToast({ message: 'Success Child Expense Added!', error: false });
        }
        return res;
      } catch (error) {
        dispatch({ type: CREATE_CHILD_ERROR });
        if (typeof addToast === 'function') {
          if (error.response === undefined) {
            addToast({ message: 'Unknown Error', error: true });
          } else if (
            error.response.status === 500 ||
            error.response.status === 404
          ) {
            addToast({ message: 'Server Error!', error: true });
          } else if (error.response.status === 400) {
            if (error.response.data.income_source_email) {
              addToast({
                message:
                  'Income source: ' + error.response.data.income_source_email,
                error: true
              });
            } else if (error.response.data.income_source_name) {
              addToast({
                message:
                  'Income source: ' + error.response.data.income_source_name,
                error: true
              });
            } else if (error.response.data.amount) {
              addToast({
                message: 'Amount: ' + error.response.data.amount,
                error: true
              });
            } else if (error.response.data.budget) {
              addToast({
                message: 'Budget: ' + error.response.data.budget,
                error: true
              });
            } else if (error.response.data.detail) {
              addToast({
                message: error.response.data.detail,
                error: true
              });
            } else if (error.response.data.non_field_errors) {
              const message = Array.isArray(
                error.response.data.non_field_errors
              )
                ? error.response.data.non_field_errors.join(', ')
                : error.response.data.non_field_errors;
              addToast({ message, error: true });
            } else {
              addToast({
                message: 'Category: ' + error.response.data.category,
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

  const createChildIncome = useCallback(
    async (seed, data) => {
      const userPayload = readStoredTransactionUser();
      const uuid = userPayload?.pk;

      dispatch({ type: CREATE_CHILD_LOADING });

      const payload = {
        ...data,
        transaction_type: 'income',
        user: data?.user ?? uuid,
        recipient: data?.recipient ?? data?.child_id ?? data?.child ?? undefined
      };

      if (Object.prototype.hasOwnProperty.call(payload, 'child')) {
        delete payload.child;
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'child_id')) {
        delete payload.child_id;
      }

      try {
        const res = await createBudgetTransaction({ seedId: seed, payload });
        dispatch({ type: CREATE_CHILD_SUCCESS });
        dispatch({ type: CREATE_CHILD_INCOME, payload: res.raw });

        const responseTransaction = res?.transaction ?? null;
        const nowIso = new Date().toISOString();
        const normalizedUser =
          responseTransaction?.user &&
          typeof responseTransaction.user === 'object'
            ? responseTransaction.user
            : {
                id: uuid,
                pk: uuid,
                first_name:
                  responseTransaction?.user_first_name ??
                  userPayload?.first_name ??
                  userPayload?.user?.first_name ??
                  '',
                last_name:
                  responseTransaction?.user_last_name ??
                  userPayload?.last_name ??
                  userPayload?.user?.last_name ??
                  '',
                email:
                  responseTransaction?.user_email ??
                  userPayload?.email ??
                  userPayload?.user?.email ??
                  ''
              };

        const optimisticTransaction = {
          id: responseTransaction?.id ?? `temp-${Date.now()}`,
          amount:
            Number(responseTransaction?.amount ?? payload?.amount ?? 0) || 0,
          notes:
            responseTransaction?.notes ??
            responseTransaction?.description ??
            payload?.notes ??
            payload?.description ??
            '',
          description:
            responseTransaction?.description ??
            payload?.notes ??
            payload?.description ??
            '',
          category:
            responseTransaction?.category ??
            responseTransaction?.category_name ??
            payload?.category ??
            null,
          status: responseTransaction?.status ?? payload?.status ?? 'pending',
          transaction_type: responseTransaction?.transaction_type ?? 'income',
          user: normalizedUser,
          created_at: responseTransaction?.created_at ?? nowIso,
          updated_at: responseTransaction?.updated_at ?? nowIso,
          date: responseTransaction?.date ?? nowIso,
          child:
            responseTransaction?.child ??
            responseTransaction?.recipient ??
            payload?.recipient ??
            null
        };

        setChildIncomeTransactions((previous = []) => [
          optimisticTransaction,
          ...previous
        ]);
        setChildIncomeTotalTransactions((previous) => {
          const previousValue = Number(previous) || 0;
          return previousValue + optimisticTransaction.amount;
        });

        if (typeof addToast === 'function') {
          addToast({ message: 'Success Child Funds Added!', error: false });
        }
        return res;
      } catch (error) {
        dispatch({ type: CREATE_CHILD_ERROR });
        if (typeof addToast === 'function') {
          if (error.response === undefined) {
            addToast({ message: 'Unknown Error', error: true });
          } else if (
            error.response.status === 500 ||
            error.response.status === 404
          ) {
            addToast({ message: 'Server Error!', error: true });
          } else if (error.response.status === 400) {
            const data = error.response.data ?? {};
            const firstFieldMessage = (() => {
              const fieldPriority = [
                'recipient',
                'amount',
                'budget',
                'category',
                'currency',
                'date',
                'income_source_email',
                'income_source_name',
                'detail',
                'non_field_errors'
              ];
              for (const key of fieldPriority) {
                if (data?.[key]) {
                  const value = Array.isArray(data[key])
                    ? data[key].join(', ')
                    : data[key];
                  return key === 'detail' || key === 'non_field_errors'
                    ? String(value)
                    : `${key.replace(/_/g, ' ')}: ${value}`;
                }
              }
              return null;
            })();
            addToast({
              message:
                firstFieldMessage ?? 'Unable to add funds. Please try again.',
              error: true
            });
          } else {
            addToast({ message: 'Server Error!', error: true });
          }
        }
        throw error;
      }
    },
    [addToast, dispatch]
  );

  const getChildExpense = useCallback(
    async (id, seed, filters = {}) => {
      if (!id || !seed) return null;

      dispatch({ type: GET_CHILD_LOADING });
      const params = buildTransactionFeedQueryParams(filters);

      try {
        const data = await fetchChildExpenseTransactions({
          childId: id,
          seedId: seed,
          filters: params
        });
        setChildTransactions(data.transactions);
        setChildYesterdayTransactions(data.yesterday_transactions);
        setChildTotalTransactions(data.total_transactions);
        setChildYDiffFromLastWeek(data.diff_from_last_week);
        setChildTodayTransactions(data.today_transactions);
        setChildCurrentMonthTotal(data.current_month_total);
        setChildLastMonthTotal(data.last_month_total);
        setChildDiffFromLastMonth(data.diff_from_last_month);
        setChildYesterdayTotal(data.yesterday_total);
        setChildTodayTotal(data.today_total);
        setChildWeeklyChart(data.chart);
        dispatch({ type: GET_CHILD_SUCCESS });
        return data || null;
      } catch (error) {
        dispatch({ type: GET_CHILD_ERROR });
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
      }
    },
    [addToast, dispatch]
  );

  const getChildIncome = useCallback(
    async (id, seed, options: TransactionQueryOptions = {}) => {
      if (!id || !seed) {
        return null;
      }

      const cacheKey = `${id}:${seed}`;
      const { force = false } = options;

      if (!force && childIncomeRequestsRef.current[cacheKey]) {
        return childIncomeRequestsRef.current[cacheKey];
      }

      setChildIncomeLoading(true);
      setChildIncomeError(null);

      const request = (async () => {
        try {
          const data = await fetchChildIncomeTransactions({
            childId: id,
            seedId: seed
          });

          setChildIncomeTransactions(
            Array.isArray(data.transactions) ? data.transactions : []
          );
          setChildIncomeYesterdayTransactions(data.yesterday_transactions);
          setChildIncomeTotalTransactions(data.total_transactions);
          setChildIncomeYDiffFromLastWeek(data.diff_from_last_week);
          setChildIncomeTodayTransactions(data.today_transactions);
          setChildIncomeCurrentMonthTotal(data.current_month_total);
          setChildIncomeLastMonthTotal(data.last_month_total);
          setChildIncomeDiffFromLastMonth(data.diff_from_last_month);
          setChildIncomeYesterdayTotal(data.yesterday_total);
          setChildIncomeTodayTotal(data.today_total);
          setChildIncomeWeeklyChart(data.chart);

          return data;
        } catch (error) {
          setChildIncomeError(error);
          if (typeof addToast === 'function') {
            const message =
              error.response?.data?.message ||
              'Unable to fetch child income transactions';
            addToast({ message, error: true });
          }
          throw error;
        } finally {
          setChildIncomeLoading(false);
          delete childIncomeRequestsRef.current[cacheKey];
        }
      })();

      childIncomeRequestsRef.current[cacheKey] = request;
      return request;
    },
    [addToast]
  );

  return {
    income,
    incomeBudgets,
    transactions,
    transactionsLoading,
    transactionsError,
    incomeTotal,
    expenses,
    expenseTotal,
    incomeChartData,
    expenseChartData,
    transactionsSeedId,
    getIncome,
    getIncomeTotal,
    getTransactions,
    queryTransactions,
    getExpenses,
    getExpsenseTotal,
    createIncome,
    prefetchTransactions,
    refreshTransactionData,
    clearTransactionCache,
    createExpense,
    createChildExpense,
    createChildIncome,
    getChildExpense,
    getChildIncome,
    childTransactions,
    childYesterdayTransactions,
    childTotalTransactions,
    childYDiffFromLastWeek,
    childTodayTransactions,
    childCurrentMonthTotal,
    childLastMonthTotal,
    childDiffFromLastMonth,
    childYesterdayTotal,
    childTodayTotal,
    childWeeklyChart,
    childIncomeTransactions,
    childIncomeYesterdayTransactions,
    childIncomeTotalTransactions,
    childIncomeYDiffFromLastWeek,
    childIncomeTodayTransactions,
    childIncomeCurrentMonthTotal,
    childIncomeLastMonthTotal,
    childIncomeDiffFromLastMonth,
    childIncomeYesterdayTotal,
    childIncomeTodayTotal,
    childIncomeWeeklyChart,
    childIncomeLoading,
    childIncomeError
  };
};
