import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { normalizeWorkspaceId } from '../../../domain/workspace/workspaceId';
import { isWorkspaceAgnosticPath } from './workspaceAgnosticRoutes';

// Canonical "which workspace am I on" hook. URL is the only input — no
// Context, no localStorage, no props. Every page (Sidebar, dashboards,
// pickers) should read from this so they agree on the active workspace.
//
// The legacy codebase resolves activeSeedId from ~5 different sources in
// ~5 different sites (Sidebar.jsx, useActivePersona.js, SeedInfo.jsx,
// Layout.jsx, useViewerSession). Those drift on workspace switch. This
// hook replaces them; per the foundation plan (Track B step B1), as
// existing call sites migrate they all collapse to this single reader.
//
// Source enum lets call sites instrument *which* URL surface the id came
// from. The order below matches every workspace-scoped route's param
// spelling in `src/features/routing/presentation/routes.tsx` plus the
// query-string variants used by ?seedId= / ?seed_id= / ?seed= routes
// (e.g. /teams/directories, /marketplace), with a last-UUID-in-pathname
// fallback for routes that don't carry the workspace id in a named param
// (matches `useActivePersona.js#resolveSeedIdFromLocation`).

export type ActiveWorkspaceSource =
  | 'route-workspace-id'
  | 'route-id'
  | 'route-seed-id'
  | 'route-seed-id-camel'
  | 'route-seed'
  | 'query-seed-id-camel'
  | 'query-seed-id'
  | 'query-seed'
  | 'path-uuid'
  | 'none';

export type ActiveWorkspace = {
  workspaceId: string | null;
  source: ActiveWorkspaceSource;
};

const PATH_UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// The list of workspace-agnostic prefixes is shared with Layout.jsx
// and Sidebar.jsx via workspaceAgnosticRoutes.ts so all three readers
// agree on which URLs are workspace-scoped vs not.

type ParamCandidate = readonly [ActiveWorkspaceSource, string | undefined];

const firstNormalized = (
  candidates: ParamCandidate[]
): ActiveWorkspace | null => {
  for (const [source, value] of candidates) {
    const normalized = normalizeWorkspaceId(value);
    if (normalized) {
      return { workspaceId: normalized, source };
    }
  }
  return null;
};

export const useActiveWorkspace = (): ActiveWorkspace => {
  const params = useParams();
  const location = useLocation();

  return useMemo(() => {
    // Named route params remain authoritative — workspace-scoped routes
    // always declare them explicitly. This bypass survives even when the
    // top-level path is in the agnostic list (e.g. /sponsor/projects/
    // :seedId, where :seedId IS the active workspace on a dedicated
    // sponsor projects page).
    const fromParams = firstNormalized([
      ['route-workspace-id', params.workspaceId],
      ['route-id', params.id],
      ['route-seed-id', params.seed_id],
      ['route-seed-id-camel', params.seedId],
      ['route-seed', params.seed]
    ]);
    if (fromParams) return fromParams;

    // Workspace-agnostic prefixes (e.g. /profile/:pk, /sponsor): refuse
    // to infer a workspace from query string or path UUID. Both are
    // workspace-shaped in this codebase but semantically point at
    // something else here — :pk is a user UUID, ?seed_id= is the
    // donee's workspace on /sponsor. Inferring either as the active
    // workspace flipped the sidebar chrome to a stranger / personal
    // and silently produced "Workspace not found" toasts.
    const pathname = location.pathname || '';
    if (isWorkspaceAgnosticPath(pathname)) {
      return { workspaceId: null, source: 'none' };
    }

    if (location.search) {
      try {
        const query = new URLSearchParams(location.search);
        const fromQuery = firstNormalized([
          ['query-seed-id-camel', query.get('seedId') ?? undefined],
          ['query-seed-id', query.get('seed_id') ?? undefined],
          ['query-seed', query.get('seed') ?? undefined]
        ]);
        if (fromQuery) return fromQuery;
      } catch {
        // Malformed search string — fall through.
      }
    }

    const uuids = pathname.match(PATH_UUID_PATTERN);
    if (uuids && uuids.length) {
      // Last UUID wins. Workspace-scoped routes that nest other ids
      // (e.g. /teams/:team_id/:seed_id) put the workspace id last.
      const last = uuids[uuids.length - 1];
      const normalized = normalizeWorkspaceId(last);
      if (normalized) {
        return { workspaceId: normalized, source: 'path-uuid' };
      }
    }

    return { workspaceId: null, source: 'none' };
  }, [
    params.workspaceId,
    params.id,
    params.seed_id,
    params.seedId,
    params.seed,
    location.pathname,
    location.search
  ]);
};
