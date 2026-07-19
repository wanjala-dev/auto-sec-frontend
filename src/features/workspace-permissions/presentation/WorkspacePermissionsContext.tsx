import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from 'react';

import { useSeedContext } from '../../seed/presentation/SeedContext';
import {
  emptyWorkspacePermissionsSnapshot,
  fetchWorkspacePermissionsSnapshot,
  type WorkspacePermissionKey,
  type WorkspacePermissionsSnapshot
} from '../application/workspacePermissionsService';

type WorkspacePermissionsContextValue = {
  snapshot: WorkspacePermissionsSnapshot;
  /** True when the snapshot is still being fetched for the active workspace. */
  isLoading: boolean;
  /**
   * Returns true iff the caller carries ``key`` OR is the workspace owner.
   * Safe to call during the initial fetch — returns false until the
   * snapshot lands. Callers that prefer graceful degradation can pair
   * with ``isLoading`` to show a spinner instead of hiding the button.
   */
  hasPermission: (key: WorkspacePermissionKey) => boolean;
  /** Force a refresh (after a role change, permission grant, etc.). */
  refresh: () => Promise<void>;
};

const WorkspacePermissionsContext =
  createContext<WorkspacePermissionsContextValue | null>(null);

/**
 * Fetches the active workspace's capability set once per active
 * workspace id and caches it in-memory for the session. The snapshot
 * invalidates and refetches whenever ``seed.id`` changes.
 *
 * Designed to wrap components that need permission-aware UI. Does NOT
 * persist to localStorage — role changes should always round-trip
 * through the server so the UI matches the authoritative gate.
 */
export function WorkspacePermissionsProvider({ children }: PropsWithChildren) {
  const { seed } = useSeedContext() || {};
  const workspaceId: string = seed?.id ? String(seed.id) : '';

  const [snapshot, setSnapshot] = useState<WorkspacePermissionsSnapshot>(
    emptyWorkspacePermissionsSnapshot
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const lastFetchedWorkspaceRef = useRef<string>('');

  const loadSnapshot = useCallback(async (targetWorkspaceId: string) => {
    if (!targetWorkspaceId) {
      setSnapshot(emptyWorkspacePermissionsSnapshot());
      return;
    }
    setIsLoading(true);
    try {
      const result = await fetchWorkspacePermissionsSnapshot(targetWorkspaceId);
      // Guard against race conditions when the user switches workspaces
      // mid-fetch — only commit if the target still matches what the
      // seed context currently holds.
      if (lastFetchedWorkspaceRef.current === targetWorkspaceId) {
        setSnapshot(result);
      }
    } finally {
      if (lastFetchedWorkspaceRef.current === targetWorkspaceId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    lastFetchedWorkspaceRef.current = workspaceId;
    if (!workspaceId) {
      setSnapshot(emptyWorkspacePermissionsSnapshot());
      setIsLoading(false);
      return;
    }
    void loadSnapshot(workspaceId);
  }, [workspaceId, loadSnapshot]);

  const refresh = useCallback(async () => {
    await loadSnapshot(workspaceId);
  }, [loadSnapshot, workspaceId]);

  const hasPermission = useCallback(
    (key: WorkspacePermissionKey) =>
      snapshot.isOwner || snapshot.permissions.has(key),
    [snapshot]
  );

  const value = useMemo<WorkspacePermissionsContextValue>(
    () => ({
      snapshot,
      isLoading,
      hasPermission,
      refresh
    }),
    [snapshot, isLoading, hasPermission, refresh]
  );

  return (
    <WorkspacePermissionsContext.Provider value={value}>
      {children}
    </WorkspacePermissionsContext.Provider>
  );
}

/**
 * Access the workspace permissions snapshot + helpers.
 *
 * Throws if called outside the provider so missing wiring surfaces
 * loudly in dev instead of silently granting no access.
 */
export function useWorkspacePermissions(): WorkspacePermissionsContextValue {
  const ctx = useContext(WorkspacePermissionsContext);
  if (ctx === null) {
    throw new Error(
      'useWorkspacePermissions must be used within a WorkspacePermissionsProvider'
    );
  }
  return ctx;
}

/**
 * Shorthand hook — returns ``true`` if the caller carries ``key`` on
 * the active workspace. Prefer this over inlining ``.snapshot.permissions.has(...)``
 * because it composes with owner short-circuit.
 */
export function useHasWorkspacePermission(
  key: WorkspacePermissionKey
): boolean {
  return useWorkspacePermissions().hasPermission(key);
}
