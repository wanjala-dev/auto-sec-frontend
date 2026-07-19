export const DEFAULT_FILTERS = {
  period: 'last_7_days',
  type: null,
  is_read: null,
  seed: null,
  created_after: null,
  created_before: null
};

export const AI_CHANNELS = [
  {
    id: 'general',
    label: 'General AI updates'
  },
  {
    id: 'teammate_status',
    label: 'Orchestrator availability'
  },
  {
    id: 'action_created',
    label: 'Actions created'
  },
  {
    id: 'action_auto_executed',
    label: 'Auto executed actions'
  },
  {
    id: 'action_error',
    label: 'Action errors'
  },
  {
    id: 'report_generated',
    label: 'Reports generated'
  }
];

export const notificationsInitialState = {
  loading: false,
  error: null,
  feed: [],
  pagination: {
    count: 0,
    next: null,
    previous: null
  },
  filters: { ...DEFAULT_FILTERS },
  unreadCount: 0,
  unreadLoading: false,
  preferences: {
    loading: false,
    saving: false,
    seeds: [],
    aiChannels: [],
    global: null,
    error: null
  }
};

export const NOTIFICATION_ACTIONS = {
  FETCH_START: 'FETCH_START',
  FETCH_SUCCESS: 'FETCH_SUCCESS',
  FETCH_ERROR: 'FETCH_ERROR',
  PREPEND_ITEM: 'PREPEND_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  MARK_ALL_READ: 'MARK_ALL_READ',
  SET_UNREAD_COUNT: 'SET_UNREAD_COUNT',
  UNREAD_LOADING: 'UNREAD_LOADING',
  PREFERENCES_LOADING: 'PREFERENCES_LOADING',
  PREFERENCES_SUCCESS: 'PREFERENCES_SUCCESS',
  PREFERENCES_ERROR: 'PREFERENCES_ERROR',
  PREFERENCES_SAVING: 'PREFERENCES_SAVING',
  PREFERENCES_SAVED: 'PREFERENCES_SAVED'
};

export const notificationsReducer = (state, action) => {
  switch (action.type) {
    case NOTIFICATION_ACTIONS.FETCH_START:
      return {
        ...state,
        loading: true,
        error: null,
        filters: action.payload?.filters ?? state.filters,
        ...(action.payload?.reset
          ? { feed: [], pagination: notificationsInitialState.pagination }
          : {})
      };
    case NOTIFICATION_ACTIONS.FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        feed: action.payload.append
          ? [...state.feed, ...action.payload.results]
          : action.payload.results,
        pagination: action.payload.pagination
      };
    case NOTIFICATION_ACTIONS.FETCH_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    case NOTIFICATION_ACTIONS.PREPEND_ITEM: {
      // Live websocket arrival — newest first, deduped against anything the
      // REST fetch already delivered (the stream and a concurrent fetch can
      // both carry the same row).
      const incoming = action.payload;
      if (!incoming?.id) return state;
      if (state.feed.some((item) => item.id === incoming.id)) return state;
      return {
        ...state,
        feed: [incoming, ...state.feed],
        pagination: {
          ...state.pagination,
          count: (state.pagination?.count ?? 0) + 1
        }
      };
    }
    case NOTIFICATION_ACTIONS.UPDATE_ITEM:
      return {
        ...state,
        feed: state.feed.map((item) =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.changes }
            : item
        )
      };
    case NOTIFICATION_ACTIONS.MARK_ALL_READ:
      return {
        ...state,
        feed: state.feed.map((item) => ({ ...item, is_read: true }))
      };
    case NOTIFICATION_ACTIONS.SET_UNREAD_COUNT:
      return {
        ...state,
        unreadCount:
          typeof action.payload === 'number'
            ? action.payload
            : state.unreadCount,
        unreadLoading: false
      };
    case NOTIFICATION_ACTIONS.UNREAD_LOADING:
      return {
        ...state,
        unreadLoading: action.payload
      };
    case NOTIFICATION_ACTIONS.PREFERENCES_LOADING:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          loading: true,
          error: null
        }
      };
    case NOTIFICATION_ACTIONS.PREFERENCES_SUCCESS:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          loading: false,
          error: null,
          seeds: action.payload.seeds,
          aiChannels: action.payload.aiChannels,
          global: action.payload.global
        }
      };
    case NOTIFICATION_ACTIONS.PREFERENCES_ERROR:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          loading: false,
          error: action.payload
        }
      };
    case NOTIFICATION_ACTIONS.PREFERENCES_SAVING:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          saving: action.payload
        }
      };
    case NOTIFICATION_ACTIONS.PREFERENCES_SAVED:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          saving: false,
          ...(action.payload.seeds ? { seeds: action.payload.seeds } : {}),
          ...(action.payload.aiChannels
            ? { aiChannels: action.payload.aiChannels }
            : {}),
          ...(action.payload.global ? { global: action.payload.global } : {})
        }
      };
    default:
      return state;
  }
};
