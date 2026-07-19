import { useEffect, useRef, useState } from 'react';

import {
  openRealtimeSocket,
  type ResourceEventEnvelope
} from '../../../infrastructure/realtime/realtimeSocket';

export interface ResourceStreamState {
  /** Latest event received on the stream, or null before the first arrives. */
  latest: ResourceEventEnvelope | null;
  /** Append-only log of every event received since the hook mounted. */
  events: ResourceEventEnvelope[];
  /** True once the server has sent the `resource.stream.ready` ack. */
  ready: boolean;
  /** Last close-code seen, when the socket disconnects unexpectedly. */
  lastError: number | null;
}

/**
 * Subscribe to a single resource's event stream over WebSocket.
 *
 * URL: `/ws/workspaces/<workspace_id>/resources/<resource_type>/<resource_id>/`
 * (see backend `infrastructure.realtime.routing`).
 *
 * Replaces the old polling pattern (`setInterval` against REST) for
 * any long-running operation: agent runs, document uploads, budget
 * imports, etc. See `docs/plans/REALTIME_OBSERVABILITY_PLAN.md` Phase
 * 7.1.
 */
export const useResourceStream = (
  workspaceId: string | null | undefined,
  resourceType: string | null | undefined,
  resourceId: string | null | undefined
): ResourceStreamState => {
  const [state, setState] = useState<ResourceStreamState>({
    latest: null,
    events: [],
    ready: false,
    lastError: null
  });
  const socketRef = useRef<{ close: () => void } | null>(null);

  useEffect(() => {
    setState({ latest: null, events: [], ready: false, lastError: null });

    if (!workspaceId || !resourceType || !resourceId) {
      return undefined;
    }

    const socket = openRealtimeSocket({
      url: `/ws/workspaces/${workspaceId}/resources/${resourceType}/${resourceId}/`,
      onMessage: (msg) => {
        if (msg.type === 'resource.stream.ready') {
          setState((prev) => ({ ...prev, ready: true }));
          return;
        }
        if (msg.type === 'resource.event') {
          setState((prev) => ({
            ...prev,
            latest: msg,
            events: [...prev.events, msg]
          }));
        }
      },
      onClose: (event) => {
        if (event.code !== 1000) {
          setState((prev) => ({ ...prev, lastError: event.code }));
        }
      }
    });
    socketRef.current = socket;
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [workspaceId, resourceType, resourceId]);

  return state;
};
