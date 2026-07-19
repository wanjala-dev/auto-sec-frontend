import {
  CREATE_PROJECT,
  CREATE_PROJECT_ERROR,
  CREATE_PROJECT_LOADING,
  UPDATE_TEAM_PROJECTS,
  GET_PROJECTS_BY_SEED,
  GET_PROJECTS_BY_SEED_ERROR,
  GET_PROJECTS_BY_SEED_LOADING,
  GET_PROJECTS_BY_SEED_AND_TEAM,
  GET_PROJECTS_BY_SEED_AND_TEAM_ERROR,
  GET_PROJECTS_BY_SEED_AND_TEAM_LOADING,

  // Columns
  GET_COLUMNS,
  GET_COLUMNS_ERROR,
  GET_COLUMNS_LOADING,
  CREATE_COLUMN,
  CREATE_COLUMN_ERROR,
  CREATE_COLUMN_LOADING,
  DELETE_COLUMN,
  DELETE_COLUMN_ERROR,
  DELETE_COLUMN_LOADING,

  // Task Actions
  CREATE_TASK,
  CREATE_TASK_ERROR,
  CREATE_TASK_LOADING,
  GET_TASKS,
  GET_TASKS_ERROR,
  GET_TASKS_LOADING,
  DELETE_TASK,
  DELETE_TASK_ERROR,
  DELETE_TASK_LOADING,
  UPDATE_TASK,
  UPDATE_TASK_ERROR,
  UPDATE_TASK_LOADING,
  GET_TASK_COMMENTS,
  GET_TASK_COMMENTS_ERROR,
  GET_TASK_COMMENTS_LOADING,
  CREATE_TASK_COMMENT,
  CREATE_TASK_COMMENT_ERROR,
  CREATE_TASK_COMMENT_LOADING,

  // Project Updates
  CREATE_PROJECT_UPDATE,
  CREATE_PROJECT_UPDATE_ERROR,
  CREATE_PROJECT_UPDATE_LOADING,
  UPDATE_PROJECT_UPDATES,
  UPDATE_PROJECT_UPDATES_ERROR,
  UPDATE_PROJECT_UPDATES_LOADING,

  // Edit Project
  PATCH_PROJECT,
  PATCH_PROJECT_SUCCESS,
  PATCH_PROJECT_ERROR,
  PATCH_PROJECT_LOADING,

  // Assign User to Task
  ASSIGN_USER_TO_TASK_LOADING,
  ASSIGN_USER_TO_TASK_SUCCESS,
  ASSIGN_USER_TO_TASK_ERROR
} from '../types/projectTypes';

const projectReducer = (state, action) => {
  const { type, payload } = action;

  switch (type) {
    // Loading States
    case GET_PROJECTS_BY_SEED_LOADING:
    case GET_PROJECTS_BY_SEED_AND_TEAM_LOADING:
    case CREATE_PROJECT_LOADING:
    case GET_COLUMNS_LOADING:
    case CREATE_COLUMN_LOADING:
    case DELETE_COLUMN_LOADING:
    case CREATE_TASK_LOADING:
    case GET_TASKS_LOADING:
    case UPDATE_TASK_LOADING:
    case CREATE_PROJECT_UPDATE_LOADING:
    case UPDATE_PROJECT_UPDATES_LOADING:
    case PATCH_PROJECT_LOADING:
    case ASSIGN_USER_TO_TASK_LOADING:
      return {
        ...state,
        loading: true
      };
    case GET_TASK_COMMENTS_LOADING: {
      const taskId = payload;
      if (!taskId) return state;
      return {
        ...state,
        taskCommentsLoading: {
          ...(state.taskCommentsLoading || {}),
          [taskId]: true
        },
        taskCommentsError: {
          ...(state.taskCommentsError || {}),
          [taskId]: null
        }
      };
    }
    case CREATE_TASK_COMMENT_LOADING: {
      const taskId = payload;
      if (!taskId) return state;
      return {
        ...state,
        taskCommentSubmitting: {
          ...(state.taskCommentSubmitting || {}),
          [taskId]: true
        },
        taskCommentSubmitError: {
          ...(state.taskCommentSubmitError || {}),
          [taskId]: null
        }
      };
    }

    // Project Actions
    case CREATE_PROJECT:
      return {
        ...state,
        projects: payload,
        loading: false,
        error: null
      };

    case UPDATE_TEAM_PROJECTS:
      if (state?.seed && state?.seed?.teams) {
        return {
          ...state,
          seed: {
            ...state.seed,
            teams: state.seed.teams.map((team) => {
              if (team.id === payload.teamId) {
                return {
                  ...team,
                  projects: team.projects
                    ? [...team.projects, payload.project]
                    : [payload.project]
                };
              }
              return team;
            })
          },
          loading: false,
          error: null
        };
      }
      return state;

    // Error States
    case GET_PROJECTS_BY_SEED_ERROR:
    case GET_PROJECTS_BY_SEED_AND_TEAM_ERROR:
    case CREATE_PROJECT_ERROR:
    case GET_COLUMNS_ERROR:
    case CREATE_COLUMN_ERROR:
    case DELETE_COLUMN_ERROR:
    case CREATE_TASK_ERROR:
    case GET_TASKS_ERROR:
    case DELETE_TASK_ERROR:
    case UPDATE_TASK_ERROR:
    case CREATE_PROJECT_UPDATE_ERROR:
    case UPDATE_PROJECT_UPDATES_ERROR:
    case PATCH_PROJECT_ERROR:
    case ASSIGN_USER_TO_TASK_ERROR:
      return {
        ...state,
        loading: false,
        error: payload
      };
    case GET_TASK_COMMENTS_ERROR: {
      const { taskId, error: taskError } = payload || {};
      if (!taskId) return state;
      return {
        ...state,
        taskCommentsLoading: {
          ...(state.taskCommentsLoading || {}),
          [taskId]: false
        },
        taskCommentsError: {
          ...(state.taskCommentsError || {}),
          [taskId]: taskError || 'Unable to load comments'
        }
      };
    }
    case CREATE_TASK_COMMENT_ERROR: {
      const { taskId, error: submitError } = payload || {};
      if (!taskId) return state;
      return {
        ...state,
        taskCommentSubmitting: {
          ...(state.taskCommentSubmitting || {}),
          [taskId]: false
        },
        taskCommentSubmitError: {
          ...(state.taskCommentSubmitError || {}),
          [taskId]: submitError || 'Unable to add comment'
        }
      };
    }
    case GET_PROJECTS_BY_SEED:
      return {
        ...state,
        projects: payload,
        loading: false,
        error: null
      };

    case GET_PROJECTS_BY_SEED_AND_TEAM:
      return {
        ...state,
        seed_team_projects: payload,
        loading: false,
        error: null
      };

    // Column Actions
    case GET_COLUMNS:
      return {
        ...state,
        cols: payload,
        loading: false,
        error: null
      };

    case CREATE_COLUMN:
      return {
        ...state,
        columns: [...(state.columns || []), payload],
        loading: false,
        error: null
      };

    case DELETE_COLUMN:
      return {
        ...state,
        columns: state.columns
          ? state.columns.filter((column) => column.id !== payload)
          : [],
        loading: false,
        error: null
      };

    // Task Actions
    case CREATE_TASK:
      return {
        ...state,
        tasks: [...(state.tasks || []), payload],
        loading: false,
        error: null
      };

    case GET_TASKS:
      return {
        ...state,
        tasks: payload,
        loading: false,
        error: null
      };
    case GET_TASK_COMMENTS: {
      const { taskId, comments } = payload || {};
      if (!taskId) return state;
      return {
        ...state,
        taskComments: {
          ...(state.taskComments || {}),
          [taskId]: Array.isArray(comments) ? comments : []
        },
        taskCommentsLoading: {
          ...(state.taskCommentsLoading || {}),
          [taskId]: false
        },
        taskCommentsError: {
          ...(state.taskCommentsError || {}),
          [taskId]: null
        },
        loading: false
      };
    }

    case DELETE_TASK:
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== payload),
        loading: false,
        error: null
      };
    case CREATE_TASK_COMMENT: {
      const { taskId, comments } = payload || {};
      if (!taskId) return state;
      const nextState = {
        ...state,
        taskCommentSubmitting: {
          ...(state.taskCommentSubmitting || {}),
          [taskId]: false
        },
        taskCommentSubmitError: {
          ...(state.taskCommentSubmitError || {}),
          [taskId]: null
        },
        loading: false
      };
      if (Array.isArray(comments)) {
        nextState.taskComments = {
          ...(state.taskComments || {}),
          [taskId]: comments
        };
      }
      return nextState;
    }

    case UPDATE_TASK: {
      const payloadData =
        payload?.data && typeof payload.data === 'object' ? payload.data : {};

      const payloadIdentifiersRaw = Array.isArray(payload?.identifiers)
        ? payload.identifiers
        : [
            payload?.id,
            payload?.pk,
            payloadData?.id,
            payloadData?.pk,
            payloadData?.task_id,
            payloadData?.uuid,
            payloadData?.slug
          ];

      const payloadIdentifiers = payloadIdentifiersRaw
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value));

      const currentTasks = Array.isArray(state.tasks) ? state.tasks : [];

      const updatedTasks = currentTasks.map((task) => {
        const taskIdentifiers = [
          task?.id,
          task?.pk,
          task?.task_id,
          task?.uuid,
          task?.slug
        ]
          .filter((value) => value !== null && value !== undefined)
          .map((value) => String(value));

        const hasMatch =
          payloadIdentifiers.length > 0
            ? taskIdentifiers.some((identifier) =>
                payloadIdentifiers.includes(identifier)
              )
            : false;

        if (!hasMatch) {
          return task;
        }

        return {
          ...task,
          ...payloadData
        };
      });

      return {
        ...state,
        tasks: updatedTasks,
        loading: false,
        error: null
      };
    }

    case CREATE_PROJECT_UPDATE:
      return {
        ...state,
        newProjectUpdate: payload,
        loading: false,
        error: null
      };

    case UPDATE_PROJECT_UPDATES:
      return {
        ...state,
        projectUpdates: state.projectUpdates.map((update) =>
          update.id === payload.id ? { ...update, ...payload.data } : update
        ),
        loading: false,
        error: null
      };

    case PATCH_PROJECT_SUCCESS:
      return {
        ...state,
        editedProject: payload,
        loading: false,
        error: null
      };

    case ASSIGN_USER_TO_TASK_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null
      };

    case PATCH_PROJECT:
      return state;

    default:
      return state;
  }
};

export default projectReducer;
