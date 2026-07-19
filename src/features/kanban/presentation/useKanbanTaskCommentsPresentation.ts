import { useCallback, useEffect, useRef } from 'react';
import {
  CREATE_TASK_COMMENT,
  CREATE_TASK_COMMENT_ERROR,
  CREATE_TASK_COMMENT_LOADING,
  GET_TASK_COMMENTS,
  GET_TASK_COMMENTS_ERROR,
  GET_TASK_COMMENTS_LOADING
} from '../../../types/projectTypes';
import {
  createKanbanTaskComment,
  fetchKanbanTaskComments
} from '../../../application/kanban/kanbanService';

export const useKanbanTaskCommentsPresentation = ({
  dispatch,
  stateTaskComments
}: {
  dispatch: any;
  stateTaskComments: Record<string, any>;
}) => {
  const taskCommentsStateRef = useRef(stateTaskComments);

  useEffect(() => {
    taskCommentsStateRef.current = stateTaskComments;
  }, [stateTaskComments]);

  const normalizeTaskId = useCallback((id) => {
    if (id === null || id === undefined) return null;
    const stringId = String(id);
    return stringId.startsWith('task-') ? stringId.slice(5) : stringId;
  }, []);

  const buildAuthorDisplayName = useCallback((author) => {
    if (!author || typeof author !== 'object') return null;
    const {
      names,
      full_name,
      fullName,
      name,
      first_name,
      last_name,
      username,
      email,
      display_name
    } = author;
    const joinedName = [first_name, last_name].filter(Boolean).join(' ').trim();
    return (
      names ||
      full_name ||
      fullName ||
      name ||
      display_name ||
      joinedName ||
      username ||
      email ||
      null
    );
  }, []);

  const normalizeCommentNode = useCallback(
    (node, fallbackTaskId = null) => {
      if (!node || typeof node !== 'object') return null;
      const text =
        node.comment ||
        node.body ||
        node.message ||
        node.text ||
        node.content ||
        '';
      const trimmed = typeof text === 'string' ? text.trim() : '';
      if (!trimmed) return null;
      const rawId =
        node.id ||
        node.pk ||
        node.comment_id ||
        node.uuid ||
        `comment-${Math.random().toString(36).slice(2, 10)}`;
      const authorEntry =
        node.author && typeof node.author === 'object'
          ? {
              id:
                node.author.id ||
                node.author.pk ||
                node.author.user_id ||
                node.author.uuid ||
                null,
              name:
                buildAuthorDisplayName(node.author) ||
                node.author_name ||
                'Team member',
              avatar:
                node.author.avatar ||
                node.author.profile_photo ||
                node.author.photo ||
                null
            }
          : {
              id: null,
              name: node.author_name || node.author || 'Team member',
              avatar: null
            };
      const normalizedTaskId =
        normalizeTaskId(node.task_id || node.task || fallbackTaskId) || null;
      return {
        id: String(rawId),
        comment: trimmed,
        createdOn:
          node.created_on ||
          node.created_at ||
          node.created ||
          node.timestamp ||
          node.updated_at ||
          null,
        taskId: normalizedTaskId,
        parent: node.parent ? String(node.parent) : null,
        likes: Array.isArray(node.likes) ? node.likes : [],
        dislikes: Array.isArray(node.dislikes) ? node.dislikes : [],
        isParent: Boolean(node.is_parent),
        author: authorEntry,
        children: Array.isArray(node.children)
          ? node.children
              .map((child) => normalizeCommentNode(child, normalizedTaskId))
              .filter(Boolean)
          : []
      };
    },
    [buildAuthorDisplayName, normalizeTaskId]
  );

  const extractCommentCandidates = useCallback((payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.data?.results)) return payload.data.results;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.comments)) return payload.comments;
    return [];
  }, []);

  const normalizeCommentsPayload = useCallback(
    (payload, taskId) => {
      return extractCommentCandidates(payload)
        .map((comment) => normalizeCommentNode(comment, taskId))
        .filter(Boolean);
    },
    [extractCommentCandidates, normalizeCommentNode]
  );

  const fetchTaskComments = useCallback(
    async (taskId, options: { force?: boolean } = {}) => {
      const normalizedTaskId = normalizeTaskId(taskId);
      if (!normalizedTaskId) return [];
      const { force = false } = options;
      const cachedComments =
        taskCommentsStateRef.current?.[normalizedTaskId] ?? null;
      if (!force && Array.isArray(cachedComments)) {
        return cachedComments;
      }
      dispatch({
        type: GET_TASK_COMMENTS_LOADING,
        payload: normalizedTaskId
      });
      try {
        const response = await fetchKanbanTaskComments(normalizedTaskId);
        const normalizedComments = normalizeCommentsPayload(
          response,
          normalizedTaskId
        );
        dispatch({
          type: GET_TASK_COMMENTS,
          payload: { taskId: normalizedTaskId, comments: normalizedComments }
        });
        return normalizedComments;
      } catch (error) {
        dispatch({
          type: GET_TASK_COMMENTS_ERROR,
          payload: {
            taskId: normalizedTaskId,
            error:
              error?.response?.data?.detail ||
              error?.response?.data?.message ||
              'Unable to load task comments'
          }
        });
        throw error;
      }
    },
    [dispatch, normalizeCommentsPayload, normalizeTaskId]
  );

  const createTaskComment = useCallback(
    async ({ taskId, comment, parent = null }) => {
      const normalizedTaskId = normalizeTaskId(taskId);
      if (!normalizedTaskId) {
        throw new Error('Task identifier is required to add a comment.');
      }
      const text = (comment || '').trim();
      if (!text) {
        throw new Error('Comment text is required.');
      }
      dispatch({
        type: CREATE_TASK_COMMENT_LOADING,
        payload: normalizedTaskId
      });
      try {
        const payload = parent ? { comment: text, parent } : { comment: text };
        const response = await createKanbanTaskComment(
          normalizedTaskId,
          payload
        );
        await fetchTaskComments(normalizedTaskId, { force: true });
        dispatch({
          type: CREATE_TASK_COMMENT,
          payload: { taskId: normalizedTaskId }
        });
        return response?.data;
      } catch (error) {
        dispatch({
          type: CREATE_TASK_COMMENT_ERROR,
          payload: {
            taskId: normalizedTaskId,
            error:
              error?.response?.data?.detail ||
              error?.response?.data?.message ||
              'Unable to add comment'
          }
        });
        throw error;
      }
    },
    [dispatch, fetchTaskComments, normalizeTaskId]
  );

  return {
    fetchTaskComments,
    createTaskComment
  };
};
