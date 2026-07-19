import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { normalizeWorkspaceId as normalizeSeedId } from '../../../domain/workspace/workspaceId';
import {
  createKanbanProject,
  createKanbanProjectUpdate,
  editKanbanProject,
  fetchKanbanProjectsBySeed,
  fetchKanbanProjectsBySeedAndTeam,
  updateKanbanProjectUpdate
} from '../../../application/kanban/kanbanService';
import {
  CREATE_PROJECT_UPDATE,
  CREATE_PROJECT_UPDATE_ERROR,
  CREATE_PROJECT_UPDATE_LOADING,
  GET_PROJECTS_BY_SEED_AND_TEAM,
  GET_PROJECTS_BY_SEED_AND_TEAM_ERROR,
  GET_PROJECTS_BY_SEED_AND_TEAM_LOADING,
  GET_PROJECTS_BY_SEED_ERROR,
  GET_PROJECTS_BY_SEED_LOADING,
  PATCH_PROJECT_ERROR,
  PATCH_PROJECT_LOADING,
  PATCH_PROJECT_SUCCESS,
  UPDATE_PROJECT_UPDATES,
  UPDATE_PROJECT_UPDATES_ERROR,
  UPDATE_PROJECT_UPDATES_LOADING,
  UPDATE_TEAM_PROJECTS
} from '../../../types/projectTypes';
import { normalizeStoredUserId } from '../../../domain/auth/storedUserSelectors';
import { readViewerStoredUser } from '../../../features/auth/presentation/browserAuthSessionSupport';

export const useKanbanProjectsPresentation = ({
  dispatch
}: {
  dispatch: any;
}) => {
  const [projects, setProjects] = useState<any[]>([]);
  const teamProjectsCacheRef = useRef(new Map());
  const teamProjectsRequestsRef = useRef(new Map());
  const resolveStoredAuthorId = useCallback(
    () => normalizeStoredUserId(readViewerStoredUser()),
    []
  );

  const createProject = useCallback(
    async (titleOrPayload, seed_id, team) => {
      const user_id = resolveStoredAuthorId();

      dispatch({ type: 'CREATE_PROJECT_LOADING' });

      // Two call shapes are supported:
      //   (1) legacy: createProject(title, seed_id, team)
      //   (2) wizard: createProject({ title, seed_id, team, description,
      //                                start_date, end_date, lead })
      // The wizard shape carries every field the project detail card
      // surfaces so the new multi-step form doesn't lose data.
      const projectData =
        typeof titleOrPayload === 'object' && titleOrPayload !== null
          ? { user: user_id, ...titleOrPayload }
          : { user: user_id, title: titleOrPayload, seed_id, team };
      const targetTeamId = projectData.team;

      try {
        const newProject = await createKanbanProject(projectData);

        setProjects((prev) => [newProject, ...prev]);

        dispatch({
          type: UPDATE_TEAM_PROJECTS,
          payload: {
            teamId: targetTeamId,
            project: newProject
          }
        });

        toast.success('Project successfully saved!', { icon: '✅' });
        return newProject;
      } catch (error) {
        dispatch({
          type: 'CREATE_PROJECT_ERROR',
          payload: error.response?.data?.message || 'Error creating project'
        });
        toast.error('Failed to create project!', { icon: '❌' });
        throw error;
      }
    },
    [dispatch, resolveStoredAuthorId]
  );

  const getProjectsBySeed = useCallback(
    async (seedId) => {
      dispatch({
        type: GET_PROJECTS_BY_SEED_LOADING
      });

      try {
        const projectsData = await fetchKanbanProjectsBySeed(seedId);
        setProjects(projectsData);
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || 'Error fetching projects';

        dispatch({
          type: GET_PROJECTS_BY_SEED_ERROR,
          payload: errorMessage
        });
      }
    },
    [dispatch]
  );

  const getProjectsBySeedAndTeam = useCallback(
    async (seedId, teamId, setProjectsOverride, { force = false } = {}) => {
      const normalizedSeed = normalizeSeedId(seedId);
      const normalizedTeam = teamId ? String(teamId) : null;

      if (!normalizedSeed || !normalizedTeam) {
        return [];
      }

      const cacheKey = `${normalizedSeed}:${normalizedTeam}`;

      if (!force && teamProjectsCacheRef.current.has(cacheKey)) {
        const cached = teamProjectsCacheRef.current.get(cacheKey);
        dispatch({
          type: GET_PROJECTS_BY_SEED_AND_TEAM,
          payload: cached
        });
        if (typeof setProjectsOverride === 'function') {
          setProjectsOverride(cached);
        } else {
          setProjects(cached);
        }
        return cached;
      }

      if (!force && teamProjectsRequestsRef.current.has(cacheKey)) {
        return teamProjectsRequestsRef.current.get(cacheKey);
      }

      dispatch({
        type: GET_PROJECTS_BY_SEED_AND_TEAM_LOADING
      });

      const request = (async () => {
        try {
          const projectsData = await fetchKanbanProjectsBySeedAndTeam(
            normalizedSeed,
            normalizedTeam
          );
          teamProjectsCacheRef.current.set(cacheKey, projectsData);
          dispatch({
            type: GET_PROJECTS_BY_SEED_AND_TEAM,
            payload: projectsData
          });
          if (typeof setProjectsOverride === 'function') {
            setProjectsOverride(projectsData);
          } else {
            setProjects(projectsData);
          }
          return projectsData;
        } catch (error) {
          dispatch({
            type: GET_PROJECTS_BY_SEED_AND_TEAM_ERROR,
            payload: error?.message || 'Error fetching projects'
          });
          throw error;
        } finally {
          teamProjectsRequestsRef.current.delete(cacheKey);
        }
      })();

      teamProjectsRequestsRef.current.set(cacheKey, request);
      return request;
    },
    [dispatch]
  );

  const createProjectUpdate = useCallback(
    async (updateData) => {
      dispatch({ type: CREATE_PROJECT_UPDATE_LOADING });

      try {
        const user_id = resolveStoredAuthorId();
        const createdUpdate = await createKanbanProjectUpdate({
          ...updateData,
          author: user_id
        });
        dispatch({ type: CREATE_PROJECT_UPDATE, payload: createdUpdate });
        toast.success('Project update added successfully!', { icon: '✅' });
        return createdUpdate;
      } catch (error) {
        dispatch({
          type: CREATE_PROJECT_UPDATE_ERROR,
          payload:
            error.response?.data?.message || 'Error adding project update'
        });
        toast.error('Failed to add project update!', { icon: '❌' });
        throw error;
      }
    },
    [dispatch, resolveStoredAuthorId]
  );

  const updateProjectUpdate = useCallback(
    async (updateId, updateData) => {
      dispatch({ type: UPDATE_PROJECT_UPDATES_LOADING });

      try {
        const user_id = resolveStoredAuthorId();
        const updatedUpdate = await updateKanbanProjectUpdate(updateId, {
          ...updateData,
          author: user_id
        });
        dispatch({ type: UPDATE_PROJECT_UPDATES, payload: updatedUpdate });
        toast.success('Project update successful!', { icon: '✅' });
        return updatedUpdate;
      } catch (error) {
        dispatch({
          type: UPDATE_PROJECT_UPDATES_ERROR,
          payload:
            error.response?.data?.message || 'Error updating project update'
        });
        toast.error('Failed to update project update!', { icon: '❌' });
        throw error;
      }
    },
    [dispatch, resolveStoredAuthorId]
  );

  const editProject = useCallback(
    async (projectId, projectData) => {
      dispatch({ type: PATCH_PROJECT_LOADING });

      try {
        const updatedProject = await editKanbanProject(projectId, projectData);

        dispatch({ type: PATCH_PROJECT_SUCCESS, payload: updatedProject });
        toast.success('Project date updated successfully!', { icon: '✅' });
        return updatedProject;
      } catch (error) {
        dispatch({
          type: PATCH_PROJECT_ERROR,
          payload: error.response?.data?.message || 'Error updating project'
        });
        toast.error('Failed to update project!', { icon: '❌' });
        throw error;
      }
    },
    [dispatch]
  );

  return {
    projects,
    setProjects,
    createProject,
    getProjectsBySeed,
    getProjectsBySeedAndTeam,
    createProjectUpdate,
    updateProjectUpdate,
    editProject
  };
};
