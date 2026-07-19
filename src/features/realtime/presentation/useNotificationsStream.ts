import { useEffect, useRef } from 'react';

import { openRealtimeSocket } from '../../../infrastructure/realtime/realtimeSocket';

/**
 * Envelope published by the backend `RealtimeNotificationChannel` to the
 * user's private `/ws/notifications/` stream (see backend
 * `NotificationConsumer`). `notification` carries the same serialized shape
 * the REST `/notifications/` list returns, so it can be prepended into the
 * existing feed state untouched.
 */
export interface NotificationEventEnvelope {
  type: 'notification.event';
  event_name:
    | 'notification.created'
    | 'notification.read'
    | 'notification.all_read';
  notification_id: string | null;
  workspace_id: string | null;
  notification: Record<string, unknown> | null;
  unread_count: number | null;
  timestamp: string;
}

interface UseNotificationsStreamOptions {
  /** Only open the socket once the user is resolved — an anonymous
   *  connection is closed by the server with 4401 (no reconnect). */
  enabled: boolean;
  /** Fires with the current unread count on connect (`notifications.ready`). */
  onReady?: (unreadCount: number | null) => void;
  /** Fires for every notification lifecycle event. */
  onEvent?: (envelope: NotificationEventEnvelope) => void;
}

/**
 * Subscribe to the authenticated user's PRIVATE notification stream.
 *
 * URL: `/ws/notifications/` (no ids in the path — the backend consumer keys
 * the group off the authenticated user, so this only ever surfaces the
 * current user's own notifications). Replaces badge staleness: created /
 * read / all-read events arrive live, each carrying a fresh `unread_count`.
 */
export const useNotificationsStream = ({
  enabled,
  onReady,
  onEvent
}: UseNotificationsStreamOptions): void => {
  // Refs so changing callback identities don't tear down + reconnect the
  // socket on every render (mirrors useSponsorFeed).
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return undefined;

    const socket = openRealtimeSocket({
      url: '/ws/notifications/',
      onMessage: (msg: any) => {
        if (msg?.type === 'notifications.ready') {
          try {
            onReadyRef.current?.(
              typeof msg.unread_count === 'number' ? msg.unread_count : null
            );
          } catch {
            /* a consumer callback throwing must not kill the stream */
          }
          return;
        }
        if (msg?.type === 'notification.event') {
          try {
            onEventRef.current?.(msg as NotificationEventEnvelope);
          } catch {
            /* a consumer callback throwing must not kill the stream */
          }
        }
      }
    });
    return () => socket.close();
  }, [enabled]);
};
