import { useCallback, useRef, useState } from 'react';

export const kanbanInitialState = {
  seed_team_projects: [],
  loading: true,
  error: null,
  taskComments: {},
  taskCommentsLoading: {},
  taskCommentsError: {},
  taskCommentSubmitting: {},
  taskCommentSubmitError: {}
};

export const useKanbanProviderSupport = () => {
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeColumn, setActiveColumn] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const persistingTaskIdsRef = useRef(new Set());
  const [persistingTaskIdsState, setPersistingTaskIdsState] = useState(
    new Set()
  );

  const setPersistingTask = useCallback((taskId, isPersisting) => {
    if (taskId === null || taskId === undefined) {
      return;
    }
    const normalizedId = String(taskId);
    persistingTaskIdsRef.current = new Set(persistingTaskIdsRef.current);
    if (isPersisting) {
      persistingTaskIdsRef.current.add(normalizedId);
    } else {
      persistingTaskIdsRef.current.delete(normalizedId);
    }
    setPersistingTaskIdsState(new Set(persistingTaskIdsRef.current));
  }, []);

  const dragTaskMetaRef = useRef(null);

  return {
    columns,
    setColumns,
    tasks,
    setTasks,
    activeColumn,
    setActiveColumn,
    activeTask,
    setActiveTask,
    persistingTaskIdsState,
    setPersistingTask,
    dragTaskMetaRef
  };
};
