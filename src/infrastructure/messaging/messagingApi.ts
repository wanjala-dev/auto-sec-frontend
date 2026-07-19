import apiClient from '../http/apiClient';

const BASE = '/messaging';

export const messagingApi = {
  listConversations: () => apiClient.get(`${BASE}/conversations/`),

  startConversation: (payload: {
    recipient_id: string;
    workspace_id?: string;
  }) => apiClient.post(`${BASE}/conversations/start/`, payload),

  getMessages: (conversationId: string) =>
    apiClient.get(`${BASE}/conversations/${conversationId}/messages/`),

  // Text-only sends go as JSON; an image attachment switches to
  // multipart/form-data (axios sets the boundary automatically).
  sendMessage: (
    conversationId: string,
    payload: {
      body?: string;
      image?: File | null;
      // Structured card payload (Share in chat) — {share: {kind, title,
      // url, excerpt}} renders as a card in the thread.
      metadata?: Record<string, unknown>;
    }
  ) => {
    const url = `${BASE}/conversations/${conversationId}/messages/send/`;
    if (payload.image) {
      const form = new FormData();
      if (payload.body) form.append('body', payload.body);
      form.append('image', payload.image);
      return apiClient.post(url, form);
    }
    return apiClient.post(url, {
      body: payload.body || '',
      ...(payload.metadata ? { metadata: payload.metadata } : {})
    });
  },

  deleteMessage: (messageId: string) =>
    apiClient.delete(`${BASE}/messages/${messageId}/`),

  markRead: (conversationId: string) =>
    apiClient.post(`${BASE}/conversations/${conversationId}/read/`),

  getUnreadCount: () => apiClient.get(`${BASE}/unread/`),

  // Workspace user typeahead for starting a new conversation (membership
  // context — the canonical operator directory search).
  searchUsers: (q: string, workspaceId?: string) =>
    apiClient.get('/membership/users/search/', {
      params: { q, ...(workspaceId ? { workspace_id: workspaceId } : {}) }
    }),

  archiveConversation: (conversationId: string) =>
    apiClient.post(`${BASE}/conversations/${conversationId}/archive/`),

  unarchiveConversation: (conversationId: string) =>
    apiClient.post(`${BASE}/conversations/${conversationId}/unarchive/`),

  starConversation: (conversationId: string) =>
    apiClient.post(`${BASE}/conversations/${conversationId}/star/`),

  unstarConversation: (conversationId: string) =>
    apiClient.post(`${BASE}/conversations/${conversationId}/unstar/`),

  muteConversation: (conversationId: string) =>
    apiClient.post(`${BASE}/conversations/${conversationId}/mute/`),

  unmuteConversation: (conversationId: string) =>
    apiClient.post(`${BASE}/conversations/${conversationId}/unmute/`)
};
