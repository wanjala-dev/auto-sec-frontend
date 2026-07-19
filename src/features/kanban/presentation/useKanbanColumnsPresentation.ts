import { useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  createKanbanColumn,
  deleteKanbanColumn,
  fetchProjectColumns,
  fetchTeamColumns,
  reorderKanbanColumns
} from '../../../application/kanban/kanbanService';
import {
  CREATE_COLUMN,
  CREATE_COLUMN_ERROR,
  CREATE_COLUMN_LOADING,
  DELETE_COLUMN,
  DELETE_COLUMN_ERROR,
  DELETE_COLUMN_LOADING,
  GET_COLUMNS,
  GET_COLUMNS_ERROR,
  GET_COLUMNS_LOADING,
  GET_PROJECTS_BY_SEED_AND_TEAM,
  GET_TASKS
} from '../../../types/projectTypes';
import { normalizeStoredUserId } from '../../../domain/auth/storedUserSelectors';
import { readViewerStoredUser } from '../../../features/auth/presentation/browserAuthSessionSupport';

export const useKanbanColumnsPresentation = ({
  dispatch,
  columns,
  setColumns,
  setTasks
}: {
  dispatch: any;
  columns: any[];
  setColumns: any;
  setTasks: any;
}) => {
  const fetchInFlightRef = useRef({ key: null, loading: false });
  const lastLoadedKeyRef = useRef(null);

  const fetchColumns = useCallback(
    async (
      teamId,
      seedId,
      options: { force?: boolean; projectId?: string | number | null } = {}
    ) => {
      if (!teamId || !seedId) {
        return;
      }

      // `force` re-fetches the board even when it's already the loaded key —
      // used after an in-place mutation (e.g. a sign-off approve/reject from a
      // task modal) so the board reflects the change without a navigation.
      const force = options?.force === true;
      // A truthy projectId narrows the board to that project's columns; falsy
      // (null/undefined) = the team's default board (project-less columns).
      const projectId = options?.projectId || null;
      const cacheKey = `${teamId}-${seedId}-${projectId ?? 'team'}`;
      if (!force && lastLoadedKeyRef.current === cacheKey) {
        return;
      }
      if (
        fetchInFlightRef.current.loading &&
        fetchInFlightRef.current.key === cacheKey
      ) {
        return;
      }

      if (lastLoadedKeyRef.current !== cacheKey) {
        setColumns([]);
        setTasks([]);
      }

      fetchInFlightRef.current = { key: cacheKey, loading: true };
      dispatch({ type: GET_COLUMNS_LOADING });

      try {
        const response = {
          data: {
            data: projectId
              ? await fetchProjectColumns(projectId, teamId, seedId)
              : await fetchTeamColumns(teamId, seedId)
          }
        };

        const normalizeTask = (task) => {
          const identifier =
            task?.pk ||
            task?.id ||
            task?.task_id ||
            task?.uuid ||
            task?.slug ||
            null;
          return identifier ? { ...task, pk: identifier } : { ...task };
        };

        const transformedColumns = response.data.data.map((column) => ({
          id: column.pk,
          title: column.title.charAt(0).toUpperCase() + column.title.slice(1),
          team: column.team,
          seed: column.seed ?? column.workspace ?? column.workspace_id,
          created_by: column.created_by,
          project: column.project,
          order: column.order,
          hidden: column.hidden,
          description: column.description,
          color: column.color,
          is_archived: column.is_archived,
          is_deleted: column.is_deleted,
          created_at: column.created_at,
          updated_at: column.updated_at,
          tasks: Array.isArray(column.tasks)
            ? column.tasks.map((task) => normalizeTask(task))
            : []
        }));

        setColumns(transformedColumns);
        dispatch({ type: GET_COLUMNS, payload: transformedColumns });

        const transformedTasks = transformedColumns.flatMap(
          (column) => column.tasks
        );

        const projectMap = new Map();
        transformedColumns.forEach((column) => {
          (column.tasks || []).forEach((task) => {
            const project = task?.project;
            if (!project) return;
            const projectId =
              project?.id || project?.pk || project?.uuid || project?.slug;
            if (!projectId || projectMap.has(projectId)) return;
            projectMap.set(projectId, {
              id: projectId,
              title:
                project?.title ||
                project?.name ||
                project?.display_name ||
                `Project ${projectId}`,
              ...project
            });
          });
        });

        if (projectMap.size > 0) {
          dispatch({
            type: GET_PROJECTS_BY_SEED_AND_TEAM,
            payload: Array.from(projectMap.values())
          });
        }

        setTasks(transformedTasks);
        dispatch({ type: GET_TASKS, payload: transformedTasks });
        lastLoadedKeyRef.current = cacheKey;
      } catch (error) {
        dispatch({
          type: GET_COLUMNS_ERROR,
          payload: error.response?.data?.message || 'Error fetching columns'
        });
      } finally {
        fetchInFlightRef.current = { key: null, loading: false };
      }
    },
    [dispatch, setColumns, setTasks]
  );

  const createColumn = useCallback(
    async (teamId, seedId, title, order, projectId = null) => {
      dispatch({ type: CREATE_COLUMN_LOADING });

      try {
        const user_id = normalizeStoredUserId(readViewerStoredUser());

        const newColumn = {
          team: teamId,
          workspace: seedId,
          created_by: user_id,
          title,
          order: order,
          // Bind the column to the active project board when one is selected;
          // omitted → the column joins the team's default board.
          ...(projectId ? { project: projectId } : {})
        };

        const createdColumn = await createKanbanColumn(newColumn);

        const columnToAdd = {
          id:
            createdColumn?.pk ??
            createdColumn?.id ??
            createdColumn?.uuid ??
            createdColumn.title.toLowerCase(),
          title:
            createdColumn.title.charAt(0).toUpperCase() +
            createdColumn.title.slice(1)
        };

        setColumns((prevColumns) => [...prevColumns, columnToAdd]);
        dispatch({ type: CREATE_COLUMN, payload: columnToAdd });
        toast.success('Column added successfully!', { icon: '✅' });
      } catch (error) {
        dispatch({
          type: CREATE_COLUMN_ERROR,
          payload: error.response?.data?.message || 'Error adding column'
        });
      }
    },
    [dispatch, setColumns]
  );

  const softDeleteColumn = useCallback(
    async (columnId) => {
      dispatch({ type: DELETE_COLUMN_LOADING });

      try {
        const response = await deleteKanbanColumn(columnId);

        if (response.status === 204 || response.status === 200) {
          setColumns((prevColumns) =>
            prevColumns.filter((column) => column.id !== columnId)
          );

          dispatch({ type: DELETE_COLUMN, payload: columnId });
          toast.success('Column Deleted!', { icon: '✅' });
        }
      } catch (error) {
        dispatch({
          type: DELETE_COLUMN_ERROR,
          payload: error.response?.data?.message || 'Error archiving column'
        });
      }
    },
    [dispatch, setColumns]
  );

  // Optimistic local removal for the recycle-bin column trash flow. Drops the
  // column from board state immediately and returns a rollback that restores
  // it at its old index if the backend trash call rejects. The server-side
  // soft delete + RecycleBinEntry happen through recycleBinService.trashEntity
  // — this only owns the board's local state.
  const removeColumnLocally = useCallback(
    (columnId) => {
      let removed = null;
      let removedIndex = -1;
      setColumns((prevColumns) => {
        removedIndex = prevColumns.findIndex(
          (column) => String(column.id) === String(columnId)
        );
        if (removedIndex === -1) return prevColumns;
        removed = prevColumns[removedIndex];
        return prevColumns.filter(
          (column) => String(column.id) !== String(columnId)
        );
      });
      dispatch({ type: DELETE_COLUMN, payload: columnId });
      return () => {
        if (!removed) return;
        setColumns((prevColumns) => {
          const next = [...prevColumns];
          next.splice(Math.min(removedIndex, next.length), 0, removed);
          return next;
        });
      };
    },
    [dispatch, setColumns]
  );

  const persistColumnOrder = useCallback(
    async (nextColumns, previousColumnsSnapshot) => {
      if (!Array.isArray(nextColumns) || nextColumns.length === 0) {
        return;
      }

      const previousColumns =
        Array.isArray(previousColumnsSnapshot) && previousColumnsSnapshot.length
          ? previousColumnsSnapshot
          : columns;

      const previousOrderMap = new Map(
        previousColumns.map((column, index) => [
          String(column.id),
          typeof column.order === 'number' ? column.order : index
        ])
      );

      const updates = nextColumns
        .map((column, index) => {
          const columnId =
            column?.id ??
            column?.pk ??
            column?.uuid ??
            column?.slug ??
            column?.column_id ??
            null;

          if (columnId === null || columnId === undefined) {
            return null;
          }

          const normalizedId = String(columnId);
          const previousOrder = previousOrderMap.has(normalizedId)
            ? previousOrderMap.get(normalizedId)
            : null;

          if (previousOrder === index) {
            return null;
          }

          return {
            id: columnId,
            order: index
          };
        })
        .filter(Boolean);

      if (updates.length === 0) {
        return;
      }

      // Optimistically apply the new order locally so the board reflects the
      // drop immediately. Rollback below restores the snapshot if the backend
      // rejects the update.
      setColumns(nextColumns);

      try {
        await reorderKanbanColumns(updates);
        toast.success('Column order saved', { icon: '✅' });
      } catch (error) {
        console.error('Failed to persist column order:', error);
        toast.error('Unable to save column order', { icon: '⚠️' });
        if (Array.isArray(previousColumnsSnapshot)) {
          setColumns(previousColumnsSnapshot);
        }
      }
    },
    [columns, setColumns]
  );

  return {
    fetchColumns,
    createColumn,
    softDeleteColumn,
    removeColumnLocally,
    persistColumnOrder
  };
};
