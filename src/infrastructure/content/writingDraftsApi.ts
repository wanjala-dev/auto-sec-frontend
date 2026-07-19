import apiClient from '../http/apiClient';

/**
 * Writing drafts + AI-assist endpoints (Reports studio). Backed by the ported
 * content context: draft CRUD, publish, `draft-with-ai` (grounded generation
 * via the writing agent) and the persisted `assist-thread` conversation.
 */
export const writingDraftsApi = {
  list: (workspaceId: string, params: Record<string, unknown> = {}) =>
    apiClient.get('/content/drafts/', {
      params: { workspace_id: workspaceId, ...params }
    }),

  create: (payload: {
    workspace_id: string;
    title: string;
    kind?: string;
    body_html?: string;
    template_id?: string;
  }) => apiClient.post('/content/drafts/', payload),

  get: (draftId: string) => apiClient.get(`/content/drafts/${draftId}/`),

  update: (
    draftId: string,
    payload: { title?: string; body_html?: string; metadata?: Record<string, unknown> }
  ) => apiClient.patch(`/content/drafts/${draftId}/`, payload),

  publish: (draftId: string) =>
    apiClient.post(`/content/drafts/${draftId}/publish/`, {}),

  remove: (draftId: string) => apiClient.delete(`/content/drafts/${draftId}/`),

  // Grounded AI drafting — returns {body_html, title, excerpt, source_chunks,
  // faithfulness, ai_provenance, assist_conversation_id, assist_message_id}.
  draftWithAi: (
    draftId: string,
    payload: {
      prompt: string;
      tone?: string;
      topic?: string;
      existing_body_html?: string;
      grounding_file_ids?: string[];
      conversation?: Array<{ role: string; text: string }>;
    }
  ) => apiClient.post(`/content/drafts/${draftId}/draft-with-ai/`, payload),

  // The persisted document-assist conversation id for thread hydration.
  assistThread: (draftId: string) =>
    apiClient.get(`/content/drafts/${draftId}/assist-thread/`)
};
