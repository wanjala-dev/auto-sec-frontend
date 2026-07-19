import { normalizeCommentCollection } from '../../domain/comments/commentCollection';
import { commentsApi } from '../../infrastructure/comments/commentsApi';

export const fetchWorkspaceComments = async (workspaceId: string | number) => {
  try {
    const response = await commentsApi.getWorkspaceComments(workspaceId);
    return normalizeCommentCollection(response?.data);
  } catch (error: any) {
    if (error?.response?.status !== 404) throw error;
    const fallback = await commentsApi.getLegacySeedComments(workspaceId);
    return normalizeCommentCollection(fallback?.data);
  }
};

export const createWorkspaceComment = async (
  payload: Record<string, unknown>
) => {
  const response = await commentsApi.createWorkspaceComment(payload);
  return response?.data ?? null;
};
