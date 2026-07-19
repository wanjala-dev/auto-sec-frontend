import { useEffect, useMemo, useState } from 'react';

import {
  readStoredUserSummary,
  writeStoredUserSummary
} from '../../../infrastructure/session/browserAuthStore';
import { useActiveWorkspace } from './useActiveWorkspace';

// Reads `workspace_context.active_workspace_ai_quota` off the cached
// me/summary response and exposes it as a typed snapshot the chat
// header pill consumes. Mirrors the pattern in
// `useActiveWorkspaceSummary` so re-fetches via the
// `user-summary-updated` event repaint the pill without a page
// reload (e.g. after a chat call bumps the daily counter on the
// server and the next me/summary fetch picks up the new remaining
// value).
//
// Shape comes from the backend's
// `components/agents/application/queries/workspace_ai_quota_query.py`
// → `build_workspace_ai_quota_snapshot`. -1 in any `*_remaining` field
// means "unlimited" (budget == 0) and the pill should render nothing.

export type WorkspaceAIQuota = {
  ai_enabled: boolean;
  daily_message_budget: number;
  daily_messages_used: number;
  daily_messages_remaining: number;
  monthly_token_budget: number;
  monthly_tokens_used: number;
  monthly_tokens_remaining: number;
};

export type ActiveWorkspaceAIQuota = {
  workspaceId: string | null;
  quota: WorkspaceAIQuota | null;
  isLoading: boolean;
  // True when the daily message budget is finite and exhausted. The
  // chat composer uses this to disable the send button so a user
  // hitting Enter doesn't fire a doomed request that comes back 429.
  isDailyExhausted: boolean;
  // True when the monthly token budget is finite and exhausted.
  // Ops kill-switch; rare in normal use.
  isMonthlyTokensExhausted: boolean;
};

type CachedSummary = {
  workspace_context?: { active_workspace_ai_quota?: WorkspaceAIQuota | null };
  data?: {
    workspace_context?: { active_workspace_ai_quota?: WorkspaceAIQuota | null };
  };
};

const SUMMARY_UPDATED_EVENT = 'user-summary-updated';

const readQuota = (summary: CachedSummary | null): WorkspaceAIQuota | null => {
  if (!summary) return null;
  const ctx =
    summary?.data?.workspace_context || summary?.workspace_context || null;
  return ctx?.active_workspace_ai_quota || null;
};

const useSummaryRevision = (): number => {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const bump = (event?: StorageEvent) => {
      if (!event || !event.key || event.key === 'user_summary') {
        setRevision((value) => value + 1);
      }
    };
    window.addEventListener('storage', bump);
    window.addEventListener(SUMMARY_UPDATED_EVENT, bump as EventListener);
    return () => {
      window.removeEventListener('storage', bump);
      window.removeEventListener(SUMMARY_UPDATED_EVENT, bump as EventListener);
    };
  }, []);

  return revision;
};

// ─── Optimistic update helpers ───────────────────────────────────
//
// useChatSession.ts calls these around the chat send so the pill
// repaints immediately on success / 429 without waiting for the next
// natural me/summary refetch. The backend remains the source of
// truth — these helpers are a UX shortcut, not a cache. The next
// me/summary fetch overwrites any drift introduced here.

const writeQuotaUpdate = (
  updater: (current: WorkspaceAIQuota | null) => WorkspaceAIQuota | null
): void => {
  const summary = readStoredUserSummary() as CachedSummary | null;
  if (!summary) return;
  const ctx = summary?.data?.workspace_context || summary?.workspace_context;
  if (!ctx) return;
  const current = ctx.active_workspace_ai_quota || null;
  const next = updater(current);
  if (next === current) return;

  // Mutate in-place inside whichever shape the cached summary uses.
  // Same writer covers both data.workspace_context.* and
  // workspace_context.* envelopes the backend has shipped over time.
  if (summary?.data?.workspace_context) {
    summary.data.workspace_context.active_workspace_ai_quota = next;
  }
  if (summary?.workspace_context) {
    summary.workspace_context.active_workspace_ai_quota = next;
  }
  writeStoredUserSummary(summary);
};

/**
 * Decrement the cached workspace's daily-messages counter by one.
 * Called from useChatSession.ts after a successful chat reply so the
 * pill repaints instantly. Safe when quota is unlimited or missing —
 * those paths short-circuit.
 */
export const decrementActiveWorkspaceAIQuotaUsed = (): void => {
  writeQuotaUpdate((current) => {
    if (!current) return current;
    // Unlimited workspaces don't track remaining — skip.
    if (current.daily_messages_remaining === -1) return current;
    const nextUsed = current.daily_messages_used + 1;
    const nextRemaining = Math.max(0, current.daily_messages_remaining - 1);
    return {
      ...current,
      daily_messages_used: nextUsed,
      daily_messages_remaining: nextRemaining
    };
  });
};

/**
 * Force the daily-messages counter to exhausted (remaining = 0).
 * Called from useChatSession.ts when the backend returns 429 with a
 * workspace-daily-cap decision, so the pill flips to red instantly.
 */
export const markActiveWorkspaceAIQuotaDailyExhausted = (): void => {
  writeQuotaUpdate((current) => {
    if (!current) return current;
    if (current.daily_messages_remaining === -1) return current;
    return {
      ...current,
      daily_messages_used: current.daily_message_budget,
      daily_messages_remaining: 0
    };
  });
};

/**
 * Force the monthly-tokens counter to exhausted. Called when the
 * backend returns 429 with the monthly-token kill-switch decision —
 * rare in practice but a clean parallel to the daily helper.
 */
export const markActiveWorkspaceAIQuotaMonthlyTokensExhausted = (): void => {
  writeQuotaUpdate((current) => {
    if (!current) return current;
    if (current.monthly_tokens_remaining === -1) return current;
    return {
      ...current,
      monthly_tokens_used: current.monthly_token_budget,
      monthly_tokens_remaining: 0
    };
  });
};

export const useActiveWorkspaceAIQuota = (): ActiveWorkspaceAIQuota => {
  const { workspaceId } = useActiveWorkspace();
  const revision = useSummaryRevision();

  return useMemo(() => {
    if (!workspaceId) {
      return {
        workspaceId: null,
        quota: null,
        isLoading: false,
        isDailyExhausted: false,
        isMonthlyTokensExhausted: false
      };
    }

    const summary = readStoredUserSummary() as CachedSummary | null;
    if (!summary) {
      return {
        workspaceId,
        quota: null,
        isLoading: true,
        isDailyExhausted: false,
        isMonthlyTokensExhausted: false
      };
    }

    const quota = readQuota(summary);
    if (!quota) {
      return {
        workspaceId,
        quota: null,
        isLoading: false,
        isDailyExhausted: false,
        isMonthlyTokensExhausted: false
      };
    }

    // -1 means "unlimited" — never exhausted.
    const isDailyExhausted =
      quota.daily_messages_remaining !== -1 &&
      quota.daily_messages_remaining <= 0;
    const isMonthlyTokensExhausted =
      quota.monthly_tokens_remaining !== -1 &&
      quota.monthly_tokens_remaining <= 0;

    return {
      workspaceId,
      quota,
      isLoading: false,
      isDailyExhausted,
      isMonthlyTokensExhausted
    };
    // revision is consumed implicitly by re-running this memo when the
    // cached summary changes via storage/event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, revision]);
};
