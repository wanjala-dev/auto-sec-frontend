import { useEffect, useMemo, useState } from 'react';

import { readStoredUserSummary } from '../../../infrastructure/session/browserAuthStore';
import { useActiveWorkspace } from './useActiveWorkspace';

// Canonical "what is the active workspace's metadata" reader.
//
// URL via useActiveWorkspace() picks the active workspace id; this hook
// looks up the matching workspace in the cached me/summary response and
// returns its name + workspace_type. Use this whenever a component
// needs to display the workspace name — dashboards, page headers,
// chips, anywhere "what workspace am I on" surfaces in copy.
//
// Why not just read `state.seed.workspace_name`? The Redux `state.seed`
// can lag behind the URL on workspace switch (and can be polluted with
// team metadata by older code paths), which is exactly the drift class
// useActiveWorkspace was created to eliminate. The Sidebar already
// resolves headerTitle this way; this hook formalises the pattern so
// dashboards and other surfaces can do the same in one line.
//
// Returns null fields when the user is not on a workspace-scoped route
// (workspaceId === null) or when the cached summary hasn't loaded yet.

type CachedWorkspace = {
  id?: string | number | null;
  name?: string | null;
  workspace_name?: string | null;
  seed_name?: string | null;
  title?: string | null;
  display_name?: string | null;
  organization_name?: string | null;
  workspace_type?: string | null;
};

type CachedSummary = {
  workspaces?: CachedWorkspace[];
  data?: { workspaces?: CachedWorkspace[] };
};

export type ActiveWorkspaceSummary = {
  workspaceId: string | null;
  name: string | null;
  workspaceType: string | null;
  isLoading: boolean;
};

const SUMMARY_UPDATED_EVENT = 'user-summary-updated';

const readWorkspaces = (summary: CachedSummary | null): CachedWorkspace[] => {
  if (!summary) return [];
  return summary?.data?.workspaces || summary?.workspaces || [];
};

const resolveName = (workspace: CachedWorkspace | null): string | null => {
  if (!workspace) return null;
  return (
    workspace.workspace_name ||
    workspace.name ||
    workspace.seed_name ||
    workspace.title ||
    workspace.display_name ||
    workspace.organization_name ||
    null
  );
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

export const useActiveWorkspaceSummary = (): ActiveWorkspaceSummary => {
  const { workspaceId } = useActiveWorkspace();
  const revision = useSummaryRevision();

  return useMemo(() => {
    if (!workspaceId) {
      return {
        workspaceId: null,
        name: null,
        workspaceType: null,
        isLoading: false
      };
    }

    const summary = readStoredUserSummary() as CachedSummary | null;
    if (!summary) {
      return {
        workspaceId,
        name: null,
        workspaceType: null,
        isLoading: true
      };
    }

    const match =
      readWorkspaces(summary).find(
        (ws) => String(ws?.id) === String(workspaceId)
      ) || null;

    return {
      workspaceId,
      name: resolveName(match),
      workspaceType: match?.workspace_type || null,
      isLoading: false
    };
    // revision is consumed implicitly by re-running this memo when the
    // cached summary changes via storage/event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, revision]);
};
