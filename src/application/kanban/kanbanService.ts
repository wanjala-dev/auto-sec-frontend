import { kanbanApi } from '../../infrastructure/kanban/kanbanApi';

export const fetchTeamColumns = async (
  teamId: string | number,
  seedId: string | number
) => {
  const response = await kanbanApi.getTeamColumns(teamId, seedId);
  return response?.data?.data || [];
};

export const fetchProjectColumns = async (
  projectId: string | number,
  teamId: string | number,
  seedId: string | number
) => {
  const response = await kanbanApi.getProjectColumns(projectId, teamId, seedId);
  return response?.data?.data || [];
};

export const createKanbanColumn = async (payload: Record<string, unknown>) => {
  const response = await kanbanApi.createColumn(payload);
  return response?.data?.data || response?.data || null;
};

export const deleteKanbanColumn = (columnId: string | number) =>
  kanbanApi.deleteColumn(columnId);

export const createKanbanTask = async (payload: Record<string, unknown>) => {
  const response = await kanbanApi.createTask(payload);
  return response?.data || {};
};

export const persistKanbanColumnOrder = (
  columnId: string | number,
  order: number
) => kanbanApi.updateColumnOrder(columnId, order);

export const updateKanbanColumn = async (
  columnId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await kanbanApi.updateColumn(columnId, payload);
  return response?.data?.data || response?.data || null;
};

export const reorderKanbanColumns = async (
  updates: Array<{ id: string | number; order: number }>
) => {
  const response = await kanbanApi.reorderColumns(updates);
  return response?.data?.data || [];
};

export const createKanbanProject = async (payload: Record<string, unknown>) => {
  const response = await kanbanApi.createProject(payload);
  return response?.data?.data || response?.data || null;
};

export const patchKanbanTask = async ({
  userId,
  taskId,
  payload
}: {
  userId?: string | number | null;
  taskId: string | number;
  payload: Record<string, unknown>;
}) => {
  if (userId !== null && userId !== undefined) {
    try {
      const userScopedResponse = await kanbanApi.patchTaskByUser(
        userId,
        taskId,
        payload
      );
      return (
        userScopedResponse?.data?.data?.task ??
        userScopedResponse?.data?.data ??
        userScopedResponse?.data?.task ??
        userScopedResponse?.data ??
        null
      );
    } catch (error: any) {
      if (!error?.response || error.response.status >= 500) {
        throw error;
      }
    }
  }

  const response = await kanbanApi.patchTask(taskId, payload);
  return (
    response?.data?.data?.task ??
    response?.data?.data ??
    response?.data?.task ??
    response?.data ??
    null
  );
};

export const fetchKanbanProjectsBySeed = async (seedId: string | number) => {
  const response = await kanbanApi.getProjectsBySeed(seedId);
  return response?.data?.data || [];
};

export const fetchKanbanProjectsBySeedAndTeam = async (
  seedId: string | number,
  teamId: string | number
) => {
  const response = await kanbanApi.getProjectsBySeedAndTeam(seedId, teamId);
  return response?.data?.data || [];
};

/**
 * Tasks assigned to the current user across all teams in a workspace — the
 * server-truth source for the Work ▸ My Work page. Same `data.data` envelope as
 * the project reads (the backend endpoint mirrors ProjectsView).
 */
export const fetchAssignedTasks = async (workspaceId: string | number) => {
  const response = await kanbanApi.getAssignedTasks(workspaceId);
  return response?.data?.data || [];
};

export const createKanbanProjectUpdate = async (
  payload: Record<string, unknown>
) => {
  const response = await kanbanApi.createProjectUpdate(payload);
  return response?.data?.data || response?.data || null;
};

export const updateKanbanProjectUpdate = async (
  updateId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await kanbanApi.updateProjectUpdate(updateId, payload);
  return response?.data?.data || response?.data || null;
};

export const editKanbanProject = async (
  projectId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await kanbanApi.editProject(projectId, payload);
  return response?.data?.data || response?.data || null;
};

export const assignKanbanUsersToTask = async (
  taskId: string | number,
  userIds: Array<string | number>
) => {
  const response = await kanbanApi.assignUsersToTask(taskId, {
    user_ids: userIds
  });
  return response?.data || null;
};

export const fetchKanbanTaskComments = async (taskId: string | number) => {
  const response = await kanbanApi.getTaskComments(taskId);
  return response?.data;
};

export const createKanbanTaskComment = async (
  taskId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await kanbanApi.createTaskComment(taskId, payload);
  return response?.data;
};

export const batchMoveKanbanTasks = async (
  moves: Array<Record<string, unknown>>
) => {
  const response = await kanbanApi.batchMoveTasks(moves);
  return response?.data || {};
};

export const handleKanbanTaskTimer = async (
  action: 'start' | 'stop' | 'discard',
  payload: Record<string, unknown>
) => {
  const response = await kanbanApi.handleTaskTimer(action, payload);
  return response?.data ?? null;
};
