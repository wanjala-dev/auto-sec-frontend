import {
  PAYMENTS_PROVIDERS_REQUEST,
  PAYMENTS_PROVIDERS_SUCCESS,
  PAYMENTS_PROVIDERS_FAILURE,
  PAYMENTS_METHODS_REQUEST,
  PAYMENTS_METHODS_SUCCESS,
  PAYMENTS_METHODS_FAILURE,
  PAYMENTS_CREATE_METHOD_REQUEST,
  PAYMENTS_CREATE_METHOD_SUCCESS,
  PAYMENTS_CREATE_METHOD_FAILURE,
  PAYMENTS_UPDATE_METHOD_REQUEST,
  PAYMENTS_UPDATE_METHOD_SUCCESS,
  PAYMENTS_UPDATE_METHOD_FAILURE,
  PAYMENTS_SET_PRIMARY_REQUEST,
  PAYMENTS_SET_PRIMARY_SUCCESS,
  PAYMENTS_SET_PRIMARY_FAILURE,
  PAYMENTS_AUTHORIZE_REQUEST,
  PAYMENTS_AUTHORIZE_SUCCESS,
  PAYMENTS_AUTHORIZE_FAILURE,
  PAYMENTS_DELETE_METHOD_REQUEST,
  PAYMENTS_DELETE_METHOD_SUCCESS,
  PAYMENTS_DELETE_METHOD_FAILURE,
  PAYMENTS_METHOD_PLANS_REQUEST,
  PAYMENTS_METHOD_PLANS_SUCCESS,
  PAYMENTS_METHOD_PLANS_FAILURE,
  PAYMENTS_METHOD_PLAN_CREATE_REQUEST,
  PAYMENTS_METHOD_PLAN_CREATE_SUCCESS,
  PAYMENTS_METHOD_PLAN_CREATE_FAILURE,
  PAYMENTS_METHOD_PLAN_UPDATE_REQUEST,
  PAYMENTS_METHOD_PLAN_UPDATE_SUCCESS,
  PAYMENTS_METHOD_PLAN_UPDATE_FAILURE,
  PAYMENTS_METHOD_PLAN_DELETE_REQUEST,
  PAYMENTS_METHOD_PLAN_DELETE_SUCCESS,
  PAYMENTS_METHOD_PLAN_DELETE_FAILURE,
  PAYMENTS_CLEAR_ERROR
} from '../types/paymentsTypes';

const createSeedPaymentsState = () => ({
  items: [],
  loading: false,
  error: null,
  createLoading: false,
  updateLoading: {},
  setPrimaryLoading: false,
  authorizeLoading: false,
  deleteLoading: {},
  lastUpdated: 0
});

const updateMethodCollection = (collection, method) => {
  if (!method || !method.id) {
    return collection;
  }
  const index = collection.findIndex((item) => item.id === method.id);
  if (index === -1) {
    return [...collection, method];
  }
  const updated = [...collection];
  updated[index] = { ...updated[index], ...method };
  return updated;
};

const removeMethodById = (collection, methodId) =>
  collection.filter((item) => item.id !== methodId);

const updatePlanCollection = (collection, plan) => {
  if (!plan || !plan.id) {
    return collection;
  }
  const index = collection.findIndex((item) => item.id === plan.id);
  if (index === -1) {
    return [...collection, plan];
  }
  const updated = [...collection];
  updated[index] = { ...updated[index], ...plan };
  return updated;
};

const removePlanById = (collection, planId) =>
  collection.filter((item) => item.id !== planId);

const createMethodPlansState = () => ({
  items: [],
  loading: false,
  error: null,
  createLoading: false,
  updateLoading: {},
  deleteLoading: {},
  lastUpdated: 0
});

const paymentsReducer = (state, action) => {
  const { type, payload } = action;

  switch (type) {
    case PAYMENTS_PROVIDERS_REQUEST:
      return {
        ...state,
        providers: {
          ...state.providers,
          loading: true,
          error: null
        }
      };
    case PAYMENTS_PROVIDERS_SUCCESS:
      return {
        ...state,
        providers: {
          items: Array.isArray(payload) ? payload : [],
          loading: false,
          error: null,
          fetchedAt: Date.now()
        }
      };
    case PAYMENTS_PROVIDERS_FAILURE:
      return {
        ...state,
        providers: {
          ...state.providers,
          loading: false,
          error: payload || 'Unable to load payment providers.'
        }
      };

    case PAYMENTS_METHODS_REQUEST: {
      const { seedId } = payload || {};
      if (!seedId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            loading: true,
            error: null
          }
        }
      };
    }
    case PAYMENTS_METHODS_SUCCESS: {
      const { seedId, methods } = payload || {};
      if (!seedId) return state;
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...createSeedPaymentsState(),
            items: Array.isArray(methods) ? methods : [],
            lastUpdated: Date.now()
          }
        }
      };
    }
    case PAYMENTS_METHODS_FAILURE: {
      const { seedId, error } = payload || {};
      if (!seedId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            loading: false,
            error: error || 'Unable to load payment methods.'
          }
        }
      };
    }

    case PAYMENTS_CREATE_METHOD_REQUEST: {
      const { seedId } = payload || {};
      if (!seedId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            createLoading: true,
            error: null
          }
        }
      };
    }
    case PAYMENTS_CREATE_METHOD_SUCCESS: {
      const { seedId, method } = payload || {};
      if (!seedId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      let items = updateMethodCollection(existing.items, method);
      if (method?.is_primary) {
        items = items.map((item) => ({
          ...item,
          is_primary: item.id === method.id
        }));
      }
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            items,
            createLoading: false,
            error: null,
            lastUpdated: Date.now()
          }
        }
      };
    }
    case PAYMENTS_CREATE_METHOD_FAILURE: {
      const { seedId, error } = payload || {};
      if (!seedId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            createLoading: false,
            error: error || 'Unable to create payment method.'
          }
        }
      };
    }

    case PAYMENTS_UPDATE_METHOD_REQUEST: {
      const { seedId, methodId } = payload || {};
      if (!seedId || !methodId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            updateLoading: {
              ...existing.updateLoading,
              [methodId]: true
            },
            error: null
          }
        }
      };
    }
    case PAYMENTS_UPDATE_METHOD_SUCCESS: {
      const { seedId, method } = payload || {};
      if (!seedId || !method?.id) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      const { [method.id]: omit, ...restLoading } = existing.updateLoading;
      let items = updateMethodCollection(existing.items, method);
      if (method?.is_primary) {
        items = items.map((item) => ({
          ...item,
          is_primary: item.id === method.id
        }));
      }
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            items,
            updateLoading: restLoading,
            error: null,
            lastUpdated: Date.now()
          }
        }
      };
    }
    case PAYMENTS_UPDATE_METHOD_FAILURE: {
      const { seedId, methodId, error } = payload || {};
      if (!seedId || !methodId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      const { [methodId]: omit, ...restLoading } = existing.updateLoading;
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            updateLoading: restLoading,
            error: error || 'Unable to update payment method.'
          }
        }
      };
    }

    case PAYMENTS_SET_PRIMARY_REQUEST: {
      const { seedId } = payload || {};
      if (!seedId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            setPrimaryLoading: true,
            error: null
          }
        }
      };
    }
    case PAYMENTS_SET_PRIMARY_SUCCESS: {
      const { seedId, method } = payload || {};
      if (!seedId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      let items = existing.items;
      if (method && method.id) {
        items = existing.items.map((item) => ({
          ...item,
          is_primary: item.id === method.id
        }));
        items = updateMethodCollection(items, method);
      }
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            items,
            setPrimaryLoading: false,
            error: null,
            lastUpdated: Date.now()
          }
        }
      };
    }
    case PAYMENTS_SET_PRIMARY_FAILURE: {
      const { seedId, error } = payload || {};
      if (!seedId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            setPrimaryLoading: false,
            error: error || 'Unable to update default payment method.'
          }
        }
      };
    }

    case PAYMENTS_AUTHORIZE_REQUEST: {
      const { seedId } = payload || {};
      if (!seedId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            authorizeLoading: true,
            error: null
          }
        }
      };
    }
    case PAYMENTS_AUTHORIZE_SUCCESS: {
      const { seedId, method } = payload || {};
      if (!seedId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      const items = method
        ? updateMethodCollection(existing.items, method)
        : existing.items;
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            items,
            authorizeLoading: false,
            error: null,
            lastUpdated: Date.now()
          }
        }
      };
    }
    case PAYMENTS_AUTHORIZE_FAILURE: {
      const { seedId, error } = payload || {};
      if (!seedId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            authorizeLoading: false,
            error: error || 'Unable to authorize payment method.'
          }
        }
      };
    }

    case PAYMENTS_DELETE_METHOD_REQUEST: {
      const { seedId, methodId } = payload || {};
      if (!seedId || !methodId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            deleteLoading: {
              ...existing.deleteLoading,
              [methodId]: true
            },
            error: null
          }
        }
      };
    }
    case PAYMENTS_DELETE_METHOD_SUCCESS: {
      const { seedId, methodId } = payload || {};
      if (!seedId || !methodId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      const { [methodId]: omit, ...restDeleteLoading } =
        existing.deleteLoading || {};
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            items: removeMethodById(existing.items, methodId),
            deleteLoading: restDeleteLoading,
            error: null,
            lastUpdated: Date.now()
          }
        }
      };
    }
    case PAYMENTS_DELETE_METHOD_FAILURE: {
      const { seedId, methodId, error } = payload || {};
      if (!seedId || !methodId) return state;
      const existing = state.methodsBySeed[seedId] || createSeedPaymentsState();
      const { [methodId]: omit, ...restDeleteLoading } =
        existing.deleteLoading || {};
      return {
        ...state,
        methodsBySeed: {
          ...state.methodsBySeed,
          [seedId]: {
            ...existing,
            deleteLoading: restDeleteLoading,
            error: error || 'Unable to remove payment method.'
          }
        }
      };
    }

    case PAYMENTS_METHOD_PLANS_REQUEST: {
      const { methodId } = payload || {};
      if (!methodId) return state;
      const existing =
        state.plansByMethod[methodId] || createMethodPlansState();
      return {
        ...state,
        plansByMethod: {
          ...state.plansByMethod,
          [methodId]: {
            ...existing,
            loading: true,
            error: null
          }
        }
      };
    }
    case PAYMENTS_METHOD_PLANS_SUCCESS: {
      const { methodId, plans } = payload || {};
      if (!methodId) return state;
      return {
        ...state,
        plansByMethod: {
          ...state.plansByMethod,
          [methodId]: {
            ...createMethodPlansState(),
            items: Array.isArray(plans) ? plans : [],
            lastUpdated: Date.now()
          }
        }
      };
    }
    case PAYMENTS_METHOD_PLANS_FAILURE: {
      const { methodId, error } = payload || {};
      if (!methodId) return state;
      const existing =
        state.plansByMethod[methodId] || createMethodPlansState();
      return {
        ...state,
        plansByMethod: {
          ...state.plansByMethod,
          [methodId]: {
            ...existing,
            loading: false,
            error: error || 'Unable to load payment plans.'
          }
        }
      };
    }

    case PAYMENTS_METHOD_PLAN_CREATE_REQUEST: {
      const { methodId } = payload || {};
      if (!methodId) return state;
      const existing =
        state.plansByMethod[methodId] || createMethodPlansState();
      return {
        ...state,
        plansByMethod: {
          ...state.plansByMethod,
          [methodId]: {
            ...existing,
            createLoading: true,
            error: null
          }
        }
      };
    }
    case PAYMENTS_METHOD_PLAN_CREATE_SUCCESS: {
      const { methodId, plan } = payload || {};
      if (!methodId) return state;
      const existing =
        state.plansByMethod[methodId] || createMethodPlansState();
      return {
        ...state,
        plansByMethod: {
          ...state.plansByMethod,
          [methodId]: {
            ...existing,
            items: updatePlanCollection(existing.items, plan),
            createLoading: false,
            error: null,
            lastUpdated: Date.now()
          }
        }
      };
    }
    case PAYMENTS_METHOD_PLAN_CREATE_FAILURE: {
      const { methodId, error } = payload || {};
      if (!methodId) return state;
      const existing =
        state.plansByMethod[methodId] || createMethodPlansState();
      return {
        ...state,
        plansByMethod: {
          ...state.plansByMethod,
          [methodId]: {
            ...existing,
            createLoading: false,
            error: error || 'Unable to create payment plan.'
          }
        }
      };
    }

    case PAYMENTS_METHOD_PLAN_UPDATE_REQUEST: {
      const { methodId, planId } = payload || {};
      if (!methodId || !planId) return state;
      const existing =
        state.plansByMethod[methodId] || createMethodPlansState();
      return {
        ...state,
        plansByMethod: {
          ...state.plansByMethod,
          [methodId]: {
            ...existing,
            updateLoading: {
              ...existing.updateLoading,
              [planId]: true
            },
            error: null
          }
        }
      };
    }
    case PAYMENTS_METHOD_PLAN_UPDATE_SUCCESS: {
      const { methodId, plan } = payload || {};
      if (!methodId || !plan?.id) return state;
      const existing =
        state.plansByMethod[methodId] || createMethodPlansState();
      const { [plan.id]: omit, ...restLoading } = existing.updateLoading;
      return {
        ...state,
        plansByMethod: {
          ...state.plansByMethod,
          [methodId]: {
            ...existing,
            items: updatePlanCollection(existing.items, plan),
            updateLoading: restLoading,
            error: null,
            lastUpdated: Date.now()
          }
        }
      };
    }
    case PAYMENTS_METHOD_PLAN_UPDATE_FAILURE: {
      const { methodId, planId, error } = payload || {};
      if (!methodId || !planId) return state;
      const existing =
        state.plansByMethod[methodId] || createMethodPlansState();
      const { [planId]: omit, ...restLoading } = existing.updateLoading;
      return {
        ...state,
        plansByMethod: {
          ...state.plansByMethod,
          [methodId]: {
            ...existing,
            updateLoading: restLoading,
            error: error || 'Unable to update payment plan.'
          }
        }
      };
    }

    case PAYMENTS_METHOD_PLAN_DELETE_REQUEST: {
      const { methodId, planId } = payload || {};
      if (!methodId || !planId) return state;
      const existing =
        state.plansByMethod[methodId] || createMethodPlansState();
      return {
        ...state,
        plansByMethod: {
          ...state.plansByMethod,
          [methodId]: {
            ...existing,
            deleteLoading: {
              ...existing.deleteLoading,
              [planId]: true
            },
            error: null
          }
        }
      };
    }
    case PAYMENTS_METHOD_PLAN_DELETE_SUCCESS: {
      const { methodId, planId } = payload || {};
      if (!methodId || !planId) return state;
      const existing =
        state.plansByMethod[methodId] || createMethodPlansState();
      const { [planId]: omit, ...restDeleteLoading } =
        existing.deleteLoading || {};
      return {
        ...state,
        plansByMethod: {
          ...state.plansByMethod,
          [methodId]: {
            ...existing,
            items: removePlanById(existing.items, planId),
            deleteLoading: restDeleteLoading,
            error: null,
            lastUpdated: Date.now()
          }
        }
      };
    }
    case PAYMENTS_METHOD_PLAN_DELETE_FAILURE: {
      const { methodId, planId, error } = payload || {};
      if (!methodId || !planId) return state;
      const existing =
        state.plansByMethod[methodId] || createMethodPlansState();
      const { [planId]: omit, ...restDeleteLoading } =
        existing.deleteLoading || {};
      return {
        ...state,
        plansByMethod: {
          ...state.plansByMethod,
          [methodId]: {
            ...existing,
            deleteLoading: restDeleteLoading,
            error: error || 'Unable to remove payment plan.'
          }
        }
      };
    }

    case PAYMENTS_CLEAR_ERROR: {
      const { scope, seedId } = payload || {};
      if (scope === 'providers') {
        return {
          ...state,
          providers: {
            ...state.providers,
            error: null
          }
        };
      }
      if (seedId && state.methodsBySeed[seedId]) {
        return {
          ...state,
          methodsBySeed: {
            ...state.methodsBySeed,
            [seedId]: {
              ...state.methodsBySeed[seedId],
              error: null
            }
          }
        };
      }
      return state;
    }

    default:
      return state;
  }
};

export const paymentsInitialState = {
  providers: {
    items: [],
    loading: false,
    error: null,
    fetchedAt: 0
  },
  methodsBySeed: {},
  plansByMethod: {}
};

export default paymentsReducer;
