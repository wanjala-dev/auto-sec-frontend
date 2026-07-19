/**
 * Read the workspace's AI fluency profile fields (voice tone,
 * beneficiary-language rules, custom system-prompt addendum).
 *
 * Since the brand-kit voice move (2026-07-12), ``voice_tone`` is sourced from
 * its CANONICAL home — the brand kit, via the cached ``me/summary``
 * ``workspace_context.theme.voice_tone`` — while the two AI-specific fields
 * still come from the AI config endpoint. The legacy ``voice_tone`` inside the
 * AI config JSON is ignored (it goes stale once admins edit voice in
 * Settings → Brand).
 *
 * Used by:
 * - ``MissionContextChip`` (V1 + V2 chat surfaces) to indicate when
 *   the workspace owner has authored a profile and to render it on
 *   tooltip hover.
 * - ``WorkspaceAIProfileTab`` (settings) to seed the form.
 *
 * Returns ``null`` while loading and an empty object when no fields
 * are set so callers can branch on either.
 *
 * Plan reference: ``/Users/henrywanjala/.claude/plans/atomic-gathering-fox.md``
 * AI Fluency Wave 1 frontend slice.
 */
import { useCallback, useEffect, useState } from 'react';

import { agentsApi } from 'infrastructure/agents/agentsApi';
import { readStoredUserSummary } from 'infrastructure/session/browserAuthStore';
import { extractWorkspaceTheme } from 'features/theme/presentation/applyWorkspaceTheme';

export type WorkspaceAIProfile = {
  voice_tone: string;
  beneficiary_language_rules: string;
  custom_system_prompt_addendum: string;
};

const EMPTY_PROFILE: WorkspaceAIProfile = {
  voice_tone: '',
  beneficiary_language_rules: '',
  custom_system_prompt_addendum: ''
};

const PROFILE_KEYS = [
  'voice_tone',
  'beneficiary_language_rules',
  'custom_system_prompt_addendum'
] as const;

export type UseWorkspaceAIProfileResult = {
  profile: WorkspaceAIProfile;
  /** True when any of the three fields is non-empty after trim. */
  isConfigured: boolean;
  loading: boolean;
  error: unknown;
  reload: () => Promise<void>;
};

/**
 * Read the AI fluency fields from the workspace's stored config.
 *
 * Why a dedicated hook (rather than re-reading the AI config inline
 * in each consumer): both the chip on chat surfaces and the settings
 * tab need the same fields, the same default-shape coercion, and the
 * same "isConfigured" check. Centralising here keeps the consumers
 * thin and preserves a single re-fetch surface (``reload()``) for
 * after a save.
 */
export function useWorkspaceAIProfile(
  workspaceId: string | undefined | null
): UseWorkspaceAIProfileResult {
  const [profile, setProfile] = useState<WorkspaceAIProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setProfile(EMPTY_PROFILE);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await agentsApi.getAIConfig(workspaceId);
      const config = (res?.data?.config ?? {}) as Record<string, unknown>;
      const next: WorkspaceAIProfile = { ...EMPTY_PROFILE };
      for (const key of PROFILE_KEYS) {
        const value = config[key];
        next[key] = typeof value === 'string' ? value : '';
      }
      // Canonical voice: the brand kit, delivered via the cached me/summary
      // theme. The legacy JSON copy in the AI config is deliberately
      // overridden — it stops updating once voice is edited in the Brand tab.
      const theme = extractWorkspaceTheme(readStoredUserSummary<any>()) as any;
      next.voice_tone =
        typeof theme?.voice_tone === 'string' ? theme.voice_tone : '';
      setProfile(next);
    } catch (err) {
      setError(err);
      setProfile(EMPTY_PROFILE);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const isConfigured = PROFILE_KEYS.some(
    (key) => (profile[key] ?? '').trim().length > 0
  );

  return {
    profile,
    isConfigured,
    loading,
    error,
    reload: load
  };
}

export { EMPTY_PROFILE, PROFILE_KEYS };
