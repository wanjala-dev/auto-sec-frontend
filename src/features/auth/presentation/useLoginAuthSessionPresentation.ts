import { useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  fetchActiveWorkspaceIdForUser,
  fetchLoginUserSummary
} from '../../../application/auth/authSessionService';
import {
  loginWithCredentials,
  loginWithGoogleCredential,
  logoutWithRefreshToken,
  refreshAuthAccessToken,
  verifyOtpChallenge
} from '../../../application/auth/authFlowService';
import { acceptTeamInvitationCode } from '../../team/application/teamService';
import {
  getDashboardPath,
  resolveOnboardPath,
  resolveRequiresOrgOnboarding
} from '../../../constants/navigation';
import { replaceBrowserRoute } from '../../../features/navigation/presentation/browserNavigationSupport';
import { resolveBooleanFlag as resolveBoolean } from '../../../domain/auth/booleanFlags';
import { extractWorkspaceId as deriveSeedId } from '../../../domain/workspace/workspaceId';
import {
  clearPendingInviteRecord,
  normalizeInviteCodeInput,
  persistAcceptedPendingInviteRecord,
  resolvePendingInviteDetails,
  writeInvitePostLoginRedirect
} from './invitePageSupport';
import {
  clearViewerAuthSessionStorage,
  readViewerAccessToken,
  readViewerPostLoginRedirect,
  readViewerPreauthToken,
  readViewerRefreshToken,
  readViewerStoredUser,
  removeViewerAccessToken,
  removeViewerPostLoginRedirect,
  removeViewerPreauthToken,
  removeViewerRefreshToken,
  writeViewerAccessToken,
  writeViewerPreauthToken,
  writeViewerRefreshToken,
  writeViewerStoredUser,
  writeViewerStoredUserSummary
} from './browserAuthSessionSupport';

const normalizeOtpRequired = (value) => {
  const resolved = resolveBoolean(value);
  if (resolved !== null) return resolved === true;
  return value === true;
};

type LoginFlowOptions = {
  suppressToast?: boolean;
};

type VerifyOtpOptions = {
  token: string;
  method?: 'totp' | 'recovery';
};

export const useLoginAuthSessionPresentation = ({
  state,
  setLoading,
  resetAuthForm,
  notifySummaryUpdated,
  loginUrl,
  logoutUrl
}: {
  state: any;
  setLoading: (status: boolean, description: string) => void;
  resetAuthForm: () => void;
  notifySummaryUpdated?: ((summary: any) => void) | null;
  loginUrl: string;
  logoutUrl: string;
}) => {
  const refreshAccessToken = useCallback(async () => {
    const refreshToken = readViewerRefreshToken();
    if (!refreshToken) return false;
    try {
      const response = await refreshAuthAccessToken(refreshToken);
      if (response?.access) {
        writeViewerAccessToken(response.access);
        return true;
      }
    } catch (_) {}
    return false;
  }, []);

  const extractWorkspaceIdsFromSummary = useCallback((summaryPayload) => {
    if (!summaryPayload || typeof summaryPayload !== 'object') return [];

    const workspaceContext =
      summaryPayload?.workspace_context ||
      summaryPayload?.workspaceContext ||
      summaryPayload?.data?.workspace_context ||
      summaryPayload?.data?.workspaceContext ||
      null;

    const workspaces =
      summaryPayload?.workspaces ||
      summaryPayload?.data?.workspaces ||
      workspaceContext?.workspaces ||
      null;

    // A FOLLOWED (non-member) org must never become the active workspace:
    // every membership-gated call against it 403s, which floods the UI with
    // error toasts and bounces the dashboard to that org's public profile.
    // Followed orgs belong under "Following" — they are not "your" workspace.
    // The summary tags each entry relationship=member|follower; entries without
    // the tag are treated as members so this can't regress a payload variant
    // that omits it.
    const ids = new Set<string>();
    const followerIds = new Set<string>();

    if (Array.isArray(workspaces)) {
      workspaces.forEach((workspace) => {
        const candidate = deriveSeedId(workspace);
        if (!candidate) return;
        if (workspace?.relationship === 'follower') {
          followerIds.add(String(candidate));
          return;
        }
        ids.add(String(candidate));
      });
    }

    // The backend summary can report a FOLLOWED org as active_workspace_id
    // (it derives a default even when the user has no member-set active one).
    // Only honour it when it isn't a follower, so a followed org is never the
    // resolved/validated active workspace.
    const activeId = workspaceContext?.active_workspace_id;
    if (activeId && !followerIds.has(String(activeId))) {
      ids.add(String(activeId));
    }

    return Array.from(ids);
  }, []);

  const acceptInviteAfterLogin = useCallback(
    async (code) => {
      const normalizedCode = normalizeInviteCodeInput(code);
      if (!normalizedCode) return null;
      try {
        return await acceptTeamInvitationCode(normalizedCode);
      } catch (error) {
        const status = error?.response?.status;
        const errorCode = error?.response?.data?.code;
        if (errorCode === 'token_not_valid' && status !== 401) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            throw error;
          }
          return acceptTeamInvitationCode(normalizedCode);
        }
        throw error;
      }
    },
    [refreshAccessToken]
  );

  const completeLoginFlow = useCallback(
    async (
      responseData: Record<string, any> = {},
      options: LoginFlowOptions = {}
    ) => {
      resetAuthForm();

      let summaryPayload = null;
      const accessToken = readViewerAccessToken();
      if (accessToken) {
        try {
          summaryPayload = await fetchLoginUserSummary();
          if (summaryPayload) {
            writeViewerStoredUserSummary(summaryPayload);
            notifySummaryUpdated?.(summaryPayload);
          }
        } catch (_) {}
      }

      const summaryUser =
        summaryPayload?.user || summaryPayload?.data?.user || summaryPayload;

      const membershipCountRaw =
        responseData?.org_membership_count ??
        summaryPayload?.org_membership_count ??
        summaryUser?.org_membership_count;
      const membershipCount =
        membershipCountRaw !== undefined && membershipCountRaw !== null
          ? Number(membershipCountRaw)
          : null;
      const hasMembershipCount =
        membershipCountRaw !== undefined &&
        membershipCountRaw !== null &&
        Number.isFinite(membershipCount);
      const requiresOrgFlag = resolveBoolean(
        responseData?.requires_org_onboarding ??
          summaryPayload?.requires_org_onboarding ??
          summaryUser?.requires_org_onboarding
      );
      const requiresOrgOnboarding = resolveRequiresOrgOnboarding({
        requires_org_onboarding: requiresOrgFlag,
        org_membership_count: hasMembershipCount ? membershipCount : null
      });
      const orgAccessSeeds = Array.isArray(summaryPayload?.org_access_seeds)
        ? summaryPayload.org_access_seeds
        : Array.isArray(responseData?.org_access_seeds)
        ? responseData.org_access_seeds
        : [];

      const userId =
        responseData?.user_id ||
        summaryUser?.pk ||
        summaryUser?.id ||
        summaryUser?.user_id ||
        summaryUser?.userId ||
        summaryUser?.uuid ||
        responseData?.pk ||
        responseData?.id ||
        responseData?.uuid ||
        null;

      const availableWorkspaceIds =
        extractWorkspaceIdsFromSummary(summaryPayload);

      const storedWorkspaceId = (() => {
        try {
          const parsed = readViewerStoredUser();
          if (!parsed) return null;
          return (
            parsed?.active_workspace_id ||
            parsed?.default_workspace_id ||
            parsed?.active_seed_id ||
            null
          );
        } catch {
          return null;
        }
      })();

      const activeWorkspaceFromSummary = deriveSeedId(
        summaryPayload || summaryUser
      );
      let resolvedWorkspaceId =
        activeWorkspaceFromSummary ||
        (await fetchActiveWorkspaceIdForUser(userId));

      if (
        resolvedWorkspaceId &&
        availableWorkspaceIds.length > 0 &&
        !availableWorkspaceIds.includes(String(resolvedWorkspaceId))
      ) {
        resolvedWorkspaceId = null;
      }

      if (
        !resolvedWorkspaceId &&
        storedWorkspaceId &&
        availableWorkspaceIds.length > 0 &&
        availableWorkspaceIds.includes(String(storedWorkspaceId))
      ) {
        resolvedWorkspaceId = storedWorkspaceId;
      }

      if (!resolvedWorkspaceId && availableWorkspaceIds.length > 0) {
        resolvedWorkspaceId = availableWorkspaceIds[0];
      }

      const rawOnboardComplete =
        responseData?.is_onboard_complete ??
        summaryPayload?.is_onboard_complete ??
        summaryUser?.is_onboard_complete ??
        responseData?.data?.is_onboard_complete ??
        responseData?.data?.user?.is_onboard_complete;
      const resolvedOnboardComplete = resolveBoolean(rawOnboardComplete);
      const isOnboardComplete =
        resolvedOnboardComplete === null
          ? rawOnboardComplete === false
            ? false
            : rawOnboardComplete
          : resolvedOnboardComplete;

      const twoFactorEnabledRaw =
        responseData?.two_factor_enabled ??
        summaryPayload?.two_factor_enabled ??
        summaryUser?.two_factor_enabled;
      const twoFactorEnabled = resolveBoolean(twoFactorEnabledRaw);
      const twoFactorConfirmedAt =
        responseData?.two_factor_confirmed_at ??
        summaryPayload?.two_factor_confirmed_at ??
        summaryUser?.two_factor_confirmed_at ??
        null;

      const currentUser = {
        email: responseData?.email || summaryUser?.email,
        username: responseData?.username || summaryUser?.username,
        pk: userId,
        is_onboard_complete: isOnboardComplete,
        is_contributor:
          responseData?.is_contributor ??
          summaryUser?.is_contributor ??
          summaryPayload?.is_contributor,
        active_workspace_id: resolvedWorkspaceId || null,
        active_seed_id: resolvedWorkspaceId || null,
        requires_org_onboarding: requiresOrgOnboarding,
        org_membership_count: Number.isFinite(membershipCount)
          ? membershipCount
          : null,
        org_access_seeds: orgAccessSeeds,
        two_factor_enabled:
          twoFactorEnabled === null ? false : twoFactorEnabled,
        two_factor_confirmed_at: twoFactorConfirmedAt
      };

      writeViewerStoredUser(currentUser);

      const pendingInvite = resolvePendingInviteDetails();
      const pendingInviteCode = normalizeInviteCodeInput(pendingInvite?.code);
      if (pendingInviteCode) {
        const inviteDetails = {
          ...pendingInvite,
          code: pendingInviteCode
        };
        try {
          const inviteResponse = await acceptInviteAfterLogin(
            pendingInviteCode
          );
          const invitePayload =
            inviteResponse?.data?.data ?? inviteResponse?.data ?? {};
          persistAcceptedPendingInviteRecord(inviteDetails, invitePayload);
          writeInvitePostLoginRedirect(inviteDetails);
        } catch (inviteError) {
          const status = inviteError?.response?.status;
          const errorCode = inviteError?.response?.data?.code;
          const isAuthFailure =
            status === 401 || errorCode === 'token_not_valid';
          if (isAuthFailure) {
            clearPendingInviteRecord();
            removeViewerAccessToken();
            removeViewerRefreshToken();
            toast.error('Session expired, please log in again.', {
              icon: '⚠️'
            });
            replaceBrowserRoute('/identity/login');
            return { otpRequired: false };
          }
          clearPendingInviteRecord();
          toast.error(
            inviteError?.response?.data?.detail ||
              inviteError?.response?.data?.message ||
              inviteError?.message ||
              'Unable to accept invite. Please try again.'
          );
        }
      }

      if (!options?.suppressToast) {
        toast.success('Login successful!');
      }

      const pendingRedirect = readViewerPostLoginRedirect();
      const onboardDestination = resolveOnboardPath(currentUser);
      const needsProfileOnboarding = isOnboardComplete === false;
      const destination =
        requiresOrgOnboarding || needsProfileOnboarding
          ? onboardDestination
          : resolvedWorkspaceId
          ? getDashboardPath(resolvedWorkspaceId)
          : onboardDestination;

      if (pendingRedirect) {
        removeViewerPostLoginRedirect();
        if (
          (requiresOrgOnboarding || needsProfileOnboarding) &&
          pendingRedirect.includes('/dashboard')
        ) {
          replaceBrowserRoute(onboardDestination);
        } else {
          replaceBrowserRoute(pendingRedirect);
        }
        return { otpRequired: false };
      }

      replaceBrowserRoute(destination);
      return { otpRequired: false };
    },
    [
      acceptInviteAfterLogin,
      extractWorkspaceIdsFromSummary,
      notifySummaryUpdated,
      resetAuthForm
    ]
  );

  const clearOtpLogin = useCallback(() => {
    removeViewerPreauthToken();
  }, []);

  const verifyOtpLogin = useCallback(
    async ({ token, method = 'totp' }: VerifyOtpOptions) => {
      const preauthToken = readViewerPreauthToken();
      if (!preauthToken) {
        throw new Error('Missing pre-auth token. Please log in again.');
      }

      setLoading(true, 'Verifying code...');
      try {
        let payload;
        try {
          payload = await verifyOtpChallenge({
            token,
            method,
            preauthToken
          });
        } catch (error) {
          if (error?.response?.status === 429) {
            toast.error('Too many attempts. Try again later.');
            throw error;
          }
          toast.error(
            error?.response?.data?.detail ||
              error?.response?.data?.message ||
              error?.message ||
              'Unable to verify code. Please try again.'
          );
          throw error;
        }

        const data = payload?.data ?? payload ?? {};
        const tokensPayload = data?.tokens || {};
        if (!tokensPayload.access || !tokensPayload.refresh) {
          throw new Error('Unable to finalize login. Please try again.');
        }

        writeViewerAccessToken(tokensPayload.access);
        writeViewerRefreshToken(tokensPayload.refresh);
        removeViewerPreauthToken();

        await completeLoginFlow(data, { suppressToast: true });
        return { otpRequired: false };
      } finally {
        setLoading(false, '');
      }
    },
    [completeLoginFlow, setLoading]
  );

  const login = useCallback(async () => {
    try {
      const responseData = await loginWithCredentials({
        url: `${loginUrl}?response=minimal`,
        email: state.email,
        password: state.password
      });
      const tokensPayload =
        responseData?.tokens || responseData?.data?.tokens || {};
      const otpRequired = normalizeOtpRequired(
        responseData?.otp_required ?? responseData?.data?.otp_required
      );
      const preauthToken =
        responseData?.preauth_token ||
        responseData?.data?.preauth_token ||
        responseData?.preauthToken ||
        null;

      if (otpRequired || (preauthToken && !tokensPayload?.access)) {
        setLoading(false, '');
        removeViewerAccessToken();
        removeViewerRefreshToken();
        if (preauthToken) {
          writeViewerPreauthToken(preauthToken);
        }
        toast.info('Enter your authentication code to continue.', {
          icon: '🔐'
        });
        return { otpRequired: true };
      }

      const accessToken =
        tokensPayload.access ||
        responseData?.data?.token ||
        responseData?.token;
      const refreshToken =
        tokensPayload.refresh ||
        responseData?.data?.refresh ||
        responseData?.refresh;
      if (accessToken) {
        writeViewerAccessToken(accessToken);
      }
      if (refreshToken) {
        writeViewerRefreshToken(refreshToken);
      }

      if (!accessToken || !refreshToken) {
        throw new Error('Unable to login. Please try again.');
      }

      await completeLoginFlow(responseData);
      return { otpRequired: false };
    } catch (error) {
      setLoading(false, '');
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Unable to login. Please try again.';

      const normalized = (errorMessage || '').toLowerCase();
      const isInvalidCredentials =
        (error.response?.status === 401 || error.response?.status === 400) &&
        normalized.includes('invalid credential');

      if (isInvalidCredentials) {
        toast.warning(errorMessage, { icon: '⚠️' });
      } else {
        toast.error(errorMessage);
      }
      return;
    }
  }, [completeLoginFlow, loginUrl, setLoading, state.email, state.password]);

  // Google sign-in: exchange the GIS credential (a signed ID token) for a
  // platform JWT session, then hand off to the exact same post-login flow as
  // email/password — including the new-signup → org-onboarding routing.
  const loginWithGoogle = useCallback(
    async (credential) => {
      if (!credential) return;
      setLoading(true, 'Signing in with Google...');
      try {
        const responseData = await loginWithGoogleCredential(credential);
        const tokensPayload =
          responseData?.tokens || responseData?.data?.tokens || {};
        const accessToken =
          tokensPayload.access ||
          responseData?.data?.token ||
          responseData?.token;
        const refreshToken =
          tokensPayload.refresh ||
          responseData?.data?.refresh ||
          responseData?.refresh;

        if (accessToken) {
          writeViewerAccessToken(accessToken);
        }
        if (refreshToken) {
          writeViewerRefreshToken(refreshToken);
        }
        if (!accessToken || !refreshToken) {
          throw new Error('Unable to sign in with Google. Please try again.');
        }

        await completeLoginFlow(responseData);
        return { otpRequired: false };
      } catch (error) {
        setLoading(false, '');
        removeViewerAccessToken();
        removeViewerRefreshToken();
        const errorMessage =
          error.response?.data?.error ||
          error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          'Unable to sign in with Google. Please try again.';
        toast.error(errorMessage);
        return;
      }
    },
    [completeLoginFlow, setLoading]
  );

  const logout = useCallback(async () => {
    const token_refresh = readViewerRefreshToken();
    // Best-effort server-side revocation. We deliberately do not await its
    // success before clearing local state — logout is a declaration of
    // intent and must succeed for the user even when the backend is slow,
    // unreachable, or rejects the (possibly already-expired) refresh token.
    try {
      if (token_refresh) {
        await logoutWithRefreshToken(logoutUrl, token_refresh);
      }
    } catch (error) {
      // Surfaced for observability only; never block the user on this.
      console.warn(
        'Logout API call failed; proceeding with local sign-out.',
        error
      );
    } finally {
      setLoading(false, '');
      clearViewerAuthSessionStorage();
      toast.success('You have been logged out.');
      replaceBrowserRoute('/identity/login');
    }
  }, [logoutUrl, setLoading]);

  return {
    login,
    loginWithGoogle,
    verifyOtpLogin,
    clearOtpLogin,
    logout
  };
};
