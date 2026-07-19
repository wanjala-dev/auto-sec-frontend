import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSeedContext } from '../features/seed/presentation/SeedContext';
import { DEFAULT_AI_ALIAS } from '../features/agents/presentation/AgentContext';
import { normalizeWorkspaceId as normalizeSeedId } from '../domain/workspace/workspaceId';
import { resolveStoredActiveSeedId } from '../domain/auth/storedUserSelectors';
import { resolveStoredSummaryWorkspaceId } from '../domain/auth/storedSummarySelectors';
import { readViewerSessionSnapshot } from '../features/auth/presentation/useViewerSession';

const deriveFallbackSeedId = (): string | null => {
  const { storedUser, storedSummary } = readViewerSessionSnapshot();
  const userWorkspaceId = resolveStoredActiveSeedId(storedUser);
  if (userWorkspaceId) return userWorkspaceId;
  return resolveStoredSummaryWorkspaceId(storedSummary);
};

export const useAiTeammateAlias = (explicitSeedId: any = null) => {
  const {
    fetchAiTeammateAlias,
    renameAiTeammate,
    updateAiTeammateAvatar,
    aiTeammateAliases,
    aiTeammateAvatars,
    seed: activeSeed
  } = useSeedContext?.() ||
  ({
    fetchAiTeammateAlias: null,
    renameAiTeammate: null,
    updateAiTeammateAvatar: null,
    aiTeammateAliases: {},
    aiTeammateAvatars: {},
    seed: null
  } as any);

  const resolvedSeedId = useMemo(() => {
    const provided = normalizeSeedId(explicitSeedId);
    if (provided) return provided;

    const contextSeed = normalizeSeedId(
      activeSeed?.id || activeSeed?.seed_id || activeSeed?.pk
    );
    if (contextSeed) return contextSeed;

    const fallback = normalizeSeedId(deriveFallbackSeedId());
    return fallback || null;
  }, [explicitSeedId, activeSeed]);

  const aliasFromContext = useMemo(() => {
    if (!resolvedSeedId) return null;
    if (aiTeammateAliases && aiTeammateAliases[resolvedSeedId]) {
      return aiTeammateAliases[resolvedSeedId];
    }

    const contextAlias =
      activeSeed?.ai_teammate_display_name || activeSeed?.display_name || null;
    if (contextAlias && normalizeSeedId(activeSeed?.id) === resolvedSeedId) {
      return contextAlias;
    }
    return null;
  }, [resolvedSeedId, aiTeammateAliases, activeSeed]);

  const [alias, setAlias] = useState(aliasFromContext || DEFAULT_AI_ALIAS);
  const [loading, setLoading] = useState(false);
  const fetchAttemptedRef = useRef(false);

  useEffect(() => {
    fetchAttemptedRef.current = false;
    if (!resolvedSeedId) {
      setAlias(DEFAULT_AI_ALIAS);
    }
  }, [resolvedSeedId]);

  useEffect(() => {
    if (aliasFromContext) {
      setAlias(aliasFromContext);
      fetchAttemptedRef.current = false;
    } else if (!resolvedSeedId) {
      setAlias(DEFAULT_AI_ALIAS);
    }
  }, [aliasFromContext, resolvedSeedId]);

  // ``undefined`` = the teammate profile was never fetched for this
  // workspace (the alias may have come from seed-context fields that
  // don't carry the avatar); '' = fetched, platform default.
  const avatarFromContext = resolvedSeedId
    ? (aiTeammateAvatars || {})[resolvedSeedId]
    : undefined;

  useEffect(() => {
    if (
      !resolvedSeedId ||
      (aliasFromContext && avatarFromContext !== undefined) ||
      !fetchAiTeammateAlias ||
      fetchAttemptedRef.current
    ) {
      return;
    }

    fetchAttemptedRef.current = true;
    setLoading(true);
    fetchAiTeammateAlias(resolvedSeedId)
      .then((fetchedAlias: string | null) => {
        setAlias(fetchedAlias || DEFAULT_AI_ALIAS);
      })
      .catch(() => {
        setAlias(DEFAULT_AI_ALIAS);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [resolvedSeedId, aliasFromContext, fetchAiTeammateAlias]);

  const fetchAlias = useCallback(
    async (seedId?: string | null) => {
      const normalized = normalizeSeedId(seedId || resolvedSeedId);
      if (!fetchAiTeammateAlias || !normalized) {
        return DEFAULT_AI_ALIAS;
      }
      const fetched = await fetchAiTeammateAlias(normalized);
      if (normalized === resolvedSeedId) {
        setAlias(fetched || DEFAULT_AI_ALIAS);
      }
      return fetched || DEFAULT_AI_ALIAS;
    },
    [fetchAiTeammateAlias, resolvedSeedId]
  );

  const renameAlias = useCallback(
    async (seedId: string | null | undefined, displayName: string) => {
      if (!renameAiTeammate) return null;
      const normalized = normalizeSeedId(seedId || resolvedSeedId);
      if (!normalized) return null;
      const result = await renameAiTeammate(normalized, displayName);
      if (normalized === resolvedSeedId) {
        const trimmed =
          typeof displayName === 'string' ? displayName.trim() : '';
        setAlias(trimmed.length ? trimmed : DEFAULT_AI_ALIAS);
      }
      return result;
    },
    [renameAiTeammate, resolvedSeedId]
  );

  const updateAvatar = useCallback(
    async (seedId: string | null | undefined, avatarUrl: string) => {
      if (!updateAiTeammateAvatar) return null;
      const normalized = normalizeSeedId(seedId || resolvedSeedId);
      if (!normalized) return null;
      return updateAiTeammateAvatar(normalized, avatarUrl);
    },
    [updateAiTeammateAvatar, resolvedSeedId]
  );

  return {
    alias,
    /** Workspace-configured assistant avatar URL; '' = platform default. */
    avatarUrl: avatarFromContext || '',
    loading,
    seedId: resolvedSeedId,
    fetchAlias,
    renameAlias,
    updateAvatar
  };
};
