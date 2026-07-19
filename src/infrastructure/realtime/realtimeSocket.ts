/**
 * Thin WebSocket client for the realtime layer (Phase 7+8 of the
 * Real-Time Observability Plan). Wraps reconnect-with-backoff and
 * JWT-on-handshake plumbing so feature hooks just have to subscribe
 * and receive parsed events.
 *
 * Server contract: every published event is a `resource.event`
 * envelope (see backend `RealtimeEventPort`). Connection-level
 * messages (ready, error) come through with their own `type`.
 */

import { readAccessToken } from '../session/browserAuthStore';

export interface ResourceEventEnvelope {
  type: 'resource.event';
  resource_type: string;
  resource_id: string;
  workspace_id: string;
  status: string;
  progress_percent: number;
  event_name: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export type RealtimeMessage =
  | ResourceEventEnvelope
  | {
      type: 'resource.stream.ready';
      resource_type: string;
      resource_id: string;
    }
  | { type: 'workspace.stream.ready'; workspace_id: string }
  | { type: 'ping.echo' | 'ping.ready'; [key: string]: unknown };

export type RealtimeListener = (msg: RealtimeMessage) => void;

export interface RealtimeSocket {
  close: () => void;
}

interface OpenSocketOptions {
  url: string;
  onMessage: RealtimeListener;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  /** Initial reconnect delay; doubles up to maxBackoffMs. */
  initialBackoffMs?: number;
  maxBackoffMs?: number;
}

const buildWsBase = (): string => {
  const apiBase = (process.env.REACT_APP_API_BASE_URL || '').replace(
    /\/+$/,
    ''
  );
  if (apiBase.startsWith('https://')) {
    return apiBase.replace(/^https:\/\//, 'wss://');
  }
  if (apiBase.startsWith('http://')) {
    return apiBase.replace(/^http:\/\//, 'ws://');
  }
  // Same-origin fallback.
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}`;
  }
  return '';
};

const appendToken = (path: string): string => {
  const token = readAccessToken();
  const sep = path.includes('?') ? '&' : '?';
  if (!token) return path;
  return `${path}${sep}token=${encodeURIComponent(token)}`;
};

/**
 * Open a WebSocket to the given path under `/ws/`. Reconnects on
 * abnormal close with exponential backoff; close() stops the loop.
 */
export const openRealtimeSocket = ({
  url,
  onMessage,
  onError,
  onClose,
  initialBackoffMs = 800,
  maxBackoffMs = 10_000
}: OpenSocketOptions): RealtimeSocket => {
  let socket: WebSocket | null = null;
  let cancelled = false;
  let backoff = initialBackoffMs;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (cancelled) return;
    const fullUrl = appendToken(`${buildWsBase()}${url}`);
    try {
      socket = new WebSocket(fullUrl);
    } catch (error) {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      backoff = initialBackoffMs;
    };
    socket.onmessage = (event) => {
      if (cancelled) return;
      try {
        const parsed = JSON.parse(event.data) as RealtimeMessage;
        onMessage(parsed);
      } catch {
        // Non-JSON server frame — ignore. The contract is JSON only.
      }
    };
    socket.onerror = (event) => {
      if (onError) onError(event);
    };
    socket.onclose = (event) => {
      if (onClose) onClose(event);
      // 1000 is a clean close (we initiated). 4401/4403 are auth/perm
      // closes from the server — don't reconnect, the user can't fix
      // those by retrying.
      const noReconnect = [1000, 4401, 4403].includes(event.code);
      if (cancelled || noReconnect) return;
      scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (cancelled) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      backoff = Math.min(backoff * 2, maxBackoffMs);
      connect();
    }, backoff);
  };

  connect();

  return {
    close: () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close(1000, 'client_close');
      }
      socket = null;
    }
  };
};
