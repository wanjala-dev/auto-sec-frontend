import apiClient from '../http/apiClient';

export const aiChatApi = {
  createMemoryConversation: (payload: Record<string, unknown>) =>
    apiClient.post('/ai/memories/conversations/create/', payload),

  listConversations: (params?: Record<string, unknown>) =>
    apiClient.get('/ai/conversations/', params ? { params } : undefined),

  getConversationMessages: (
    conversationId: string,
    params?: Record<string, unknown>
  ) =>
    apiClient.get(
      `/ai/conversations/${conversationId}/messages/`,
      params ? { params } : undefined
    ),

  askWorkspaceChat: (payload: Record<string, unknown>) =>
    // Deep Agent Unification: the legacy /ai/chat/workspace-chat/ endpoint
    // was removed. Every chat message now flows through the deep agent at
    // /ai/chat/agent-chat/. Response shape gains `plan_id` — used by the
    // `<DeepRunProgress />` component to subscribe to run events.
    apiClient.post('/ai/chat/agent-chat/', payload),

  getDeepRunSnapshot: (planId: string) =>
    apiClient.get(`/ai/agents/runs/${planId}/`),

  getDeepRunEvents: (
    planId: string,
    params?: { since?: string; limit?: number }
  ) =>
    apiClient.get(
      `/ai/agents/runs/${planId}/events/`,
      params ? { params } : undefined
    ),

  getDeepRunStats: (params?: { workspace_id?: string; since?: string }) =>
    apiClient.get('/ai/agents/runs/stats/', params ? { params } : undefined),

  submitMessageFeedback: (
    conversationId: string,
    messageId: string,
    payload: { rating: 'up' | 'down'; comment?: string }
  ) =>
    apiClient.post(
      `/ai/conversations/${conversationId}/messages/${messageId}/feedback/`,
      payload
    ),

  removeMessageFeedback: (conversationId: string, messageId: string) =>
    apiClient.delete(
      `/ai/conversations/${conversationId}/messages/${messageId}/feedback/`
    ),

  uploadFile: (formData: FormData) =>
    apiClient.post('/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),

  getUpload: (fileId: string | number) => apiClient.get(`/upload/${fileId}/`),

  createConversation: (payload: Record<string, unknown>) =>
    apiClient.post('/ai/memories/conversations/create/', payload),

  createConversationMessage: (
    conversationId: string,
    payload: Record<string, unknown>
  ) =>
    apiClient.post(
      `/ai/conversations/${conversationId}/messages/create/`,
      payload
    ),

  getConversation: (conversationId: string) =>
    apiClient.get(`/ai/conversations/${conversationId}/`),

  deleteConversation: (conversationId: string) =>
    apiClient.delete(`/ai/conversations/${conversationId}/`),

  renameConversation: (conversationId: string, title: string) =>
    apiClient.patch(`/ai/conversations/${conversationId}/`, { title }),

  clearAgentMemory: (agentId: string) =>
    apiClient.post(`/ai/agents/${agentId}/memory/clear/`)
};
