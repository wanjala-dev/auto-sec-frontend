import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { updateKanbanColumn } from '../../../application/kanban/kanbanService';

export const useKanbanBoardItemsPresentation = ({
  columns,
  setColumns,
  setTasks
}: {
  columns: any[];
  setColumns: any;
  setTasks: any;
}) => {
  const generateUniqueId = useCallback(
    () => Math.floor(Math.random() * 10001),
    []
  );

  const createNewColumn = useCallback(() => {
    const columnToAdd = {
      id: generateUniqueId(),
      title: `Column ${columns.length + 1}`
    };
    setColumns((prevColumns) => [...prevColumns, columnToAdd]);
  }, [columns.length, generateUniqueId, setColumns]);

  const deleteColumn = useCallback(
    (columnId) => {
      setColumns((prevColumns) =>
        prevColumns.filter((column) => column.id !== columnId)
      );
      setTasks((prevTasks) =>
        prevTasks.filter((task) => task.columnId !== columnId)
      );
    },
    [setColumns, setTasks]
  );

  const updateColumn = useCallback(
    async (columnId, newTitle) => {
      const trimmedTitle = (newTitle || '').trim();
      if (!trimmedTitle) return;

      let previousTitle = null;
      setColumns((prevColumns) =>
        prevColumns.map((col) => {
          if (col.id !== columnId) return col;
          previousTitle = col.title;
          return { ...col, title: trimmedTitle };
        })
      );

      if (previousTitle === trimmedTitle) return;

      try {
        await updateKanbanColumn(columnId, { title: trimmedTitle });
        toast.success('Column renamed', { icon: '✅' });
      } catch (error) {
        console.error('Failed to rename column', error);
        toast.error('Unable to rename this column', { icon: '⚠️' });
        setColumns((prevColumns) =>
          prevColumns.map((col) => {
            if (col.id !== columnId) return col;
            return { ...col, title: previousTitle };
          })
        );
      }
    },
    [setColumns]
  );

  const createNewTask = useCallback(
    (columnId) => {
      const taskToAdd = {
        id: generateUniqueId(),
        columnId,
        content: '',
        isEditing: true
      };
      setTasks((prevTasks) => [...prevTasks, taskToAdd]);
    },
    [generateUniqueId, setTasks]
  );

  const deleteTask = useCallback(
    (taskId) => {
      // Board tasks are keyed by ``pk`` (API rows) or ``id`` (unsaved local
      // rows) — match either, otherwise a pk-keyed task never leaves state.
      setTasks((prevTasks) =>
        prevTasks.filter(
          (task) => String(task.pk ?? task.id) !== String(taskId)
        )
      );
    },
    [setTasks]
  );

  const updateTask = useCallback(
    (taskId, newContent) => {
      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          if (task.id !== taskId) return task;
          return { ...task, content: newContent };
        })
      );
    },
    [setTasks]
  );

  return {
    createNewColumn,
    deleteColumn,
    updateColumn,
    createNewTask,
    deleteTask,
    updateTask
  };
};
