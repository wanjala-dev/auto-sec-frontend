// Single source of truth for a task's dnd-kit sortable id. The column's
// SortableContext items and each card's useSortable registration MUST agree on
// this value — a mismatch makes dnd-kit treat every card as outside its
// SortableContext (index -1), which silently disables sorting. Mirrors the
// literacyseed helper so the shared kanban drag hook (which normalizes task
// ids the same way) resolves the same identifiers.
export const getTaskSortableId = (task, fallbackColumnId) => {
  const baseId =
    task?.pk || task?.id || task?.task_id || task?.uuid || task?.slug || null;
  if (baseId !== null && baseId !== undefined) {
    return `task-${String(baseId)}`;
  }
  const columnId = task?.column ?? fallbackColumnId ?? 'unknown';
  if (task?.title) {
    return `task-${columnId}-${String(task.title).replace(/\s+/g, '-')}`;
  }
  return `task-temp-${columnId}`;
};

// Resolve a task's owning column id defensively — the board task payload may
// carry `column` as a scalar FK, a nested { id } object, or `board_column`.
export const getTaskColumnId = (task) => {
  const raw = task?.column ?? task?.board_column ?? null;
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object') return raw.id ?? raw.pk ?? null;
  return raw;
};

// dnd-kit droppable id for a column lane.
export const getColumnDndId = (columnId) => `column-${String(columnId)}`;
