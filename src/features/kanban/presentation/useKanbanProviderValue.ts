import { useMemo } from 'react';

export const useKanbanProviderValue = ({
  state,
  support,
  boardItems,
  columnsPresentation,
  projectsPresentation,
  taskCommentsPresentation,
  taskMutationPresentation,
  dragPresentation,
  dispatch
}: {
  state: any;
  support: any;
  boardItems: any;
  columnsPresentation: any;
  projectsPresentation: any;
  taskCommentsPresentation: any;
  taskMutationPresentation: any;
  dragPresentation: any;
  dispatch: any;
}) =>
  useMemo(
    () => ({
      ...state,
      columns: support.columns,
      tasks: support.tasks,
      setTasks: support.setTasks,
      taskCommentsByTask: state.taskComments,
      taskCommentsLoadingByTask: state.taskCommentsLoading,
      taskCommentsErrorByTask: state.taskCommentsError,
      taskCommentSubmittingByTask: state.taskCommentSubmitting,
      taskCommentSubmitErrorByTask: state.taskCommentSubmitError,
      activeColumn: support.activeColumn,
      activeTask: support.activeTask,
      fetchColumns: columnsPresentation.fetchColumns,
      fetchTaskComments: taskCommentsPresentation.fetchTaskComments,
      createNewColumn: boardItems.createNewColumn,
      createColumn: columnsPresentation.createColumn,
      deleteColumn: boardItems.deleteColumn,
      softDeleteColumn: columnsPresentation.softDeleteColumn,
      removeColumnLocally: columnsPresentation.removeColumnLocally,
      updateColumn: boardItems.updateColumn,
      createNewTask: boardItems.createNewTask,
      createTask: taskMutationPresentation.createTask,
      deleteTask: boardItems.deleteTask,
      updateTask: boardItems.updateTask,
      onDragStart: dragPresentation.onDragStart,
      onDragEnd: dragPresentation.onDragEnd,
      onDragOver: dragPresentation.onDragOver,
      persistingTaskIds: support.persistingTaskIdsState,
      createProject: projectsPresentation.createProject,
      projects: projectsPresentation.projects,
      patchTaskColumn: taskMutationPresentation.patchTaskColumn,
      getProjectsBySeed: projectsPresentation.getProjectsBySeed,
      getProjectsBySeedAndTeam: projectsPresentation.getProjectsBySeedAndTeam,
      dispatch,
      createProjectUpdate: projectsPresentation.createProjectUpdate,
      updateProjectUpdate: projectsPresentation.updateProjectUpdate,
      editProject: projectsPresentation.editProject,
      assignUserToTask: taskMutationPresentation.assignUserToTask,
      createTaskComment: taskCommentsPresentation.createTaskComment,
      taskMatchesId: taskMutationPresentation.taskMatchesId
    }),
    [
      state,
      support,
      boardItems,
      columnsPresentation,
      projectsPresentation,
      taskCommentsPresentation,
      taskMutationPresentation,
      dragPresentation,
      dispatch
    ]
  );
