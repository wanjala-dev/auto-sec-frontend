import {
  hasStoredUserSession,
  normalizeStoredUserId,
  resolveStoredActiveSeedId,
  resolveStoredUserEmail
} from '../../../domain/auth/storedUserSelectors';
import { resolveStoredSummaryEmail } from '../../../domain/auth/storedSummarySelectors';
import { normalizeWorkspaceId as normalizeSeedId } from '../../../domain/workspace/workspaceId';

export const resolveViewerSessionSnapshot = (
  storedUser,
  storedSummary = null
) => {
  const sessionUser =
    storedUser && typeof storedUser === 'object' ? storedUser : null;
  const sessionSummary =
    storedSummary && typeof storedSummary === 'object' ? storedSummary : null;

  return {
    storedUser: sessionUser,
    storedSummary: sessionSummary,
    hasSession: hasStoredUserSession(sessionUser),
    viewerId: normalizeStoredUserId(sessionUser),
    viewerEmail:
      resolveStoredUserEmail(sessionUser) ||
      resolveStoredSummaryEmail(sessionSummary) ||
      null,
    // @deprecated New code MUST NOT consume this as the active
    // workspace — the workspace foundation rewrite (Track B) made
    // `useActiveWorkspace()` the single canonical reader. This field
    // remains only as a bootstrap hint for routes that haven't yet
    // chosen a workspace (e.g. /onboard, /home pre-redirect). Anywhere
    // a hook is available, use `useActiveWorkspace()` instead.
    storedActiveSeedId:
      normalizeSeedId(resolveStoredActiveSeedId(sessionUser)) || null
  };
};

export const doesViewerOwnSeed = (seedOwner, viewerId) => {
  const ownerId = normalizeStoredUserId(seedOwner);
  if (!ownerId || !viewerId) return false;
  return String(ownerId) === String(viewerId);
};

export const createViewerSessionKey = (viewerId, viewerEmail) => {
  if (!viewerId || !viewerEmail) return null;
  return `${viewerId}-${viewerEmail}`;
};
