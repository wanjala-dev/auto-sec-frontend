/*
 * Web-push-only service worker.
 *
 * This worker exists solely to display push notifications delivered by the
 * backend (POST /notifications/push/subscriptions/ registers the browser's
 * PushSubscription). It intentionally has NO fetch/caching handlers — the app
 * is not a PWA and must not become one via this file.
 *
 * Expected push payload (JSON):
 *   { title, body, link (absolute URL or null), notification_id, icon? }
 *
 * Registration happens only from the subscription flow in
 * src/infrastructure/push/pushManager.ts (explicit user toggle) — never on
 * page load.
 */

'use strict';

var FALLBACK_ICON = '/logo192.png';

self.addEventListener('install', function () {
  // Activate updated workers immediately; there is no cache state to migrate.
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var payload = null;
  try {
    payload = event.data ? event.data.json() : null;
  } catch (parseError) {
    // Malformed (non-JSON) payload — nothing meaningful to render.
    payload = null;
  }
  if (!payload || !payload.title) {
    return;
  }

  var options = {
    body: payload.body || '',
    icon: payload.icon || FALLBACK_ICON,
    data: {
      link: payload.link || null,
      notification_id: payload.notification_id || null
    }
  };
  if (payload.notification_id) {
    // Tag dedupes: re-delivery of the same notification replaces, not stacks.
    options.tag = String(payload.notification_id);
  }

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var link = (event.notification.data && event.notification.data.link) || '/';

  var target;
  try {
    target = new URL(link, self.location.origin);
  } catch (urlError) {
    target = new URL('/', self.location.origin);
  }
  var sameOrigin = target.origin === self.location.origin;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (windowClients) {
        if (sameOrigin) {
          var existing = null;
          for (var i = 0; i < windowClients.length; i += 1) {
            try {
              if (new URL(windowClients[i].url).origin === target.origin) {
                existing = windowClients[i];
                break;
              }
            } catch (clientUrlError) {
              // Unparseable client URL — skip it.
            }
          }
          if (existing) {
            return existing.focus().then(function (focused) {
              var client = focused || existing;
              if (client && typeof client.navigate === 'function') {
                return client.navigate(target.href).catch(function () {
                  // Navigation can be refused (e.g. cross-origin redirect);
                  // the window is focused, which is the best we can do.
                  return client;
                });
              }
              return client;
            });
          }
        }
        return self.clients.openWindow(sameOrigin ? target.href : link);
      })
  );
});
