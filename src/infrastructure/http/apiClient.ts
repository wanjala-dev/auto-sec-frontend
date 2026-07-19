import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';

import { normalizeC1Money } from '../../shared/money/normalizeC1';

import type {
  ApiError,
  ApiRequestConfig,
  StoredUserRecord,
  UserSummaryRecord,
  WorkspaceRecord
} from './apiTypes';

// The frontend talks to the versioned API surface. Every backend endpoint
// (all CRUD, every context) is mounted under /api/v1/; v1 reads return the
// ratified contract (money as C1 objects, ISO-8601-UTC-Z datetimes). The C1
// money objects are flattened back to the frontend's number model by the
// response interceptor below (see shared/money/normalizeC1). v0 == the legacy
// root-alias surface, kept for rollback. Bump this one constant to re-pin.
const API_VERSION_PREFIX = '/api/v1';

const resolveBaseURL = (): string => {
  const raw = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');
  return `${raw}${API_VERSION_PREFIX}`;
};

const BASE_URL = resolveBaseURL();

const apiClient = axios.create({
  baseURL: BASE_URL || undefined
});
const refreshClient = axios.create({
  baseURL: BASE_URL || undefined
});
const retryClient = axios.create({
  baseURL: BASE_URL || undefined
});

const LOGIN_PATH = '/identity/login/';
const REFRESH_PATH = '/identity/token/refresh/';
let pendingRefresh: Promise<string | null> | null = null;

// Set on the first 401 with code='token_not_valid' in a burst. Suppresses
// per-error toasts + skips refresh attempts for every subsequent 401 in
// the same burst, then redirects once. Reset on next page load.
let _sessionDead = false;
const _handleSessionDead = () => {
  if (_sessionDead) return;
  _sessionDead = true;
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('token_refresh');
    localStorage.removeItem('user');
    localStorage.removeItem('user_summary');
  } catch {
    /* storage may throw in private mode — redirect anyway */
  }
  toast.error('Session expired, please log in again.', {
    icon: '⚠️',
    toastId: 'session-dead'
  });
  if (
    typeof window !== 'undefined' &&
    !window.location.pathname.startsWith('/identity/login')
  ) {
    window.location.replace('/identity/login');
  }
};

// ── Connectivity tracking ────────────────────────────────────────
// When the server is unreachable, suppress per-request toasts and
// surface a single persistent banner instead.
// ── Rate-limit tracking ─────────────────────────────────────────
// When a 429 is received, suppress duplicate toasts and expose the
// cooldown window so callers can skip requests entirely.
let _rateLimitedUntil = 0;
let _rateLimitToastShown = false;

export const isRateLimited = (): boolean => Date.now() < _rateLimitedUntil;

let _networkErrorCount = 0;
let _isOffline = false;
let _offlineListeners: Array<(offline: boolean) => void> = [];
let _offlineSince = 0;
let _onlineDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const OFFLINE_THRESHOLD = 2; // consecutive network errors before showing overlay
const MIN_OFFLINE_DURATION_MS = 5000; // stay offline at least 5s to prevent flicker
const ONLINE_DEBOUNCE_MS = 3000; // wait 3s of successful requests before dismissing

const _notifyOfflineListeners = () => {
  _offlineListeners.forEach((fn) => {
    try {
      fn(_isOffline);
    } catch {
      /* noop */
    }
  });
};

const _markOffline = () => {
  if (_onlineDebounceTimer) {
    clearTimeout(_onlineDebounceTimer);
    _onlineDebounceTimer = null;
  }
  if (_isOffline) return;
  _isOffline = true;
  _offlineSince = Date.now();
  toast.dismiss();
  _notifyOfflineListeners();
};

const _markOnline = () => {
  _networkErrorCount = 0;
  if (!_isOffline) return;

  // Ensure minimum offline duration to prevent flicker
  const elapsed = Date.now() - _offlineSince;
  if (elapsed < MIN_OFFLINE_DURATION_MS) {
    if (!_onlineDebounceTimer) {
      _onlineDebounceTimer = setTimeout(() => {
        _onlineDebounceTimer = null;
        if (_networkErrorCount === 0) {
          _isOffline = false;
          _notifyOfflineListeners();
        }
      }, MIN_OFFLINE_DURATION_MS - elapsed);
    }
    return;
  }

  // Debounce: wait for sustained connectivity before dismissing
  if (_onlineDebounceTimer) return;
  _onlineDebounceTimer = setTimeout(() => {
    _onlineDebounceTimer = null;
    if (_networkErrorCount === 0) {
      _isOffline = false;
      _notifyOfflineListeners();
    }
  }, ONLINE_DEBOUNCE_MS);
};

const _recordNetworkError = () => {
  _networkErrorCount += 1;
  // Cancel any pending "go online" timer
  if (_onlineDebounceTimer) {
    clearTimeout(_onlineDebounceTimer);
    _onlineDebounceTimer = null;
  }
  if (_networkErrorCount >= OFFLINE_THRESHOLD) {
    _markOffline();
  }
};

export const subscribeConnectivity = (listener: (offline: boolean) => void) => {
  _offlineListeners.push(listener);
  // immediately notify current state
  listener(_isOffline);
  return () => {
    _offlineListeners = _offlineListeners.filter((fn) => fn !== listener);
  };
};

export const getIsOffline = () => _isOffline;

type GenericRecord = Record<string, unknown>;

const isAuthPath = (url: unknown, path: string): boolean => {
  if (typeof url !== 'string') return false;
  return url.includes(path);
};

const isCanceledRequest = (error: unknown): boolean => {
  const maybeError = error as { code?: string; name?: string };
  return (
    axios.isCancel?.(error) ||
    maybeError?.code === 'ERR_CANCELED' ||
    maybeError?.name === 'CanceledError' ||
    maybeError?.name === 'AbortError'
  );
};

const isPlainObject = (value: unknown): value is GenericRecord =>
  Boolean(value) &&
  typeof value === 'object' &&
  (value.constructor === Object ||
    Object.getPrototypeOf(value) === Object.prototype);

const readActiveWorkspaceId = (): string | number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const rawSummary = localStorage.getItem('user_summary');
    if (rawSummary) {
      const summary = JSON.parse(rawSummary) as UserSummaryRecord;
      const workspaceContext =
        summary?.workspace_context ||
        summary?.workspaceContext ||
        summary?.data?.workspace_context ||
        summary?.data?.workspaceContext ||
        null;
      const workspaces =
        summary?.workspaces ||
        summary?.data?.workspaces ||
        workspaceContext?.workspaces ||
        null;

      const availableIds = Array.isArray(workspaces)
        ? workspaces
            .map((workspace: WorkspaceRecord | null | undefined) => {
              if (!workspace || typeof workspace !== 'object') return null;
              return (
                workspace.id ||
                workspace.pk ||
                workspace.workspace_id ||
                workspace.uuid ||
                null
              );
            })
            .filter(Boolean)
            .map((value) => String(value))
        : [];

      const activeId = workspaceContext?.active_workspace_id
        ? String(workspaceContext.active_workspace_id)
        : null;

      if (
        activeId &&
        (availableIds.length === 0 || availableIds.includes(activeId))
      ) {
        return activeId;
      }

      if (availableIds.length > 0) {
        return availableIds[0];
      }
    }

    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser) as StoredUserRecord;
      return (
        parsed?.active_workspace_id ||
        parsed?.default_workspace_id ||
        parsed?.active_workspace ||
        parsed?.active_seed_id ||
        parsed?.default_seed_id ||
        null
      );
    }

    return null;
  } catch {
    return null;
  }
};

const normalizeWorkspaceParam = <T>(container: T): T => {
  if (!container || typeof container !== 'object') return container;
  const mutable = container as Record<string, unknown>;
  if (mutable.workspace_id === undefined && mutable.seed_id !== undefined) {
    mutable.workspace_id = mutable.seed_id;
    delete mutable.seed_id;
  }
  return container;
};

const isAbsoluteUrl = (url: string): boolean => /^https?:\/\//i.test(url);

const normalizeApiPathname = (pathname: string): string => {
  if (!pathname || typeof pathname !== 'string') return pathname;
  let next = pathname;

  next = `/${next}`.replace(/^\/+/, '/').replace(/\/{2,}/g, '/');

  next = next.replace(/^\/seed(?=\/|$)/, '/workspaces');
  next = next.replace(/^\/seeds(?=\/|$)/, '/workspaces');
  next = next.replace(/^\/team\/seed(?=\/|$)/, '/team/workspaces');
  next = next.replace(
    /^\/notifications\/preferences\/seeds(?=\/|$)/,
    '/notifications/preferences/workspaces'
  );
  next = next.replace(
    /^\/workspaces\/categories\/subcategories(?=\/|$)/,
    '/workspaces/categories-subcategories'
  );
  next = next.replace(
    /^\/seed\/categories-subcategories(?=\/|$)/,
    '/workspaces/categories-subcategories'
  );
  next = next.replace(
    /^\/seed\/categories\/subcategories(?=\/|$)/,
    '/workspaces/categories-subcategories'
  );
  next = next.replace(
    /^\/sponsorship\/children(?=\/|$)/,
    '/sponsorship/recipients'
  );
  next = next.replace(
    /^\/sponsorship\/sponsor\/child(?=\/|$)/,
    '/sponsorship/sponsor/recipient'
  );
  next = next.replace(
    /^\/budget\/transaction\/child(?=\/|$)/,
    '/budget/transaction/recipient'
  );
  next = next.replace(/^\/project\/seed(?=\/|$)/, '/project/workspaces');
  next = next.replace(/^\/users(?=\/|$)/, '/identity');

  if (next === '/workspaces') {
    next = '/workspaces/';
  }

  return next;
};

const normalizeApiUrl = (url: unknown): unknown => {
  if (!url || typeof url !== 'string') return url;

  if (isAbsoluteUrl(url)) {
    try {
      const parsed = new URL(url);
      parsed.pathname = normalizeApiPathname(parsed.pathname);
      return parsed.toString();
    } catch {
      return url;
    }
  }

  return normalizeApiPathname(url);
};

const resolvePathname = (url: unknown): string => {
  if (!url || typeof url !== 'string') return '';
  if (isAbsoluteUrl(url)) {
    try {
      return new URL(url).pathname || '';
    } catch {
      return '';
    }
  }
  return url;
};

const shouldEnsureWorkspaceParam = (pathname: string): boolean =>
  pathname.startsWith('/membership/members/') ||
  pathname.startsWith('/ai/actions/metrics/') ||
  pathname.startsWith('/membership/invitations/') ||
  pathname.startsWith('/feature-flags/');

const attachRequestInterceptor = (client: typeof apiClient): void => {
  client.interceptors.request.use(
    async (config) => {
      if (typeof config?.url === 'string') {
        config.url = normalizeApiUrl(config.url) as string;
      }

      const resolvedPathname = resolvePathname(config?.url);

      if (config?.params) {
        normalizeWorkspaceParam(config.params);
      }

      if (shouldEnsureWorkspaceParam(resolvedPathname)) {
        const params = isPlainObject(config.params) ? config.params : {};
        if (!params.workspace_id) {
          const activeWorkspaceId = readActiveWorkspaceId();
          if (activeWorkspaceId) {
            params.workspace_id = activeWorkspaceId;
          }
        }
        config.params = params;
      }

      const data = config?.data;
      if (data) {
        if (typeof FormData !== 'undefined' && data instanceof FormData) {
          try {
            const hasWorkspace = data.has('workspace_id');
            const seedValue = data.get('seed_id');
            if (
              !hasWorkspace &&
              seedValue !== null &&
              seedValue !== undefined
            ) {
              data.append('workspace_id', seedValue);
              if (typeof data.delete === 'function') {
                data.delete('seed_id');
              }
            }
          } catch {
            // no-op
          }
        } else if (isPlainObject(data)) {
          normalizeWorkspaceParam(data);
        }
      }

      const accessToken = localStorage.getItem('token');
      if (!config.headers) {
        config.headers = {};
      }
      if (!('Authorization' in config.headers)) {
        if (accessToken) {
          (
            config.headers as Record<string, string>
          ).Authorization = `Bearer ${accessToken}`;
        } else {
          delete (config.headers as Record<string, string>).Authorization;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
};

attachRequestInterceptor(apiClient);
attachRequestInterceptor(retryClient);

axios.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    if (typeof config?.url === 'string') {
      config.url = normalizeApiUrl(config.url) as string;
    }
    if (config?.params) {
      normalizeWorkspaceParam(config.params);
    }

    const resolvedPathname = resolvePathname(config?.url);
    if (
      resolvedPathname.startsWith('/membership/members/') ||
      resolvedPathname.startsWith('/ai/actions/metrics/') ||
      resolvedPathname.startsWith('/membership/invitations/')
    ) {
      const params = isPlainObject(config.params) ? config.params : {};
      if (!params.workspace_id) {
        const activeWorkspaceId = readActiveWorkspaceId();
        if (activeWorkspaceId) {
          params.workspace_id = activeWorkspaceId;
        }
      }
      config.params = params;
    }

    const data = config?.data;
    if (data && isPlainObject(data)) {
      normalizeWorkspaceParam(data);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// v1 anti-corruption layer: flatten C1 money objects in the response body
// back to the frontend's number model before any caller sees them. Walks
// only object/array bodies; primitives (blobs, plain strings) pass through.
const normalizeResponseMoney = (response: { data?: unknown }) => {
  const { data } = response;
  if (data && typeof data === 'object') {
    normalizeC1Money(data);
  }
  return response;
};

apiClient.interceptors.response.use(
  (response) => {
    _markOnline();
    return normalizeResponseMoney(response);
  },
  async (error: ApiError) => {
    if (isCanceledRequest(error)) {
      console.info('Request canceled:', error?.message || error);
      return Promise.reject(error);
    }

    const requestUrl = error.config?.url;
    const requestPathname = resolvePathname(requestUrl || '');
    const isLoginRequest = isAuthPath(requestUrl, LOGIN_PATH);
    const isRefreshRequest = isAuthPath(requestUrl, REFRESH_PATH);
    // Suppress toasts for background/non-critical API calls that
    // fail silently (the caller handles the error locally).
    const isSilentPath =
      requestPathname.startsWith('/ai/agents/ai-config') ||
      requestPathname.startsWith('/sponsor/methods') ||
      requestPathname.startsWith('/announcements/') ||
      requestPathname.startsWith('/feature-flags/') ||
      requestPathname.startsWith('/shop/') ||
      requestPathname.startsWith('/store/') ||
      // The workspace feed UI is shipped but the backend endpoint
      // (/social/workspaces/<ws>/feed/) doesn't exist yet. Suppress
      // the 404 toast until the feed endpoint lands or the UI is
      // removed. Tracked alongside the GTM scope freeze work.
      requestPathname.startsWith('/social/workspaces/') ||
      requestPathname.startsWith('/receipts/') ||
      requestPathname.startsWith('/documents/') ||
      requestPathname.includes('/groups/') ||
      requestPathname.includes('/permissions/') ||
      requestPathname.startsWith('/imports/') ||
      requestPathname.startsWith('/identity/logout') ||
      requestPathname.startsWith('/userpreferences') ||
      requestPathname.startsWith('/cart/list') ||
      // Message feedback (thumbs up/down) is best-effort — the
      // FeedbackButtons component handles its own rollback. Don't
      // pop the global error toast when the endpoint is unreachable
      // (e.g. backend not yet deployed / 404).
      /^\/ai\/conversations\/[^/]+\/messages\/[^/]+\/feedback\/?$/.test(
        requestPathname
      ) ||
      // Deep-run snapshot + events endpoints. The chat UI now
      // generates planId on submit so the WS subscription opens
      // before the run row is written; any caller that pings these
      // endpoints during that window legitimately gets 404. The hook
      // (useDeepRunProgress) gates the snapshot fetch on the first
      // WS event so this should rarely fire — but keep the toast
      // suppressed so a future caller can't accidentally regress
      // the UX. Stats endpoint is intentionally NOT in this group;
      // a 404 there is a real error.
      /^\/ai\/agents\/runs\/[a-f0-9-]{36}(\/events)?\/?$/.test(
        requestPathname
      ) ||
      // Invitation info + accept — ShareInvitationAcceptPage renders
      // a dedicated in-page error state ("Invitation no longer valid"
      // / inline form error), so the global toast is redundant noise.
      // Pending-share revoke (DELETE /sharing/invitations/<uuid>/) is
      // intentionally NOT in this group — that's a user-initiated
      // action where a toast IS the right failure signal.
      requestPathname === '/sharing/invitations/info/' ||
      requestPathname === '/sharing/invitations/accept/';
    const shouldShowGlobalToast =
      !isLoginRequest && !isRefreshRequest && !isSilentPath;

    if (!error.response) {
      console.error('Network Error:', error);
      _recordNetworkError();
      // When offline, the banner handles the messaging — no toast spam
      if (shouldShowGlobalToast && !_isOffline) {
        toast.error(
          'Unable to connect to the server. Please check your connection.',
          {
            icon: '⚠️',
            toastId: 'network-error',
            autoClose: 5000
          }
        );
      }
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    console.error(`API Error (${status}):`, data);

    // Stale-token burst: localStorage holds an invalid JWT (signed with an
    // old SECRET_KEY, malformed, or for a deleted user). Every request in
    // the page paint will 401 with code='token_not_valid'. Refreshing
    // won't help — the access token isn't expired, it's invalid. Fire one
    // toast, clear the session, redirect; suppress everything else in the
    // burst so the user doesn't see a toast wall.
    if (status === 401 && (data as GenericRecord)?.code === 'token_not_valid') {
      _handleSessionDead();
      return Promise.reject(error);
    }
    if (_sessionDead) {
      return Promise.reject(error);
    }

    // Circuit breaker: 429 Too Many Requests — stop retrying, back off.
    // Suppress all toasts during the cooldown window to prevent toast storms.
    if (status === 429) {
      const retryAfter = error.response.headers?.['retry-after'];
      const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
      console.warn(`Rate limited (429). Retry after ${waitSeconds}s.`);
      _rateLimitedUntil = Date.now() + waitSeconds * 1000;
      if (!_rateLimitToastShown) {
        _rateLimitToastShown = true;
        toast.warning?.('Too many requests. Please wait a moment.', {
          icon: '⏳',
          toastId: 'rate-limit',
          onClose: () => {
            _rateLimitToastShown = false;
          }
        });
      }
      return Promise.reject(error);
    }

    // Circuit breaker: if the current user's profile/detail returns 404,
    // the user no longer exists on this backend — force logout.
    const resolvedPathname = resolvePathname(requestUrl);
    if (
      status === 404 &&
      (resolvedPathname.startsWith('/identity/detail/') ||
        resolvedPathname.startsWith('/identity/users/') ||
        resolvedPathname.startsWith('/identity/me/'))
    ) {
      console.warn('User profile not found (404) — forcing session clear.');
      localStorage.removeItem('token');
      localStorage.removeItem('token_refresh');
      localStorage.removeItem('user');
      localStorage.removeItem('user_summary');
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/identity/login')
      ) {
        window.location.replace('/identity/login');
      }
      return Promise.reject(error);
    }

    // Feature-flag gate responses are explicit "this surface is off" —
    // not an error the user should see. The backend returns 403 with
    // detail="Feature not enabled." via RequiresFeatureFlag; suppress
    // the global toast. Callers that care can still handle the rejection.
    const isFeatureFlagGate =
      status === 403 &&
      (data as GenericRecord)?.detail === 'Feature not enabled.';

    // Membership-required gates fire when the viewer hits a workspace
    // they aren't a member of — e.g., opening a "sponsor a new seed"
    // flow on someone else's organization. The Layout still loads
    // member-only endpoints (members, transactions, imports) for that
    // workspace and each one 403s with error_code='WorkspaceMembership
    // RequiredError'. Until the sponsor/guest views learn to load a
    // reduced endpoint set, these 403s are expected — suppress the
    // global toast so the viewer doesn't see a stack of red errors.
    // The deep fix is for those page-loads to skip member-only fetches
    // when the viewer isn't a member; tracked separately.
    const isMembershipGate =
      status === 403 &&
      ((data as GenericRecord)?.error_code ===
        'WorkspaceMembershipRequiredError' ||
        (data as GenericRecord)?.error_code === 'TeamMembershipRequiredError');

    // 5xx responses count as "backend is unhealthy" just like a no-
    // response network error. Increment the same counter — once
    // OFFLINE_THRESHOLD consecutive failures land, _markOffline()
    // fires, ConnectivityBanner shows the sunset overlay, and
    // queued/in-flight toasts get dismissed. Without this, hooks
    // like useSeedSponsorshipPresentation that fire
    // addToast({ message: 'Server Error!' }) on 500 paint a wall
    // of red toasts instead of the calmer sunset state.
    if (typeof status === 'number' && status >= 500) {
      _recordNetworkError();
    }

    // Metered-AI limit (402). The workspace has spent its monthly AI-run
    // allowance for its tier (Free 20 / Pro 200 / Premium unlimited). The
    // backend returns 402 with {code, used, limit, upgrade_required}. Show a
    // tailored upgrade nudge instead of the generic "Something went wrong",
    // and emit an app event so a richer upgrade modal can hook in later.
    const isAiRunLimit =
      status === 402 &&
      (data as GenericRecord)?.code === 'ai_run_limit_exceeded';
    if (isAiRunLimit) {
      const used = (data as GenericRecord)?.used;
      const limit = (data as GenericRecord)?.limit;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('wanjala:ai-run-limit', { detail: { used, limit } })
        );
      }
      if (shouldShowGlobalToast && !_isOffline) {
        toast.warning?.(
          `You've used your monthly AI runs (${used}/${limit}). ` +
            'Upgrade your plan to keep using AI.',
          { icon: '⭐', toastId: 'ai-run-limit' }
        );
      }
      return Promise.reject(error);
    }

    if (
      shouldShowGlobalToast &&
      !_isOffline &&
      !isRateLimited() &&
      !isFeatureFlagGate &&
      !isMembershipGate
    ) {
      const message =
        ((data as GenericRecord)?.message as string) || 'Something went wrong';
      toast.error(message, { icon: '⚠️' });
    }

    if (status === 401 && !isLoginRequest && !isRefreshRequest) {
      const originalRequest = error.config as ApiRequestConfig;
      if (originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        const refreshToken = localStorage.getItem('token_refresh');
        if (!refreshToken) {
          // Only a visitor who HAD a session gets the session-expired
          // treatment. An anonymous visitor (no tokens at all — e.g. a donor
          // opening a public /join, /sponsor or /forms link) hitting an
          // authenticated endpoint is a plain 401, NOT a dead session:
          // redirecting them to /identity/login would yank every anonymous
          // donor off the public donate surfaces.
          if (localStorage.getItem('token')) {
            _handleSessionDead();
          }
          return Promise.reject(error);
        }
        try {
          if (!pendingRefresh) {
            pendingRefresh = refreshClient
              .post(REFRESH_PATH, { refresh: refreshToken })
              .then((res) => {
                if (res.status === 200 && res.data.access) {
                  localStorage.setItem('token', res.data.access);
                  return res.data.access as string;
                }
                return null;
              })
              .catch((refreshError) => {
                console.error('Token refresh failed:', refreshError);
                _handleSessionDead();
                return null;
              })
              .finally(() => {
                pendingRefresh = null;
              });
          }
          const newToken = await pendingRefresh;
          if (newToken) {
            if (!originalRequest.headers) {
              originalRequest.headers = {};
            }
            (
              originalRequest.headers as Record<string, string>
            ).Authorization = `Bearer ${newToken}`;
            return retryClient.request(originalRequest);
          }
        } catch {
          // refresh already handled above
        }
      }
    }

    return Promise.reject(error);
  }
);

// Retried requests (after a 401 -> token refresh) return through retryClient,
// bypassing apiClient's success interceptor, so apply the same C1 money
// normalization here. Otherwise a response that happened to be retried would
// leak C1 objects to callers.
retryClient.interceptors.response.use(
  (response) => normalizeResponseMoney(response),
  (error) => Promise.reject(error)
);

export default apiClient;
