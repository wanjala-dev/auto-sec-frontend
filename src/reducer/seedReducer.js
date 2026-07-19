import {
  GET_SEED,
  CREATE_SEED,
  GET_CATEGORY,
  SEED_LOADING,
  SEED_SUCCESS,
  SEED_ERROR,
  GET_USER_SEEDS,
  GET_ALL_SEEDS,
  GET_PLANS_SUCCES,
  PLANS_LOADING,
  GET_PLANS_ERROR,
  GET_INCOME,
  GET_INCOME_LOADING,
  GET_INCOME_ERROR,
  GET_ACTION,
  GET_EXPENSE,
  GET_COMMENT,
  SEED_TEAM_LOADING,
  GET_ALL_TEAMS,
  SEED_TEAM_ERROR,
  GET_TEAM,
  CREATE_INCOME,
  CREATE_ACTION,
  CREATE_EXPENSE,
  CREATE_COMMENT,
  GET_INCOME_CATEGORY,
  GET_EXPENSE_TOTAL,
  GET_INCOME_TOTAL,
  GET_DONATIONS,
  GET_DONATIONS_LOADING,
  GET_DONATIONS_ERROR,
  CREATE_DONATION_LOADING,
  CREATE_DONATION_SUCCESS,
  CREATE_DONATION_ERROR,
  GET_USER_PREFERENCES,
  PATCH_USER_PREFENCES,
  GET_SEED_PREFERENCES,
  PATCH_SEED_PREFENCES,
  GET_SEED_OPERATIONS,
  PATCH_SEED_OPERATIONS,
  GET_TRANSACTIONS_CATEGORIES,
  CREATE_CHILD_EXPENSE,
  CREATE_CHILD_INCOME,
  GET_CHILD_EXPENSE,
  CREATE_TRANSACTIONS_CATEGORIES,
  CREATE_BUDGET,
  CREATE_BUDGET_ESTIMATE,
  UPDATE_PROJECT_BUDGET_ESTIMATES,
  GET_BUDGET,
  GET_BUDGET_ESTIMATE,
  PATCH_ESTIMATE,
  GET_BUDGET_SUMMARY,
  GET_BUDGET_SUMMARY_YEAR,
  GET_BUDGET_SUMMARY_YEAR_MONTH,
  UPDATE_BUDGET_STATUS,
  UPDATE_BUDGET,
  DELETE_BUDGET,
  REPLACE_BUDGET_TEMP,
  CREATE_CHILD,
  CREATE_CHILD_LOADING,
  CREATE_CHILD_SUCCESS,
  CREATE_CHILD_ERROR,
  GET_CHILD,
  GET_CHILDREN,
  GET_CHILD_LOADING,
  GET_CHILD_SUCCESS,
  GET_CHILD_ERROR,
  GET_STATUS_UPDATES,
  GET_STATUS_UPDATE,
  CREATE_STATUS_UPDATE,
  GET_STATUS_UPDATE_TAGS,
  CHILD_STATUS_UPDATE_LOADING,
  CHILD_STATUS_UPDATE_SUCCESS,
  CHILD_STATUS_UPDATE_ERROR,
  EDIT_STATUS_UPDATES,
  DELETE_STATUS_UPDATES,
  CREATE_TEAM,
  CREATE_TEAM_LOADING,
  CREATE_TEAM_ERROR,
  UPDATE_SEED_TEAMS,
  UPDATE_SEED_TRANSACTIONS_CATEGORIES,
  GET_FINANCIAL_DATA,
  GET_FINANCIAL_DATA_LOADING,
  GET_FINANCIAL_DATA_SUCCESS,
  GET_FINANCIAL_DATA_ERROR,
  GET_CONTRIBUTION_MEANS,
  GET_CONTRIBUTION_MEANS_LOADING,
  GET_CONTRIBUTION_MEANS_SUCCESS,
  GET_CONTRIBUTION_MEANS_ERROR,
  GET_BANNERS_LOADING,
  GET_BANNERS_SUCCESS,
  GET_BANNERS_ERROR,
  DISMISS_BANNER,
  SET_DISMISSED_BANNERS,
  GET_SETUP_STATUS_LOADING,
  GET_SETUP_STATUS_SUCCESS,
  GET_SETUP_STATUS_ERROR,
  FOLLOW_SEED_LOADING,
  FOLLOW_SEED_ERROR,
  UPDATE_SEED_FOLLOW_STATE,
  TEAM_EVENTS_LOADING,
  TEAM_EVENTS_SUCCESS,
  TEAM_EVENTS_ERROR,
  TEAM_EVENT_SUBMITTING
} from '../types/seedTypes';

const resolveBannerPriority = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 999;
};

const resolveBannerTimestamp = (banner) => {
  const raw =
    banner?.createdAt ??
    banner?.created_at ??
    banner?.updatedAt ??
    banner?.updated_at ??
    banner?.timestamp ??
    null;
  if (raw === null || raw === undefined) {
    return 0;
  }
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0;
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortBanners = (a, b) => {
  const priorityA = resolveBannerPriority(a?.priority);
  const priorityB = resolveBannerPriority(b?.priority);
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  const timeA = resolveBannerTimestamp(a);
  const timeB = resolveBannerTimestamp(b);
  if (timeA !== timeB) {
    return timeB - timeA; // newest first
  }
  return String(a?.title || '').localeCompare(String(b?.title || ''));
};

const mergeBannerCollections = (
  baseBanners = [],
  recommendationBanners = [],
  dismissedIds = []
) => {
  const dismissedSet = new Set(
    Array.isArray(dismissedIds) ? dismissedIds.map((id) => String(id)) : []
  );

  const uniqueBanners = new Map();
  const combined = [
    ...(Array.isArray(baseBanners) ? baseBanners : []),
    ...(Array.isArray(recommendationBanners) ? recommendationBanners : [])
  ];

  combined.forEach((banner) => {
    if (!banner) return;
    const identifier = String(
      banner.id ?? banner.bannerId ?? banner.code ?? ''
    );
    if (!identifier) return;
    if (banner.dismissible && dismissedSet.has(identifier)) {
      return;
    }
    if (!uniqueBanners.has(identifier)) {
      uniqueBanners.set(identifier, banner);
      return;
    }
    const existing = uniqueBanners.get(identifier);
    if (
      resolveBannerPriority(banner?.priority) <
      resolveBannerPriority(existing?.priority)
    ) {
      uniqueBanners.set(identifier, banner);
    }
  });

  return Array.from(uniqueBanners.values()).sort(sortBanners);
};

const getSeedIdentifier = (seed) => {
  if (!seed || typeof seed !== 'object') return null;
  return (
    seed.id ??
    seed.pk ??
    seed.seed_id ??
    seed.uuid ??
    seed.slug ??
    seed.seedId ??
    null
  );
};

const resolveBudgetIdentifier = (budget) => {
  if (!budget || typeof budget !== 'object') return null;
  return (
    budget.id ??
    budget.pk ??
    budget.uuid ??
    budget.slug ??
    budget.budget_id ??
    null
  );
};

const applyBudgetStatusUpdate = (budget, budgetId, update = {}) => {
  if (!budget || !budgetId) return budget;
  const candidateId = resolveBudgetIdentifier(budget);
  if (!candidateId || String(candidateId) !== String(budgetId)) {
    return budget;
  }
  const next =
    update?.data && typeof update.data === 'object'
      ? { ...budget, ...update.data }
      : { ...budget };
  const status = update?.status ?? next?.status ?? next?.budget_status;
  if (status) {
    next.status = status;
    next.budget_status = status;
    if (next.progress && typeof next.progress === 'object') {
      next.progress = { ...next.progress, status };
    }
    if (next.budget_data && typeof next.budget_data === 'object') {
      next.budget_data = {
        ...next.budget_data,
        meta: {
          ...(next.budget_data.meta || {}),
          status
        }
      };
    }
  }
  return next;
};

const updateBudgetCollection = (collection, budgetId, update) => {
  if (Array.isArray(collection)) {
    return collection.map((entry) =>
      applyBudgetStatusUpdate(entry, budgetId, update)
    );
  }
  if (collection && typeof collection === 'object') {
    if (Array.isArray(collection.results)) {
      return {
        ...collection,
        results: collection.results.map((entry) =>
          applyBudgetStatusUpdate(entry, budgetId, update)
        )
      };
    }
    if (Array.isArray(collection.data)) {
      return {
        ...collection,
        data: collection.data.map((entry) =>
          applyBudgetStatusUpdate(entry, budgetId, update)
        )
      };
    }
    if (Array.isArray(collection.budgets)) {
      return {
        ...collection,
        budgets: collection.budgets.map((entry) =>
          applyBudgetStatusUpdate(entry, budgetId, update)
        )
      };
    }
  }
  return collection;
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

// Mirrors removeBudgetFromCollection but instead of dropping the
// matching entry, replaces it with the merged shape (existing fields +
// updated overrides). Used by UPDATE_BUDGET so the SwitcherCard on
// BudgetDashboardPage rerenders with the new title without a full
// seed refetch.
const mergeBudgetIntoCollection = (collection, budgetId, patch) => {
  if (!budgetId || !patch || typeof patch !== 'object') return collection;
  const merge = (entry) => {
    const candidateId = resolveBudgetIdentifier(entry);
    if (!candidateId || String(candidateId) !== String(budgetId)) return entry;
    return { ...entry, ...patch };
  };
  if (Array.isArray(collection)) {
    return collection.map(merge);
  }
  if (collection && typeof collection === 'object') {
    if (Array.isArray(collection.results)) {
      return { ...collection, results: collection.results.map(merge) };
    }
    if (Array.isArray(collection.data)) {
      return { ...collection, data: collection.data.map(merge) };
    }
    if (Array.isArray(collection.budgets)) {
      return { ...collection, budgets: collection.budgets.map(merge) };
    }
  }
  return collection;
};

// Prepend a freshly-created budget to whatever list shape we have.
// Used by CREATE_BUDGET so optimistic and real creations both surface
// at the top of BudgetDashboardPage's SwitcherCard row immediately,
// without waiting for getBudgets to refetch. If the budget is already
// in the collection (matched by id), skip the prepend so we don't
// double-render a row when the reducer fires twice.
const prependBudgetToCollection = (collection, budget) => {
  if (!budget) return collection;
  const budgetId = resolveBudgetIdentifier(budget);
  const alreadyPresent = (entries) => {
    if (!budgetId) return false;
    return entries.some((entry) => {
      const candidateId = resolveBudgetIdentifier(entry);
      return candidateId && String(candidateId) === String(budgetId);
    });
  };
  if (Array.isArray(collection)) {
    if (alreadyPresent(collection)) return collection;
    return [budget, ...collection];
  }
  if (collection && typeof collection === 'object') {
    if (Array.isArray(collection.results)) {
      if (alreadyPresent(collection.results)) return collection;
      return { ...collection, results: [budget, ...collection.results] };
    }
    if (Array.isArray(collection.data)) {
      if (alreadyPresent(collection.data)) return collection;
      return { ...collection, data: [budget, ...collection.data] };
    }
    if (Array.isArray(collection.budgets)) {
      if (alreadyPresent(collection.budgets)) return collection;
      return { ...collection, budgets: [budget, ...collection.budgets] };
    }
  }
  return Array.isArray(collection) ? [budget] : collection;
};

// Replace the optimistic stub (matched by tempId) with the real budget
// returned by the backend. Preserves list order so the row doesn't
// jump under the user's cursor when reconciliation lands.
const replaceBudgetInCollection = (collection, tempId, budget) => {
  if (!tempId || !budget) return collection;
  const swap = (entry) => {
    const candidateId = resolveBudgetIdentifier(entry);
    if (!candidateId || String(candidateId) !== String(tempId)) return entry;
    return budget;
  };
  if (Array.isArray(collection)) {
    return collection.map(swap);
  }
  if (collection && typeof collection === 'object') {
    if (Array.isArray(collection.results)) {
      return { ...collection, results: collection.results.map(swap) };
    }
    if (Array.isArray(collection.data)) {
      return { ...collection, data: collection.data.map(swap) };
    }
    if (Array.isArray(collection.budgets)) {
      return { ...collection, budgets: collection.budgets.map(swap) };
    }
  }
  return collection;
};

const initialState = {
  loading: false,
  categories: [],
  seed: {},
  donations: [],
  donationsLoading: false,
  donationsError: null,
  donationSubmitting: false,
  teamEvents: [],
  teamEventsLoading: false,
  teamEventsError: null,
  teamEventSubmitting: false,
  contributionMeans: { results: [] },
  banners: [],
  bannersRaw: [],
  bannerRecommendations: [],
  bannersLoading: false,
  bannersError: null,
  dismissedBannerIds: [],
  setupStatus: null,
  setupStatusLoading: false,
  setupStatusError: null,
  seedFollowRequests: {},
  seedFollowErrors: {}
};

const seedReducer = (state, action) => {
  const { type, payload } = action;
  switch (type) {
    // Seed Operations
    case PATCH_SEED_OPERATIONS:
      return { ...state, seed_operations_patched: payload, loading: false };
    case GET_SEED_OPERATIONS:
      return { ...state, seed_operations: payload, loading: false };

    // Seed Preferences
    case PATCH_SEED_PREFENCES:
      return { ...state, seed_preferences_patched: payload, loading: false };
    case GET_SEED_PREFERENCES:
      return { ...state, seed_preferences: payload, loading: false };

    // User Preferences
    case GET_USER_PREFERENCES:
      return { ...state, preferences: payload, loading: false };
    case PATCH_USER_PREFENCES:
      return { ...state, preferences_patched: payload, loading: false };

    // Income and Expenses
    case GET_INCOME_CATEGORY:
      return { ...state, income_category: payload, loading: false };

    case GET_TRANSACTIONS_CATEGORIES:
      return { ...state, transaction_category: payload, loading: false };
    case GET_EXPENSE_TOTAL:
      return { ...state, expense_total: payload, loading: false };
    case GET_INCOME_TOTAL:
      return { ...state, income_total: payload, loading: false };
    case GET_DONATIONS_LOADING:
      return {
        ...state,
        donationsLoading: true,
        donationsError: null
      };
    case GET_DONATIONS:
      return {
        ...state,
        donations: Array.isArray(payload) ? payload : [],
        donationsLoading: false,
        donationsError: null
      };
    case GET_DONATIONS_ERROR:
      return {
        ...state,
        donationsLoading: false,
        donationsError: payload
      };
    case CREATE_DONATION_LOADING:
      return {
        ...state,
        donationSubmitting: true,
        donationsError: null
      };
    case CREATE_DONATION_SUCCESS:
      return {
        ...state,
        donationSubmitting: false
      };
    case CREATE_DONATION_ERROR:
      return {
        ...state,
        donationSubmitting: false,
        donationsError: payload
      };
    // Seed and Category
    case GET_SEED:
      return { ...state, seed: payload, loading: false };
    case GET_CATEGORY:
      return { ...state, categories: payload, loading: false };

    // Plans
    case GET_PLANS_SUCCES:
      return { ...state, plans: payload, loading: false };

    case GET_ALL_SEEDS:
      return { ...state, seeds: payload, loading: false };
    case GET_USER_SEEDS:
      return { ...state, userseed: payload, loading: false };

    // Income, Action, Expense, Comment, Team
    // case GET_INCOME:
    //     console.log("GET_INCOME dispatched with payload:", payload);
    //     return {
    //         ...state,
    //         income: {
    //             transactions: payload.transactions,
    //             total: payload.total,
    //             chart: payload.chart,
    //         },
    //         loading: false,
    //         error: null, // Ensure to clear errors on success
    //     };

    case GET_ACTION:
      return { ...state, actions: payload, loading: false };
    case GET_EXPENSE:
      return { ...state, expenses: payload, loading: false };
    case GET_COMMENT:
      return { ...state, comments: payload, loading: false };
    case GET_TEAM:
      return { ...state, team: payload, loading: false };

    // Create Operations
    case CREATE_INCOME:
      return { ...state, income: payload, loading: false };

    case CREATE_ACTION:
      return { ...state, actions: payload, loading: false };
    case CREATE_EXPENSE:
      return { ...state, expenses: payload, loading: false };
    case CREATE_COMMENT:
      return { ...state, comments: payload, loading: false };
    case CREATE_TEAM:
      return { ...state, team: payload, loading: false, error: null };

    case UPDATE_SEED_TRANSACTIONS_CATEGORIES:
      if (state.seed) {
        const newState = {
          ...state,
          seed: {
            ...state.seed,
            transaction_categories: state.seed.transaction_categories
              ? [...state.seed.transaction_categories, ...action.payload]
              : [...action.payload]
          }
        };
        return newState;
      }
      return state;

    case UPDATE_SEED_TEAMS:
      if (state.seed) {
        return {
          ...state,
          seed: {
            ...state.seed,
            teams: state.seed.teams ? [...state.seed.teams, payload] : [payload]
          }
        };
      }
      return state;

    case CREATE_SEED:
      return { ...state, store: payload, loading: false };
    case CREATE_TRANSACTIONS_CATEGORIES:
      return { ...state, transactionsCategories: payload };
    case CREATE_BUDGET: {
      // Mirror DELETE_BUDGET / UPDATE_BUDGET: every layer the dashboard
      // reads from needs to see the new row immediately. Setting only
      // state.budget (the old behavior) left state.budgets and
      // state.seed.budgets stale, so BudgetDashboardPage's SwitcherCard
      // never re-rendered after a create -- the bug behind the "I
      // saved it but I can't see it" report on the Extract path.
      const updatedBudgets = prependBudgetToCollection(state.budgets, payload);
      const updatedSeedBudgets = prependBudgetToCollection(
        state.seed?.budgets,
        payload
      );
      const updatedSeed =
        state.seed && state.seed.budgets
          ? { ...state.seed, budgets: updatedSeedBudgets }
          : state.seed && payload
          ? { ...state.seed, budgets: [payload] }
          : state.seed;
      return {
        ...state,
        budget: payload,
        budgets: updatedBudgets,
        seed: updatedSeed
      };
    }
    case REPLACE_BUDGET_TEMP: {
      // Payload: { tempId, budget }. Swaps the optimistic stub for the
      // real backend record after createBudgetOptimistic's persist()
      // resolves. Preserves list order so the row doesn't jump.
      const tempId = payload?.tempId;
      const realBudget = payload?.budget;
      if (!tempId || !realBudget) return state;
      const updatedBudgets = replaceBudgetInCollection(
        state.budgets,
        tempId,
        realBudget
      );
      const updatedSeedBudgets = replaceBudgetInCollection(
        state.seed?.budgets,
        tempId,
        realBudget
      );
      const updatedSeed =
        state.seed && state.seed.budgets
          ? { ...state.seed, budgets: updatedSeedBudgets }
          : state.seed;
      const currentBudgetId = resolveBudgetIdentifier(state.budget);
      const updatedBudget =
        currentBudgetId && String(currentBudgetId) === String(tempId)
          ? realBudget
          : state.budget;
      return {
        ...state,
        budget: updatedBudget,
        budgets: updatedBudgets,
        seed: updatedSeed
      };
    }
    case GET_BUDGET:
      return { ...state, budgets: payload };
    case GET_CHILD_EXPENSE:
      return { ...state, child_expenses: payload };
    case GET_BUDGET_ESTIMATE:
      return { ...state, budgetEstimate: payload };
    case CREATE_BUDGET_ESTIMATE:
      return { ...state, budgetEstimate: payload };

    case UPDATE_PROJECT_BUDGET_ESTIMATES:
      if (state.seed) {
        const updatedProjects = state.seed.projects.map((project) => {
          if (project.pk === action.payload.projectId) {
            const newEstimateObject = {
              id: action.payload.newEstimate.id,
              category_name: action.payload.newEstimate.category,
              amount: action.payload.newEstimate.amount
            };

            const updatedBudgetEstimates = project.budget_estimates
              ? [...project.budget_estimates, newEstimateObject]
              : [newEstimateObject];

            return { ...project, budget_estimates: updatedBudgetEstimates };
          }
          return { ...project };
        });

        return {
          ...state,
          seed: {
            ...state.seed,
            projects: updatedProjects
          }
        };
      }
      return state;

    case GET_BUDGET_SUMMARY:
      return { ...state, budgetSummary: payload };
    case GET_BUDGET_SUMMARY_YEAR:
      return { ...state, budgetSummaryYear: payload };
    case GET_BUDGET_SUMMARY_YEAR_MONTH:
      return { ...state, budgetSummaryYearMonth: payload };
    case UPDATE_BUDGET_STATUS: {
      const budgetId = payload?.budgetId;
      if (!budgetId) return state;
      const update = {
        data: payload?.data,
        status: payload?.status
      };
      const updatedBudgets = updateBudgetCollection(
        state.budgets,
        budgetId,
        update
      );
      const updatedSeedBudgets = updateBudgetCollection(
        state.seed?.budgets,
        budgetId,
        update
      );
      const updatedSeed =
        state.seed && state.seed.budgets
          ? { ...state.seed, budgets: updatedSeedBudgets }
          : state.seed;
      const updatedBudget = applyBudgetStatusUpdate(
        state.budget,
        budgetId,
        update
      );
      return {
        ...state,
        budgets: updatedBudgets,
        seed: updatedSeed,
        budget: updatedBudget
      };
    }
    case UPDATE_BUDGET: {
      // Payload: { budgetId, patch }. patch contains the changed
      // fields (e.g. { name, slug }). We merge into state.budgets AND
      // state.seed.budgets so both the SwitcherCard row on the
      // dashboard AND the budget detail header rerender immediately.
      const budgetId = payload?.budgetId;
      const patch = payload?.patch;
      if (!budgetId || !patch) return state;
      const updatedBudgets = mergeBudgetIntoCollection(
        state.budgets,
        budgetId,
        patch
      );
      const updatedSeedBudgets = mergeBudgetIntoCollection(
        state.seed?.budgets,
        budgetId,
        patch
      );
      const updatedSeed =
        state.seed && state.seed.budgets
          ? { ...state.seed, budgets: updatedSeedBudgets }
          : state.seed;
      // If the active state.budget IS the one we just edited, also
      // patch it so the detail header shows the new name without
      // requiring a refetch via fetchBudgetDetail.
      const currentBudgetId = resolveBudgetIdentifier(state.budget);
      const updatedBudget =
        currentBudgetId && String(currentBudgetId) === String(budgetId)
          ? { ...state.budget, ...patch }
          : state.budget;
      return {
        ...state,
        budgets: updatedBudgets,
        seed: updatedSeed,
        budget: updatedBudget
      };
    }
    case DELETE_BUDGET: {
      const budgetId = payload?.budgetId ?? payload;
      if (!budgetId) return state;
      const updatedBudgets = removeBudgetFromCollection(
        state.budgets,
        budgetId
      );
      const updatedSeedBudgets = removeBudgetFromCollection(
        state.seed?.budgets,
        budgetId
      );
      const updatedSeed =
        state.seed && state.seed.budgets
          ? { ...state.seed, budgets: updatedSeedBudgets }
          : state.seed;
      const currentBudgetId = resolveBudgetIdentifier(state.budget);
      const updatedBudget =
        currentBudgetId && String(currentBudgetId) === String(budgetId)
          ? null
          : state.budget;
      return {
        ...state,
        budgets: updatedBudgets,
        seed: updatedSeed,
        budget: updatedBudget
      };
    }
    case CREATE_CHILD:
      return { ...state, child: payload };
    case CREATE_CHILD_EXPENSE:
      return { ...state, childExpense: payload };
    case CREATE_CHILD_INCOME:
      return { ...state, childIncome: payload };
    case GET_CHILD:
      return { ...state, child: payload };
    case GET_CHILDREN:
      return { ...state, children: payload };
    case GET_STATUS_UPDATES:
      return { ...state, child_status_udpates: payload, loading: false };
    case GET_STATUS_UPDATE:
      return { ...state, child_status_udpate: payload };
    case CREATE_STATUS_UPDATE:
      return { ...state, created_child_status_udpate: payload };
    case GET_STATUS_UPDATE_TAGS:
      return { ...state, child_status_udpate_tags: payload };
    case EDIT_STATUS_UPDATES:
      return {
        ...state,
        edit_status_udpates_response: payload,
        loading: false
      };
    case DELETE_STATUS_UPDATES:
      return {
        ...state,
        delete_status_udpates_response: payload,
        loading: false
      };
    case GET_FINANCIAL_DATA_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        financialData: {
          ...state.financialData,
          weekly: payload.weekly,
          monthly: payload.monthly,
          yearly: payload.yearly,
          // Custom date-range bucket + its x-axis labels. Added so the
          // "Last 3 months / 6 months / 12 months / YTD" quick picks on
          // the Income chart can read from one place instead of hitting
          // the API on every render.
          custom: payload.custom,
          customLabels: payload.customLabels,
          monthlySummary: payload.monthlySummary || [],
          topCategories: payload.topCategories,
          error: null
        }
      };

    // Events
    case TEAM_EVENTS_LOADING:
      return {
        ...state,
        teamEventsLoading: true,
        teamEventsError: null
      };
    case TEAM_EVENTS_SUCCESS: {
      const normalizedEvents = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.events)
        ? payload.events
        : [];
      return {
        ...state,
        teamEvents: normalizedEvents,
        teamEventsLoading: false,
        teamEventsError: null
      };
    }
    case TEAM_EVENTS_ERROR:
      return {
        ...state,
        teamEventsLoading: false,
        teamEventsError:
          payload === null ? null : payload || 'Unable to load events'
      };
    case TEAM_EVENT_SUBMITTING:
      return {
        ...state,
        teamEventSubmitting:
          typeof payload === 'boolean'
            ? payload
            : Boolean(payload?.isSubmitting ?? payload)
      };
    case FOLLOW_SEED_LOADING: {
      const { seedId, loading } = payload || {};
      if (!seedId) {
        return state;
      }
      return {
        ...state,
        seedFollowRequests: {
          ...state.seedFollowRequests,
          [seedId]: Boolean(loading)
        },
        seedFollowErrors: {
          ...state.seedFollowErrors,
          [seedId]: null
        }
      };
    }
    case FOLLOW_SEED_ERROR: {
      const { seedId, error } = payload || {};
      if (!seedId) {
        return state;
      }
      return {
        ...state,
        seedFollowRequests: {
          ...state.seedFollowRequests,
          [seedId]: false
        },
        seedFollowErrors: {
          ...state.seedFollowErrors,
          [seedId]: error || 'Unable to update follow status.'
        }
      };
    }
    case UPDATE_SEED_FOLLOW_STATE: {
      const { seedId, isFollowing, deltaFollowers } = payload || {};
      if (!seedId) {
        return state;
      }
      const activeSeedId = getSeedIdentifier(state.seed);
      let updatedSeed = state.seed;
      if (
        activeSeedId &&
        String(activeSeedId) === String(seedId) &&
        state.seed
      ) {
        const currentFollowers = Number(state.seed.followers_count) || 0;
        const nextFollowers = Math.max(
          0,
          currentFollowers + (deltaFollowers || 0)
        );
        updatedSeed = {
          ...state.seed,
          is_following: Boolean(isFollowing),
          followers_count: nextFollowers
        };
      }
      return {
        ...state,
        seed: updatedSeed,
        seedFollowRequests: {
          ...state.seedFollowRequests,
          [seedId]: false
        },
        seedFollowErrors: {
          ...state.seedFollowErrors,
          [seedId]: null
        }
      };
    }

    // Contribution Means
    case GET_CONTRIBUTION_MEANS:
      return {
        ...state,
        contributionMeans: action.append
          ? {
              ...action.payload,
              results: [
                ...(state.contributionMeans?.results || []),
                ...action.payload.results
              ]
            }
          : action.payload,
        loading: false
      };
    case GET_CONTRIBUTION_MEANS_LOADING:
      return { ...state, loading: true, error: null };
    case GET_CONTRIBUTION_MEANS_SUCCESS:
      return { ...state, loading: false };
    case GET_CONTRIBUTION_MEANS_ERROR:
      return { ...state, loading: false, error: payload };

    // Seed banners
    case GET_BANNERS_LOADING:
      return {
        ...state,
        bannersLoading: true,
        bannersError: null
      };
    case GET_BANNERS_SUCCESS: {
      const normalized = Array.isArray(payload) ? payload : [];
      return {
        ...state,
        bannersRaw: normalized,
        banners: mergeBannerCollections(
          normalized,
          state.bannerRecommendations,
          state.dismissedBannerIds
        ),
        bannersLoading: false,
        bannersError: null
      };
    }
    case GET_BANNERS_ERROR:
      return {
        ...state,
        bannersLoading: false,
        bannersError: payload
      };
    case SET_DISMISSED_BANNERS: {
      const dismissed = Array.isArray(payload)
        ? payload.map((id) => String(id))
        : [];
      return {
        ...state,
        dismissedBannerIds: dismissed,
        banners: mergeBannerCollections(
          state.bannersRaw,
          state.bannerRecommendations,
          dismissed
        )
      };
    }
    case DISMISS_BANNER: {
      const dismissedSet = new Set(state.dismissedBannerIds || []);
      if (payload !== undefined && payload !== null) {
        dismissedSet.add(String(payload));
      }
      const dismissed = Array.from(dismissedSet);
      return {
        ...state,
        dismissedBannerIds: dismissed,
        banners: mergeBannerCollections(
          state.bannersRaw,
          state.bannerRecommendations,
          dismissed
        )
      };
    }

    // Setup status
    case GET_SETUP_STATUS_LOADING:
      return {
        ...state,
        setupStatusLoading: true,
        setupStatusError: null
      };
    case GET_SETUP_STATUS_SUCCESS: {
      const setupStatus = payload?.setupStatus ?? null;
      const recommendationBanners = Array.isArray(
        payload?.recommendationBanners
      )
        ? payload.recommendationBanners
        : [];
      return {
        ...state,
        setupStatus,
        setupStatusLoading: false,
        setupStatusError: null,
        bannerRecommendations: recommendationBanners,
        banners: mergeBannerCollections(
          state.bannersRaw,
          recommendationBanners,
          state.dismissedBannerIds
        )
      };
    }
    case GET_SETUP_STATUS_ERROR:
      return {
        ...state,
        setupStatusLoading: false,
        setupStatusError: payload
      };

    // Loading Cases (Grouped)
    case SEED_LOADING:
    case PLANS_LOADING:
    case SEED_TEAM_LOADING:
    case CREATE_TEAM_LOADING:
    case CHILD_STATUS_UPDATE_LOADING:
    case CREATE_CHILD_LOADING:
    case GET_CHILD_LOADING:
    case GET_INCOME_LOADING:
    case GET_FINANCIAL_DATA_LOADING:
      return { ...state, loading: true, error: null }; // Clear error

    // Error Cases (Grouped)
    case SEED_ERROR:
    case GET_PLANS_ERROR:
    case SEED_TEAM_ERROR:
    case CREATE_TEAM_ERROR:
    case CHILD_STATUS_UPDATE_ERROR:
    case CREATE_CHILD_ERROR:
    case GET_CHILD_ERROR:
    case GET_INCOME_ERROR:
    case GET_FINANCIAL_DATA_ERROR:
    case GET_CONTRIBUTION_MEANS_ERROR:
      return { ...state, loading: false, error: payload };

    // Success Cases
    case SEED_SUCCESS:
    case CHILD_STATUS_UPDATE_SUCCESS:
    case CREATE_CHILD_SUCCESS:
    case GET_CHILD_SUCCESS:
    case GET_CONTRIBUTION_MEANS_SUCCESS:
      return { ...state, loading: false };

    default:
      return state;
  }
};

export default seedReducer;
