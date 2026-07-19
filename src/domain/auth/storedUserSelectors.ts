export const normalizeStoredUserId = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === 'object') {
    return normalizeStoredUserId(
      value.pk ??
        value.id ??
        value.user_id ??
        value.userId ??
        value.uuid ??
        value.user?.pk ??
        value.user?.id ??
        value.user?.user_id ??
        value.user?.userId ??
        value.user?.uuid
    );
  }
  return null;
};

export const resolveStoredUsername = (userLike: any): string | null => {
  if (!userLike || typeof userLike !== 'object') return null;
  return (
    userLike.username ||
    userLike.user?.username ||
    userLike.email ||
    userLike.user?.email ||
    null
  );
};

export const resolveStoredUserEmail = (userLike: any): string | null => {
  if (!userLike || typeof userLike !== 'object') return null;
  return userLike.email || userLike.user?.email || null;
};

export const resolveStoredUserDisplayLabel = (userLike: any): string | null => {
  if (!userLike || typeof userLike !== 'object') return null;

  const fullName =
    userLike.full_name ||
    userLike.fullName ||
    userLike.name ||
    [userLike.first_name, userLike.last_name].filter(Boolean).join(' ').trim();

  return (
    fullName ||
    resolveStoredUsername(userLike) ||
    resolveStoredUserEmail(userLike)
  );
};

export const resolveStoredUserPhotoUrl = (userLike: any): string | null => {
  if (!userLike || typeof userLike !== 'object') return null;
  return (
    userLike.profile?.photo_url ||
    userLike.photo_url ||
    userLike.profile?.avatar_url ||
    userLike.avatar_url ||
    userLike.user?.profile?.photo_url ||
    null
  );
};

export const resolveStoredUserFirstName = (userLike: any): string | null => {
  if (!userLike || typeof userLike !== 'object') return null;
  const first = String(userLike.first_name || '').trim();
  if (first) return first;
  // Fall back to the first word of the display label so a single
  // ``full_name`` field ("Mary Wanjiku") still yields a useful
  // first-name caption.
  const label = resolveStoredUserDisplayLabel(userLike);
  if (!label) return null;
  const parts = String(label).trim().split(/\s+/).filter(Boolean);
  return parts[0] || null;
};

export const resolveStoredUserInitials = (userLike: any): string => {
  // Two-letter initials from first + last name when available, single
  // letter from a one-word display label, '?' when nothing is known.
  // Mirrors the resolution chain used by ``resolveStoredUserDisplayLabel``
  // so the bubble's photo-fallback letters match the user's actual name,
  // not a generic placeholder like 'A'.
  if (!userLike || typeof userLike !== 'object') return '?';

  const first = String(userLike.first_name || '').trim();
  const last = String(userLike.last_name || '').trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();

  const label = resolveStoredUserDisplayLabel(userLike);
  if (!label) return '?';

  const parts = String(label).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return '?';
};

export const resolveStoredActiveSeedId = (userLike: any): string | null => {
  if (!userLike || typeof userLike !== 'object') return null;

  const candidates = [
    userLike.active_workspace_id,
    userLike.activeWorkspaceId,
    userLike.default_workspace_id,
    userLike.defaultWorkspaceId,
    userLike.active_seed_id,
    userLike.activeSeedId,
    userLike.active_seed,
    userLike.activeSeed,
    userLike.profile?.active_workspace_id,
    userLike.profile?.active_seed_id,
    userLike.profile?.active_seed,
    userLike.user?.profile?.active_workspace_id,
    userLike.user?.profile?.active_seed_id,
    userLike.user?.profile?.active_seed,
    userLike.user?.active_workspace_id,
    userLike.user?.active_seed_id,
    userLike.user?.active_seed
  ];

  for (const candidate of candidates) {
    const normalized = normalizeStoredUserId(candidate);
    if (normalized) return normalized;
  }

  return null;
};

export const hasStoredUserSession = (userLike: any): boolean =>
  Boolean(normalizeStoredUserId(userLike) || resolveStoredUsername(userLike));
