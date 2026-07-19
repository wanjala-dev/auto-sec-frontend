import { useCallback, useState } from 'react';
import {
  CHILD_STATUS_UPDATE_ERROR,
  CREATE_TEAM,
  CREATE_TEAM_ERROR,
  CREATE_TEAM_LOADING,
  GET_ALL_TEAMS,
  GET_SEED,
  GET_TEAM,
  SEED_LOADING,
  SEED_TEAM_LOADING
} from '../../../types/seedTypes';
import {
  fetchWorkspaceActions,
  createWorkspaceAction
} from '../../../application/workspace/workspaceStateService';
import {
  fetchWorkspaceComments,
  createWorkspaceComment
} from '../../../application/comments/commentsService';
import { listBillingPlans } from '../../../application/payments/paymentsService';
import {
  createWorkspaceTeam,
  listWorkspaceTeams as listWorkspaceTeamsRequest,
  updateWorkspaceTeam
} from '../../team/application/teamService';
import { normalizeStoredUserId } from '../../../domain/auth/storedUserSelectors';
import { normalizeWorkspaceId as normalizeSeedId } from '../../../domain/workspace/workspaceId';
import { readViewerStoredUser } from '../../../features/auth/presentation/browserAuthSessionSupport';

export const useSeedCollaborationPresentation = ({
  dispatch,
  addToast,
  notifySuccess,
  notifyError,
  isCacheEntryFresh,
  seedCacheRef,
  latestSeedRef,
  stateSeed
}: {
  dispatch: any;
  addToast?: ((payload: { message: string; error: boolean }) => void) | null;
  notifySuccess?:
    | ((message: string, options?: Record<string, unknown>) => void)
    | null;
  notifyError?:
    | ((message: string, options?: Record<string, unknown>) => void)
    | null;
  isCacheEntryFresh: (entry: any, ttl?: number) => boolean;
  seedCacheRef: any;
  latestSeedRef: any;
  stateSeed: any;
}) => {
  type TeamProjectMutationOptions = {
    replaceId?: string | number | null;
    mode?: 'upsert' | 'remove';
  };

  type TeamFetchOptions = {
    force?: boolean;
    ttl?: number;
  };

  const [comments, setComments] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const teamsCacheRef = useState(() => ({
    current: {} as Record<string, any>
  }))[0];
  const teamsRequestRef = useState(() => ({
    current: {} as Record<string, Promise<any>>
  }))[0];

  const getTeamIdentifier = useCallback(
    (team) => team?.id ?? team?.pk ?? team?.uuid ?? team?.team_id ?? null,
    []
  );

  // Scope `previousTeams` to the current seed before merging. Without this,
  // switching workspaces leaves teams from the prior workspace (e.g. its
  // "Agents" team) in state, and the new workspace's teams get appended —
  // producing duplicate rows in the sidebar.
  const scopeTeamsToSeed = useCallback((existingTeams, seedId) => {
    if (!Array.isArray(existingTeams) || !seedId) return [];
    const targetSeedId = normalizeSeedId(seedId);
    return existingTeams.filter((team) => {
      const teamSeedId = normalizeSeedId(
        team?.workspace_id ??
          team?.workspace?.id ??
          team?.workspace ??
          team?.seed_id ??
          null
      );
      // Keep teams with no identifiable seed (optimistic local adds)
      // plus teams that match the target seed.
      return teamSeedId === null || teamSeedId === targetSeedId;
    });
  }, []);

  const getProjectIdentifier = useCallback(
    (project) =>
      project?.id ??
      project?.pk ??
      project?.uuid ??
      project?.project_id ??
      null,
    []
  );

  const getProjectCacheKey = useCallback(
    (project) => {
      const identifier = getProjectIdentifier(project);
      if (identifier !== null && identifier !== undefined) {
        return String(identifier);
      }
      if (project?.slug !== undefined && project?.slug !== null) {
        return String(project.slug);
      }
      if (project?.id !== undefined && project?.id !== null) {
        return String(project.id);
      }
      return null;
    },
    [getProjectIdentifier]
  );

  const mergeProjectCollections = useCallback(
    (existingProjects, incomingProjects) => {
      const projectMap = new Map();

      (Array.isArray(existingProjects) ? existingProjects : []).forEach(
        (project, index) => {
          const key = getProjectCacheKey(project) ?? `local-${index}`;
          projectMap.set(key, project);
        }
      );

      (Array.isArray(incomingProjects) ? incomingProjects : []).forEach(
        (project, index) => {
          const key = getProjectCacheKey(project) ?? `incoming-${index}`;
          const current = projectMap.get(key);
          if (current) {
            projectMap.set(key, { ...current, ...project });
          } else {
            projectMap.set(key, project);
          }
        }
      );

      return Array.from(projectMap.values());
    },
    [getProjectCacheKey]
  );

  const mergeTeamCollections = useCallback(
    (existingTeams, incomingTeams) => {
      const teamMap = new Map();

      (Array.isArray(existingTeams) ? existingTeams : []).forEach(
        (team, index) => {
          const identifier = getTeamIdentifier(team);
          const key =
            identifier !== null && identifier !== undefined
              ? String(identifier)
              : `local-${index}`;
          teamMap.set(key, team);
        }
      );

      (Array.isArray(incomingTeams) ? incomingTeams : []).forEach(
        (team, index) => {
          const identifier = getTeamIdentifier(team);
          const key =
            identifier !== null && identifier !== undefined
              ? String(identifier)
              : `incoming-${index}`;
          const current = teamMap.get(key);
          if (current) {
            teamMap.set(key, {
              ...current,
              ...team,
              projects: mergeProjectCollections(
                current?.projects,
                team?.projects
              )
            });
          } else {
            teamMap.set(key, {
              ...team,
              projects: mergeProjectCollections([], team?.projects)
            });
          }
        }
      );

      return Array.from(teamMap.values());
    },
    [getTeamIdentifier, mergeProjectCollections]
  );

  const persistSeedSnapshot = useCallback(
    (seedPayload) => {
      const cacheKey = normalizeSeedId(
        seedPayload?.id ?? seedPayload?.seed_id ?? seedPayload?.seedId
      );
      if (!cacheKey) return;
      seedCacheRef.current[cacheKey] = {
        data: seedPayload,
        updatedAt: Date.now()
      };
    },
    [seedCacheRef]
  );

  const applyProjectMutation = useCallback(
    (projects, { project, replaceId, mode }) => {
      let next = Array.isArray(projects) ? [...projects] : [];
      const replaceIdStr =
        replaceId !== undefined && replaceId !== null
          ? String(replaceId)
          : null;

      if (replaceIdStr) {
        next = next.filter(
          (item) => String(getProjectIdentifier(item) ?? '') !== replaceIdStr
        );
      }

      if (mode === 'remove') {
        return next;
      }

      if (!project) {
        return next;
      }

      const projectId = getProjectIdentifier(project);
      const projectIdStr =
        projectId !== undefined && projectId !== null
          ? String(projectId)
          : null;

      if (projectIdStr) {
        const existingIndex = next.findIndex(
          (item) => String(getProjectIdentifier(item) ?? '') === projectIdStr
        );
        if (existingIndex !== -1) {
          next[existingIndex] = { ...next[existingIndex], ...project };
          return next;
        }
      }

      next.push(project);
      return next;
    },
    [getProjectIdentifier]
  );

  const updateTeamProjectsInSeed = useCallback(
    (teamId, project, options: TeamProjectMutationOptions = {}) => {
      if (!teamId) return;

      const { replaceId = null, mode = 'upsert' } = options;

      const mutateTeamsCollection = (collection) =>
        Array.isArray(collection)
          ? collection.map((team) => {
              const identifier = getTeamIdentifier(team);
              if (
                identifier !== null &&
                String(identifier) === String(teamId)
              ) {
                return {
                  ...team,
                  projects: applyProjectMutation(team.projects, {
                    project,
                    replaceId,
                    mode
                  })
                };
              }
              return team;
            })
          : collection;

      if (stateSeed) {
        const nextSeedState = {
          ...stateSeed,
          teams: mutateTeamsCollection(stateSeed?.teams),
          updatedAt: Date.now()
        };
        persistSeedSnapshot(nextSeedState);
        dispatch({
          type: GET_SEED,
          payload: nextSeedState
        });
      }

      setTeams((previousTeams) => mutateTeamsCollection(previousTeams));
    },
    [
      applyProjectMutation,
      dispatch,
      getTeamIdentifier,
      persistSeedSnapshot,
      stateSeed
    ]
  );

  const removeTeamProjectFromSeed = useCallback(
    (teamId, projectId) =>
      updateTeamProjectsInSeed(teamId, null, {
        mode: 'remove',
        replaceId: projectId
      }),
    [updateTeamProjectsInSeed]
  );

  const addTeamToCollections = useCallback(
    (team) => {
      if (!team) return;
      setTeams((previous) => {
        const list = Array.isArray(previous) ? [...previous] : [];
        const identifier =
          team?.id ?? team?.pk ?? team?.uuid ?? team?.team_id ?? null;
        if (
          identifier !== null &&
          list.some(
            (existing) =>
              String(
                existing?.id ??
                  existing?.pk ??
                  existing?.uuid ??
                  existing?.team_id ??
                  ''
              ) === String(identifier)
          )
        ) {
          return list;
        }
        return [...list, team];
      });

      dispatch({
        type: GET_SEED,
        payload: {
          ...stateSeed,
          teams: Array.isArray(stateSeed?.teams)
            ? [...stateSeed.teams, team]
            : [team]
        }
      });
    },
    [dispatch, stateSeed]
  );

  const getActions = useCallback(
    async (id) => {
      dispatch({ type: SEED_LOADING });
      const payload = await fetchWorkspaceActions(id);
      setActions(Array.isArray(payload) ? payload : []);
    },
    [dispatch]
  );

  const getComments = useCallback(async (id) => {
    const payload = await fetchWorkspaceComments(id);
    setComments(Array.isArray(payload) ? payload : []);
  }, []);

  const getTeamsBySeed = useCallback(
    async (seedId, options: TeamFetchOptions = {}) => {
      const { force = false, ttl = 3 * 60 * 1000 } = options;
      const normalizedSeedId = normalizeSeedId(seedId);

      if (!normalizedSeedId) {
        if (typeof addToast === 'function') {
          addToast({ message: 'Invalid Seed ID', error: true });
        }
        return [];
      }

      const cachedEntry = teamsCacheRef.current[normalizedSeedId];
      if (!force && cachedEntry?.data && isCacheEntryFresh(cachedEntry, ttl)) {
        const cachedTeams = cachedEntry.data;
        let mergedTeamsState;
        setTeams((previousTeams) => {
          mergedTeamsState = mergeTeamCollections(
            scopeTeamsToSeed(previousTeams, normalizedSeedId),
            cachedTeams
          );
          return mergedTeamsState;
        });

        const snapshotSeed = latestSeedRef.current;
        const snapshotSeedId = normalizeSeedId(
          snapshotSeed?.id ?? snapshotSeed?.seed_id
        );

        if (snapshotSeedId && normalizedSeedId === snapshotSeedId) {
          dispatch({
            type: GET_SEED,
            payload: {
              ...snapshotSeed,
              teams: mergeTeamCollections(snapshotSeed?.teams, cachedTeams)
            }
          });
        }

        dispatch({
          type: GET_ALL_TEAMS,
          payload:
            mergedTeamsState ??
            mergeTeamCollections(latestSeedRef.current?.teams, cachedTeams)
        });

        return mergedTeamsState ?? cachedTeams;
      }

      if (!force && teamsRequestRef.current[normalizedSeedId]) {
        return teamsRequestRef.current[normalizedSeedId];
      }

      const snapshotSeed = latestSeedRef.current;
      const snapshotSeedId = normalizeSeedId(
        snapshotSeed?.id ?? snapshotSeed?.seed_id
      );
      const seedTeams =
        snapshotSeedId && snapshotSeedId === normalizedSeedId
          ? Array.isArray(snapshotSeed?.teams)
            ? snapshotSeed.teams
            : []
          : [];
      const hasSeedTeams = seedTeams.length > 0;

      if (hasSeedTeams) {
        let mergedTeamsState;
        setTeams((previousTeams) => {
          mergedTeamsState = mergeTeamCollections(
            scopeTeamsToSeed(previousTeams, normalizedSeedId),
            seedTeams
          );
          return mergedTeamsState;
        });
        dispatch({
          type: GET_ALL_TEAMS,
          payload:
            mergedTeamsState ??
            mergeTeamCollections(latestSeedRef.current?.teams, seedTeams)
        });
        teamsCacheRef.current[normalizedSeedId] = {
          data: seedTeams,
          updatedAt: Date.now()
        };
      }

      if (!hasSeedTeams) {
        setTeamsLoading(true);
        dispatch({ type: SEED_TEAM_LOADING });
      }

      const request = (async () => {
        try {
          const fetchedTeams = await listWorkspaceTeamsRequest(
            normalizedSeedId
          );

          let mergedTeamsState;
          setTeams((previousTeams) => {
            mergedTeamsState = mergeTeamCollections(
              scopeTeamsToSeed(previousTeams, normalizedSeedId),
              fetchedTeams
            );
            return mergedTeamsState;
          });

          const currentSeed = latestSeedRef.current;
          const currentSeedId = normalizeSeedId(
            currentSeed?.id ?? currentSeed?.seed_id
          );

          if (currentSeedId && normalizedSeedId === currentSeedId) {
            const nextSeedState = {
              ...currentSeed,
              teams: mergeTeamCollections(currentSeed?.teams, fetchedTeams),
              updatedAt: Date.now()
            };
            persistSeedSnapshot(nextSeedState);
            dispatch({
              type: GET_SEED,
              payload: nextSeedState
            });
          }

          dispatch({
            type: GET_ALL_TEAMS,
            payload:
              mergedTeamsState ??
              mergeTeamCollections(latestSeedRef.current?.teams, fetchedTeams)
          });

          teamsCacheRef.current[normalizedSeedId] = {
            data: fetchedTeams,
            updatedAt: Date.now()
          };

          return mergedTeamsState ?? fetchedTeams;
        } catch (_) {
          dispatch({ type: CHILD_STATUS_UPDATE_ERROR });
          if (typeof addToast === 'function') {
            addToast({ message: 'An unexpected error occurred', error: true });
          }
          return [];
        } finally {
          setTeamsLoading(false);
          delete teamsRequestRef.current[normalizedSeedId];
        }
      })();

      teamsRequestRef.current[normalizedSeedId] = request;
      return request;
    },
    [
      addToast,
      dispatch,
      isCacheEntryFresh,
      latestSeedRef,
      mergeTeamCollections,
      persistSeedSnapshot,
      scopeTeamsToSeed,
      teamsCacheRef,
      teamsRequestRef
    ]
  );

  const getTeam = useCallback(
    async (id) => {
      dispatch({ type: SEED_LOADING });
      const responseTeams = await listWorkspaceTeamsRequest(id);
      setTeams(responseTeams);
      dispatch({
        type: GET_TEAM,
        payload: responseTeams
      });
    },
    [dispatch]
  );

  const getPlans = useCallback(async () => {
    dispatch({ type: 'PLANS_LOADING' });
    try {
      const payload = await listBillingPlans();
      dispatch({
        type: 'GET_PLANS_SUCCESS',
        payload
      });
    } catch (error: any) {
      dispatch({
        type: 'GET_PLANS_ERROR',
        payload: error.message
      });
    }
  }, [dispatch]);

  const createAction = useCallback(
    async (seed, title) => {
      const uuid = normalizeStoredUserId(readViewerStoredUser());
      dispatch({ type: SEED_LOADING });
      try {
        const createdAction = await createWorkspaceAction(seed, uuid, title);
        setActions((previous) => [createdAction, ...previous]);
      } catch (error: any) {
        if (typeof addToast === 'function') {
          if (error.response === undefined) {
            addToast({
              message: 'Unknown Error - check your network connection',
              error: true
            });
          } else if (
            error.response.status === 500 ||
            error.response.status === 404
          ) {
            addToast({ message: 'Server Error !', error: true });
          } else {
            addToast({ message: error.response.data.name, error: true });
          }
        }
      }
    },
    [addToast, dispatch]
  );

  const createComment = useCallback(
    async (seed, comment) => {
      const uuid = normalizeStoredUserId(readViewerStoredUser());
      dispatch({ type: SEED_LOADING });
      try {
        const createdComment = await createWorkspaceComment({
          workspace: seed,
          comment,
          author: uuid
        });
        setComments((previous) => [createdComment, ...previous]);
      } catch (error: any) {
        if (typeof addToast === 'function') {
          if (error.response === undefined) {
            addToast({
              message: 'Unknown Error - check your network connection',
              error: true
            });
          } else if (
            error.response.status === 500 ||
            error.response.status === 404
          ) {
            addToast({ message: 'Server Error !', error: true });
          } else {
            addToast({ message: error.response.data.name, error: true });
          }
        }
      }
    },
    [addToast, dispatch]
  );

  const createTeam = useCallback(
    async (data) => {
      dispatch({ type: CREATE_TEAM_LOADING });

      try {
        const createdTeam = await createWorkspaceTeam(data);
        dispatch({ type: CREATE_TEAM, payload: createdTeam });
        if (createdTeam) {
          addTeamToCollections(createdTeam);
          if (typeof notifySuccess === 'function') {
            notifySuccess('Team has been added!', { icon: '✅' });
          }
        }

        return createdTeam;
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error?.message ||
          'Failed to add team.';
        dispatch({ type: CREATE_TEAM_ERROR, payload: message });
        if (typeof notifyError === 'function') {
          notifyError(message);
        }
        throw error;
      }
    },
    [addTeamToCollections, dispatch, notifyError, notifySuccess]
  );

  // Edits an existing team. Same cache-touch pattern as createTeam but
  // uses PATCH against /team/<uuid>/ via TeamAddByUuidView. Returns the
  // updated team so the caller can refresh the detail view.
  const updateTeam = useCallback(
    async (teamId: string, data: Record<string, unknown>) => {
      if (!teamId) {
        throw new Error('Team id is required to update a team');
      }
      try {
        const updated = await updateWorkspaceTeam(teamId, data);
        if (updated) {
          // Reuse mergeTeamCollections so the active team in seed state
          // picks up the new title without a full refetch.
          addTeamToCollections(updated);
          if (typeof notifySuccess === 'function') {
            notifySuccess('Team updated.', { icon: '✅' });
          }
        }
        return updated;
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error?.message ||
          'Failed to update team.';
        if (typeof notifyError === 'function') {
          notifyError(message);
        }
        throw error;
      }
    },
    [addTeamToCollections, notifyError, notifySuccess]
  );

  return {
    comments,
    actions,
    teams,
    teamsLoading,
    getTeamIdentifier,
    mergeTeamCollections,
    persistSeedSnapshot,
    updateTeamProjectsInSeed,
    removeTeamProjectFromSeed,
    getActions,
    getComments,
    getTeamsBySeed,
    getTeam,
    getPlans,
    createAction,
    createComment,
    createTeam,
    updateTeam
  };
};
