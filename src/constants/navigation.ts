import { resolveBooleanFlag as resolveBoolean } from '../domain/auth/booleanFlags';
import type { UserLike } from '../types/auth';

export const DEFAULT_SEED_ID: string | null = null;

export const DEFAULT_DASHBOARD_PATH = `/onboard`;

export const getDashboardPath = (seedId?: string | null): string => {
  const resolved = seedId || DEFAULT_SEED_ID;
  return resolved ? `/dashboard/${resolved}` : DEFAULT_DASHBOARD_PATH;
};

export const getHomePath = (seedId?: string | null): string => {
  const resolved = seedId || DEFAULT_SEED_ID;
  return resolved ? `/home/${resolved}` : '/home';
};

export const getBudgetDashboardPath = (
  seedId?: string | null,
  budgetId?: string | null
): string => {
  const resolved = seedId || DEFAULT_SEED_ID;
  if (!resolved) {
    return '/budget/dashboard';
  }

  const basePath = `/budget/dashboard/${resolved}`;
  if (!budgetId) {
    return basePath;
  }

  const params = new URLSearchParams({ budgetId: String(budgetId) });
  return `${basePath}?${params.toString()}`;
};

/**
 * @deprecated Pulls "active workspace" out of a user object's various
 * legacy fields. New code MUST NOT use this as a source of truth — the
 * workspace foundation rewrite (Track B) made `useActiveWorkspace()`
 * the single canonical reader, and per-user `active_seed_id` is now
 * just a bootstrap hint for the URL on cold-load. This helper is kept
 * for the resolve-on-bootstrap paths (`resolveHomePath`, login flow)
 * where the URL hasn't been chosen yet. Anywhere a hook is available,
 * use `useActiveWorkspace()` instead.
 */
export const getActiveSeedId = (user: any): string | null => {
  if (!user || typeof user !== 'object') {
    return null;
  }

  return (
    user.active_seed_id ||
    user.active_seed ||
    user?.user?.active_seed ||
    user?.user?.active_seed_id ||
    user?.user?.profile?.active_seed ||
    user?.profile?.active_seed ||
    null
  );
};

const parseUser = (value: UserLike): any => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
};

const resolveUserId = (user: any): string | null => {
  if (!user || typeof user !== 'object') return null;
  const direct =
    user.pk || user.id || user.user_id || user.userId || user.uuid || null;
  if (direct !== null && direct !== undefined && direct !== '') {
    return String(direct);
  }
  const nested =
    user.user ||
    user.profile ||
    user.data?.user ||
    user.data?.profile ||
    user.data ||
    null;
  if (nested && nested !== user) {
    return resolveUserId(nested);
  }
  return null;
};

export const resolveOnboardPath = (userLike: UserLike): string => {
  const parsed = parseUser(userLike);
  const userId = resolveUserId(parsed);
  return userId ? `/onboard/${userId}` : '/onboard';
};

export const resolveRequiresOrgOnboarding = (userLike: UserLike): boolean => {
  const parsed = parseUser(userLike);
  const requiresFlag = resolveBoolean(parsed?.requires_org_onboarding);
  if (requiresFlag === true) return true;
  if (requiresFlag === false) return false;

  const membershipCount = Number(parsed?.org_membership_count);
  if (Number.isFinite(membershipCount) && membershipCount === 0) {
    return true;
  }

  return false;
};

export const resolveHomePath = (userLike: UserLike): string => {
  const parsed = parseUser(userLike);
  const requiresOrgOnboarding = resolveRequiresOrgOnboarding(parsed);
  const onboardComplete = resolveBoolean(parsed?.is_onboard_complete);
  if (requiresOrgOnboarding || onboardComplete === false) {
    return resolveOnboardPath(parsed);
  }
  const seedId = getActiveSeedId(parsed);
  return getHomePath(seedId);
};
