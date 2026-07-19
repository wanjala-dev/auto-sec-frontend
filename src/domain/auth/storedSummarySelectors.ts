const normalizeRole = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLowerCase();
  return normalized || null;
};

const normalizeWorkspaceId = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized || null;
  }
  if (typeof value === 'object') {
    return normalizeWorkspaceId(
      value.id ??
        value.pk ??
        value.seed_id ??
        value.workspace_id ??
        value.workspaceId ??
        value.uuid
    );
  }
  return null;
};

export const resolveStoredMembershipRole = (
  summaryLike: any
): string | null => {
  if (!summaryLike || typeof summaryLike !== 'object') return null;

  const workspaceContext =
    summaryLike.workspace_context ||
    summaryLike.workspaceContext ||
    summaryLike.data?.workspace_context ||
    summaryLike.data?.workspaceContext ||
    null;

  // The backend ships the active workspace role under
  // ``workspace_context.active_workspace_role`` (see
  // ``components/identity/application/dto/user_context_dto.py``
  // ``WorkspaceContextDto.active_workspace_role``). Earlier iterations of
  // this selector only knew about ``active_membership_role`` and friends —
  // none of which the backend ever sets — which is why the
  // PaymentMathodsTab "Admin access required" gate locked out admin
  // personas even when the role was correctly populated server-side.
  return normalizeRole(
    workspaceContext?.active_workspace_role ||
      workspaceContext?.activeWorkspaceRole ||
      workspaceContext?.active_membership_role ||
      workspaceContext?.activeMembershipRole ||
      workspaceContext?.membership_role ||
      workspaceContext?.membershipRole ||
      summaryLike.active_workspace_role ||
      summaryLike.activeWorkspaceRole ||
      summaryLike.active_membership_role ||
      summaryLike.activeMembershipRole ||
      summaryLike.membership_role ||
      summaryLike.membershipRole
  );
};

export const resolveStoredSummaryWorkspaceId = (
  summaryLike: any
): string | null => {
  if (!summaryLike || typeof summaryLike !== 'object') return null;

  const workspaceContext =
    summaryLike.workspace_context ||
    summaryLike.workspaceContext ||
    summaryLike.data?.workspace_context ||
    summaryLike.data?.workspaceContext ||
    null;

  return normalizeWorkspaceId(
    workspaceContext?.active_workspace_id ||
      workspaceContext?.activeWorkspaceId ||
      workspaceContext?.workspace_id ||
      workspaceContext?.workspaceId ||
      summaryLike.active_workspace_id ||
      summaryLike.activeWorkspaceId
  );
};

/**
 * Resolve the active workspace's default currency from the stored
 * user summary. Looks in the same places the workspace id is read
 * from and falls back through:
 *
 *  1. workspace_context.active_workspace.default_currency
 *  2. workspace_context.default_currency (flat)
 *  3. the matching entry in summary.workspaces[]
 *
 * Returns an uppercase ISO 4217 code, or ``null`` when the summary
 * doesn't carry one yet (e.g. pre-login or an older payload the
 * backend hasn't re-issued).
 */
export const resolveStoredSummaryWorkspaceCurrency = (
  summaryLike: any
): string | null => {
  if (!summaryLike || typeof summaryLike !== 'object') return null;

  const workspaceContext =
    summaryLike.workspace_context ||
    summaryLike.workspaceContext ||
    summaryLike.data?.workspace_context ||
    summaryLike.data?.workspaceContext ||
    null;

  const activeWorkspace =
    workspaceContext?.active_workspace ||
    workspaceContext?.activeWorkspace ||
    null;

  const fromContext =
    activeWorkspace?.default_currency ||
    activeWorkspace?.defaultCurrency ||
    workspaceContext?.default_currency ||
    workspaceContext?.defaultCurrency ||
    null;

  if (typeof fromContext === 'string' && fromContext.trim()) {
    return fromContext.trim().toUpperCase();
  }

  const activeId = resolveStoredSummaryWorkspaceId(summaryLike);
  const workspaces =
    (Array.isArray(summaryLike.workspaces) && summaryLike.workspaces) ||
    (Array.isArray(summaryLike.data?.workspaces) &&
      summaryLike.data.workspaces) ||
    (Array.isArray(workspaceContext?.workspaces) &&
      workspaceContext.workspaces) ||
    [];
  if (activeId && workspaces.length) {
    const match = workspaces.find((entry: any) => {
      const id = normalizeWorkspaceId(
        entry?.id ?? entry?.pk ?? entry?.uuid ?? entry?.workspace_id
      );
      return id && String(id) === String(activeId);
    });
    const fromWorkspaceEntry =
      match?.default_currency || match?.defaultCurrency || null;
    if (typeof fromWorkspaceEntry === 'string' && fromWorkspaceEntry.trim()) {
      return fromWorkspaceEntry.trim().toUpperCase();
    }
  }

  return null;
};

/**
 * Resolve the active workspace's display NAME from the stored user summary.
 * The backend ships it on the user summary's ``active_workspace`` dict
 * (``{id, workspace_name, icon}`` — see CustomUserSummarySerializer), NOT in
 * ``workspace_context`` (which only carries id/kind/role). Falls back through
 * the flat summary fields and the matching ``workspaces[]`` entry. Returns
 * ``null`` when the summary doesn't carry a name yet.
 */
export const resolveStoredSummaryWorkspaceName = (
  summaryLike: any
): string | null => {
  if (!summaryLike || typeof summaryLike !== 'object') return null;

  const pick = (ws: any): string | null => {
    if (!ws || typeof ws !== 'object') return null;
    const raw = ws.workspace_name || ws.workspaceName || ws.name || null;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  };

  const activeWorkspace =
    summaryLike.active_workspace ||
    summaryLike.activeWorkspace ||
    summaryLike.data?.active_workspace ||
    summaryLike.data?.activeWorkspace ||
    null;
  const fromActive = pick(activeWorkspace);
  if (fromActive) return fromActive;

  const activeId = resolveStoredSummaryWorkspaceId(summaryLike);
  const workspaceContext =
    summaryLike.workspace_context ||
    summaryLike.workspaceContext ||
    summaryLike.data?.workspace_context ||
    summaryLike.data?.workspaceContext ||
    null;
  const workspaces =
    (Array.isArray(summaryLike.workspaces) && summaryLike.workspaces) ||
    (Array.isArray(summaryLike.data?.workspaces) &&
      summaryLike.data.workspaces) ||
    (Array.isArray(workspaceContext?.workspaces) &&
      workspaceContext.workspaces) ||
    [];
  if (activeId && workspaces.length) {
    const match = workspaces.find((entry: any) => {
      const id = normalizeWorkspaceId(
        entry?.id ?? entry?.pk ?? entry?.uuid ?? entry?.workspace_id
      );
      return id && String(id) === String(activeId);
    });
    const fromEntry = pick(match);
    if (fromEntry) return fromEntry;
  }

  return null;
};

/**
 * Resolve a user's relationship to a specific workspace from the
 * stored user summary — ``'member'`` if they're an owner / team
 * member / have an active ``WorkspaceMembership``, ``'follower'`` if
 * they only follow it. Returns ``null`` when the summary doesn't
 * carry the field yet (pre-fix payload, no match, etc.) so callers
 * can default to the legacy "treat as member" behaviour.
 *
 * Mirrors ``resolveStoredSummaryWorkspaceCurrency``'s fallback chain
 * for finding the matching workspace entry — the source of truth is
 * the same ``workspaces[]`` array.
 */
export const resolveStoredSummaryWorkspaceRelationship = (
  summaryLike: any,
  workspaceId: string | number | null | undefined
): 'member' | 'follower' | null => {
  if (!summaryLike || typeof summaryLike !== 'object') return null;
  const targetId = normalizeWorkspaceId(workspaceId);
  if (!targetId) return null;

  const workspaceContext =
    summaryLike.workspace_context ||
    summaryLike.workspaceContext ||
    summaryLike.data?.workspace_context ||
    summaryLike.data?.workspaceContext ||
    null;

  const workspaces =
    (Array.isArray(summaryLike.workspaces) && summaryLike.workspaces) ||
    (Array.isArray(summaryLike.data?.workspaces) &&
      summaryLike.data.workspaces) ||
    (Array.isArray(workspaceContext?.workspaces) &&
      workspaceContext.workspaces) ||
    [];

  const match = workspaces.find((entry: any) => {
    const id = normalizeWorkspaceId(
      entry?.id ?? entry?.pk ?? entry?.uuid ?? entry?.workspace_id
    );
    return id && String(id) === String(targetId);
  });

  const value = match?.relationship;
  if (value === 'member' || value === 'follower') return value;
  return null;
};

/**
 * Returns true if the user has an active ``SupportImpersonationSession``
 * targeting the given workspace. The session is the persona switcher's
 * "preview as a different role on this workspace" mechanism — it grants
 * a synthetic ``WorkspaceMembership`` for ~30 minutes so the user can
 * see the dashboard / sidebar exactly as the impersonated persona would.
 *
 * Routing checks need this so that previewing an admin view on a
 * follow-only workspace still loads the dashboard, instead of being
 * redirected to the public profile (the redirect would defeat the
 * whole point of the persona switcher).
 */
export const hasActiveImpersonationForWorkspace = (
  summaryLike: any,
  workspaceId: string | number | null | undefined
): boolean => {
  if (!summaryLike || typeof summaryLike !== 'object') return false;
  const targetId = normalizeWorkspaceId(workspaceId);
  if (!targetId) return false;

  const session =
    summaryLike.active_impersonation ||
    summaryLike.data?.active_impersonation ||
    null;
  if (!session || typeof session !== 'object') return false;

  const sessionWorkspaceId = normalizeWorkspaceId(
    session.target_workspace_id ?? session.workspace_id
  );
  return Boolean(sessionWorkspaceId && sessionWorkspaceId === targetId);
};

export const resolveStoredSummaryEmail = (summaryLike: any): string | null => {
  if (!summaryLike || typeof summaryLike !== 'object') return null;
  return (
    summaryLike.user?.email ||
    summaryLike.email ||
    summaryLike.data?.user?.email ||
    summaryLike.data?.email ||
    null
  );
};

export const canManageStoredWorkspacePermissions = (
  summaryLike: any
): boolean => {
  const role = resolveStoredMembershipRole(summaryLike);
  return role === 'owner' || role === 'admin';
};
