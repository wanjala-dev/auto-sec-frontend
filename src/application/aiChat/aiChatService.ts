import {
  extractConversationId,
  normalizeConversationList,
  normalizeConversationMessages
} from '../../domain/aiChat/conversations';
import { aiChatApi } from '../../infrastructure/aiChat/aiChatApi';

export const createSeedMemoryConversation = async (
  workspaceId: string | number,
  title: string
) => {
  const response = await aiChatApi.createMemoryConversation({
    workspace_id: workspaceId,
    title
  });
  const data = response?.data || {};

  return {
    id: extractConversationId(data),
    data
  };
};

// Coalesce concurrent identical conversation-list fetches. The Messages inbox
// mounts several consumers that each list a workspace's conversations on load
// (InboxPage's fetch effect, useChatSession's thread-list loader, the shared
// chat session), so the same GET /ai/conversations/?workspace_id=<ws> fires
// 3-5x in the mount burst. A shared in-flight promise keyed by workspace+params
// collapses that burst into ONE request; the entry is dropped as soon as it
// settles, so later refreshes still fetch fresh data (this only dedupes
// genuinely overlapping calls, it does not cache results).
const inFlightConversationLists = new Map<string, Promise<any>>();

export const listSeedConversations = async (
  workspaceId?: string | number | null,
  params: Record<string, unknown> = {}
) => {
  const key = `${workspaceId ?? ''}::${JSON.stringify(params)}`;
  const existing = inFlightConversationLists.get(key);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    try {
      const response = await aiChatApi.listConversations({
        ...(workspaceId ? { workspace_id: workspaceId } : {}),
        ...params
      });
      return normalizeConversationList(response?.data);
    } finally {
      inFlightConversationLists.delete(key);
    }
  })();

  inFlightConversationLists.set(key, request);
  return request;
};

export const getSeedConversationMessages = async (
  conversationId: string,
  workspaceId?: string | number | null
) => {
  const response = await aiChatApi.getConversationMessages(
    conversationId,
    workspaceId ? { workspace_id: workspaceId } : undefined
  );

  return normalizeConversationMessages(response?.data);
};

export const askWorkspaceQuestion = async (
  payload: Record<string, unknown>
) => {
  const response = await aiChatApi.askWorkspaceChat(payload);
  return response?.data;
};

export const renameConversation = async (
  conversationId: string,
  title: string
) => {
  const response = await aiChatApi.renameConversation(conversationId, title);
  return response?.data;
};

export const submitMessageFeedback = async (
  conversationId: string,
  messageId: string,
  rating: 'up' | 'down',
  comment?: string
) => {
  const response = await aiChatApi.submitMessageFeedback(
    conversationId,
    messageId,
    { rating, ...(comment ? { comment } : {}) }
  );
  return response?.data;
};

export const removeMessageFeedback = async (
  conversationId: string,
  messageId: string
) => {
  const response = await aiChatApi.removeMessageFeedback(
    conversationId,
    messageId
  );
  return response?.data;
};

export const uploadWorkspacePdf = async (formData: FormData) => {
  const response = await aiChatApi.uploadFile(formData);
  return response?.data || null;
};

export const getUploadedFileStatus = async (fileId: string | number) => {
  const response = await aiChatApi.getUpload(fileId);
  return response?.data || null;
};

export const createPdfConversationForWorkspace = async (
  pdfId: string | number,
  workspaceId: string | number,
  title: string
) => {
  const response = await aiChatApi.createConversation({
    pdf_id: pdfId,
    workspace_id: workspaceId,
    title
  });
  const data = response?.data || {};

  return {
    id: extractConversationId(data),
    data
  };
};

export const sendConversationMessage = async (
  conversationId: string,
  input: string
) => {
  const response = await aiChatApi.createConversationMessage(conversationId, {
    input
  });
  return response?.data || null;
};

export const getConversationById = async (conversationId: string) => {
  const response = await aiChatApi.getConversation(conversationId);
  return response?.data || null;
};

export const deleteConversationById = (conversationId: string) =>
  aiChatApi.deleteConversation(conversationId);

export const clearAiAgentMemory = (agentId: string) =>
  aiChatApi.clearAgentMemory(agentId);
