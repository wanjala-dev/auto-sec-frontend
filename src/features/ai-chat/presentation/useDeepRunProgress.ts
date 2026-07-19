import { useEffect, useRef, useState } from 'react';

import { getDeepRunSnapshot } from '../../../application/aiChat/deepRunService';
import type {
  DeepRunEvent,
  DeepRunSnapshot
} from '../../../domain/aiChat/deepRun';
import { useResourceStream } from '../../realtime/presentation/useResourceStream';
import type { ResourceEventEnvelope } from '../../../infrastructure/realtime/realtimeSocket';

// Snapshot-refetch debounce (ms). Bundles back-to-back WS events
// into one snapshot fetch so a busy ``tool_progress``-heavy run
// doesn't hammer the snapshot endpoint. 250ms is below the
// progress-bar's perceived latency budget (~300ms) but high enough
// to collapse several events emitted by a single tool call into
// one fetch on a typical run. Terminal events (run_completed,
// run_failed) flush immediately because the user is waiting on
// them and the snapshot data is final.
const SNAPSHOT_REFETCH_DEBOUNCE_MS = 250;

const TERMINAL_EVENT_NAMES = new Set([
  'run_completed',
  'run_failed',
  'run_cancelled',
  'run_succeeded'
]);

interface UseDeepRunProgressResult {
  snapshot: DeepRunSnapshot | null;
  events: DeepRunEvent[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Live deep-run progress, sourced from the WebSocket realtime layer
 * instead of REST polling.
 *
 * - Subscribes to `/ws/workspaces/<workspaceId>/resources/agent_run/<planId>/`
 *   and appends every `resource.event` envelope as it arrives. No more
 *   1.5s polling.
 * - Fetches the REST snapshot once on mount (and once on completion)
 *   so the consumer still has the rolled-up `DeepRunSnapshot` shape
 *   the existing `<DeepRunProgress />` component expects.
 * - Returns the same `UseDeepRunProgressResult` shape as before so
 *   call sites don't have to change.
 *
 * See `docs/plans/REALTIME_OBSERVABILITY_PLAN.md` Phase 7.1.
 */
export const useDeepRunProgress = (
  planId: string | null | undefined,
  workspaceId?: string | null
): UseDeepRunProgressResult => {
  const [snapshot, setSnapshot] = useState<DeepRunSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const stream = useResourceStream(workspaceId, 'agent_run', planId);

  // Two-effect strategy:
  //
  // 1. **On mount**, attempt an initial snapshot fetch. With the new
  //    plan-id-from-frontend flow the DeepRun row may not exist yet
  //    when this fires (the chat POST is still in flight). That's
  //    fine — the apiClient interceptor silences the 404 for this
  //    URL, the service swallows it and returns null, and we move on.
  //
  // 2. **On every WS event arrival**, *debounce* a snapshot refetch.
  //    Each event is proof the row exists *and* its state has just
  //    changed (status, progress, completed task count, subagent
  //    rollup). The ``SNAPSHOT_REFETCH_DEBOUNCE_MS`` window collapses
  //    bursty events (a single tool emitting several
  //    ``tool_progress`` ticks in quick succession) into one fetch.
  //    Terminal events flush immediately because the user is waiting
  //    on them. Without the refetch, the snapshot stays frozen at
  //    the "status=running, progress_percent=0" moment we first
  //    fetched it and the bar never animates — the 2026-05-08
  //    symptom that motivated this hook in the first place. With
  //    the refetch but no debounce, a typical run hammered the
  //    snapshot endpoint with 5–15 reads in under a second; the
  //    debounce keeps the bar live without the stampede.
  useEffect(() => {
    if (!planId) {
      setSnapshot(null);
      setError(null);
      setIsLoading(false);
      return undefined;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getDeepRunSnapshot(planId)
      .then((next) => {
        if (cancelled) return;
        if (next) setSnapshot(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load deep-run progress');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  // Debounced snapshot refetch. ``timerRef`` holds the pending timer
  // and ``cancelledRef`` tracks the most recent in-flight fetch so a
  // late-arriving promise resolution doesn't overwrite a newer
  // snapshot.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  useEffect(() => {
    if (!planId) return undefined;
    const lastEvent = stream.events[stream.events.length - 1];
    if (!lastEvent) return undefined;

    const fetchSnapshot = () => {
      const ticket = { cancelled: false };
      cancelledRef.current.cancelled = true;
      cancelledRef.current = ticket;
      getDeepRunSnapshot(planId)
        .then((next) => {
          if (ticket.cancelled) return;
          if (next) setSnapshot(next);
        })
        .catch(() => {
          /* silent — events keep arriving, next refetch will retry */
        });
    };

    // Terminal events flush the queue immediately — the user has
    // been staring at the bar waiting for the final state.
    if (TERMINAL_EVENT_NAMES.has(lastEvent.event_name)) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      fetchSnapshot();
      return undefined;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      fetchSnapshot();
    }, SNAPSHOT_REFETCH_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [planId, stream.events]);

  return {
    snapshot,
    events: stream.events.map(envelopeToDeepRunEvent),
    isLoading,
    error
  };
};

const envelopeToDeepRunEvent = (
  envelope: ResourceEventEnvelope
): DeepRunEvent => {
  const payload = envelope.payload || {};
  return {
    id: Number((payload as { log_id?: number }).log_id || 0),
    timestamp: envelope.timestamp,
    event_type: envelope.event_name,
    status: envelope.status,
    agent_type: String((payload as { agent_type?: string }).agent_type || ''),
    tool_name: String((payload as { tool_name?: string }).tool_name || ''),
    payload
  };
};
