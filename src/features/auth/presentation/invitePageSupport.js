import { requestPasswordResetEmail } from '../../../application/auth/authFlowService';
import {
  clearPendingInvite,
  normalizeInviteCode,
  readPendingInvite,
  writePendingInvite
} from '../../team/application/pendingInviteService';
import {
  readBrowserOrigin,
  readBrowserSearch
} from '../../../features/navigation/presentation/browserNavigationSupport';
import {
  readViewerAccessToken,
  removeViewerPostLoginRedirect,
  writeViewerPostLoginRedirect
} from './browserAuthSessionSupport';

const buildQueryString = (params) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value);
    }
  });

  return searchParams.toString();
};

const parseJwtPayload = (token) => {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch (_) {
    return null;
  }
};

export const normalizeInviteCodeInput = (inviteCode) =>
  normalizeInviteCode(inviteCode);

export const hasValidStoredInviteAccessToken = () => {
  const accessToken = readViewerAccessToken();
  if (!accessToken) return false;

  const payload = parseJwtPayload(accessToken);
  if (!payload || !payload.exp) return true;

  return Date.now() < payload.exp * 1000;
};

export const persistPendingInviteRecord = ({
  code,
  email,
  teamId,
  seedId,
  teamName
}) => {
  const normalizedCode = normalizeInviteCode(code);
  if (!normalizedCode) return;

  const currentInvite = readPendingInvite();
  const currentCode = normalizeInviteCode(currentInvite?.code);
  const updates = {
    code: normalizedCode,
    email: email || undefined,
    teamId: teamId || undefined,
    seedId: seedId || undefined,
    teamName: teamName || undefined
  };

  if (currentCode && currentCode !== normalizedCode) {
    updates.acceptedPayload = null;
  }

  writePendingInvite(updates);
};

export const readInviteDetailsFromSearch = () => {
  const params = new URLSearchParams(readBrowserSearch());
  const code = params.get('code');
  if (!code) return null;

  return {
    code,
    email: params.get('email') || '',
    teamId: params.get('team') || '',
    seedId: params.get('seed') || '',
    teamName: params.get('team_name') || ''
  };
};

export const resolvePendingInviteDetails = () => {
  const storedInvite = readPendingInvite() || {};
  const inviteFromSearch = readInviteDetailsFromSearch();

  if (inviteFromSearch?.code) {
    const storedCode = normalizeInviteCode(storedInvite?.code);
    const searchCode = normalizeInviteCode(inviteFromSearch.code);
    const mergedInvite = { ...storedInvite, ...inviteFromSearch };

    if (storedCode && searchCode && storedCode !== searchCode) {
      delete mergedInvite.acceptedPayload;
    }

    return mergedInvite;
  }

  return Object.keys(storedInvite).length ? storedInvite : null;
};

export const persistAcceptedPendingInviteRecord = (invite, acceptedPayload) => {
  if (!invite?.code) return;

  persistPendingInviteRecord({
    code: invite.code,
    email: invite.email,
    teamId: invite.teamId,
    seedId: invite.seedId,
    teamName: invite.teamName
  });

  writePendingInvite({
    ...invite,
    code: normalizeInviteCode(invite.code),
    acceptedPayload
  });
};

export const buildInviteRedirectPath = (invite = {}) => {
  const normalizedCode = normalizeInviteCode(invite.code);
  if (!normalizedCode) return null;

  const params = new URLSearchParams();
  params.set('code', normalizedCode);
  if (invite.email) params.set('email', invite.email);
  if (invite.teamId) params.set('team', invite.teamId);
  if (invite.seedId) params.set('seed', invite.seedId);
  if (invite.teamName) params.set('team_name', invite.teamName);

  return `/identity/invite/accept?${params.toString()}`;
};

export const writeInvitePostLoginRedirect = (invite) => {
  const inviteRedirect = buildInviteRedirectPath(invite);
  if (inviteRedirect) {
    writeViewerPostLoginRedirect(inviteRedirect);
  }
  return inviteRedirect;
};

export const readStoredAcceptedInvitePayload = (code) => {
  const normalizedCode = normalizeInviteCode(code);
  if (!normalizedCode) return null;

  const storedInvite = readPendingInvite();
  const storedCode = normalizeInviteCode(storedInvite?.code);

  if (!storedCode || storedCode !== normalizedCode) {
    return null;
  }

  const acceptedPayload = storedInvite?.acceptedPayload;
  return acceptedPayload && Object.keys(acceptedPayload).length > 0
    ? acceptedPayload
    : null;
};

export const requestInvitePasswordSetupEmail = ({
  code,
  email,
  teamId,
  seedId,
  teamName
}) => {
  const redirectUrl = `${readBrowserOrigin()}/invite/accept?${buildQueryString({
    code: normalizeInviteCode(code),
    email,
    team: teamId,
    seed: seedId,
    team_name: teamName
  })}`;

  return requestPasswordResetEmail(email, redirectUrl);
};

export const clearPendingInviteRecord = () => clearPendingInvite();

export const clearInvitePostLoginRedirect = () =>
  removeViewerPostLoginRedirect();
