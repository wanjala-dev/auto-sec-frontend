import apiClient from '../http/apiClient';

export const kanbanApi = {
  getTeamColumns: (teamId: string | number, seedId: string | number) =>
    apiClient.get(`/project/columns/team/${teamId}/workspaces/${seedId}/`),

  getProjectColumns: (
    projectId: string | number,
    teamId: string | number,
    seedId: string | number
  ) =>
    apiClient.get(
      `/project/columns/project/${projectId}/team/${teamId}/workspaces/${seedId}/`
    ),

  createColumn: (payload: Record<string, unknown>) =>
    apiClient.post('/project/columns/', payload),

  deleteColumn: (columnId: string | number) =>
    apiClient.delete(`/project/columns/${columnId}/`),

  createTask: (payload: Record<string, unknown>) =>
    apiClient.post('/project/task/', payload),

  updateColumnOrder: (columnId: string | number, order: number) =>
    apiClient.put(`/project/columns/${columnId}/`, { order }),

  updateColumn: (columnId: string | number, payload: Record<string, unknown>) =>
    apiClient.put(`/project/columns/${columnId}/`, payload),

  reorderColumns: (updates: Array<{ id: string | number; order: number }>) =>
    apiClient.post('/project/columns/reorder/', { updates }),

  createProject: (payload: Record<string, unknown>) =>
    apiClient.post('/project/', payload),

  patchTaskByUser: (
    userId: string | number,
    taskId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/project/task/update/${userId}/${taskId}/`, payload),

  patchTask: (taskId: string | number, payload: Record<string, unknown>) =>
    apiClient.patch(`/project/tasks/${taskId}/`, payload),

  getProjectsBySeed: (seedId: string | number) =>
    apiClient.get(`/project/workspaces/${seedId}/`),

  getProjectsBySeedAndTeam: (
    seedId: string | number,
    teamId: string | number
  ) => apiClient.get(`/project/workspaces/${seedId}/team/${teamId}/`),

  createProjectUpdate: (payload: Record<string, unknown>) =>
    apiClient.post('/project/updates/', payload),

  updateProjectUpdate: (
    updateId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/project/updates/${updateId}/`, payload),

  editProject: (projectId: string | number, payload: Record<string, unknown>) =>
    apiClient.patch(`/project/patch/${projectId}/`, payload),

  assignUsersToTask: (
    taskId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/project/tasks/${taskId}/assign/`, payload),

  getTaskComments: (taskId: string | number) =>
    apiClient.get(`/project/tasks/${taskId}/comments/`),

  createTaskComment: (
    taskId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.post(`/project/tasks/${taskId}/comments/`, payload),

  handleTaskTimer: (action: string, payload: Record<string, unknown>) =>
    apiClient.post(`/project/tasks/timer/${action}_timer/`, payload),

  batchMoveTasks: (moves: Array<Record<string, unknown>>) =>
    apiClient.post('/project/tasks/batch-move/', { moves }),

  getTasksByEvent: (eventId: string | number) =>
    apiClient.get(`/project/tasks/event/${eventId}/`),

  getTasksByCampaign: (campaignId: string | number) =>
    apiClient.get(`/project/tasks/campaign/${campaignId}/`),

  getTasksByRecipient: (recipientId: string | number) =>
    apiClient.get(`/project/tasks/recipient/${recipientId}/`),

  getTasksByGrant: (grantId: string | number) =>
    apiClient.get(`/project/tasks/grant/${grantId}/`),

  getColumnsByWorkspace: (workspaceId: string | number) =>
    apiClient.get(`/project/columns/workspaces/${workspaceId}/`),

  // Tasks assigned to the current user across every team in a workspace —
  // powers the Work ▸ My Work page. Server scopes to request.user.
  getAssignedTasks: (workspaceId: string | number) =>
    apiClient.get(`/project/tasks/assigned-to-me/${workspaceId}/`)
};
