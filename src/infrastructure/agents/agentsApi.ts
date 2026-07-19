import apiClient from '../http/apiClient';

export const agentsApi = {
  getTeammate: (workspaceId: string | number) =>
    apiClient.get(`/ai/agents/teammate/${workspaceId}/`),

  renameTeammate: (
    workspaceId: string | number,
    payload: Record<string, unknown>
  ) => apiClient.patch(`/ai/agents/teammate/${workspaceId}/`, payload),

  execute: (agentId: string, payload: Record<string, unknown>) =>
    apiClient.post(`/ai/agents/${agentId}/execute/`, payload),

  getMemoryHistory: (agentId: string, params?: Record<string, unknown>) =>
    apiClient.get(
      `/ai/agents/${agentId}/memory/`,
      params ? { params } : undefined
    ),

  listExecutions: (agentId: string, params?: Record<string, unknown>) =>
    apiClient.get(
      `/ai/agents/${agentId}/executions/`,
      params ? { params } : undefined
    ),

  getExecution: (executionId: string) =>
    apiClient.get(`/ai/agents/executions/${executionId}/`),

  create: (payload: Record<string, unknown>) =>
    apiClient.post('/ai/agents/create/', payload),

  getState: (agentId: string) => apiClient.get(`/ai/agents/${agentId}/state/`),

  pause: (agentId: string) => apiClient.post(`/ai/agents/${agentId}/pause/`),

  resume: (agentId: string) => apiClient.post(`/ai/agents/${agentId}/resume/`),

  remove: (agentId: string) => apiClient.delete(`/ai/agents/${agentId}/`),

  listTypes: () => apiClient.get('/ai/agents/types/'),

  list: () => apiClient.get('/ai/agents/'),

  // ── Workspace AI Configuration ───────────────────────────────────

  getAIConfig: (workspaceId: string) =>
    apiClient.get('/ai/agents/ai-config/', {
      params: { workspace_id: workspaceId }
    }),

  updateAIConfig: (workspaceId: string, config: Record<string, unknown>) =>
    apiClient.patch('/ai/agents/ai-config/update/', {
      workspace_id: workspaceId,
      config
    }),

  listAIModels: (provider?: string) =>
    apiClient.get(
      '/ai/agents/ai-models/',
      provider ? { params: { provider } } : undefined
    )
};
