import { useCallback, useEffect, useRef } from 'react';
import { readViewerSessionSnapshot } from '../../../features/auth/presentation/useViewerSession';

const DEFAULT_CACHE_TTL = 3 * 60 * 1000;

const normalizeUserIdentifier = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
};

const extractUserIdCandidate = (userLike) => {
  if (!userLike || typeof userLike !== 'object') return null;
  return (
    userLike.pk ??
    userLike.id ??
    userLike.user_id ??
    userLike.userId ??
    userLike.uuid ??
    userLike.user_uuid ??
    null
  );
};

export const useSeedProviderSupport = ({ state }) => {
  const seedCacheRef = useRef({});
  const seedRequestRef = useRef({});
  const latestSeedRef = useRef(state.seed);
  const seedsCacheRef = useRef({ data: null, updatedAt: 0, promise: null });
  const userSeedsCacheRef = useRef({});
  const userSeedsPrefetchRef = useRef(false);

  useEffect(() => {
    latestSeedRef.current = state.seed;
  }, [state.seed]);

  const isCacheEntryFresh = useCallback(
    ({ updatedAt }: { updatedAt?: number } = {}, ttl = DEFAULT_CACHE_TTL) => {
      if (!updatedAt) return false;
      return Date.now() - updatedAt < ttl;
    },
    []
  );

  const resolveUserId = useCallback((explicitId) => {
    const normalizedExplicit = normalizeUserIdentifier(explicitId);
    if (normalizedExplicit) {
      return normalizedExplicit;
    }

    try {
      const { storedUser: parsed } = readViewerSessionSnapshot();
      if (!parsed) return null;
      const candidate =
        extractUserIdCandidate(parsed) ?? extractUserIdCandidate(parsed?.user);
      return normalizeUserIdentifier(candidate);
    } catch (_) {
      return null;
    }
  }, []);
  return {
    seedCacheRef,
    seedRequestRef,
    latestSeedRef,
    seedsCacheRef,
    userSeedsCacheRef,
    userSeedsPrefetchRef,
    isCacheEntryFresh,
    resolveUserId
  };
};
