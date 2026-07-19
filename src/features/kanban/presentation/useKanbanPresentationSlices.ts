import { useKanbanBoardItemsPresentation } from './useKanbanBoardItemsPresentation';
import { useKanbanColumnsPresentation } from './useKanbanColumnsPresentation';
import { useKanbanDragPresentation } from './useKanbanDragPresentation';
import { useKanbanProjectsPresentation } from './useKanbanProjectsPresentation';
import { useKanbanTaskCommentsPresentation } from './useKanbanTaskCommentsPresentation';
import { useKanbanTaskMutationPresentation } from './useKanbanTaskMutationPresentation';

export const useKanbanPresentationSlices = ({
  state,
  dispatch,
  support
}: {
  state: any;
  dispatch: any;
  support: any;
}) => {
  const boardItems = useKanbanBoardItemsPresentation({
    columns: support.columns,
    setColumns: support.setColumns,
    setTasks: support.setTasks
  });

  const columnsPresentation = useKanbanColumnsPresentation({
    dispatch,
    columns: support.columns,
    setColumns: support.setColumns,
    setTasks: support.setTasks
  });

  const projectsPresentation = useKanbanProjectsPresentation({
    dispatch
  });

  const taskCommentsPresentation = useKanbanTaskCommentsPresentation({
    dispatch,
    stateTaskComments: state.taskComments
  });

  const taskMutationPresentation = useKanbanTaskMutationPresentation({
    dispatch,
    setTasks: support.setTasks,
    setPersistingTask: support.setPersistingTask
  });

  const dragPresentation = useKanbanDragPresentation({
    columns: support.columns,
    tasks: support.tasks,
    setTasks: support.setTasks,
    setActiveColumn: support.setActiveColumn,
    setActiveTask: support.setActiveTask,
    dragTaskMetaRef: support.dragTaskMetaRef,
    setPersistingTask: support.setPersistingTask,
    persistColumnOrder: columnsPresentation.persistColumnOrder,
    patchTaskColumn: taskMutationPresentation.patchTaskColumn,
    taskMatchesId: taskMutationPresentation.taskMatchesId,
    normalizeTaskId: taskMutationPresentation.normalizeTaskId,
    normalizeColumnId: taskMutationPresentation.normalizeColumnId,
    getTaskKey: taskMutationPresentation.getTaskKey,
    extractColumnIdentifier: taskMutationPresentation.extractColumnIdentifier,
    coerceIdValue: taskMutationPresentation.coerceIdValue
  });

  return {
    boardItems,
    columnsPresentation,
    projectsPresentation,
    taskCommentsPresentation,
    taskMutationPresentation,
    dragPresentation
  };
};
