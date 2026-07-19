import { useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  assignKanbanUsersToTask,
  createKanbanTask,
  patchKanbanTask
} from '../../../application/kanban/kanbanService';
import {
  ASSIGN_USER_TO_TASK_ERROR,
  ASSIGN_USER_TO_TASK_LOADING,
  ASSIGN_USER_TO_TASK_SUCCESS,
  CREATE_TASK,
  CREATE_TASK_ERROR,
  UPDATE_TASK,
  UPDATE_TASK_ERROR
} from '../../../types/projectTypes';
import {
  normalizeStoredUserId,
  resolveStoredUsername
} from '../../../domain/auth/storedUserSelectors';
import { readViewerStoredUser } from '../../../features/auth/presentation/browserAuthSessionSupport';

export const useKanbanTaskMutationPresentation = ({
  dispatch,
  setTasks,
  setPersistingTask
}: {
  dispatch: any;
  setTasks: any;
  setPersistingTask: (taskId: any, isPersisting: boolean) => void;
}) => {
  const getStoredUser = useCallback(() => readViewerStoredUser() || {}, []);

  const getTaskKey = useCallback(
    (task) =>
      task?.pk || task?.id || task?.task_id || task?.uuid || task?.slug || null,
    []
  );

  const normalizeTaskId = useCallback((id) => {
    if (id === null || id === undefined) return null;
    const stringId = String(id);
    return stringId.startsWith('task-') ? stringId.slice(5) : stringId;
  }, []);

  const normalizeColumnId = useCallback((id) => {
    if (id === null || id === undefined) return null;
    const stringId = String(id);
    return stringId.startsWith('column-') ? stringId.slice(7) : stringId;
  }, []);

  const normalizeActionId = useCallback((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') {
      return (
        normalizeActionId(value?.id) ||
        normalizeActionId(value?.pk) ||
        normalizeActionId(value?.uuid) ||
        normalizeActionId(value?.action_id) ||
        normalizeActionId(value?.slug)
      );
    }
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : null;
  }, []);

  const extractColumnIdentifier = useCallback(
    (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') {
        return (
          extractColumnIdentifier(value?.id) ??
          extractColumnIdentifier(value?.pk) ??
          extractColumnIdentifier(value?.uuid) ??
          extractColumnIdentifier(value?.slug)
        );
      }
      return normalizeColumnId(value);
    },
    [normalizeColumnId]
  );

  const coerceIdValue = useCallback((id) => {
    if (id === null || id === undefined) return id;
    const numericValue = Number(id);
    return Number.isNaN(numericValue) ? id : numericValue;
  }, []);

  const sanitizeTaskUpdatePayload = useCallback(
    (payload: Record<string, any> = {}) => {
      if (!payload || typeof payload !== 'object') {
        return {};
      }

      const sanitizedPayload = { ...payload };

      if (Object.prototype.hasOwnProperty.call(sanitizedPayload, 'column')) {
        const columnIdentifier = extractColumnIdentifier(
          sanitizedPayload.column
        );
        if (columnIdentifier === null || columnIdentifier === undefined) {
          delete sanitizedPayload.column;
        } else {
          sanitizedPayload.column = coerceIdValue(columnIdentifier);
        }
      }

      if (Object.prototype.hasOwnProperty.call(sanitizedPayload, 'project')) {
        const projectValue = sanitizedPayload.project;
        if (projectValue && typeof projectValue === 'object') {
          const projectIdentifier =
            projectValue?.id ??
            projectValue?.pk ??
            projectValue?.project_id ??
            projectValue?.uuid ??
            projectValue?.slug ??
            null;
          sanitizedPayload.project =
            projectIdentifier !== null && projectIdentifier !== undefined
              ? coerceIdValue(projectIdentifier)
              : projectValue;
        }
      }

      if (
        Object.prototype.hasOwnProperty.call(sanitizedPayload, 'assigned_to') &&
        Array.isArray(sanitizedPayload.assigned_to)
      ) {
        sanitizedPayload.assigned_to = sanitizedPayload.assigned_to
          .filter((user) => user !== null && user !== undefined)
          .map((user) => {
            if (typeof user === 'object') {
              return (
                user?.id ??
                user?.pk ??
                user?.user_id ??
                user?.uuid ??
                user?.slug ??
                null
              );
            }
            return user;
          })
          .filter((value) => value !== null && value !== undefined);
      }

      return sanitizedPayload;
    },
    [coerceIdValue, extractColumnIdentifier]
  );

  const collectTaskIdentifiers = useCallback(
    (taskLike, fallbackId = null) => {
      const identifiers = [];
      const candidateValues = [
        fallbackId,
        taskLike?.id,
        taskLike?.pk,
        taskLike?.task_id,
        taskLike?.uuid,
        taskLike?.slug
      ];

      candidateValues.forEach((value) => {
        if (value === null || value === undefined) {
          return;
        }
        const normalizedValue = coerceIdValue(value);
        if (
          !identifiers.some(
            (existing) => String(existing) === String(normalizedValue)
          )
        ) {
          identifiers.push(normalizedValue);
        }
      });

      return identifiers;
    },
    [coerceIdValue]
  );

  const taskMatchesId = useCallback(
    (task, id) => {
      const key = getTaskKey(task);
      if (key === null || key === undefined) return false;
      const normalizedId = normalizeTaskId(id);
      if (normalizedId === null || normalizedId === undefined) return false;
      return String(key) === String(normalizedId);
    },
    [getTaskKey, normalizeTaskId]
  );

  const createTask = useCallback(
    async (seedId, columnId, taskTitle) => {
      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const userData = getStoredUser();
      const optimisticTask = {
        id: tempId,
        pk: tempId,
        title: taskTitle,
        column: columnId,
        created_at: new Date().toISOString(),
        status: 'pending',
        assigned_to: [],
        user: {
          username: resolveStoredUsername(userData) || 'You',
          first_name: userData?.user?.first_name || userData?.first_name || '',
          last_name: userData?.user?.last_name || userData?.last_name || '',
          profile: {
            photo_url:
              userData?.user?.profile?.photo_url ||
              userData?.profile?.photo_url ||
              null
          }
        }
      };

      setTasks((prev) => {
        const columnTaskCount = prev.filter(
          (task) => String(task.column) === String(columnId)
        ).length;
        return [
          ...prev,
          {
            ...optimisticTask,
            order: columnTaskCount
          }
        ];
      });
      setPersistingTask(tempId, true);

      try {
        const newTask = {
          project: '',
          hours: 2,
          minutes: 30,
          user: normalizeStoredUserId(userData),
          title: taskTitle,
          workspace_id: seedId,
          column: columnId
        };

        const response = await createKanbanTask(newTask);

        if (response?.error) {
          const message =
            response.error || response.message || 'Unable to add task';
          toast.error(message, { icon: '⚠️' });
          dispatch({
            type: CREATE_TASK_ERROR,
            payload: message
          });
          return null;
        }

        const createdTask = response.task;
        if (!createdTask) {
          const message = response?.message || 'Unable to add task';
          toast.error(message, { icon: '⚠️' });
          dispatch({
            type: CREATE_TASK_ERROR,
            payload: message
          });
          return null;
        }

        const normalizedTask = {
          ...createdTask,
          id: createdTask?.id || createdTask?.pk || createdTask?.task_id,
          pk: createdTask?.pk || createdTask?.id || createdTask?.task_id,
          column: createdTask?.column || columnId
        };

        setTasks((prev) =>
          prev.map((task) =>
            task.id === tempId
              ? { ...task, ...normalizedTask, isOptimistic: false }
              : task
          )
        );
        setPersistingTask(tempId, false);

        dispatch({ type: CREATE_TASK, payload: normalizedTask });
        toast.success('Task added successfully!', { icon: '✅' });
        return normalizedTask;
      } catch (error) {
        const message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          'Unable to add task';
        dispatch({
          type: CREATE_TASK_ERROR,
          payload: message
        });
        setTasks((prev) => prev.filter((task) => task.id !== tempId));
        setPersistingTask(tempId, false);
        toast.error(message, { icon: '⚠️' });

        return null;
      }
    },
    [dispatch, getStoredUser, setPersistingTask, setTasks]
  );

  const patchTaskColumn = useCallback(
    async (taskId, updatedData = {}) => {
      const normalizedTaskIdentifier = coerceIdValue(
        normalizeTaskId(taskId) ??
          (typeof taskId === 'object' ? getTaskKey(taskId) : taskId)
      );

      if (
        normalizedTaskIdentifier === null ||
        normalizedTaskIdentifier === undefined
      ) {
        const message = 'Unable to determine task identifier';
        dispatch({
          type: UPDATE_TASK_ERROR,
          payload: message
        });
        throw new Error(message);
      }

      const sanitizedPayload = sanitizeTaskUpdatePayload(updatedData);

      const userId = normalizeStoredUserId(getStoredUser());

      try {
        const patchedTaskData = await patchKanbanTask({
          userId,
          taskId: normalizedTaskIdentifier,
          payload: sanitizedPayload
        });
        const normalizedTaskData =
          patchedTaskData && typeof patchedTaskData === 'object'
            ? patchedTaskData
            : sanitizedPayload;

        const identifiers = collectTaskIdentifiers(
          normalizedTaskData,
          normalizedTaskIdentifier
        );

        dispatch({
          type: UPDATE_TASK,
          payload: {
            identifiers,
            data: normalizedTaskData
          }
        });

        toast.success('Task updated successfully!', { icon: '✅' });

        return normalizedTaskData;
      } catch (error) {
        console.error('patchTaskColumn error:', error);
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'Error updating task';
        dispatch({
          type: UPDATE_TASK_ERROR,
          payload: message
        });
        throw error;
      }
    },
    [
      coerceIdValue,
      collectTaskIdentifiers,
      dispatch,
      getStoredUser,
      getTaskKey,
      normalizeTaskId,
      sanitizeTaskUpdatePayload
    ]
  );

  const assignUserToTask = useCallback(
    async (taskId, userIds) => {
      dispatch({ type: ASSIGN_USER_TO_TASK_LOADING });
      try {
        const response = await assignKanbanUsersToTask(taskId, userIds);
        dispatch({ type: ASSIGN_USER_TO_TASK_SUCCESS });
        toast.success('User(s) assigned to task successfully!');
        return response;
      } catch (error) {
        dispatch({
          type: ASSIGN_USER_TO_TASK_ERROR,
          payload:
            error.response?.data?.message || 'Error assigning user(s) to task'
        });
        toast.error('Failed to assign user(s) to task.');
        throw error;
      }
    },
    [dispatch]
  );

  return {
    getTaskKey,
    normalizeTaskId,
    normalizeColumnId,
    normalizeActionId,
    extractColumnIdentifier,
    coerceIdValue,
    taskMatchesId,
    createTask,
    patchTaskColumn,
    assignUserToTask
  };
};
