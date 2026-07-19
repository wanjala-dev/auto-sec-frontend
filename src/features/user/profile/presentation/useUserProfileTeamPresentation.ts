import { useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  extractWorkspaceId as deriveSeedId,
  normalizeWorkspaceId as normalizeSeedId
} from '../../../../domain/workspace/workspaceId';
import {
  readStoredUserSession as readStoredUser,
  updateStoredUserSession as updateStoredUser
} from '../../../../application/auth/storedUserService';
import {
  readViewerStoredUserSummary,
  writeViewerStoredUserSummary
} from '../../../../features/auth/presentation/browserAuthSessionSupport';
import { deriveTeamId, normalizeTeamId } from '../../../team/domain/teamId';
import {
  acceptTeamInvitation,
  acceptTeamInvitationCode,
  inviteTeamMembers,
  listTeamInvitations
} from '../../../team/application/teamService';
import {
  activateUserTeam,
  activateUserWorkspace,
  createUserTeam,
  updateUserProfileById
} from '../../../../application/userProfile/userProfileService';
import {
  INVITATION_ERROR,
  INVITATION_LOADING,
  INVITATION_SUCCESS,
  USER_ACCEPT_INVITATION,
  USER_CREATE_TEAM,
  USER_ERROR,
  USER_INVITATIOINS,
  USER_INVITE,
  USER_LOADING,
  USER_PROFILE_UPDATE,
  USER_PROFILE_UPDATE_ERROR,
  USER_PROFILE_UPDATE_LOADING,
  USER_PROFILE_UPDATE_SUCCESS,
  USER_SUCCESS
} from '../../../../types/userProfileTypes';

const buildLegacyErrorToast = (addToast, error) => {
  if (typeof addToast !== 'function') return;
  if (error?.response === undefined) {
    addToast({
      message: 'Unknown Error',
      error: true
    });
  } else if (error.response.status === 500 || error.response.status === 404) {
    addToast({ message: 'Server Error!', error: true });
  } else if (error.response.status === 400) {
    if (error.response.data.amount) {
      addToast({
        message: 'Amount: ' + error.response.data.amount,
        error: true
      });
    } else if (error.response.data.budget) {
      addToast({
        message: 'Budget: ' + error.response.data.budget,
        error: true
      });
    } else {
      addToast({
        message: 'Category: ' + error.response.data.category,
        error: true
      });
    }
  } else {
    addToast({ message: 'Server Error!', error: true });
  }
};

export const useUserProfileTeamPresentation = ({
  dispatch,
  addToast,
  fetchEvaluatedFlags,
  notifySummaryUpdated,
  userCacheRef,
  stateUser,
  normalizeUserId,
  resolveSeedIdFromPayload
}: {
  dispatch: any;
  addToast?: ((payload: { message: string; error: boolean }) => void) | null;
  fetchEvaluatedFlags?:
    | ((options?: Record<string, unknown>) => Promise<any>)
    | null;
  notifySummaryUpdated?: ((summary: any) => void) | null;
  userCacheRef: any;
  stateUser: any;
  normalizeUserId: (value: any) => string | null;
  resolveSeedIdFromPayload: (payload: any) => string | null;
}) => {
  type InviteOptions = {
    suppressToast?: boolean;
  };

  type ActivateTeamOptions = {
    suppressToast?: boolean;
    seedPayload?: any;
    seedId?: string | number | null;
  };

  const createTeam = useCallback(
    async (data) => {
      dispatch({ type: USER_LOADING });

      try {
        const createdTeam = await createUserTeam(data);

        dispatch({ type: USER_SUCCESS });
        dispatch({ type: USER_CREATE_TEAM, payload: createdTeam });
        toast.success('Team has been added!', { icon: '✅' });

        return createdTeam;
      } catch (error) {
        dispatch({ type: USER_ERROR });
      }
    },
    [dispatch]
  );

  const inviteUser = useCallback(
    async (data) => {
      dispatch({
        type: USER_LOADING
      });
      try {
        const inviteResult = await inviteTeamMembers(data);
        dispatch({
          type: USER_SUCCESS
        });
        dispatch({
          type: USER_INVITE,
          payload: inviteResult
        });
        const inviteResults = inviteResult?.results;
        const addedCount = Array.isArray(inviteResults?.added)
          ? inviteResults.added.length
          : 0;
        const skippedCount = Array.isArray(inviteResults?.skipped)
          ? inviteResults.skipped.length
          : 0;
        const missingCount = Array.isArray(inviteResults?.missing)
          ? inviteResults.missing.length
          : 0;
        const detailParts = [];
        if (addedCount) detailParts.push(`added ${addedCount}`);
        if (skippedCount) detailParts.push(`skipped ${skippedCount}`);
        if (missingCount) detailParts.push(`missing ${missingCount}`);
        const summarySuffix = detailParts.length
          ? ` (${detailParts.join(', ')})`
          : '';
        let successMessage = inviteResult?.message;
        if (inviteResults) {
          successMessage = successMessage || 'Invites processed.';
          successMessage = `${successMessage}${summarySuffix}`;
        } else if (!successMessage) {
          successMessage = 'Success user Invited!';
        }
        addToast?.({ message: successMessage, error: false });
        return inviteResult;
      } catch (error) {
        dispatch({
          type: USER_ERROR
        });
        buildLegacyErrorToast(addToast, error);
      }
    },
    [addToast, dispatch]
  );

  const getInvitations = useCallback(
    async (data) => {
      dispatch({
        type: USER_LOADING
      });
      try {
        const storedUser = readStoredUser() || {};
        const workspaceId =
          normalizeSeedId(data?.workspace_id || data?.seed_id || data?.seed) ||
          normalizeSeedId(deriveSeedId(storedUser)) ||
          null;

        if (!workspaceId) {
          dispatch({ type: USER_SUCCESS });
          dispatch({ type: USER_INVITATIOINS, payload: [] });
          return { results: [], count: 0, next: null, previous: null };
        }

        const res = await listTeamInvitations(workspaceId);
        dispatch({
          type: USER_SUCCESS
        });
        dispatch({
          type: USER_INVITATIOINS,
          payload: Array.isArray(res?.results) ? res.results : []
        });
        return res;
      } catch (error) {
        dispatch({
          type: USER_ERROR
        });
        buildLegacyErrorToast(addToast, error);
      }
    },
    [addToast, dispatch]
  );

  const acceptInvitation = useCallback(
    async (data) => {
      dispatch({
        type: INVITATION_LOADING
      });
      try {
        const res = await acceptTeamInvitation(data);
        dispatch({
          type: INVITATION_SUCCESS
        });
        dispatch({
          type: USER_ACCEPT_INVITATION,
          payload: res.data
        });
        addToast?.({ message: 'Success user Invited!', error: false });
        return res;
      } catch (error) {
        dispatch({
          type: INVITATION_ERROR
        });
        buildLegacyErrorToast(addToast, error);
      }
    },
    [addToast, dispatch]
  );

  const acceptInviteCode = useCallback(
    async (code, options: InviteOptions = {}) => {
      const normalizedCode =
        typeof code === 'string' ? code.trim() : String(code || '').trim();
      if (!normalizedCode) {
        throw new Error('Invite code is required.');
      }

      dispatch({ type: INVITATION_LOADING });
      try {
        const res = await acceptTeamInvitationCode(normalizedCode);
        dispatch({ type: INVITATION_SUCCESS });
        dispatch({ type: USER_ACCEPT_INVITATION, payload: res.data });
        return res;
      } catch (error) {
        dispatch({ type: INVITATION_ERROR });
        if (!options?.suppressToast) {
          addToast?.({
            message:
              error?.response?.data?.detail ||
              error?.response?.data?.message ||
              error?.message ||
              'Unable to accept invite code.',
            error: true
          });
        }
        throw error;
      }
    },
    [addToast, dispatch]
  );

  // Shared post-activation side effects for activateTeam + activateWorkspace.
  // The backend returns the same Team payload shape from both endpoints,
  // so only the activation call itself differs — everything that follows
  // (profile update, localStorage writes, summary refresh, feature flag
  // refetch) is identical.
  const applyActivationSideEffects = useCallback(
    async (
      activationData: any,
      options: ActivateTeamOptions & { fallbackTeamId?: any } = {}
    ) => {
      dispatch({ type: USER_PROFILE_UPDATE_SUCCESS });

      const payload = activationData?.data ?? activationData ?? {};
      const fallbackSeedId =
        resolveSeedIdFromPayload(options?.seedPayload) ||
        normalizeSeedId(options?.seedId);
      const resolvedSeedId =
        deriveSeedId(payload) ||
        deriveSeedId(options?.seedPayload) ||
        fallbackSeedId ||
        null;
      const resolvedTeamId =
        deriveTeamId(payload) ||
        (options?.fallbackTeamId
          ? normalizeTeamId(options.fallbackTeamId)
          : null);

      if (!resolvedSeedId) {
        throw new Error('Unable to resolve an organization to activate.');
      }

      // Apply the fresh me/summary payload from the activate response
      // BEFORE any other side effect. The backend hands us the full
      // post-switch summary (role/persona/visible_sections for the new
      // workspace + updated workspace_context). Writing it first means
      // useWorkspaceVisibility() returns fresh data on the very next
      // render — no race with the separate me/summary GET that
      // useEnsureFreshWorkspaceSummary used to fire, no stale-sections
      // flash in the sidebar. writeViewerStoredUserSummary fires the
      // 'user-summary-updated' event same-tab, so useSummaryRevision
      // (in useWorkspaceVisibility) bumps and re-evaluates immediately.
      const freshSummary =
        activationData?.summary ??
        activationData?.data?.summary ??
        (Array.isArray(activationData?.data)
          ? activationData.data[0]?.summary
          : null);
      if (freshSummary && typeof freshSummary === 'object') {
        writeViewerStoredUserSummary(freshSummary);
        notifySummaryUpdated?.(freshSummary);
      }

      const storedUser = readStoredUser() || null;
      const profileUuid = normalizeUserId(
        storedUser?.pk || storedUser?.id || storedUser?.uuid
      );

      if (!profileUuid) {
        throw new Error('Unable to resolve user profile for activation.');
      }

      const profilePayload: Record<string, any> = {
        active_seed_id: resolvedSeedId
      };
      if (resolvedTeamId) {
        profilePayload.active_team_id = resolvedTeamId;
      }

      const profileRes = await updateUserProfileById(
        profileUuid,
        profilePayload
      );

      dispatch({ type: USER_PROFILE_UPDATE, payload: profileRes });

      const normalizedId = normalizeUserId(profileUuid);
      if (normalizedId) {
        const currentData =
          userCacheRef.current[normalizedId]?.data || stateUser || {};
        userCacheRef.current[normalizedId] = {
          data: {
            ...currentData,
            profile: {
              ...(currentData?.profile || {}),
              ...(profileRes || {})
            }
          },
          updatedAt: Date.now()
        };
      }

      updateStoredUser((current) => {
        const existingSeeds = Array.isArray(current?.org_access_seeds)
          ? current.org_access_seeds
          : [];
        const nextSeeds =
          resolvedSeedId && !existingSeeds.includes(resolvedSeedId)
            ? [...existingSeeds, resolvedSeedId]
            : existingSeeds;
        return {
          ...current,
          active_seed_id: resolvedSeedId || current?.active_seed_id || null,
          active_team_id: resolvedTeamId || current?.active_team_id || null,
          requires_org_onboarding: false,
          org_access_seeds: nextSeeds,
          org_membership_count:
            typeof current?.org_membership_count === 'number'
              ? Math.max(current.org_membership_count, 1)
              : current?.org_membership_count ?? 1
        };
      });

      try {
        // Legacy fallback: when the activate response did NOT carry a
        // fresh summary (older backend, or a non-toggle activation path
        // that doesn't go through the activate views), patch the cached
        // summary's workspace_context so useWorkspaceVisibility's
        // active_workspace_id stays in sync. With the fresh-summary path
        // above this branch is a no-op for the toggle flow.
        if (!freshSummary) {
          const existingSummary = readViewerStoredUserSummary();
          if (existingSummary && typeof existingSummary === 'object') {
            const existingSummaryRecord = existingSummary as Record<
              string,
              any
            >;
            const summaryPayload: Record<string, any> =
              existingSummaryRecord?.data &&
              typeof existingSummaryRecord.data === 'object'
                ? { ...existingSummaryRecord.data }
                : { ...existingSummaryRecord };
            const workspaceContext =
              summaryPayload.workspace_context ||
              summaryPayload.workspaceContext ||
              summaryPayload.data?.workspace_context ||
              summaryPayload.data?.workspaceContext ||
              {};

            const nextWorkspaceContext = {
              ...(workspaceContext || {}),
              active_workspace_id: resolvedSeedId
            };

            const nextSummary =
              existingSummaryRecord?.data &&
              typeof existingSummaryRecord.data === 'object'
                ? {
                    ...existingSummaryRecord,
                    data: {
                      ...summaryPayload,
                      workspace_context: nextWorkspaceContext
                    }
                  }
                : {
                    ...summaryPayload,
                    workspace_context: nextWorkspaceContext
                  };

            const nextSummaryRecord = nextSummary as Record<string, any>;

            if (
              nextSummaryRecord?.data &&
              typeof nextSummaryRecord.data === 'object'
            ) {
              delete nextSummaryRecord.data.feature_flags;
              delete nextSummaryRecord.data.featureFlags;
            }
            delete nextSummaryRecord.feature_flags;
            delete nextSummaryRecord.featureFlags;

            writeViewerStoredUserSummary(nextSummaryRecord);
            notifySummaryUpdated?.(nextSummaryRecord);
          }
        }

        await fetchEvaluatedFlags?.({ workspaceId: resolvedSeedId });
      } catch (error) {
        console.warn('Unable to refresh feature flags after activation', error);
      }

      if (!options?.suppressToast) {
        toast.success('Organization activated!', { icon: '✅' });
      }

      return {
        ...activationData,
        activeSeedId: resolvedSeedId,
        activeTeamId: resolvedTeamId
      };
    },
    [
      dispatch,
      fetchEvaluatedFlags,
      notifySummaryUpdated,
      resolveSeedIdFromPayload,
      stateUser,
      userCacheRef
    ]
  );

  const handleActivationError = useCallback(
    (
      error: any,
      options: ActivateTeamOptions = {},
      fallbackMessage: string
    ) => {
      dispatch({ type: USER_PROFILE_UPDATE_ERROR });
      if (!options?.suppressToast) {
        addToast?.({
          message:
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            error?.message ||
            fallbackMessage,
          error: true
        });
      }
    },
    [addToast, dispatch]
  );

  const activateTeam = useCallback(
    async (teamId: any, options: ActivateTeamOptions = {}) => {
      const normalizedTeamId = normalizeTeamId(teamId);
      if (!normalizedTeamId) {
        throw new Error('Team id is required.');
      }

      dispatch({ type: USER_PROFILE_UPDATE_LOADING });
      try {
        const activationData = await activateUserTeam(normalizedTeamId);
        return await applyActivationSideEffects(activationData, {
          ...options,
          fallbackTeamId: normalizedTeamId
        });
      } catch (error) {
        handleActivationError(error, options, 'Unable to activate this team.');
        throw error;
      }
    },
    [applyActivationSideEffects, dispatch, handleActivationError]
  );

  // Single-call counterpart that hits POST /team/workspace/activate/.
  // Server resolves the first accessible team in the workspace and
  // activates atomically — eliminates the round-trip + race window that
  // the legacy two-call (getTeamsBySeed + activateTeam) flow created.
  const activateWorkspace = useCallback(
    async (workspaceId: string, options: ActivateTeamOptions = {}) => {
      if (!workspaceId) {
        throw new Error('Workspace id is required.');
      }

      dispatch({ type: USER_PROFILE_UPDATE_LOADING });
      try {
        const activationData = await activateUserWorkspace(workspaceId);
        return await applyActivationSideEffects(activationData, {
          ...options,
          seedId: options?.seedId || workspaceId
        });
      } catch (error) {
        handleActivationError(
          error,
          options,
          'Unable to activate this workspace.'
        );
        throw error;
      }
    },
    [applyActivationSideEffects, dispatch, handleActivationError]
  );

  return {
    createTeam,
    inviteUser,
    getInvitations,
    acceptInvitation,
    acceptInviteCode,
    activateTeam,
    activateWorkspace
  };
};
