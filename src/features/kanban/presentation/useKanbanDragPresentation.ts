import { useCallback, useEffect } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import {
  configurePatchQueue,
  enqueueMoveTask
} from '../../../infrastructure/kanban/kanbanPatchQueue';

export const useKanbanDragPresentation = ({
  columns,
  tasks,
  setTasks,
  setActiveColumn,
  setActiveTask,
  dragTaskMetaRef,
  setPersistingTask,
  persistColumnOrder,
  patchTaskColumn,
  taskMatchesId,
  normalizeTaskId,
  normalizeColumnId,
  getTaskKey,
  extractColumnIdentifier,
  coerceIdValue
}: {
  columns: any[];
  tasks: any[];
  setTasks: any;
  setActiveColumn: any;
  setActiveTask: any;
  dragTaskMetaRef: any;
  setPersistingTask: (taskId: any, isPersisting: boolean) => void;
  persistColumnOrder: (
    nextColumns: any[],
    previousColumnsSnapshot?: any[]
  ) => Promise<void>;
  patchTaskColumn: (
    taskId: any,
    updatedData?: Record<string, any>
  ) => Promise<any>;
  taskMatchesId: (task: any, id: any) => boolean;
  normalizeTaskId: (id: any) => any;
  normalizeColumnId: (id: any) => any;
  getTaskKey: (task: any) => any;
  extractColumnIdentifier: (value: any) => any;
  coerceIdValue: (value: any) => any;
}) => {
  useEffect(() => {
    configurePatchQueue(patchTaskColumn);
  }, [patchTaskColumn]);

  const onDragStart = useCallback(
    (event) => {
      const { active } = event;

      if (
        active.data.current?.type === 'Column' &&
        active.data.current.column
      ) {
        setActiveColumn(active.data.current.column);
      }

      if (active.data.current?.type === 'Task' && active.data.current.task) {
        setActiveTask(active.data.current.task);

        const normalizedTaskId = normalizeTaskId(active.id);
        const taskFromEvent = active.data.current.task;
        const fallbackTask =
          tasks.find((task) => taskMatchesId(task, active.id)) || taskFromEvent;
        const originalColumnIdentifier = extractColumnIdentifier(
          taskFromEvent?.column ?? fallbackTask?.column
        );
        const originalOrderValue =
          typeof taskFromEvent?.order === 'number'
            ? taskFromEvent.order
            : typeof fallbackTask?.order === 'number'
            ? fallbackTask.order
            : null;

        const startColumnValue =
          originalColumnIdentifier !== null &&
          originalColumnIdentifier !== undefined
            ? originalColumnIdentifier
            : fallbackTask?.column;
        // Index of the task within its column BEFORE the drag — the reliable
        // "did it actually move?" baseline. The stored `order` field can't be
        // trusted for this: seeded/legacy tasks often share order=0.
        const originalIndexInColumn = tasks
          .filter((task) => String(task.column) === String(startColumnValue))
          .findIndex((task) => taskMatchesId(task, active.id));

        dragTaskMetaRef.current = {
          taskId:
            normalizedTaskId !== null && normalizedTaskId !== undefined
              ? coerceIdValue(normalizedTaskId)
              : coerceIdValue(getTaskKey(fallbackTask)),
          originalColumn:
            originalColumnIdentifier !== null &&
            originalColumnIdentifier !== undefined
              ? coerceIdValue(originalColumnIdentifier)
              : fallbackTask?.column,
          originalOrder: originalOrderValue,
          originalIndexInColumn:
            originalIndexInColumn === -1 ? null : originalIndexInColumn,
          startTimestamp: Date.now()
        };
      }
    },
    [
      coerceIdValue,
      dragTaskMetaRef,
      extractColumnIdentifier,
      getTaskKey,
      normalizeTaskId,
      setActiveColumn,
      setActiveTask,
      taskMatchesId,
      tasks
    ]
  );

  const onDragEnd = useCallback(
    async (event) => {
      // Every code path below MUST clear the active drag state — an early
      // return that skips it leaves the DragOverlay stuck on screen. The
      // try/finally guarantees cleanup regardless of which branch returns.
      try {
        const { active, over } = event;

        if (!over) {
          return;
        }

        const activeId = active.id;
        const overId = over.id;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        if (activeType === 'Task') {
          const activeTaskIndex = tasks.findIndex((task) =>
            taskMatchesId(task, activeId)
          );

          if (activeTaskIndex === -1) {
            return;
          }

          const activeTask = tasks[activeTaskIndex];
          const dragMeta = dragTaskMetaRef.current || {};
          const originalOrderValue =
            dragMeta.originalOrder !== null &&
            dragMeta.originalOrder !== undefined
              ? dragMeta.originalOrder
              : activeTask &&
                Object.prototype.hasOwnProperty.call(activeTask, 'order')
              ? activeTask.order
              : null;
          const normalizedActiveTaskIdRaw = normalizeTaskId(activeId);
          const fallbackActiveIdentifier = getTaskKey(activeTask);
          const normalizedActiveTaskId =
            dragMeta.taskId !== null && dragMeta.taskId !== undefined
              ? dragMeta.taskId
              : coerceIdValue(
                  normalizedActiveTaskIdRaw !== null &&
                    normalizedActiveTaskIdRaw !== undefined
                    ? normalizedActiveTaskIdRaw
                    : fallbackActiveIdentifier
                );

          if (
            normalizedActiveTaskId === null ||
            normalizedActiveTaskId === undefined
          ) {
            return;
          }

          const sourceColumnValue =
            dragMeta.originalColumn !== null &&
            dragMeta.originalColumn !== undefined
              ? coerceIdValue(dragMeta.originalColumn)
              : (() => {
                  const sourceColumnIdentifier = extractColumnIdentifier(
                    activeTask?.column
                  );
                  return sourceColumnIdentifier !== null &&
                    sourceColumnIdentifier !== undefined
                    ? coerceIdValue(sourceColumnIdentifier)
                    : activeTask?.column;
                })();

          const reindexTasksAfterMove = (
            taskList,
            targetColumnValue,
            columnChanged
          ) => {
            const targetColumnString = String(targetColumnValue);
            const sourceColumnString = String(sourceColumnValue);
            let targetOrderCounter = 0;
            let sourceOrderCounter = 0;
            let newOrderValue = null;

            const reindexed = taskList.map((task) => {
              const taskColumnString = String(task.column);
              if (taskColumnString === targetColumnString) {
                const nextTask = {
                  ...task,
                  order: targetOrderCounter
                };
                if (taskMatchesId(task, activeId)) {
                  newOrderValue = targetOrderCounter;
                }
                targetOrderCounter += 1;
                return nextTask;
              }
              if (columnChanged && taskColumnString === sourceColumnString) {
                const nextTask = {
                  ...task,
                  order: sourceOrderCounter
                };
                sourceOrderCounter += 1;
                return nextTask;
              }
              return task;
            });

            return { reindexedTasks: reindexed, newOrder: newOrderValue };
          };

          const applyPatchWithRollback = (
            payload,
            _previousTasksSnapshot,
            _meta
          ) => {
            enqueueMoveTask({
              task_id: normalizedActiveTaskId,
              column: payload.column,
              order: payload.order ?? null
            });
            setPersistingTask(normalizedActiveTaskId, false);
          };

          if (overType === 'Task') {
            const overTaskIndex = tasks.findIndex((task) =>
              taskMatchesId(task, overId)
            );

            if (overTaskIndex === -1) {
              return;
            }

            const overTask = tasks[overTaskIndex];
            const targetColumnIdentifier = extractColumnIdentifier(
              over?.data?.current?.task?.column ?? overTask.column
            );

            if (
              targetColumnIdentifier === null ||
              targetColumnIdentifier === undefined
            ) {
              return;
            }

            const targetColumnValue = coerceIdValue(targetColumnIdentifier);
            const sameColumn =
              String(sourceColumnValue) === String(targetColumnValue);

            if (sameColumn && activeTaskIndex === overTaskIndex) {
              // The pointer released over the dragged card ITSELF — which is
              // the normal end state of an in-column reorder, because
              // onDragOver already arrayMoved the card under the cursor.
              // Bailing here (the old behavior) made same-column reorders
              // purely cosmetic: the order was never persisted, so a reload
              // reverted it. Derive the task's new order from current state
              // and persist when it actually moved.
              const { reindexedTasks, newOrder } = reindexTasksAfterMove(
                tasks,
                targetColumnValue,
                false
              );
              const startIndex =
                dragMeta.originalIndexInColumn !== null &&
                dragMeta.originalIndexInColumn !== undefined
                  ? dragMeta.originalIndexInColumn
                  : originalOrderValue ?? null;
              if (
                newOrder === null ||
                newOrder === undefined ||
                newOrder === startIndex
              ) {
                return;
              }
              setTasks(reindexedTasks);
              setPersistingTask(normalizedActiveTaskId, true);
              await applyPatchWithRollback(
                { column: targetColumnValue, order: newOrder },
                tasks,
                { before: tasks, after: reindexedTasks }
              );
              return;
            }

            const workingTasks = tasks.map((task, index) =>
              index === activeTaskIndex
                ? {
                    ...task,
                    column: targetColumnValue
                  }
                : task
            );
            const filteredWorkingTasks = workingTasks.filter(
              (_, index) => index !== activeTaskIndex
            );
            const insertionIndex = overTaskIndex;
            filteredWorkingTasks.splice(
              insertionIndex,
              0,
              workingTasks[activeTaskIndex]
            );

            const { reindexedTasks, newOrder } = reindexTasksAfterMove(
              filteredWorkingTasks,
              targetColumnValue,
              !sameColumn
            );

            const previousTasksSnapshot = tasks;
            setTasks(reindexedTasks);

            const payload: Record<string, any> = {
              column: targetColumnValue
            };

            if (newOrder !== null && newOrder !== undefined) {
              payload.order = newOrder;
            }

            const columnChanged =
              String(sourceColumnValue) !== String(targetColumnValue);
            const startIndexBaseline =
              dragMeta.originalIndexInColumn !== null &&
              dragMeta.originalIndexInColumn !== undefined
                ? dragMeta.originalIndexInColumn
                : originalOrderValue ?? null;
            const orderChanged = columnChanged
              ? true
              : newOrder !== null && newOrder !== undefined
              ? newOrder !== startIndexBaseline
              : activeTaskIndex !== overTaskIndex;

            if (!columnChanged && !orderChanged) {
              setTasks(previousTasksSnapshot);
              setActiveColumn(null);
              setActiveTask(null);
              return;
            }

            setPersistingTask(normalizedActiveTaskId, true);
            await applyPatchWithRollback(payload, previousTasksSnapshot, {
              before: previousTasksSnapshot,
              after: reindexedTasks
            });
          } else if (overType === 'Column') {
            const newColumnIdentifier = extractColumnIdentifier(
              over?.data?.current?.column ?? overId
            );

            if (
              newColumnIdentifier === null ||
              newColumnIdentifier === undefined
            ) {
              return;
            }

            const targetColumnValue = coerceIdValue(newColumnIdentifier);
            const sameColumn =
              String(sourceColumnValue) === String(targetColumnValue);

            const workingTasks = tasks.map((task, index) =>
              index === activeTaskIndex
                ? {
                    ...task,
                    column: targetColumnValue
                  }
                : task
            );

            const filteredWorkingTasks = workingTasks.filter(
              (_, index) => index !== activeTaskIndex
            );

            const targetColumnString = String(targetColumnValue);
            let insertIndex = filteredWorkingTasks.findIndex(
              (task) => String(task.column) !== targetColumnString
            );

            if (insertIndex === -1) {
              insertIndex = filteredWorkingTasks.length;
            }

            filteredWorkingTasks.splice(
              insertIndex,
              0,
              workingTasks[activeTaskIndex]
            );

            const { reindexedTasks, newOrder } = reindexTasksAfterMove(
              filteredWorkingTasks,
              targetColumnValue,
              !sameColumn
            );

            const previousTasksSnapshot = tasks;
            setTasks(reindexedTasks);

            const payload: Record<string, any> = {
              column: targetColumnValue
            };

            if (newOrder !== null && newOrder !== undefined) {
              payload.order = newOrder;
            }

            const columnChanged =
              String(sourceColumnValue) !== String(targetColumnValue);
            const startIndexBaseline =
              dragMeta.originalIndexInColumn !== null &&
              dragMeta.originalIndexInColumn !== undefined
                ? dragMeta.originalIndexInColumn
                : originalOrderValue ?? null;
            const orderChanged =
              columnChanged ||
              (newOrder !== null && newOrder !== undefined
                ? newOrder !== startIndexBaseline
                : insertIndex !== activeTaskIndex);

            if (!columnChanged && !orderChanged) {
              setTasks(previousTasksSnapshot);
              setActiveColumn(null);
              setActiveTask(null);
              return;
            }

            setPersistingTask(normalizedActiveTaskId, true);
            await applyPatchWithRollback(payload, previousTasksSnapshot, {
              before: previousTasksSnapshot,
              after: reindexedTasks
            });
          }
        }

        if (activeType === 'Column') {
          const normalizedActiveColumnId = normalizeColumnId(
            active?.data?.current?.column?.id ?? activeId
          );
          // closestCorners frequently reports a TASK CARD as `over` when a
          // column is dropped onto another column's body — resolve the drop to
          // that card's parent column instead of silently ignoring it.
          const normalizedOverColumnId =
            overType === 'Task'
              ? extractColumnIdentifier(over?.data?.current?.task?.column)
              : normalizeColumnId(over?.data?.current?.column?.id ?? overId);

          const activeColumnIndex = columns.findIndex(
            (col) => String(col.id) === String(normalizedActiveColumnId)
          );
          const overColumnIndex = columns.findIndex(
            (col) => String(col.id) === String(normalizedOverColumnId)
          );

          if (
            activeColumnIndex !== -1 &&
            overColumnIndex !== -1 &&
            activeColumnIndex !== overColumnIndex
          ) {
            const previousColumnsSnapshot = columns.map((column) => ({
              ...column,
              tasks: Array.isArray(column.tasks)
                ? [...column.tasks]
                : column.tasks
            }));
            const reorderedColumns = arrayMove(
              columns,
              activeColumnIndex,
              overColumnIndex
            );
            const reindexedColumns = reorderedColumns.map((column, index) => ({
              ...column,
              order: index
            }));
            await persistColumnOrder(reindexedColumns, previousColumnsSnapshot);
          }
        }
      } finally {
        dragTaskMetaRef.current = null;
        setActiveColumn(null);
        setActiveTask(null);
      }
    },
    [
      coerceIdValue,
      columns,
      dragTaskMetaRef,
      extractColumnIdentifier,
      getTaskKey,
      normalizeColumnId,
      normalizeTaskId,
      persistColumnOrder,
      setActiveColumn,
      setActiveTask,
      setPersistingTask,
      setTasks,
      taskMatchesId,
      tasks
    ]
  );

  const onDragOver = useCallback(
    (event) => {
      const { active, over } = event;

      if (!over) {
        return;
      }

      const activeId = active.id;
      const overId = over.id;

      const activeType = active.data.current?.type;
      const overType = over.data.current?.type;

      if (activeType !== 'Task') {
        return;
      }

      setTasks((prevTasks) => {
        const activeTaskIndex = prevTasks.findIndex((task) =>
          taskMatchesId(task, activeId)
        );
        if (activeTaskIndex === -1) {
          return prevTasks;
        }

        let updatedTasks = [...prevTasks];
        const activeTask = updatedTasks[activeTaskIndex];

        if (overType === 'Task') {
          const overTaskIndex = updatedTasks.findIndex((task) =>
            taskMatchesId(task, overId)
          );
          if (overTaskIndex === -1 || activeTaskIndex === overTaskIndex) {
            return prevTasks;
          }

          const overTask = updatedTasks[overTaskIndex];
          const targetColumnIdentifier = extractColumnIdentifier(
            over?.data?.current?.task?.column ?? overTask.column
          );
          const columnValue =
            targetColumnIdentifier !== null
              ? coerceIdValue(targetColumnIdentifier)
              : overTask.column;
          if (String(activeTask.column) !== String(columnValue)) {
            updatedTasks[activeTaskIndex] = {
              ...activeTask,
              column: columnValue
            };
          }

          updatedTasks = arrayMove(
            updatedTasks,
            activeTaskIndex,
            overTaskIndex
          );
          return updatedTasks;
        }

        if (overType === 'Column') {
          const targetColumnIdentifier = extractColumnIdentifier(
            over?.data?.current?.column ?? overId
          );
          if (
            targetColumnIdentifier === null ||
            targetColumnIdentifier === undefined
          ) {
            return prevTasks;
          }

          const columnValue = coerceIdValue(targetColumnIdentifier);

          if (String(activeTask.column) === String(columnValue)) {
            return prevTasks;
          }

          updatedTasks[activeTaskIndex] = {
            ...activeTask,
            column: columnValue
          };
          return updatedTasks;
        }

        return prevTasks;
      });
    },
    [coerceIdValue, extractColumnIdentifier, setTasks, taskMatchesId]
  );

  return {
    onDragStart,
    onDragEnd,
    onDragOver
  };
};
