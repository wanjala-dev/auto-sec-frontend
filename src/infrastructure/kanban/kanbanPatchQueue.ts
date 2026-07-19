/**
 * Debounced patch queue for task column/order moves.
 *
 * Collects moves keyed by task_id (later moves overwrite earlier ones),
 * then flushes after a quiet period:
 *   - 1 pending move  → calls the single-task patcher (existing PATCH)
 *   - 2+ pending moves → calls the batch endpoint (POST /project/tasks/batch-move/)
 */

import { kanbanApi } from './kanbanApi';

type PendingMove = {
  task_id: string | number;
  column: string | number;
  order?: number | null;
};

type SinglePatcher = (
  taskId: string | number,
  payload: Record<string, any>
) => Promise<any>;

const FLUSH_DELAY_MS = 800;

let pending: Map<string, PendingMove> = new Map();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let singlePatcher: SinglePatcher | null = null;

export const configurePatchQueue = (patcher: SinglePatcher): void => {
  singlePatcher = patcher;
};

export const enqueueMoveTask = (move: PendingMove): void => {
  pending.set(String(move.task_id), move);

  if (flushTimer !== null) {
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
};

const flush = async (): Promise<void> => {
  flushTimer = null;
  const moves = Array.from(pending.values());
  pending = new Map();

  if (moves.length === 0) return;

  if (moves.length === 1 && singlePatcher) {
    const move = moves[0];
    const payload: Record<string, any> = { column: move.column };
    if (move.order !== null && move.order !== undefined) {
      payload.order = move.order;
    }
    try {
      await singlePatcher(move.task_id, payload);
    } catch {
      // optimistic UI already applied — error toast handled by the patcher
    }
    return;
  }

  try {
    await kanbanApi.batchMoveTasks(
      moves.map((m) => ({
        task_id: m.task_id,
        column: m.column,
        ...(m.order !== null && m.order !== undefined ? { order: m.order } : {})
      }))
    );
  } catch {
    // optimistic UI already applied — individual rollbacks are not practical
    // for batch; the next board refresh will reconcile
  }
};
