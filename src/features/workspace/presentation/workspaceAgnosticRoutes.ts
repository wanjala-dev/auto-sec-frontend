// Single source of truth for "this route does not carry the viewer's
// active workspace in URL." Used by useActiveWorkspace, Layout, and
// Sidebar so all three readers agree on which URLs are workspace-
// scoped vs workspace-agnostic.
//
// Why this matters: routes like /profile/:pk (a user UUID) and /sponsor
// (?seed_id=<donee-workspace>) put workspace-SHAPED values in URL slots
// that mean something else. If any reader infers an active workspace
// from those, the sidebar chrome flips — to the user's own UUID, to a
// stranger's workspace, or to "Private/personal" when the inferred id
// matches none of the viewer's workspaces — and downstream
// getSeed(<bad id>) 404s as "Workspace not found".
//
// Add a prefix here when introducing a workspace-agnostic route. Do
// NOT add workspace-scoped routes — those declare their workspace via
// a named route param (:workspaceId, :seed_id, :seedId, :seed, :id),
// which the readers honour BEFORE consulting this list.

const WORKSPACE_AGNOSTIC_PATH_PREFIXES = [
  '/profile/',
  '/profile',
  '/user/',
  '/sponsor', // covers /sponsor and /sponsor/projects/<seedId>
  '/auth/',
  '/identity/',
  '/onboard',
  '/welcome',
  '/u/',
  '/c/'
];

export const isWorkspaceAgnosticPath = (pathname: string): boolean =>
  WORKSPACE_AGNOSTIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
